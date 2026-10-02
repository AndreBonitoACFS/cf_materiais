"""IBS/CBS no regime regular: débitos, créditos e saldo credor por mês.
A mesma apuração é feita separadamente para o IBS e para a CBS."""
from dataclasses import dataclass
from decimal import Decimal

from .decimais import ZERO, moeda


@dataclass(frozen=True)
class MesRegular:
    debito: Decimal
    credito: Decimal
    disponivel: Decimal
    utilizado: Decimal
    a_recolher: Decimal
    saldo_final: Decimal


def debito(base: Decimal, aliquota: Decimal) -> Decimal:
    return moeda(base * aliquota)


def tributo_embutido(preco_bruto: Decimal, aliquota: Decimal) -> Decimal:
    """Somente quando o preço inclui o tributo e essa convenção for aplicável."""
    return moeda(preco_bruto * aliquota / (1 + aliquota))


def apurar(debitos: list, creditos: list, saldo_inicial: Decimal = ZERO) -> list:
    """Saldo credor é transportado; não há presunção de ressarcimento."""
    meses, saldo = [], saldo_inicial
    for deb, cred in zip(debitos, creditos):
        disponivel = saldo + cred
        utilizado = min(deb, disponivel)
        a_recolher = max(ZERO, deb - utilizado)
        saldo = disponivel - utilizado
        meses.append(MesRegular(deb, cred, disponivel, utilizado, a_recolher, saldo))
    return meses
