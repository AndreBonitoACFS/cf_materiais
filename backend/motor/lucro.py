"""IRPJ/CSLL — estimativas anuais por CNPJ (Lucro Presumido e Lucro Real).
Não são apuração fiscal completa por período."""
from dataclasses import dataclass
from decimal import Decimal

from .decimais import ZERO, moeda, soma
from .parametros import Parametros


@dataclass(frozen=True)
class IrpjCsll:
    base_irpj: Decimal
    base_csll: Decimal
    irpj: Decimal
    csll: Decimal
    fator_lc224: Decimal | None = None

    @property
    def total(self) -> Decimal:
        return self.irpj + self.csll


def _irpj(base: Decimal, p: Parametros) -> Decimal:
    tributavel = max(ZERO, base)
    excedente = max(ZERO, base - p.obter("irpj_parcela_isenta_adicional"))
    return moeda(p.obter("irpj_aliquota") * tributavel + p.obter("irpj_adicional") * excedente)


def _csll(base: Decimal, p: Parametros) -> Decimal:
    return moeda(p.obter("csll_aliquota") * max(ZERO, base))


def lucro_real(base_irpj: Decimal, base_csll: Decimal, p: Parametros) -> IrpjCsll:
    """Bases já ajustadas (resultado + adições − exclusões de cada tributo).
    Sem presunção e sem compensação de prejuízos fiscais."""
    return IrpjCsll(base_irpj, base_csll, _irpj(base_irpj, p), _csll(base_csll, p))


def lucro_presumido(receitas: dict, presuncoes: dict, p: Parametros, receita_bruta: Decimal | None = None) -> IrpjCsll:
    """receitas: atividade -> receita anual do CNPJ; presuncoes: atividade ->
    (presunção IRPJ, presunção CSLL). Agregação e adicional uma vez por CNPJ."""
    total = soma(receitas.values()) if receita_bruta is None else receita_bruta
    if total <= 0:  # sem receita: sem base e sem divisão por zero
        return IrpjCsll(ZERO, ZERO, ZERO, ZERO, Decimal(1))
    excedente = max(ZERO, total - p.obter("lc224_limite"))
    acrescimo = p.obter("lc224_acrescimo")
    fator = 1 + acrescimo * excedente / total
    # Multiplica antes de dividir para a base não herdar o erro de truncamento do fator.
    ajuste = total + acrescimo * excedente
    base_irpj = moeda(soma(r * presuncoes[a][0] for a, r in receitas.items()) * ajuste / total)
    base_csll = moeda(soma(r * presuncoes[a][1] for a, r in receitas.items()) * ajuste / total)
    return IrpjCsll(base_irpj, base_csll, _irpj(base_irpj, p), _csll(base_csll, p), fator)
