"""Orquestração da simulação, na ordem do documento 02:
estrutura e regimes → atividades por PJ → calendário → base da CF → receitas,
custos e fluxos entre PJs → tributos e créditos por PJ → consolidação → estados."""
import logging
from dataclasses import dataclass, field
from decimal import Decimal

from . import ibs_cbs
from .categorias import estimar
from .decimais import MESES, ZERO, moeda, soma
from .entradas import Cenario, ConfigPJ, FormaPessoal, TipoAjuste, Transporte
from .estados import COM_VALORES, Indisponivel, Status, pior
from .estrutura import NOMES_ATIVIDADE, NOMES_REGIME, REGULARES, SERVICOS, SIMPLES, Atividade, Empresa, Regime, empresas
from .lucro import lucro_presumido, lucro_real
from .parametros import Parametros, carregar
from .resultado import Consolidado, LinhaMemoria, Pendencia, Resultado, ResultadoPJ
from .simples import ApuracaoSimples, apurar_simples

_ZEROS = [ZERO] * MESES

# Só emite quando quem usa o motor configura o logging (a API configura; os testes não).
log = logging.getLogger("simulador.motor")


@dataclass
class _Contexto:
    cenario: Cenario
    p: Parametros
    memoria: list = field(default_factory=list)
    hipoteses: list = field(default_factory=list)
    provisorio: list = field(default_factory=list)
    pendencias: list = field(default_factory=list)
    pessoal_calculado: dict = field(default_factory=dict)

    def nota(self, pj, etapa, descricao, formula=None, valor=None, unidade=None):
        self.memoria.append(LinhaMemoria(pj, etapa, descricao, formula, valor, unidade or ("moeda" if isinstance(valor, Decimal) else "texto")))
        log.debug("[%s] %s | %s = %s", pj or "consolidado", etapa, descricao, valor)

    def hipotese(self, texto):
        if texto not in self.hipoteses:
            self.hipoteses.append(texto)

    def provisoria(self, texto):
        if texto not in self.provisorio:
            self.provisorio.append(texto)

    def config_pj(self, emp: Empresa) -> ConfigPJ:
        return self.cenario.config.por_papel.get(emp.papel) or ConfigPJ()


@dataclass
class _Operacao:
    """Receitas e custos de uma atividade de serviço, já no calendário de 2027."""

    atividade: Atividade
    receita_cf: list
    receita_terceiros: list
    custos_sem_pessoal: Decimal
    depreciacao: Decimal
    pessoal: Decimal

    @property
    def custo_anual(self) -> Decimal:
        return self.custos_sem_pessoal + self.depreciacao + self.pessoal


@dataclass
class _Indiretos:
    simples: ApuracaoSimples | None
    fora_do_das: dict  # ISS/ICMS/IBS apurados fora do DAS, por mês
    debito_ibs: list
    debito_cbs: list


# --- Atividades: receitas, custos e pessoal ---


def _custo_pessoal(ctx, atividade: Atividade, regime: Regime, faltantes: list, obrigatorio: bool = True):
    nome = NOMES_ATIVIDADE[atividade]
    pessoal = ctx.cenario.pessoal.get(atividade)
    if pessoal is None or pessoal.forma is None:
        if obrigatorio:
            faltantes.append(f"Pessoal de {nome}: forma de contratação")
        return None
    if pessoal.forma is FormaPessoal.TERCEIRIZACAO:
        if pessoal.preco_mensal is None:
            faltantes.append(f"Pessoal de {nome}: preço mensal do serviço terceirizado")
            return None
        total = pessoal.preco_mensal * MESES
        ctx.pessoal_calculado[atividade] = {"atividade": atividade.value, "quantidade": None, "folha_anual": None, "encargos_sem_cpp_anual": None, "cpp_anual": None, "custo_anual": total}
        return total
    no_simples = regime in SIMPLES
    if atividade is Atividade.COMERCIO and pessoal.custo_total_mensal is not None:
        if pessoal.remuneracao_mensal is not None:
            faltantes.append("Pessoal da CF: escolha custo total com encargos ou remuneração, sem preencher ambos")
            return None
        return pessoal.custo_total_mensal * MESES
    remuneracao = pessoal.remuneracao_mensal
    quantidade = pessoal.quantidade_funcionarios
    if atividade in SERVICOS and (pessoal.equipe_por_quantidade or quantidade is not None or pessoal.remuneracao_media_mensal is not None):
        if quantidade is None or quantidade < 0 or quantidade != quantidade.to_integral_value():
            faltantes.append(f"Pessoal de {nome}: quantidade inteira não negativa de funcionários")
            return None
        if quantidade == 0:
            remuneracao = ZERO
        elif pessoal.remuneracao_media_mensal is None or pessoal.remuneracao_media_mensal < 0:
            faltantes.append(f"Pessoal de {nome}: remuneração média mensal por funcionário")
            return None
        else:
            remuneracao = quantidade * pessoal.remuneracao_media_mensal
    elif atividade in SERVICOS:
        ctx.hipotese("Entrada legada de folha total: não representa quantidade ou salário individual. Atualize a equipe antes de reutilizar esta configuração.")
    encargos = pessoal.encargos_no_simples if no_simples else pessoal.encargos_fora_do_simples
    sem_cpp_config = pessoal.encargos_no_simples
    if pessoal.encargos_componentes:
        componentes = pessoal.encargos_componentes
        nomes = ("cpp", "fgts", "ferias", "decimo_terceiro", "beneficios", "outros_encargos")
        exigidos = [k for k in nomes if k != "cpp" or not no_simples]
        if remuneracao != ZERO and any(componentes.get(k) is None for k in exigidos):
            faltantes.append(f"Pessoal de {nome}: componentes de encargos incompletos")
            return None
        sem_cpp_config = soma(componentes.get(k) or ZERO for k in nomes if k != "cpp")
        encargos = sem_cpp_config + (ZERO if no_simples else componentes.get("cpp") or ZERO)
    if remuneracao is None:
        faltantes.append(f"Pessoal de {nome}: remuneração mensal")
    if remuneracao == ZERO:
        encargos = ZERO
    if encargos is None:
        faltantes.append(f"Pessoal de {nome}: encargos aplicáveis {'no Simples (sem CPP patronal)' if no_simples else 'fora do Simples'}")
    if remuneracao is None or encargos is None:
        return None
    sem_cpp = ZERO if remuneracao == ZERO else sem_cpp_config
    if sem_cpp is None:
        faltantes.append(f"Pessoal de {nome}: encargos sem CPP")
        return None
    if not no_simples and encargos < sem_cpp:
        faltantes.append(f"Pessoal de {nome}: encargos com CPP inferiores aos encargos sem CPP")
        return None
    folha = remuneracao * MESES
    cpp = ZERO if no_simples else folha * (encargos - sem_cpp)
    total = folha * (1 + encargos)
    ctx.pessoal_calculado[atividade] = {"atividade": atividade.value, "quantidade": quantidade, "folha_anual": folha, "encargos_sem_cpp_anual": folha * sem_cpp, "cpp_anual": cpp, "custo_anual": total}
    return total


def _somar_meses(recorrentes) -> list:
    series = [r.mensal() for r in recorrentes]
    return [soma(s[m] for s in series) for m in range(MESES)]


def _operacao(ctx, atividade: Atividade, hospedeira: Empresa, regime: Regime) -> _Operacao:
    c, faltantes, recorrentes = ctx.cenario, [], []

    def exigir(valor, rotulo):
        if not valor.informado:
            faltantes.append(rotulo)
        recorrentes.append(valor)

    if atividade is Atividade.ARMAZENAGEM:
        for i, g in enumerate(c.galpoes, 1):
            exigir(g.receita_cf, f"Galpão {i}: receita de serviços para a CF")
            exigir(g.receita_terceiros, f"Galpão {i}: receita de serviços para terceiros")
            exigir(g.custos_operacionais, f"Galpão {i}: custos operacionais sem pessoal")
        depreciacao = ZERO
    else:
        lg = c.logistica
        exigir(lg.receita_cf, "Logística: receita de serviços para a CF")
        exigir(lg.receita_terceiros, "Logística: receita de serviços para terceiros")
        exigir(lg.combustivel, "Logística: combustível")
        exigir(lg.manutencao, "Logística: manutenção e demais despesas da frota")
        exigir(lg.outros_custos, "Logística: outros custos operacionais")
        if lg.depreciacao_anual is None:
            faltantes.append("Logística: depreciação anual")
        depreciacao = lg.depreciacao_anual
    pessoal = _custo_pessoal(ctx, atividade, regime, faltantes)
    if ctx.cenario.config.metodo_credito == "categorias":
        estimar(ctx, atividade)
    if faltantes:
        raise Indisponivel(Status.DADOS_INCOMPLETOS, faltantes)
    if any(r.uniforme for r in recorrentes):
        ctx.hipotese("Valores informados pela média mensal: distribuição uniforme nos 12 meses é hipótese, não histórico real.")

    if atividade is Atividade.ARMAZENAGEM:
        op = _Operacao(
            atividade,
            _somar_meses(g.receita_cf for g in c.galpoes),
            _somar_meses(g.receita_terceiros for g in c.galpoes),
            soma(g.custos_operacionais.anual() for g in c.galpoes),
            depreciacao,
            pessoal,
        )
        formula = "Σ custos anuais dos 3 galpões + pessoal_anual"
    else:
        op = _Operacao(
            atividade,
            lg.receita_cf.mensal(),
            lg.receita_terceiros.mensal(),
            lg.combustivel.anual() + lg.manutencao.anual() + lg.outros_custos.anual(),
            depreciacao,
            pessoal,
        )
        formula = "12 × (combustível + manutenção + outros custos) + depreciação_anual + pessoal_anual"
    etapa = NOMES_ATIVIDADE[atividade]
    ctx.nota(hospedeira.id, etapa, "Custo de pessoal anual", "remuneração × (1 + encargos) ou preço contratado", moeda(op.pessoal))
    ctx.nota(hospedeira.id, etapa, "Custo anual da atividade", formula, moeda(op.custo_anual))
    ctx.nota(hospedeira.id, etapa, "Receita anual de serviços para terceiros", "Σ meses", moeda(soma(op.receita_terceiros)))
    ctx.nota(
        hospedeira.id,
        etapa,
        "Serviços destinados à CF (anual)",
        "referência interna, sem faturamento" if hospedeira.e_cf else "faturados à CF (operação entre PJs)",
        moeda(soma(op.receita_cf)),
    )
    return op


# --- Tributos sobre a receita, por PJ ---


def _indiretos(ctx, emp: Empresa, regime: Regime, receitas: dict, *, nova: bool, historico) -> _Indiretos:
    """ISS/ICMS, DAS e débitos de IBS/CBS. Para a CF, os tributos indiretos do
    comércio já estão na base e não são recalculados aqui (exceto o DAS)."""
    p, cfg = ctx.p, ctx.cenario.config
    servicos = {a: r for a, r in receitas.items() if a is not Atividade.COMERCIO and any(r)}
    transporte = None
    if Atividade.LOGISTICA in servicos:
        transporte = cfg.transporte_enquadramento
        if transporte is None:
            raise Indisponivel(
                Status.DADOS_INCOMPLETOS,
                ["Enquadramento do transporte (municipal ou intermunicipal/interestadual) não configurado pela contabilidade."],
            )

    def fora_do_das(atividade):
        if atividade is Atividade.ARMAZENAGEM:
            return "ISS", p.obter("iss_armazenagem")
        if transporte is Transporte.MUNICIPAL:
            return "ISS", p.obter("iss_transporte_municipal")
        return "ICMS", p.obter("icms_transporte")

    fora = {"ISS": list(_ZEROS), "ICMS": list(_ZEROS), "IBS": list(_ZEROS), "Outros": list(_ZEROS)}
    apuracao = None
    if regime in SIMPLES:
        if transporte is Transporte.INTERMUNICIPAL:
            raise Indisponivel(
                Status.HIPOTESE_NAO_MODELADA,
                ["Transporte intermunicipal/interestadual no Simples (substituição da parcela de ISS por ICMS) ainda não modelado."],
            )
        apuracao = apurar_simples(receitas, nova=nova, regular=regime is Regime.SIMPLES_REGULAR, historico=historico, p=p)
        for texto in apuracao.notas:
            ctx.nota(emp.id, "Simples Nacional", texto)
        for texto in apuracao.aproximacoes:
            ctx.provisoria(texto)
        if Atividade.LOGISTICA in servicos:
            ctx.hipotese("Teto de ISS do Anexo III aplicado também ao transporte: simplificação declarada da referência.")
        if Atividade.COMERCIO in receitas:
            ctx.hipotese("Comércio no Anexo I sem substituição tributária, monofásicos ou benefícios por produto.")
        for m, mes in enumerate(apuracao.meses):
            if not mes.impedido:
                continue
            for atividade, serie in servicos.items():
                tributo, aliquota = fora_do_das(atividade)
                fora[tributo][m] += moeda(serie[m] * aliquota)
                if regime is Regime.SIMPLES_DAS:
                    fora["IBS"][m] += moeda(serie[m] * p.obter("ibs"))
        ctx.nota(emp.id, "Simples Nacional", "DAS anual", "Σ DAS_mês (componentes mantidos no DAS)", apuracao.das_anual)
    else:
        for atividade, serie in servicos.items():
            tributo, aliquota = fora_do_das(atividade)
            for m in range(MESES):
                fora[tributo][m] += moeda(serie[m] * aliquota)

    debito_ibs = debito_cbs = list(_ZEROS)
    if regime in REGULARES and servicos:
        base = [soma(s[m] for s in servicos.values()) for m in range(MESES)]
        debito_ibs = [ibs_cbs.debito(b, p.obter("ibs")) for b in base]
        debito_cbs = [ibs_cbs.debito(b, p.obter("cbs")) for b in base]
        ctx.hipotese("Débito de IBS/CBS calculado pela alíquota sobre a receita informada (sem extração de tributo embutido no preço).")
    if p.valores["demais_tributos_receita"] is None:
        ctx.hipotese("Demais tributos sobre a receita não configurados: nenhum valor aplicado (ausência de configuração, não zero).")
    else:
        fora["Outros"] = [moeda(soma(s[m] for s in servicos.values()) * p.obter("demais_tributos_receita")) for m in range(MESES)]
    for tributo, serie in fora.items():
        if any(serie):
            ctx.nota(emp.id, "Tributos fora do DAS", f"{tributo} anual", "Σ base_tributável × alíquota_aplicável", soma(serie))
    return _Indiretos(apuracao, fora, debito_ibs, debito_cbs)


def _credito_transferivel(ctx, regime: Regime, ind: _Indiretos, op: _Operacao) -> tuple:
    """IBS/CBS destacados nos serviços faturados à CF, por mês."""
    if not any(op.receita_cf):
        return list(_ZEROS), list(_ZEROS)
    if regime in REGULARES:
        elegivel = ctx.cenario.config.credito_regular_por_atividade.get(op.atividade.value)
        if elegivel is not True:
            if elegivel is None:
                ctx.provisoria(f"Crédito de serviços de {op.atividade.value}: elegibilidade pendente, não liberado.")
            return list(_ZEROS), list(_ZEROS)
        return (
            [ibs_cbs.debito(r, ctx.p.obter("ibs")) for r in op.receita_cf],
            [ibs_cbs.debito(r, ctx.p.obter("cbs")) for r in op.receita_cf],
        )
    reconhecido = ctx.cenario.config.credito_fornecedor_das_reconhecido
    if reconhecido is None:
        ctx.provisoria("Crédito sobre serviços de fornecedor com IBS/CBS no DAS não configurado pela contabilidade: nenhum crédito reconhecido.")
    if not reconhecido:
        return list(_ZEROS), list(_ZEROS)
    ibs, cbs = [], []
    for m, mes in enumerate(ind.simples.meses):
        total = op.receita_cf[m] + op.receita_terceiros[m]
        fracao = op.receita_cf[m] / total if total else ZERO
        componentes = mes.por_atividade[op.atividade]
        fora = moeda(op.receita_cf[m] * ctx.p.obter("ibs")) if mes.impedido else ZERO
        ibs.append(moeda(componentes.get("IBS", ZERO) * fracao) + fora)
        cbs.append(moeda(componentes.get("CBS", ZERO) * fracao))
    return ibs, cbs


def _presuncoes(p: Parametros) -> dict:
    return {a: (p.obter(f"presuncao_irpj_{a.value}"), p.obter(f"presuncao_csll_{a.value}")) for a in Atividade}


def _tributos_base(ind: _Indiretos) -> dict:
    tributos = {}
    if ind.simples is not None:
        tributos["DAS"] = ind.simples.das_anual
    for nome in ("ISS", "ICMS", "Outros"):
        if any(ind.fora_do_das[nome]):
            tributos[nome] = soma(ind.fora_do_das[nome])
    return tributos


def _mensal_simples(ind: _Indiretos) -> list:
    if ind.simples is None:
        return []
    return [
        {
            "mes": m.mes,
            "receita": moeda(m.receita),
            "rbt12": None if m.rbt12 is None else moeda(m.rbt12),
            "faixa": m.faixa,
            "impedido_sublimite": m.impedido,
            "aliquota_efetiva": {anexo: str(round(a, 6)) for anexo, a in m.aliquotas.items()},
            "das": m.das,
        }
        for m in ind.simples.meses
    ]


def _irpj_csll(ctx, emp, regime, receitas_anuais: dict, antes: Decimal, adicao_entre_pjs: Decimal = ZERO, receita_bruta=None) -> dict:
    """IRPJ/CSLL fora do DAS. Presunção só no Lucro Presumido."""
    if regime in SIMPLES:
        return {}
    if regime is Regime.LUCRO_PRESUMIDO:
        r = lucro_presumido(receitas_anuais, _presuncoes(ctx.p), ctx.p, receita_bruta)
        ctx.nota(emp.id, "Lucro Presumido", "Fator LC 224/2025", "1 + 0,10 × max(0, R − 5.000.000) / R", str(r.fator_lc224), unidade="fator")
        ctx.nota(emp.id, "Lucro Presumido", "Base presumida do IRPJ", "Σ(receita × presunção_IRPJ) × fator", r.base_irpj)
        ctx.nota(emp.id, "Lucro Presumido", "Base presumida da CSLL", "Σ(receita × presunção_CSLL) × fator", r.base_csll)
        ctx.hipotese("Lucro Presumido: estimativa anual por CNPJ, não apuração fiscal por período; LC 224/2025 aplicada pela expressão anual.")
    else:
        cfg = ctx.config_pj(emp)
        ajuste = lambda adicoes, exclusoes: (adicoes or ZERO) - (exclusoes or ZERO) + adicao_entre_pjs
        r = lucro_real(antes + ajuste(cfg.adicoes_irpj, cfg.exclusoes_irpj), antes + ajuste(cfg.adicoes_csll, cfg.exclusoes_csll), ctx.p)
        ctx.nota(emp.id, "Lucro Real", "Base do IRPJ", "resultado_antes_IRPJ_CSLL + adições_IRPJ − exclusões_IRPJ", moeda(r.base_irpj))
        ctx.nota(emp.id, "Lucro Real", "Base da CSLL", "resultado_antes_IRPJ_CSLL + adições_CSLL − exclusões_CSLL", moeda(r.base_csll))
        ctx.hipotese("Lucro Real: estimativa anual por CNPJ, sem compensação de prejuízos fiscais.")
    ctx.nota(emp.id, NOMES_REGIME[regime], "IRPJ", "0,15 × base + 0,10 × max(0, base − 240.000)", r.irpj)
    ctx.nota(emp.id, NOMES_REGIME[regime], "CSLL", "0,09 × base", r.csll)
    return {"IRPJ": r.irpj, "CSLL": r.csll}


def _creditos_informados(ctx, emp) -> tuple:
    cfg = ctx.config_pj(emp)
    adicionais = {"IBS": cfg.credito_adicional_ibs_mensal or ZERO, "CBS": cfg.credito_adicional_cbs_mensal or ZERO}
    if ctx.cenario.config.metodo_credito == "categorias":
        totais = dict(adicionais)
        for a in emp.atividades:
            if a is Atividade.COMERCIO:
                continue  # substituição da base tratada no cálculo incremental
            valores = estimar(ctx, a)
            for nome in totais:
                totais[nome] += valores[nome]
        ctx.provisoria("Créditos por categorias: estimativa sujeita à conferência de composição, estoque e base de aquisição.")
        return [totais["IBS"]] * MESES, [totais["CBS"]] * MESES
    cfg = ctx.config_pj(emp)
    if cfg.credito_ibs_mensal is None and cfg.credito_cbs_mensal is None:
        ctx.hipotese("Créditos de IBS/CBS sobre aquisições de terceiros não informados pela contabilidade: nenhum crédito presumido sobre custos.")
    return [(cfg.credito_ibs_mensal or ZERO) + adicionais["IBS"]] * MESES, [(cfg.credito_cbs_mensal or ZERO) + adicionais["CBS"]] * MESES


def _novo_resultado(emp: Empresa, regime) -> ResultadoPJ:
    return ResultadoPJ(emp.id, emp.nome, emp.papel, list(emp.atividades), regime)


# --- PJs prestadoras (sem comércio) ---


def _prestadora(ctx, emp: Empresa, regime: Regime, ops: dict, indiretos: dict) -> ResultadoPJ:
    r = _novo_resultado(emp, regime)
    try:
        minhas = [_exigir_op(ops[a]) for a in emp.atividades]
        receitas = {o.atividade: [a + b for a, b in zip(o.receita_cf, o.receita_terceiros)] for o in minhas}
        ind = _indiretos(ctx, emp, regime, receitas, nova=True, historico=None)
        indiretos[emp.id] = ind
        tributos = _tributos_base(ind)
        if regime in REGULARES:
            creditos = dict(zip(("IBS", "CBS"), _creditos_informados(ctx, emp)))
            for nome, debitos in (("IBS", ind.debito_ibs), ("CBS", ind.debito_cbs)):
                r.creditos_potenciais[nome] = soma(creditos[nome])
                meses = ibs_cbs.apurar(debitos, creditos[nome])
                tributos[nome] = soma(m.a_recolher for m in meses)
                r.creditos_utilizados[nome] = soma(m.utilizado for m in meses)
                r.saldo_credor_final[nome] = meses[-1].saldo_final
                ctx.nota(emp.id, "IBS/CBS regular", f"{nome} a recolher", "Σ max(0, débito_mês − crédito_utilizado)", tributos[nome])
            if any(ind.debito_cbs):
                ctx.provisoria("CBS regular de 2027 é parâmetro provisório da referência.")
        elif any(ind.fora_do_das["IBS"]):
            creditos_ibs = _creditos_informados(ctx, emp)[0]
            creditos_ibs = [c if m.impedido else ZERO for c, m in zip(creditos_ibs, ind.simples.meses)]
            apuracao_ibs = ibs_cbs.apurar(ind.fora_do_das["IBS"], creditos_ibs)
            tributos["IBS"] = soma(m.a_recolher for m in apuracao_ibs)
            r.creditos_potenciais["IBS"] = soma(creditos_ibs)
            r.creditos_utilizados["IBS"] = soma(m.utilizado for m in apuracao_ibs)
            r.saldo_credor_final["IBS"] = apuracao_ibs[-1].saldo_final

        r.receita = moeda(soma(soma(s) for s in receitas.values()))
        r.receita_entre_pjs = moeda(soma(soma(o.receita_cf) for o in minhas))
        if ctx.cenario.config.preco_entre_pjs_com_tributo_acrescido and regime in REGULARES:
            r.receita += soma(ind.debito_ibs) + soma(ind.debito_cbs)
            r.receita_entre_pjs += soma(soma(ibs_cbs.debito(v, ctx.p.obter("ibs")) + ibs_cbs.debito(v, ctx.p.obter("cbs")) for v in o.receita_cf) for o in minhas)
            ctx.hipotese("Serviços regulares com tributos acrescidos: preços-base para CF e terceiros; receita econômica bruta inclui IBS/CBS, bases de ISS/IRPJ/CSLL conservam o preço-base.")
        r.custos = moeda(soma(o.custo_anual for o in minhas))
        r.despesas_entre_pjs = ZERO
        r.resultado_antes_irpj_csll = r.receita - r.custos - soma(tributos.values())
        tributos.update(_irpj_csll(ctx, emp, regime, {a: soma(s) for a, s in receitas.items()}, r.resultado_antes_irpj_csll))
        r.tributos = tributos
        r.total_tributos = soma(tributos.values())
        r.resultado = r.receita - r.custos - r.total_tributos
        r.apuracao_mensal = _mensal_simples(ind)
        ctx.nota(emp.id, "Resultado", "Resultado da PJ", "receitas − custos − tributos", r.resultado)
    except Indisponivel as erro:
        r.status, r.motivos = erro.status, erro.motivos
    return r


def _exigir_op(op):
    if isinstance(op, Indisponivel):
        raise Indisponivel(op.status, op.motivos)
    return op


# --- CF Principal: base preparada e ponte de reconciliação ---


def _base_da_cf(ctx, regime: Regime):
    base = next((b for b in ctx.cenario.config.bases_cf if b.regime is regime), None)
    if base is None:
        raise Indisponivel(
            Status.DADOS_INCOMPLETOS,
            [f"Base da CF não preparada pela contabilidade para o regime {NOMES_REGIME[regime]}."],
        )
    faltantes = []
    if not base.receita_comercio.informado:
        faltantes.append("Base da CF: receita do comércio")
    if base.resultado_antes_irpj_csll_anual is None:
        faltantes.append("Base da CF: resultado anual antes de IRPJ/CSLL")
    if regime in SIMPLES and base.das_embutido_anual is None:
        faltantes.append("Base da CF: DAS já embutido no resultado (informar zero se o resultado é antes do DAS)")
    if faltantes:
        raise Indisponivel(Status.DADOS_INCOMPLETOS, faltantes)
    return base


def _ibs_cbs_incremental(ctx, emp, base, novos_debitos: dict, novos_creditos: dict, r: ResultadoPJ, impostos=("IBS", "CBS"), meses_ativos=None) -> dict:
    """Na CF os créditos compensam também o débito do comércio já embutido na
    base; registra-se apenas o efeito incremental sobre o valor a recolher."""
    categorias = ctx.cenario.config.metodo_credito == "categorias"
    if not categorias and not any(any(s) for s in (*novos_debitos.values(), *novos_creditos.values())):
        return {}
    embutidos = {
        "IBS": (base.debito_ibs_mensal, base.credito_ibs_mensal),
        "CBS": (base.debito_cbs_mensal, base.credito_cbs_mensal),
    }
    embutidos = {n: embutidos[n] for n in impostos}
    meses_ativos = [True] * MESES if meses_ativos is None else meses_ativos
    if any(v is None for par in embutidos.values() for v in par):
        raise Indisponivel(
            Status.DADOS_INCOMPLETOS,
            ["Base da CF: débitos e créditos mensais de IBS/CBS do comércio embutidos na base (necessários para o efeito incremental)."],
        )
    efeitos = {}
    estimados = estimar(ctx, Atividade.COMERCIO) if categorias else {}
    for nome, (debito, credito) in embutidos.items():
        antes = ibs_cbs.apurar([debito if ativo else ZERO for ativo in meses_ativos], [credito if ativo else ZERO for ativo in meses_ativos])
        novo = estimados[nome] if categorias else credito
        depois = ibs_cbs.apurar([(debito + d) if ativo else ZERO for d, ativo in zip(novos_debitos[nome], meses_ativos)], [(novo + c) if ativo else ZERO for c, ativo in zip(novos_creditos[nome], meses_ativos)])
        efeitos[nome] = soma(m.a_recolher for m in depois) - soma(m.a_recolher for m in antes)
        r.creditos_utilizados[nome] = soma(m.utilizado for m in depois) - soma(m.utilizado for m in antes)
        r.creditos_utilizados_totais[nome] = soma(m.utilizado for m in depois)
        r.creditos_potenciais[nome] = soma((novo + c) if ativo else ZERO for c, ativo in zip(novos_creditos[nome], meses_ativos))
        r.saldo_credor_final[nome] = depois[-1].saldo_final
        ctx.nota(emp.id, "IBS/CBS regular", f"{nome}: efeito incremental a recolher", "a_recolher com serviços e créditos novos − a_recolher da base", efeitos[nome])
    if "CBS" in impostos:
        ctx.provisoria("CBS regular de 2027 é parâmetro provisório da referência.")
    ctx.hipotese("IBS/CBS da CF: débito do comércio distribuído pela média mensal da base; não equivale à escrituração mensal.")
    return efeitos


def _cf(ctx, emp: Empresa, regime: Regime, ops: dict, hospedeiras: dict, resultados: dict, indiretos: dict) -> ResultadoPJ:
    r = _novo_resultado(emp, regime)
    try:
        base = _base_da_cf(ctx, regime)
        if regime in SIMPLES:
            # A elegibilidade conhecida não depende de preencher a equipe de outra PJ.
            apurar_simples({Atividade.COMERCIO: base.receita_comercio.mensal()}, nova=False, regular=regime is Regime.SIMPLES_REGULAR, historico=base.historico_receita, p=ctx.p)
        internas = [_exigir_op(ops[a]) for a in emp.atividades if a is not Atividade.COMERCIO]
        externas = []
        for atividade in SERVICOS:
            if atividade in emp.atividades:
                continue
            fornecedora, _ = hospedeiras[atividade]
            if resultados[fornecedora.id].status not in COM_VALORES:
                raise Indisponivel(Status.DADOS_INCOMPLETOS, [f"Depende da apuração de {fornecedora.nome} ({fornecedora.id.upper()}), que está indisponível."])
            externas.append(ops[atividade])

        comercio = base.receita_comercio.mensal()
        receitas = {Atividade.COMERCIO: comercio, **{o.atividade: o.receita_terceiros for o in internas}}
        ind = _indiretos(ctx, emp, regime, receitas, nova=False, historico=base.historico_receita)
        if ind.simples is not None and any(m.impedido for m in ind.simples.meses):
            ctx.provisoria("CF impedida pelo sublimite: ICMS/IBS do comércio fora do DAS seguem a base preparada pela contabilidade, sem apuração mensal própria.")

        ponte = [("Resultado da base antes de IRPJ/CSLL", base.resultado_antes_irpj_csll_anual)]
        sinal = {
            TipoAjuste.CUSTO_ANTIGO_SUBSTITUIDO: 1,
            TipoAjuste.TRIBUTO_ANTIGO_SUBSTITUIDO: 1,
            TipoAjuste.RECEITA_DUPLICADA: -1,
            TipoAjuste.CREDITO_ANTIGO_PERDIDO: -1,
        }
        rotulo = {
            TipoAjuste.CUSTO_ANTIGO_SUBSTITUIDO: "Custo antigo substituído",
            TipoAjuste.TRIBUTO_ANTIGO_SUBSTITUIDO: "Tributo antigo substituído",
            TipoAjuste.RECEITA_DUPLICADA: "Receita duplicada",
            TipoAjuste.CREDITO_ANTIGO_PERDIDO: "Crédito antigo perdido",
        }
        for ajuste in base.ajustes_ponte:
            ponte.append((f"{rotulo[ajuste.tipo]}: {ajuste.descricao or ajuste.id}", sinal[ajuste.tipo] * ajuste.valor_anual))
        if regime in SIMPLES and base.das_embutido_anual:
            ponte.append(("Tributo antigo substituído: DAS embutido na base", base.das_embutido_anual))

        faltantes = []
        pessoal_cf = _custo_pessoal(ctx, Atividade.COMERCIO, regime, faltantes, obrigatorio=False)
        if pessoal_cf is not None and base.custo_pessoal_embutido_anual is None:
            faltantes.append("Base da CF: custo de pessoal embutido no resultado (para substituir uma única vez)")
        if faltantes:
            raise Indisponivel(Status.DADOS_INCOMPLETOS, faltantes)
        if pessoal_cf is not None:
            ponte.append(("Custo antigo substituído: pessoal da CF embutido na base", base.custo_pessoal_embutido_anual))
            ponte.append(("Custo novo: pessoal da CF", -pessoal_cf))

        for op in internas:
            nome = NOMES_ATIVIDADE[op.atividade]
            ponte.append((f"Receita nova: {nome} para terceiros", soma(op.receita_terceiros)))
            if ctx.cenario.config.preco_entre_pjs_com_tributo_acrescido and regime in REGULARES:
                acrescido = soma(ibs_cbs.debito(v, ctx.p.obter("ibs")) + ibs_cbs.debito(v, ctx.p.obter("cbs")) for v in op.receita_terceiros)
                ponte.append((f"IBS/CBS acrescidos aos serviços de {nome} para terceiros", acrescido))
            ponte.append((f"Custo novo: {nome} (atividade na própria CF)", -op.custo_anual))
        despesas_entre_pjs = ZERO
        creditos = {"IBS": list(_ZEROS), "CBS": list(_ZEROS)}
        for op in externas:
            fornecedora, regime_fornecedora = hospedeiras[op.atividade]
            aquisicao = soma(op.receita_cf)
            if ctx.cenario.config.preco_entre_pjs_com_tributo_acrescido and regime_fornecedora in REGULARES:
                acrescido = soma(ibs_cbs.debito(v, ctx.p.obter("ibs")) + ibs_cbs.debito(v, ctx.p.obter("cbs")) for v in op.receita_cf)
                aquisicao += acrescido
                ctx.nota(emp.id, "Serviços entre PJs", "IBS/CBS acrescidos ao preço-base", "preço-base × (IBS + CBS)", acrescido)
            despesas_entre_pjs += aquisicao
            ponte.append((f"Custo novo: {NOMES_ATIVIDADE[op.atividade]} adquirida de {fornecedora.id.upper()}", -aquisicao))
            if regime in REGULARES or (ctx.cenario.config.metodo_credito == "categorias" and ind.simples and any(m.impedido for m in ind.simples.meses)):
                ibs, cbs = _credito_transferivel(ctx, regime_fornecedora, indiretos[fornecedora.id], op)
                creditos["IBS"] = [a + b for a, b in zip(creditos["IBS"], ibs)]
                creditos["CBS"] = [a + b for a, b in zip(creditos["CBS"], cbs)]

        tributos = _tributos_base(ind)
        if regime in REGULARES:
            informados = _creditos_informados(ctx, emp)
            creditos["IBS"] = [a + b for a, b in zip(creditos["IBS"], informados[0])]
            creditos["CBS"] = [a + b for a, b in zip(creditos["CBS"], informados[1])]
            tributos.update(_ibs_cbs_incremental(ctx, emp, base, {"IBS": ind.debito_ibs, "CBS": ind.debito_cbs}, creditos, r))
        elif ctx.cenario.config.metodo_credito == "categorias" and ind.simples and any(m.impedido for m in ind.simples.meses):
            informados = _creditos_informados(ctx, emp)
            creditos["IBS"] = [a + b for a, b in zip(creditos["IBS"], informados[0])]
            tributos.update(_ibs_cbs_incremental(ctx, emp, base, {"IBS": ind.fora_do_das["IBS"]}, creditos, r, impostos=("IBS",), meses_ativos=[m.impedido for m in ind.simples.meses]))
        elif any(ind.fora_do_das["IBS"]):
            tributos["IBS"] = soma(ind.fora_do_das["IBS"])
        elif despesas_entre_pjs:
            ctx.hipotese("CF com IBS/CBS no DAS: sem crédito sobre os serviços adquiridos de outras PJs.")
        for nome, valor in tributos.items():
            ponte.append((f"Tributo novo: {nome}", -valor))

        antes = soma(valor for _, valor in ponte)
        adicao = ZERO
        if regime is Regime.LUCRO_REAL and despesas_entre_pjs and ctx.cenario.config.dedutibilidade_entre_pjs_confirmada is not True:
            adicao = despesas_entre_pjs
            ctx.hipotese("Lucro Real da CF: despesas com outras PJs adicionadas à base por dedutibilidade não confirmada (premissa conservadora).")
        receitas_anuais = {a: soma(s) for a, s in receitas.items()}
        receitas_tributaveis = dict(receitas_anuais)
        if base.receita_sujeita_presuncao.informado:
            receitas_tributaveis[Atividade.COMERCIO] = base.receita_sujeita_presuncao.anual()
        sobre_lucro = _irpj_csll(ctx, emp, regime, receitas_tributaveis, antes, adicao, soma(receitas_anuais.values()))
        tributos.update(sobre_lucro)

        if base.reconciliacao_confirmada is not True:
            ctx.provisoria("Reconciliação da base da CF ainda não confirmada pela contabilidade.")
        ctx.hipotese("Tributos indiretos do comércio já embutidos na base da CF não são calculados novamente.")
        for descricao, valor in ponte:
            ctx.nota(emp.id, "Ponte da CF", descricao, None, moeda(valor))
        ctx.nota(emp.id, "Ponte da CF", "Resultado ajustado antes de IRPJ/CSLL", "base + substituídos − duplicadas − créditos perdidos + receitas novas − custos/tributos novos", moeda(antes))

        r.ponte = [{"descricao": d, "valor": moeda(v)} for d, v in ponte]
        r.receita = moeda(soma(receitas_anuais.values()))
        if ctx.cenario.config.preco_entre_pjs_com_tributo_acrescido and regime in REGULARES:
            r.receita += soma(ind.debito_ibs) + soma(ind.debito_cbs)
        r.receita_entre_pjs = ZERO
        r.despesas_entre_pjs = moeda(despesas_entre_pjs)
        r.tributos = tributos
        r.total_tributos = soma(tributos.values())
        r.resultado_antes_irpj_csll = moeda(antes)
        r.resultado = r.resultado_antes_irpj_csll - soma(sobre_lucro.values())
        # A base traz o resultado, não o detalhamento: custos (com tributos embutidos) são derivados.
        r.custos = r.receita - r.total_tributos - r.resultado
        r.apuracao_mensal = _mensal_simples(ind)
        ctx.nota(emp.id, "Resultado", "Resultado da CF", "resultado ajustado − IRPJ − CSLL", r.resultado)
    except Indisponivel as erro:
        r.status, r.motivos = erro.status, erro.motivos
    return r


# --- Consolidação ---


def _consolidar(ctx, resultados: list) -> Consolidado:
    estados = [r.status for r in resultados]
    if any(e not in COM_VALORES for e in estados):
        return Consolidado(pior(estados), motivos=["Consolidado indisponível: há empresa sem resultado calculado."])
    c = Consolidado(pior(estados))
    c.receita_externa = soma(r.receita - r.receita_entre_pjs for r in resultados)
    c.custos_externos = soma(r.custos - r.despesas_entre_pjs for r in resultados)
    c.tributos = soma(r.total_tributos for r in resultados)
    c.resultado = soma(r.resultado for r in resultados)
    ctx.nota(None, "Consolidação", "Receita externa", "Σ receitas_PJs − receitas entre participantes", c.receita_externa)
    ctx.nota(None, "Consolidação", "Custos externos", "Σ custos_PJs − despesas entre participantes", c.custos_externos)
    ctx.nota(None, "Consolidação", "Resultado consolidado", "Σ resultados_PJs (eliminações não são deduzidas novamente)", c.resultado)
    ctx.hipotese("Consolidação econômica para simulação, sem afirmar existência ou ausência de grupo econômico.")
    c.referencia = ctx.cenario.config.resultado_referencia_anual
    if c.referencia is None:
        c.motivos.append("Diferença indisponível: resultado de referência comparável da CF não configurado.")
    else:
        c.diferenca = c.resultado - c.referencia
        ctx.nota(None, "Consolidação", "Diferença contra a referência", "resultado_consolidado − resultado_referência_comparável", c.diferenca)
    return c


# --- Simulação ---


def simular(cenario: Cenario, parametros: Parametros | None = None) -> Resultado:
    cfg = cenario.config
    p = (parametros or carregar(2027)).com_valores(
        iss_transporte_municipal=cfg.iss_transporte_municipal, icms_transporte=cfg.icms_transporte, demais_tributos_receita=cfg.demais_tributos_receita
    )
    ctx = _Contexto(cenario, p)
    for validacao in cfg.validacoes_pendentes:
        ctx.provisoria(validacao)
    log.info(
        "Simulação: estrutura=%s regimes=%s",
        cenario.estrutura and cenario.estrutura.value,
        {pj: r and r.value for pj, r in cenario.regimes.items()},
    )

    if cenario.estrutura is None:
        pendencia = Pendencia("Escolha a estrutura (A, B, C ou D).")
        return Resultado(Status.AGUARDANDO_SELECAO, None, [], Consolidado(Status.AGUARDANDO_SELECAO), [pendencia], parametros=p.descrever())
    ativas = empresas(cenario.estrutura)
    sem_regime = [e for e in ativas if cenario.regimes.get(e.id) is None]
    if sem_regime:
        pendencias = [Pendencia(f"Escolha o regime de {e.nome} ({e.id.upper()}).", e.id) for e in sem_regime]
        vazias = [ResultadoPJ(e.id, e.nome, e.papel, list(e.atividades), cenario.regimes.get(e.id), Status.AGUARDANDO_SELECAO) for e in ativas]
        return Resultado(Status.AGUARDANDO_SELECAO, cenario.estrutura, vazias, Consolidado(Status.AGUARDANDO_SELECAO), pendencias, parametros=p.descrever())

    regimes = {e.id: cenario.regimes[e.id] for e in ativas}
    hospedeiras = {a: (e, regimes[e.id]) for e in ativas for a in e.atividades}
    for e in ativas:
        ctx.nota(e.id, "Estrutura", f"{e.nome} — {NOMES_REGIME[regimes[e.id]]}")

    ops = {}
    for atividade in SERVICOS:
        hospedeira, regime = hospedeiras[atividade]
        try:
            ops[atividade] = _operacao(ctx, atividade, hospedeira, regime)
        except Indisponivel as erro:
            ops[atividade] = erro
            log.info("Atividade %s indisponível (%s): %s", atividade.value, erro.status.value, erro.motivos)

    resultados, indiretos = {}, {}
    for e in ativas:
        if not e.e_cf:
            resultados[e.id] = _prestadora(ctx, e, regimes[e.id], ops, indiretos)
    cf = ativas[0]
    resultados[cf.id] = _cf(ctx, cf, regimes[cf.id], ops, hospedeiras, resultados, indiretos)

    lista = [resultados[e.id] for e in ativas]
    for r in lista:
        r.pessoal = [v for a, v in ctx.pessoal_calculado.items() if a in next(e.atividades for e in ativas if e.id == r.id)]
        r.pessoal_totais = {k: soma(p.get(k) or ZERO for p in r.pessoal) for k in ("quantidade", "folha_anual", "encargos_sem_cpp_anual", "cpp_anual", "custo_anual")}
        if r.status in COM_VALORES and ctx.provisorio:
            r.status = Status.SIMULACAO_PROVISORIA
        ctx.pendencias += [Pendencia(m, r.id) for m in r.motivos]
        log.info(
            "%s (%s, %s): status=%s receita=%s custos=%s tributos=%s resultado=%s motivos=%s",
            r.id, r.papel, regimes[r.id].value, r.status.value, r.receita, r.custos, r.tributos, r.resultado, r.motivos,
        )
    consolidado = _consolidar(ctx, lista)
    log.info("Consolidado: status=%s resultado=%s provisório=%s", consolidado.status.value, consolidado.resultado, ctx.provisorio)
    ctx.pendencias += [Pendencia(m, None, bloqueante=consolidado.resultado is None) for m in consolidado.motivos]
    ctx.pendencias += [Pendencia(m, None, bloqueante=False) for m in ctx.provisorio]
    ctx.hipotese("Elegibilidade verificada apenas quanto a limites de receita do Simples; demais requisitos legais não são avaliados.")
    return Resultado(
        consolidado.status,
        cenario.estrutura,
        lista,
        consolidado,
        ctx.pendencias,
        ctx.hipoteses,
        ctx.provisorio,
        ctx.memoria,
        p.descrever(),
    )
