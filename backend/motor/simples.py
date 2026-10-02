"""Simples Nacional — apuração mensal por CNPJ, conforme a metodologia da
referência de 2027 (documento 02, seção 7). Regras a conferir por vigência
antes de homologar."""
from dataclasses import dataclass, field
from decimal import Decimal

from .decimais import MESES, ZERO, moeda, soma
from .estados import Indisponivel, Status
from .estrutura import Atividade
from .parametros import Faixa, Parametros

ANEXO = {Atividade.COMERCIO: "I", Atividade.ARMAZENAGEM: "III", Atividade.LOGISTICA: "III"}
# Tributos retirados do DAS quando há impedimento pelo sublimite (a CBS permanece).
FORA_PELO_SUBLIMITE = ("ICMS", "ISS", "IBS")


@dataclass
class MesSimples:
    mes: int
    receita: Decimal
    rbt12: Decimal | None  # None: regra de início de atividade (primeira faixa)
    faixa: int
    impedido: bool
    aliquotas: dict = field(default_factory=dict)  # anexo -> alíquota efetiva
    por_atividade: dict = field(default_factory=dict)  # atividade -> {tributo: valor no DAS}

    @property
    def das(self) -> Decimal:
        return soma(v for comp in self.por_atividade.values() for v in comp.values())


@dataclass
class ApuracaoSimples:
    meses: list
    notas: list
    aproximacoes: list  # tornam a simulação provisória

    @property
    def das_anual(self) -> Decimal:
        return soma(m.das for m in self.meses)


def faixa_para(faixas: tuple, rbt12: Decimal | None) -> Faixa:
    if rbt12 is None or rbt12 <= 0:
        return faixas[0]
    for faixa in faixas:
        if rbt12 <= faixa.superior:
            return faixa
    return faixas[-1]  # sexta faixa estendida (aproximação da referência)


def aliquota_efetiva(faixa: Faixa, rbt12: Decimal | None) -> Decimal:
    if rbt12 is None or rbt12 <= 0:
        return faixa.nominal
    return (rbt12 * faixa.nominal - faixa.deducao) / rbt12


def rbt12_mensal(receita_total: list, nova: bool, historico: tuple | None) -> list:
    """RBT12 com defasagem: 12 meses antecedentes ao mês anterior ao período de
    apuração. Empresa nova (início em jan./2027): meses 1 e 2 na primeira faixa;
    depois, média dos meses até o penúltimo anterior, anualizada."""
    if nova:
        serie = []
        for m in range(MESES):
            anteriores = receita_total[: m - 1] if m >= 2 else []
            serie.append(soma(anteriores) / len(anteriores) * 12 if anteriores else None)
        return serie
    linha = list(historico) + list(receita_total)  # dez./2025 … dez./2027
    return [soma(linha[m : m + 12]) for m in range(MESES)]


def _impedimentos(receita_total: list, nova: bool, historico: tuple | None, p: Parametros, notas: list) -> list:
    sublimite, limite = p.obter("simples_sublimite"), p.obter("simples_limite")
    tolerancia = 1 + p.obter("simples_tolerancia_excesso")
    total = soma(receita_total)
    if nova:
        if total > limite * tolerancia:
            raise Indisponivel(
                Status.HIPOTESE_NAO_MODELADA,
                ["Receita de 2027 supera em mais de 20% o limite do Simples: exclusão retroativa ao início da atividade não modelada."],
            )
        if total > limite:
            notas.append("Receita de 2027 supera o limite do Simples em até 20%: exclusão com efeitos no ano seguinte, fora do período simulado.")
        impedido = total > sublimite * tolerancia
        if impedido:
            notas.append("Empresa nova com receita superior a 120% do sublimite: IBS, ICMS e ISS fora do DAS desde o início da atividade.")
        elif total > sublimite:
            notas.append("Receita de 2027 supera o sublimite em até 20%: efeitos no ano seguinte, fora do período simulado.")
        return [impedido] * MESES

    anterior = soma(historico[1:13])  # jan. a dez./2026
    if anterior > limite:
        raise Indisponivel(
            Status.INELEGIVEL,
            [f"Receita bruta de 2026 (R$ {moeda(anterior)}) acima do limite do Simples Nacional (R$ {moeda(limite)})."],
        )
    impedido = anterior > sublimite
    if impedido:
        notas.append("Receita de 2026 acima do sublimite: IBS, ICMS e ISS fora do DAS durante 2027.")
    situacao, acumulado = [], ZERO
    for m, receita in enumerate(receita_total):
        situacao.append(impedido)
        acumulado += receita
        if acumulado > limite * tolerancia:
            raise Indisponivel(
                Status.HIPOTESE_NAO_MODELADA,
                [f"Receita acumulada supera em mais de 20% o limite do Simples no mês {m + 1}: mudança de regime durante 2027 não modelada."],
            )
        if not impedido and acumulado > sublimite * tolerancia:
            impedido = True
            notas.append(f"Receita acumulada supera 120% do sublimite no mês {m + 1}: IBS, ICMS e ISS fora do DAS a partir do mês seguinte.")
    if acumulado > limite:
        notas.append("Receita de 2027 supera o limite do Simples em até 20%: exclusão com efeitos no ano seguinte, fora do período simulado.")
    elif acumulado > sublimite and not impedido:
        notas.append("Receita de 2027 supera o sublimite em até 20%: efeitos no ano seguinte, fora do período simulado.")
    return situacao


def _aliquotas_por_tributo(anexo: str, rbt12, p: Parametros, aproximacoes: list) -> tuple:
    faixas = p.anexos[anexo]
    faixa = faixa_para(faixas, rbt12)
    efetiva = aliquota_efetiva(faixa, rbt12)
    partes = {t: efetiva * parcela for t, parcela in faixa.partilha.items()}
    teto_iss = p.obter("simples_iss_maximo")
    if faixa is faixas[-1]:
        # Acima da quinta faixa, sem impedimento: parcela estadual/municipal/IBS
        # calculada pela quinta faixa no sublimite.
        quinta, sublimite = faixas[-2], p.obter("simples_sublimite")
        efetiva_quinta = aliquota_efetiva(quinta, sublimite)
        for tributo in FORA_PELO_SUBLIMITE:
            if tributo in quinta.partilha:
                partes[tributo] = efetiva_quinta * quinta.partilha[tributo]
        if "ISS" in partes:
            partes["ISS"] = min(partes["ISS"], teto_iss)
        aproximacoes.append(
            "Simples acima da quinta faixa: parcela de ICMS/ISS/IBS pela quinta faixa e sexta faixa estendida "
            "foram reconstruídas a partir da descrição da referência; conferir com a apuração mensal (T10)."
        )
    elif partes.get("ISS", ZERO) > teto_iss:
        # Teto do ISS: a diferença é redistribuída pelos percentuais residuais.
        restante = efetiva - teto_iss
        partes = {t: restante * parcela for t, parcela in p.residual_iii.items()}
        partes["ISS"] = teto_iss
    return faixa, efetiva, partes


def apurar_simples(receitas: dict, *, nova: bool, regular: bool, historico: tuple | None, p: Parametros) -> ApuracaoSimples:
    """receitas: atividade -> 12 receitas mensais tributáveis do CNPJ. A faixa usa
    a receita total do CNPJ; os componentes são segregados por atividade."""
    notas, aproximacoes = [], []
    receita_total = [soma(r[m] for r in receitas.values()) for m in range(MESES)]
    if not nova and historico is None:
        media = soma(receita_total) / MESES
        historico = (media,) * 13
        aproximacoes.append("RBT12 sem histórico informado: aproximado pela receita anual de 2027 distribuída uniformemente.")
    impedimentos = _impedimentos(receita_total, nova, historico, p, notas)
    rbt12s = rbt12_mensal(receita_total, nova, historico)

    meses = []
    for m in range(MESES):
        mes = MesSimples(m + 1, receita_total[m], rbt12s[m], 0, impedimentos[m])
        for atividade, serie in receitas.items():
            anexo = ANEXO[atividade]
            faixa, efetiva, partes = _aliquotas_por_tributo(anexo, rbt12s[m], p, aproximacoes)
            mes.faixa, mes.aliquotas[anexo] = faixa.numero, efetiva
            if mes.impedido:
                partes = {t: a for t, a in partes.items() if t not in FORA_PELO_SUBLIMITE}
            if regular:
                partes = {t: a for t, a in partes.items() if t not in ("IBS", "CBS")}
            mes.por_atividade[atividade] = {t: moeda(serie[m] * a) for t, a in partes.items()}
        meses.append(mes)
    return ApuracaoSimples(meses, notas, list(dict.fromkeys(aproximacoes)))
