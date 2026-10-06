"""Validação das entradas da API. Campo ausente ou null é campo vazio; zero é
dado informado. Valores monetários e alíquotas são decimais (texto ou número)."""
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    equipe_por_quantidade: bool = True
    quantidade_funcionarios: Annotated[int, Field(ge=0)] | None = None
    remuneracao_media_mensal: NaoNegativo | None = None
    custo_total_mensal: NaoNegativo | None = None
    encargos_componentes: dict[str, Aliquota | None] = {}

    @model_validator(mode="before")
    @classmethod
    def apenas_modalidade_ativa(cls, dados):
        if isinstance(dados, dict):
            dados = dict(dados)
            if dados.get("forma") == FormaPessoal.TERCEIRIZACAO:
                for k in ("quantidade_funcionarios", "remuneracao_media_mensal", "remuneracao_mensal", "encargos_no_simples", "encargos_fora_do_simples", "custo_total_mensal"):
                    dados[k] = None
                dados["encargos_componentes"] = {}
            elif dados.get("forma") == FormaPessoal.DIRETA:
                dados["preco_mensal"] = None
                if str(dados.get("quantidade_funcionarios")) == "0":
                    dados["remuneracao_media_mensal"] = None
        return dados


class AjustePonte(_Modelo):
    id: Annotated[str, Field(min_length=1)]
    tipo: TipoAjuste
    descricao: str = ""
    valor_anual: NaoNegativo


class BaseCF(_Modelo):
    regime: Regime
    receita_comercio: Valor = None
    receita_sujeita_presuncao: Valor = None
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
    credito_adicional_ibs_mensal: NaoNegativo | None = None
    credito_adicional_cbs_mensal: NaoNegativo | None = None


class Categoria(_Modelo):
    custo_bruto_mensal: NaoNegativo | None = None
    percentual_elegivel: Aliquota | None = None


class TrimestreIntegrado(_Modelo):
    receita: NaoNegativo | None = None
    presuncao: NaoNegativo | None = None
    resultado: Decimal | None = None
    alimentacao: NaoNegativo | None = None
    servicos: NaoNegativo | None = None
    aluguel: NaoNegativo | None = None
    adicoes_irpj: NaoNegativo | None = None
    exclusoes_irpj: NaoNegativo | None = None
    adicoes_csll: NaoNegativo | None = None
    exclusoes_csll: NaoNegativo | None = None
    acrescimos_irpj: NaoNegativo | None = None
    acrescimos_csll: NaoNegativo | None = None
    pat_elegivel: NaoNegativo | None = None


class ControleIntegrado(_Modelo):
    trimestres: Annotated[list[TrimestreIntegrado], Field(max_length=4)] = []
    pat: bool = False
    elegibilidade: Annotated[str, Field(pattern="^(pendente|confirmada|nao_elegivel)$")] = "pendente"
    hipotese_pat: bool = False
    evidencia: str = ""
    origens: dict = {}


class PatPJ(_Modelo):
    ativo: bool = False
    elegibilidade: Annotated[str, Field(pattern="^(pendente|confirmada|nao_elegivel)$")] = "pendente"
    evidencia: str = ""
    hipotese: bool = False
    despesa_anual: NaoNegativo | None = None


class ConfigContabil(_Modelo):
    integrada: ControleIntegrado = ControleIntegrado()
    pat_por_papel: dict[str, PatPJ] = {}
    demais_tributos_receita: Aliquota | None = None
    validacoes_pendentes: list[str] = []
    metodo_credito: Annotated[str, Field(pattern="^(manter_projecao|categorias)$")] = "manter_projecao"
    categorias: dict[Atividade, dict[str, Categoria]] = {}
    credito_regular_por_atividade: dict[Atividade, bool | None] = {}
    preco_entre_pjs_com_tributo_acrescido: bool = False
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
