"""Estruturas A/B/C/D, regimes e mapeamento das atividades para as PJs."""
from dataclasses import dataclass
from enum import Enum
from itertools import product


class Estrutura(str, Enum):
    INTEGRADA = "integrada"
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class Regime(str, Enum):
    SIMPLES_DAS = "simples_das"
    SIMPLES_REGULAR = "simples_regular"
    LUCRO_PRESUMIDO = "lucro_presumido"
    LUCRO_REAL = "lucro_real"


class Atividade(str, Enum):
    COMERCIO = "comercio"
    ARMAZENAGEM = "armazenagem"
    LOGISTICA = "logistica"


SIMPLES = {Regime.SIMPLES_DAS, Regime.SIMPLES_REGULAR}
# Regimes em que IBS/CBS são apurados no regime regular (débitos e créditos).
REGULARES = {Regime.SIMPLES_REGULAR, Regime.LUCRO_PRESUMIDO, Regime.LUCRO_REAL}
SERVICOS = (Atividade.ARMAZENAGEM, Atividade.LOGISTICA)

NOMES_REGIME = {
    Regime.SIMPLES_DAS: "Simples Nacional — IBS/CBS no DAS",
    Regime.SIMPLES_REGULAR: "Simples Nacional — IBS/CBS no regime regular",
    Regime.LUCRO_PRESUMIDO: "Lucro Presumido",
    Regime.LUCRO_REAL: "Lucro Real",
}
NOMES_ATIVIDADE = {
    Atividade.COMERCIO: "CF Principal",
    Atividade.ARMAZENAGEM: "Armazenagem",
    Atividade.LOGISTICA: "Logística",
}

_C, _A, _L = Atividade.COMERCIO, Atividade.ARMAZENAGEM, Atividade.LOGISTICA
_MAPA = {
    Estrutura.INTEGRADA: {"pj1": (_C, _L, _A)},
    Estrutura.A: {"pj1": (_C,), "pj2": (_L, _A)},
    Estrutura.B: {"pj1": (_C, _L), "pj2": (_A,)},
    Estrutura.C: {"pj1": (_C, _A), "pj2": (_L,)},
    Estrutura.D: {"pj1": (_C,), "pj2": (_A,), "pj3": (_L,)},
}


@dataclass(frozen=True)
class Empresa:
    id: str  # estável: pj1, pj2, pj3
    atividades: tuple

    @property
    def nome(self) -> str:
        return " + ".join(NOMES_ATIVIDADE[a] for a in self.atividades)

    @property
    def papel(self) -> str:
        """Identifica o papel da empresa. Configurações contábeis por empresa são
        vinculadas ao papel; se a estrutura muda o papel, elas não são reaproveitadas."""
        return "+".join(sorted(a.value for a in self.atividades))

    @property
    def e_cf(self) -> bool:
        return Atividade.COMERCIO in self.atividades


def empresas(estrutura: Estrutura) -> list:
    return [Empresa(id, atividades) for id, atividades in _MAPA[estrutura].items()]


def combinacoes():
    """As 112 combinações teóricas de estrutura e regimes."""
    for estrutura in (Estrutura.A, Estrutura.B, Estrutura.C, Estrutura.D):
        ids = list(_MAPA[estrutura])
        for regimes in product(Regime, repeat=len(ids)):
            yield estrutura, dict(zip(ids, regimes))
