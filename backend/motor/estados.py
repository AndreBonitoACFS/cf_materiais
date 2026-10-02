"""Estados de disponibilidade do resultado. Nunca há zero fictício: um caso não
calculável carrega um estado e seus motivos, sem valores."""
from enum import Enum


class Status(str, Enum):
    AGUARDANDO_SELECAO = "aguardando_selecao"
    DADOS_INCOMPLETOS = "dados_incompletos"
    INELEGIVEL = "inelegivel"
    HIPOTESE_NAO_MODELADA = "hipotese_nao_modelada"
    SIMULACAO_PROVISORIA = "simulacao_provisoria"
    CALCULO_DISPONIVEL = "calculo_disponivel"


# Do mais restritivo para o menos restritivo.
_ORDEM = list(Status)
COM_VALORES = {Status.SIMULACAO_PROVISORIA, Status.CALCULO_DISPONIVEL}


def pior(estados) -> Status:
    return min(estados, key=_ORDEM.index)


class Indisponivel(Exception):
    """Interrompe a apuração de uma PJ com o estado e os motivos."""

    def __init__(self, status: Status, motivos: list[str]):
        super().__init__("; ".join(motivos))
        self.status = status
        self.motivos = motivos
