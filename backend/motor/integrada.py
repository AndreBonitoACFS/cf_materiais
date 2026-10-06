"""Controle integrado trimestral. DRE histórica inclui todos os custos uma vez.

Versão 07/2027; PAT: LC 224/2025 art. 4 e regra conservadora do documento 07.
Valores ausentes nunca são tratados como zero.
"""
from decimal import Decimal, InvalidOperation
from .decimais import moeda, ZERO, soma
from .estrutura import Regime, empresas
from .estados import Status
from .resultado import Resultado, ResultadoPJ, Consolidado, Pendencia, LinhaMemoria

PAT_CONFIG = {2027: {"fator": Decimal("0.90"), "fonte": "LC 224/2025 art. 4; documento 07, seção 7.2"}}


def valor(v):
    if v is None or v == "":
        return None
    try:
        d = Decimal(str(v))
    except InvalidOperation as e:
        raise ValueError("Valor decimal inválido no controle integrado") from e
    if not d.is_finite():
        raise ValueError("Valor não finito no controle integrado")
    return d


def trimestre(regime, q, pat=False, elegibilidade="pendente", hipotese=False, evidencia=""):
    """Valores fiscais por trimestre completo; nenhuma compensação entre períodos."""
    def exigir(k):
        d = valor(q.get(k))
        if d is None:
            raise ValueError(f"Campo trimestral pendente: {k}")
        if k != "resultado" and d < ZERO:
            raise ValueError(f"Campo não pode ser negativo: {k}")
        return d
    if regime == Regime.LUCRO_REAL:
        resultado = exigir("resultado")
        bi = resultado + exigir("adicoes_irpj") - exigir("exclusoes_irpj")
        bc = resultado + exigir("adicoes_csll") - exigir("exclusoes_csll")
    else:
        receitas = [exigir(k) for k in ("presuncao", "servicos", "aluguel")]
        total = soma(receitas)
        excesso = max(total - Decimal("1250000"), ZERO)
        fator = 1 + Decimal("0.10") * excesso / total if total else Decimal(1)
        bi = soma(r * a for r, a in zip(receitas, map(Decimal, ("0.08", "0.32", "0.32")))) * fator + exigir("acrescimos_irpj")
        bc = soma(r * a for r, a in zip(receitas, map(Decimal, ("0.12", "0.32", "0.32")))) * fator + exigir("acrescimos_csll")
    basico = moeda(max(bi, ZERO) * Decimal("0.15"))
    adicional = moeda(max(bi - Decimal("60000"), ZERO) * Decimal("0.10"))
    csll = moeda(max(bc, ZERO) * Decimal("0.09"))
    beneficio = ZERO
    if pat and regime == Regime.LUCRO_REAL:
        d = valor(q.get("pat_elegivel"))
        if d is not None and d < ZERO:
            raise ValueError("Despesa PAT não pode ser negativa")
        if elegibilidade == "nao_elegivel" or d == ZERO:
            beneficio = ZERO
        elif d is None or not ((elegibilidade == "confirmada" and evidencia.strip()) or hipotese):
            beneficio = None
        else:
            beneficio = moeda(min(d * Decimal("0.15"), basico * Decimal("0.04")) * PAT_CONFIG[2027]["fator"])
    return {"Base IRPJ": moeda(bi), "Base CSLL": moeda(bc), "IRPJ básico": basico,
            "Adicional IRPJ": adicional, "PAT utilizado": beneficio,
            "IRPJ líquido": None if beneficio is None else basico + adicional - beneficio, "CSLL": csll}


def simular_integrada(cenario, p):
    cfg = cenario.config.integrada
    regime = cenario.regimes["pj1"]
    emp = empresas(cenario.estrutura)[0]
    r = ResultadoPJ(emp.id, "CF Materiais — 63.715.056/0001-42", emp.papel, list(emp.atividades), regime, Status.SIMULACAO_PROVISORIA)
    pend = [Pendencia(v, bloqueante=False) for v in cenario.config.validacoes_pendentes]
    memoria = []
    hip = ["Estimativa com base histórica: operação, pessoal, frota e aluguel externo já incluídos na DRE; sem faturamento interno ou dedução duplicada.",
           "Compensação de prejuízos não considerada. Sem outros incentivos concorrentes ou saldos anteriores de PAT. Não há transporte automático de excedentes.",
           "LP: limite por CNPJ, excesso proporcional entre atividades; sem ajustes de limite entre períodos nesta estimativa.",
           "Tributos indiretos exigem projeção fiscal complementar; CMV, folha e depreciação não geram créditos automáticos."]
    qs = cfg.get("trimestres") or []
    if cfg.get("pat") and cfg.get("hipotese_pat"):
        pend.append(Pendencia("Estimativa PAT — elegibilidade pendente; hipótese autorizada, sem confirmação documental.", bloqueante=False))
    calculos = []
    if regime not in (Regime.LUCRO_REAL, Regime.LUCRO_PRESUMIDO):
        r.status = Status.HIPOTESE_NAO_MODELADA
        r.motivos = ["Controle integrado disponível para LP e LR. PAT no Simples: Não se aplica."]
    elif len(qs) != 4:
        r.status = Status.DADOS_INCOMPLETOS
        r.motivos = ["Informe os quatro trimestres do controle integrado."]
    else:
        try:
            for i, q in enumerate(qs, 1):
                calculo = trimestre(regime, q, cfg.get("pat", False), cfg.get("elegibilidade", "pendente"), cfg.get("hipotese_pat", False), cfg.get("evidencia", ""))
                calculos.append(calculo)
                formulas = {
                    "Base IRPJ": f"{q.get('resultado')} + {q.get('adicoes_irpj')} − {q.get('exclusoes_irpj')}; compensação não considerada" if regime == Regime.LUCRO_REAL else f"8% × {q.get('presuncao')} + 32% × ({q.get('servicos')} + {q.get('aluguel')}); majoração proporcional: 1 + 10% × max(receitas − 1.250.000, 0)/receitas; + {q.get('acrescimos_irpj')}",
                    "Base CSLL": f"{q.get('resultado')} + {q.get('adicoes_csll')} − {q.get('exclusoes_csll')}; compensação não considerada" if regime == Regime.LUCRO_REAL else f"12% × {q.get('presuncao')} + 32% × ({q.get('servicos')} + {q.get('aluguel')}); mesma majoração proporcional; + {q.get('acrescimos_csll')}",
                    "IRPJ básico": "15% × max(Base IRPJ, 0)",
                    "Adicional IRPJ": "10% × max(Base IRPJ − 60.000, 0)",
                    "PAT utilizado": f"90% × min(15% × {q.get('pat_elegivel')}, 4% × IRPJ básico); elegibilidade {cfg.get('elegibilidade', 'pendente')}" if cfg.get("pat") and regime == Regime.LUCRO_REAL else "Não se aplica no LP / simulação sem incentivo no LR",
                    "IRPJ líquido": "IRPJ básico + adicional − PAT utilizado",
                    "CSLL": "9% × max(Base CSLL, 0); inalterada pelo PAT",
                }
                for k, v in calculo.items():
                    memoria.append(LinhaMemoria("pj1", f"{i}º trimestre", k, formulas[k], v, "moeda"))
            r.tributos = {k: None if any(c[k] is None for c in calculos) else soma(c[k] for c in calculos) for k in calculos[0] if not k.startswith("Base")}
            r.tributos.update({"IBS": None, "CBS": None, "Demais tributos": None, "Total devido": None, "Caixa efetivo": None})
            r.receita = None if any(valor(q.get("receita")) is None for q in qs) else soma(valor(q["receita"]) for q in qs)
            r.receita_entre_pjs = r.despesas_entre_pjs = ZERO
            r.resultado_antes_irpj_csll = None if any(valor(q.get("resultado")) is None for q in qs) else soma(valor(q["resultado"]) for q in qs)
            if r.tributos["IRPJ líquido"] is not None and r.resultado_antes_irpj_csll is not None:
                r.resultado = moeda(r.resultado_antes_irpj_csll - r.tributos["IRPJ líquido"] - r.tributos["CSLL"])
            if r.tributos["PAT utilizado"] is None:
                pend.append(Pendencia("Estimativa PAT — elegibilidade/despesa pendente; cenário sem PAT permanece calculável.", bloqueante=False))
        except ValueError as erro:
            r.status = Status.DADOS_INCOMPLETOS
            r.motivos = [str(erro)]
    pend += [Pendencia(m, "pj1") for m in r.motivos]
    pend.append(Pendencia("IBS/CBS, demais tributos e caixa efetivo: n/d — integração fiscal e documentos pendentes.", bloqueante=False))
    for chave, origem in (cfg.get("origens") or {}).items():
        memoria.append(LinhaMemoria("pj1", "Origem / Histórico 2025", chave, str(origem), None))
    memoria.append(LinhaMemoria("pj1", "PAT 2027", "Parâmetro versionado", str(PAT_CONFIG[2027]), "0.90", "fator"))
    c = Consolidado(r.status, receita_externa=r.receita, resultado=r.resultado)
    return Resultado(r.status, cenario.estrutura, [r], c, pend, hip, memoria=memoria, parametros={**p.descrever(), "versao": "07-integrada-2027"})
