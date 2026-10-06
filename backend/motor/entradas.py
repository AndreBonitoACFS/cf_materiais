"""Entradas do motor. None significa campo vazio (não informado); zero é dado
informado. Valores recorrentes são médias mensais ou calendário de 12 meses."""
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum

from .decimais import MESES, soma
from .estrutura import Atividade, Estrutura, Regime


@dataclass(frozen=True)
class Recorrente:
    media_mensal: Decimal | None = None
    meses: tuple | None = None

    @property
    def informado(self) -> bool:
        return self.meses is not None or self.media_mensal is not None

    @property
    def uniforme(self) -> bool:
        return self.meses is None

    def mensal(self) -> list:
        return list(self.meses) if self.meses is not None else [self.media_mensal] * MESES

    def anual(self) -> Decimal:
        return soma(self.mensal())


@dataclass
class Galpao:
    receita_cf: Recorrente = Recorrente()
    receita_terceiros: Recorrente = Recorrente()
    custos_operacionais: Recorrente = Recorrente()  # sem pessoal


@dataclass
class Logistica:
    receita_cf: Recorrente = Recorrente()
    receita_terceiros: Recorrente = Recorrente()
    combustivel: Recorrente = Recorrente()
    manutencao: Recorrente = Recorrente()  # manutenção e demais despesas da frota
    outros_custos: Recorrente = Recorrente()
    depreciacao_anual: Decimal | None = None
    # Informativos: patrimônio/capacidade, não geram custo.
    quantidade_veiculos: int | None = None
    valor_frota: Decimal | None = None


class FormaPessoal(str, Enum):
    DIRETA = "direta"
    TERCEIRIZACAO = "terceirizacao"


@dataclass
class Pessoal:
    forma: FormaPessoal | None = None
    remuneracao_mensal: Decimal | None = None
    # Encargos aplicáveis conforme o regime da PJ contratante. No Simples
    # (Anexos I/III) a CPP está no DAS e não entra nos encargos.
    encargos_no_simples: Decimal | None = None
    encargos_fora_do_simples: Decimal | None = None
    preco_mensal: Decimal | None = None  # terceirização
    equipe_por_quantidade: bool = True  # clientes antigos devem optar explicitamente pela folha total
    quantidade_funcionarios: Decimal | None = None
    remuneracao_media_mensal: Decimal | None = None
    custo_total_mensal: Decimal | None = None
    encargos_componentes: dict = field(default_factory=dict)


class TipoAjuste(str, Enum):
    CUSTO_ANTIGO_SUBSTITUIDO = "custo_antigo_substituido"
    TRIBUTO_ANTIGO_SUBSTITUIDO = "tributo_antigo_substituido"
    RECEITA_DUPLICADA = "receita_duplicada"
    CREDITO_ANTIGO_PERDIDO = "credito_antigo_perdido"


@dataclass
class AjustePonte:
    id: str
    tipo: TipoAjuste
    descricao: str
    valor_anual: Decimal


@dataclass
class BaseCF:
    """Base da CF preparada pela contabilidade para um regime da CF."""

    regime: Regime
    receita_comercio: Recorrente = Recorrente()
    # Resultado projetado de 2027 antes de IRPJ/CSLL, com despesas e tributos
    # indiretos do comércio já embutidos.
    resultado_antes_irpj_csll_anual: Decimal | None = None
    # Simples: DAS já deduzido no resultado acima (zero se o resultado é antes do DAS).
    das_embutido_anual: Decimal | None = None
    # Receita bruta mensal de dez./2025 a dez./2026 (13 valores), para o RBT12.
    historico_receita: tuple | None = None
    # Débitos e créditos de IBS/CBS do comércio já embutidos (média mensal).
    debito_ibs_mensal: Decimal | None = None
    credito_ibs_mensal: Decimal | None = None
    debito_cbs_mensal: Decimal | None = None
    credito_cbs_mensal: Decimal | None = None
    custo_pessoal_embutido_anual: Decimal | None = None
    ajustes_ponte: list = field(default_factory=list)
    reconciliacao_confirmada: bool | None = None
    receita_sujeita_presuncao: Recorrente = Recorrente()


@dataclass
class ConfigPJ:
    """Configuração contábil de uma empresa, vinculada ao seu papel."""

    adicoes_irpj: Decimal | None = None
    exclusoes_irpj: Decimal | None = None
    adicoes_csll: Decimal | None = None
    exclusoes_csll: Decimal | None = None
    credito_ibs_mensal: Decimal | None = None
    credito_cbs_mensal: Decimal | None = None
    credito_adicional_ibs_mensal: Decimal | None = None
    credito_adicional_cbs_mensal: Decimal | None = None


class Transporte(str, Enum):
    MUNICIPAL = "municipal"
    INTERMUNICIPAL = "intermunicipal_interestadual"


@dataclass
class ConfigContabil:
    integrada: dict = field(default_factory=dict)
    pat_por_papel: dict = field(default_factory=dict)
    bases_cf: list = field(default_factory=list)
    resultado_referencia_anual: Decimal | None = None
    transporte_enquadramento: Transporte | None = None
    iss_transporte_municipal: Decimal | None = None
    icms_transporte: Decimal | None = None
    dedutibilidade_entre_pjs_confirmada: bool | None = None
    credito_fornecedor_das_reconhecido: bool | None = None
    por_papel: dict = field(default_factory=dict)  # papel -> ConfigPJ
    metodo_credito: str = "manter_projecao"
    categorias: dict = field(default_factory=dict)
    credito_regular_por_atividade: dict = field(default_factory=dict)
    preco_entre_pjs_com_tributo_acrescido: bool = False
    demais_tributos_receita: Decimal | None = None
    validacoes_pendentes: list = field(default_factory=list)


@dataclass
class Cenario:
    estrutura: Estrutura | None = None
    regimes: dict = field(default_factory=dict)  # id da PJ -> Regime | None
    galpoes: list = field(default_factory=lambda: [Galpao(), Galpao(), Galpao()])
    logistica: Logistica = field(default_factory=Logistica)
    pessoal: dict = field(default_factory=dict)  # Atividade -> Pessoal
    config: ConfigContabil = field(default_factory=ConfigContabil)


# --- Construção a partir de dicionários (API, arquivos, testes) ---


def _dec(v):
    return None if v is None or v == "" else Decimal(str(v))


def _enum(tipo, v):
    return None if v is None or v == "" else tipo(v)


def _rec(v) -> Recorrente:
    if v is None or v == "":
        return Recorrente()
    if not isinstance(v, dict):
        return Recorrente(media_mensal=_dec(v))
    meses = v.get("meses")
    if meses is not None:
        if len(meses) != MESES or any(m is None or m == "" for m in meses):
            raise ValueError("O calendário mensal exige 12 valores informados.")
        return Recorrente(meses=tuple(_dec(m) for m in meses))
    return Recorrente(media_mensal=_dec(v.get("media_mensal")))


def _campos(tipo, d, conversores):
    d = d or {}
    return tipo(**{nome: conv(d.get(nome)) for nome, conv in conversores.items()})


def _galpao(d) -> Galpao:
    return _campos(Galpao, d, {"receita_cf": _rec, "receita_terceiros": _rec, "custos_operacionais": _rec})


def _logistica(d) -> Logistica:
    return _campos(
        Logistica,
        d,
        {
            "receita_cf": _rec,
            "receita_terceiros": _rec,
            "combustivel": _rec,
            "manutencao": _rec,
            "outros_custos": _rec,
            "depreciacao_anual": _dec,
            "quantidade_veiculos": lambda v: None if v is None or v == "" else int(v),
            "valor_frota": _dec,
        },
    )


def _pessoal(d) -> Pessoal:
    d = {"equipe_por_quantidade": True, **(d or {})}
    return _campos(
        Pessoal,
        d,
        {
            "forma": lambda v: _enum(FormaPessoal, v),
            "remuneracao_mensal": _dec,
            "encargos_no_simples": _dec,
            "encargos_fora_do_simples": _dec,
            "preco_mensal": _dec,
            "equipe_por_quantidade": bool,
            "quantidade_funcionarios": _dec,
            "remuneracao_media_mensal": _dec,
            "custo_total_mensal": _dec,
            "encargos_componentes": lambda v: {k: _dec(x) for k, x in (v or {}).items()},
        },
    )


def _base_cf(d) -> BaseCF:
    historico = d.get("historico_receita")
    if historico is not None:
        if len(historico) != 13 or any(h is None or h == "" for h in historico):
            raise ValueError("O histórico de receita exige 13 valores (dez./2025 a dez./2026).")
        historico = tuple(_dec(h) for h in historico)
    ajustes = [
        AjustePonte(str(a["id"]), TipoAjuste(a["tipo"]), a.get("descricao") or "", _dec(a["valor_anual"]))
        for a in d.get("ajustes_ponte") or []
    ]
    ids = [a.id for a in ajustes]
    if len(ids) != len(set(ids)):
        raise ValueError("Cada ajuste da ponte da CF deve ter identificador único (reconhecido uma única vez).")
    if any(a.valor_anual is None for a in ajustes):
        raise ValueError("Ajuste da ponte da CF sem valor informado.")
    return BaseCF(
        regime=Regime(d["regime"]),
        receita_comercio=_rec(d.get("receita_comercio")),
        resultado_antes_irpj_csll_anual=_dec(d.get("resultado_antes_irpj_csll_anual")),
        das_embutido_anual=_dec(d.get("das_embutido_anual")),
        historico_receita=historico,
        debito_ibs_mensal=_dec(d.get("debito_ibs_mensal")),
        credito_ibs_mensal=_dec(d.get("credito_ibs_mensal")),
        debito_cbs_mensal=_dec(d.get("debito_cbs_mensal")),
        credito_cbs_mensal=_dec(d.get("credito_cbs_mensal")),
        custo_pessoal_embutido_anual=_dec(d.get("custo_pessoal_embutido_anual")),
        ajustes_ponte=ajustes,
        reconciliacao_confirmada=d.get("reconciliacao_confirmada"),
        receita_sujeita_presuncao=_rec(d.get("receita_sujeita_presuncao")),
    )


def _config(d) -> ConfigContabil:
    d = d or {}
    campos_pj = ("adicoes_irpj", "exclusoes_irpj", "adicoes_csll", "exclusoes_csll", "credito_ibs_mensal", "credito_cbs_mensal", "credito_adicional_ibs_mensal", "credito_adicional_cbs_mensal")
    return ConfigContabil(
        integrada=d.get("integrada") or {},
        pat_por_papel=d.get("pat_por_papel") or {},
        demais_tributos_receita=_dec(d.get("demais_tributos_receita")),
        validacoes_pendentes=d.get("validacoes_pendentes") or [],
        metodo_credito=d.get("metodo_credito", "manter_projecao"),
        categorias=d.get("categorias") or {},
        credito_regular_por_atividade=d.get("credito_regular_por_atividade") or {},
        preco_entre_pjs_com_tributo_acrescido=d.get("preco_entre_pjs_com_tributo_acrescido", False),
        bases_cf=[_base_cf(b) for b in d.get("bases_cf") or []],
        resultado_referencia_anual=_dec(d.get("resultado_referencia_anual")),
        transporte_enquadramento=_enum(Transporte, d.get("transporte_enquadramento")),
        iss_transporte_municipal=_dec(d.get("iss_transporte_municipal")),
        icms_transporte=_dec(d.get("icms_transporte")),
        dedutibilidade_entre_pjs_confirmada=d.get("dedutibilidade_entre_pjs_confirmada"),
        credito_fornecedor_das_reconhecido=d.get("credito_fornecedor_das_reconhecido"),
        por_papel={
            papel: _campos(ConfigPJ, c, {n: _dec for n in campos_pj}) for papel, c in (d.get("por_papel") or {}).items()
        },
    )


def cenario_de_dict(d: dict) -> Cenario:
    galpoes = [_galpao(g) for g in d.get("galpoes") or []]
    if len(galpoes) > 3:
        raise ValueError("São três galpões, unidades de uma única PJ.")
    galpoes += [Galpao() for _ in range(3 - len(galpoes))]
    return Cenario(
        estrutura=_enum(Estrutura, d.get("estrutura")),
        regimes={id: _enum(Regime, r) for id, r in (d.get("regimes") or {}).items()},
        galpoes=galpoes,
        logistica=_logistica(d.get("logistica")),
        pessoal={Atividade(a): _pessoal(p) for a, p in (d.get("pessoal") or {}).items() if p is not None},
        config=_config(d.get("config")),
    )
