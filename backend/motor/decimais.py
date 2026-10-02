"""Precisão decimal e política de arredondamento do motor.

Política: os cálculos intermediários usam Decimal com a precisão padrão (28
dígitos), sem arredondar. O arredondamento para centavos (meia unidade para
cima, ROUND_HALF_UP) ocorre apenas nos pontos de apuração: cada componente
mensal de tributo e cada tributo anual estimado. Totais são somas de valores já
arredondados, de modo que as linhas exibidas fecham com os totais.
"""
from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0")
CENTAVO = Decimal("0.01")
MESES = 12


def D(valor) -> Decimal:
    return valor if isinstance(valor, Decimal) else Decimal(str(valor))


def moeda(valor: Decimal) -> Decimal:
    return valor.quantize(CENTAVO, rounding=ROUND_HALF_UP)


def soma(valores) -> Decimal:
    return sum(valores, ZERO)
