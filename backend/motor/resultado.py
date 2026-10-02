"""Saídas do motor: resultados por PJ, consolidado, pendências e memória."""
from dataclasses import dataclass, field, fields, is_dataclass
from decimal import Decimal
from enum import Enum

from .estados import Status


@dataclass
class LinhaMemoria:
    pj: str | None
    etapa: str
    descricao: str
    formula: str | None = None
    valor: Decimal | str | None = None


@dataclass
class Pendencia:
    mensagem: str
    pj: str | None = None
    bloqueante: bool = True


@dataclass
class ResultadoPJ:
    id: str
    nome: str
    papel: str
    atividades: list
    regime: object
    status: Status = Status.CALCULO_DISPONIVEL
    motivos: list = field(default_factory=list)
    receita: Decimal | None = None
    receita_entre_pjs: Decimal | None = None
    custos: Decimal | None = None
    despesas_entre_pjs: Decimal | None = None
    tributos: dict = field(default_factory=dict)
    total_tributos: Decimal | None = None
    creditos_utilizados: dict = field(default_factory=dict)
    saldo_credor_final: dict = field(default_factory=dict)
    resultado_antes_irpj_csll: Decimal | None = None
    resultado: Decimal | None = None
    ponte: list = field(default_factory=list)  # somente CF
    apuracao_mensal: list = field(default_factory=list)


@dataclass
class Consolidado:
    status: Status
    receita_externa: Decimal | None = None
    custos_externos: Decimal | None = None
    tributos: Decimal | None = None
    resultado: Decimal | None = None
    referencia: Decimal | None = None
    diferenca: Decimal | None = None
    motivos: list = field(default_factory=list)


@dataclass
class Resultado:
    status: Status
    estrutura: object
    empresas: list
    consolidado: Consolidado
    pendencias: list = field(default_factory=list)
    hipoteses: list = field(default_factory=list)
    provisorio: list = field(default_factory=list)
    memoria: list = field(default_factory=list)
    parametros: dict = field(default_factory=dict)


def para_dict(obj):
    """Converte o resultado em tipos JSON; valores decimais viram texto."""
    if is_dataclass(obj):
        return {f.name: para_dict(getattr(obj, f.name)) for f in fields(obj)}
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, dict):
        return {para_dict(k): para_dict(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [para_dict(v) for v in obj]
    return obj
