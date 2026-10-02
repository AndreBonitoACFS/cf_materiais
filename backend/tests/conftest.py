import copy
from decimal import Decimal

import pytest

from motor import carregar, cenario_de_dict, simular

REGIMES = ("simples_das", "simples_regular", "lucro_presumido", "lucro_real")


def base_cf(regime, **extra):
    base = {
        "regime": regime,
        "receita_comercio": 200000,
        "resultado_antes_irpj_csll_anual": 400000,
        "das_embutido_anual": 0,
        "historico_receita": [200000] * 13,
        "debito_ibs_mensal": 200,
        "credito_ibs_mensal": 100,
        "debito_cbs_mensal": 17600,
        "credito_cbs_mensal": 8800,
        "reconciliacao_confirmada": True,
    }
    base.update(extra)
    return base


def dados(estrutura="D", regimes=None, **alteracoes):
    """Cenário completo e hipotético; valores em média mensal."""
    ids = ("pj1", "pj2", "pj3") if estrutura == "D" else ("pj1", "pj2")
    pessoal = {"forma": "direta", "remuneracao_mensal": 10000, "encargos_no_simples": "0.35", "encargos_fora_do_simples": "0.60"}
    d = {
        "estrutura": estrutura,
        "regimes": regimes or dict.fromkeys(ids, "lucro_real"),
        "galpoes": [
            {"receita_cf": 10000, "receita_terceiros": 20000, "custos_operacionais": 8000},
            {"receita_cf": 5000, "receita_terceiros": 15000, "custos_operacionais": 6000},
            {"receita_cf": 0, "receita_terceiros": 10000, "custos_operacionais": 4000},
        ],
        "logistica": {
            "receita_cf": 12000, "receita_terceiros": 20000, "combustivel": 5000, "manutencao": 2000,
            "outros_custos": 1000, "depreciacao_anual": 12000, "quantidade_veiculos": 4, "valor_frota": 600000,
        },
        "pessoal": {"armazenagem": dict(pessoal), "logistica": dict(pessoal, remuneracao_mensal=5000)},
        "config": {
            "bases_cf": [base_cf(r) for r in REGIMES],
            "resultado_referencia_anual": 300000,
            "transporte_enquadramento": "municipal",
            "iss_transporte_municipal": "0.05",
            "dedutibilidade_entre_pjs_confirmada": True,
            "credito_fornecedor_das_reconhecido": True,
        },
    }
    d = copy.deepcopy(d)
    d.update(alteracoes)
    return d


def rodar(d, parametros=None):
    return simular(cenario_de_dict(d), parametros)


def pj(resultado, id):
    return next(e for e in resultado.empresas if e.id == id)


@pytest.fixture
def p():
    return carregar(2027)


def dec(texto):
    return Decimal(texto)
