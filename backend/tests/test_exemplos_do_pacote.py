"""Valida os casos de 04_EXEMPLOS_NUMERICOS.json. Comparação exata em centavos."""
import json
from decimal import Decimal
from pathlib import Path

import pytest

from conftest import dados, pj, rodar
from motor.estrutura import Atividade
from motor.lucro import lucro_presumido, lucro_real
from motor.simples import apurar_simples

_ARQUIVO = Path(__file__).parents[2] / "04_EXEMPLOS_NUMERICOS.json"
CASOS = {c["id"]: c for c in json.loads(_ARQUIVO.read_text(encoding="utf-8"))["casos"]}


def test_pacote_tem_dez_exemplos():
    assert len(CASOS) == 10


@pytest.mark.parametrize("id", ["LR_1", "LR_2", "LR_3", "LR_4"])
def test_lucro_real(id, p):
    e, esperado = CASOS[id]["entradas"], CASOS[id]["esperado"]
    r = lucro_real(Decimal(e["base_IRPJ"]), Decimal(e["base_CSLL"]), p)
    assert (r.irpj, r.csll, r.total) == tuple(Decimal(esperado[k]) for k in ("IRPJ", "CSLL", "total"))


@pytest.mark.parametrize("id", ["LP_ARMAZ_1000000", "LP_ARMAZ_6000000"])
def test_lucro_presumido_armazenagem(id, p):
    e, esperado = CASOS[id]["entradas"], CASOS[id]["esperado"]
    presuncoes = {Atividade.ARMAZENAGEM: (Decimal(e["presuncao_IRPJ"]), Decimal(e["presuncao_CSLL"]))}
    r = lucro_presumido({Atividade.ARMAZENAGEM: Decimal(e["receita_anual"])}, presuncoes, p)
    assert r.fator_lc224 == Decimal(esperado["fator_LC224"])
    assert (r.base_irpj, r.base_csll) == (Decimal(esperado["base_IRPJ"]), Decimal(esperado["base_CSLL"]))
    assert (r.irpj, r.csll, r.total) == tuple(Decimal(esperado[k]) for k in ("IRPJ", "CSLL", "total"))


def test_custo_da_logistica():
    e, esperado = CASOS["LOGISTICA_CUSTO"]["entradas"], CASOS["LOGISTICA_CUSTO"]["esperado"]
    d = dados("D", {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "simples_das"})
    d["logistica"] = {
        "receita_cf": 0, "receita_terceiros": e["receita_terceiros_mes"], "combustivel": e["combustivel_mes"],
        "manutencao": e["manutencao_mes"], "outros_custos": e["outros_mes"], "depreciacao_anual": e["depreciacao_ano"],
        "quantidade_veiculos": 10, "valor_frota": 5000000,
    }
    d["pessoal"]["logistica"] = {"forma": "terceirizacao", "preco_mensal": Decimal(e["pessoal_ano"]) / 12}
    logistica = pj(rodar(d), "pj3")
    assert logistica.custos == Decimal(esperado["custo_anual"])
    assert logistica.receita == Decimal(esperado["receita_terceiros_anual"])
    assert logistica.receita - logistica.custos == Decimal(esperado["margem_antes_tributos"])


@pytest.mark.parametrize("id,regular", [("SN_INICIO_DAS", False), ("SN_INICIO_REGULAR", True)])
def test_simples_inicio_de_atividade(id, regular, p):
    e, esperado = CASOS[id]["entradas"], CASOS[id]["esperado"]
    receitas = {Atividade.ARMAZENAGEM: [Decimal(e["receita_mes"])] * 12}
    ap = apurar_simples(receitas, nova=True, regular=regular, historico=None, p=p)
    for mes in ap.meses[:2]:  # somente os meses 1 e 2, na primeira faixa
        assert mes.rbt12 is None and mes.faixa == 1
        assert mes.das == Decimal(esperado["DAS_mes"])
    partilha = p.anexos["III"][0].partilha
    assert partilha["IBS"] + partilha["CBS"] == Decimal(esperado["parcela_IBS_CBS_da_faixa"])


def test_despesa_administrativa_propria_permanece_na_pj1():
    caso = CASOS["DESPESA_PROPRIA_PJ1"]
    antes = [Decimal(v) for v in caso["entradas"]["resultados_antes_dessa_despesa_PJ1_PJ2_PJ3"]]
    despesa = Decimal(caso["entradas"]["despesa_administrativa_PJ1"])
    depois = [antes[0] - despesa, antes[1], antes[2]]
    assert depois == [Decimal(v) for v in caso["esperado"]["resultados_PJ1_PJ2_PJ3"]]
    assert sum(depois) == Decimal(caso["esperado"]["resultado_consolidado"])

    # No motor: uma despesa de 12.000 só na base da CF (Simples: DAS não depende do
    # resultado) reduz a PJ 1 e o consolidado em 12.000 e não altera PJ 2 nem PJ 3.
    regimes = {"pj1": "simples_das", "pj2": "simples_das", "pj3": "simples_das"}
    sem, com = dados("D", regimes), dados("D", regimes)
    for base in com["config"]["bases_cf"]:
        base["resultado_antes_irpj_csll_anual"] -= despesa
    a, b = rodar(sem), rodar(com)
    assert pj(a, "pj1").resultado - pj(b, "pj1").resultado == despesa
    assert pj(a, "pj2").resultado == pj(b, "pj2").resultado
    assert pj(a, "pj3").resultado == pj(b, "pj3").resultado
    assert a.consolidado.resultado - b.consolidado.resultado == despesa
