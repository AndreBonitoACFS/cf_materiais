"""Validação das entradas da API. Campo ausente ou null é campo vazio; zero é
dado informado. Valores monetários e alíquotas são decimais (texto ou número)."""
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from motor.entradas import FormaPessoal, TipoAjuste, Transporte
from motor.estrutura import Atividade, Estrutura, Regime

NaoNegativo = Annotated[Decimal, Field(ge=0)]
Aliquota = Annotated[Decimal, Field(ge=0, le=1)]


class _Modelo(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Recorrente(_Modelo):
    media_mensal: NaoNegativo | None = None
    meses: Annotated[list[NaoNegativo], Field(min_length=12, max_length=12)] | None = None


Valor = Recorrente | NaoNegativo | None  # número simples = média mensal


class Galpao(_Modelo):
    receita_cf: Valor = None
    receita_terceiros: Valor = None
    custos_operacionais: Valor = None


class Logistica(_Modelo):
    receita_cf: Valor = None
    receita_terceiros: Valor = None
    combustivel: Valor = None
    manutencao: Valor = None
    outros_custos: Valor = None
    depreciacao_anual: NaoNegativo | None = None
    quantidade_veiculos: Annotated[int, Field(ge=0)] | None = None
    valor_frota: NaoNegativo | None = None


class Pessoal(_Modelo):
    forma: FormaPessoal | None = None
    remuneracao_mensal: NaoNegativo | None = None
    encargos_no_simples: NaoNegativo | None = None
    encargos_fora_do_simples: NaoNegativo | None = None
    preco_mensal: NaoNegativo | None = None


class AjustePonte(_Modelo):
    id: Annotated[str, Field(min_length=1)]
    tipo: TipoAjuste
    descricao: str = ""
    valor_anual: NaoNegativo


class BaseCF(_Modelo):
    regime: Regime
    receita_comercio: Valor = None
    resultado_antes_irpj_csll_anual: Decimal | None = None
    das_embutido_anual: NaoNegativo | None = None
    historico_receita: Annotated[list[NaoNegativo], Field(min_length=13, max_length=13)] | None = None
    debito_ibs_mensal: NaoNegativo | None = None
    credito_ibs_mensal: NaoNegativo | None = None
    debito_cbs_mensal: NaoNegativo | None = None
    credito_cbs_mensal: NaoNegativo | None = None
    custo_pessoal_embutido_anual: NaoNegativo | None = None
    ajustes_ponte: list[AjustePonte] = []
    reconciliacao_confirmada: bool | None = None


class ConfigPJ(_Modelo):
    adicoes_irpj: NaoNegativo | None = None
    exclusoes_irpj: NaoNegativo | None = None
    adicoes_csll: NaoNegativo | None = None
    exclusoes_csll: NaoNegativo | None = None
    credito_ibs_mensal: NaoNegativo | None = None
    credito_cbs_mensal: NaoNegativo | None = None


class ConfigContabil(_Modelo):
    bases_cf: list[BaseCF] = []
    resultado_referencia_anual: Decimal | None = None
    transporte_enquadramento: Transporte | None = None
    iss_transporte_municipal: Aliquota | None = None
    icms_transporte: Aliquota | None = None
    dedutibilidade_entre_pjs_confirmada: bool | None = None
    credito_fornecedor_das_reconhecido: bool | None = None
    por_papel: dict[str, ConfigPJ] = {}


class Cenario(_Modelo):
    estrutura: Estrutura | None = None
    regimes: dict[Annotated[str, Field(pattern="^pj[123]$")], Regime | None] = {}
    galpoes: Annotated[list[Galpao], Field(max_length=3)] = []
    logistica: Logistica = Logistica()
    pessoal: dict[Atividade, Pessoal | None] = {}
    config: ConfigContabil = ConfigContabil()


class Comparacao(_Modelo):
    cenarios: Annotated[list[Cenario], Field(min_length=2, max_length=8)]
