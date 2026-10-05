from copy import deepcopy
from decimal import Decimal as D
import pytest
from api.schemas import Cenario
from pydantic import ValidationError
from conftest import dados, rodar, pj
from motor.estrutura import combinacoes


def novo(estrutura="D", regimes=None):
    d = dados(estrutura, regimes)
    for a in ("armazenagem", "logistica"):
        d["pessoal"][a] = {"forma": "direta", "equipe_por_quantidade": True, "quantidade_funcionarios": 10, "remuneracao_media_mensal": 2500, "encargos_no_simples": "0.30", "encargos_fora_do_simples": "0.568"}
    return d


@pytest.mark.parametrize("regime,custo,cpp", [("simples_das", "390000", "0"), ("simples_regular", "390000", "0"), ("lucro_presumido", "470400", "80400"), ("lucro_real", "470400", "80400")])
def test_equipes_e_encargos(regime, custo, cpp):
    d = novo(regimes={"pj1":"lucro_presumido", "pj2":regime, "pj3":"lucro_presumido"})
    equipe = pj(rodar(d), "pj2").pessoal[0]
    assert equipe["folha_anual"] == D("300000")
    assert equipe["encargos_sem_cpp_anual"] == D("90000")
    assert equipe["cpp_anual"] == D(cpp)
    assert equipe["custo_anual"] == D(custo)
    d["pessoal"]["armazenagem"]["quantidade_funcionarios"] = 11
    assert pj(rodar(d), "pj2").pessoal[0]["custo_anual"] - D(custo) == D(custo)/10


def test_quantidade_ausente_zero_e_terceirizacao():
    d = novo()
    d["pessoal"]["armazenagem"]["quantidade_funcionarios"] = None
    assert pj(rodar(d), "pj2").resultado is None
    d["pessoal"]["armazenagem"].update(quantidade_funcionarios=0, remuneracao_media_mensal=None, encargos_no_simples=None, encargos_fora_do_simples=None)
    assert pj(rodar(d), "pj2").pessoal[0]["custo_anual"] == 0
    d["pessoal"]["armazenagem"].update(forma="terceirizacao", preco_mensal=2000, quantidade_funcionarios=None)
    assert pj(rodar(d), "pj2").pessoal[0]["custo_anual"] == 24000
    d["pessoal"]["armazenagem"]["forma"] = "direta"
    for q in (-1, "1.5"):
        d["pessoal"]["armazenagem"]["quantidade_funcionarios"] = q
        with pytest.raises(ValidationError): Cenario.model_validate(d)


def categorias(d, percentual="1"):
    d["config"]["metodo_credito"] = "categorias"
    d["galpoes"] = [{"receita_cf":0,"receita_terceiros":20000,"custos_operacionais":10890}, {"receita_cf":0,"receita_terceiros":0,"custos_operacionais":0}, {"receita_cf":0,"receita_terceiros":0,"custos_operacionais":0}]
    d["config"]["categorias"] = {
        "armazenagem": {k:{"custo_bruto_mensal":10890 if k=="energia" else 0,"percentual_elegivel":percentual if k=="energia" else None} for k in ("materiais","energia","servicos","outros")},
        "logistica": {k:{"percentual_elegivel":"0"} for k in ("combustivel","manutencao","outros")},
        "comercio": {k:{"custo_bruto_mensal":0,"percentual_elegivel":None} for k in ("cmv","cpv","csp")},
    }
    return d


@pytest.mark.parametrize("percentual,ibs,cbs", [("1", "120", "10560"),("0.5","60","5280")])
def test_creditos_brutos_sem_custo_duplicado(percentual, ibs, cbs):
    d = categorias(novo(), percentual)
    e = pj(rodar(d), "pj2")
    assert e.creditos_potenciais == {"IBS":D(ibs),"CBS":D(cbs)}
    assert e.custos == D("10890")*12 + D("470400")
    d["config"]["por_papel"] = {"armazenagem":{"credito_ibs_mensal":99999,"credito_cbs_mensal":99999,"credito_adicional_ibs_mensal":2}}
    assert pj(rodar(d), "pj2").creditos_potenciais["IBS"] == D(ibs)+24


def test_travas_e_projecao_inativa():
    d = categorias(novo(), None)
    assert pj(rodar(d), "pj2").resultado is None
    d["config"]["metodo_credito"] = "manter_projecao"
    assert pj(rodar(d), "pj2").resultado is not None
    d["config"]["metodo_credito"] = "categorias"
    d["config"]["categorias"]["armazenagem"]["energia"].update(percentual_elegivel="1",custo_bruto_mensal=10891)
    assert any("Reconciliação CSP" in m for m in pj(rodar(d), "pj2").motivos)


def test_substituicao_cf_teto_e_saldo_separados():
    d = categorias(novo())
    d["logistica"]["receita_cf"] = 0
    for b in d["config"]["bases_cf"]:
        b.update(debito_ibs_mensal=10, credito_ibs_mensal=5, debito_cbs_mensal=880, credito_cbs_mensal=440)
    d["config"]["categorias"]["comercio"]["cpv"] = {"custo_bruto_mensal":21780,"percentual_elegivel":"1"}
    e = pj(rodar(d), "pj1")
    assert e.tributos["IBS"] == -60
    assert e.tributos["CBS"] == -5280
    assert e.creditos_utilizados_totais == {"IBS":120,"CBS":10560}
    assert e.saldo_credor_final == {"IBS":120,"CBS":10560}
    d["config"]["categorias"]["comercio"]["cpv"]["percentual_elegivel"] = "0"
    e = pj(rodar(d), "pj1")
    assert e.tributos["IBS"] == 60 and e.tributos["CBS"] == 5280


def test_creditos_pendentes_e_pagamento_bruto():
    d = novo()
    d["config"]["credito_regular_por_atividade"] = {"armazenagem":None,"logistica":None}
    d["config"]["preco_entre_pjs_com_tributo_acrescido"] = True
    e = pj(rodar(d), "pj1")
    assert e.despesas_entre_pjs == D("324000") * D("1.089")
    assert e.creditos_utilizados.get("IBS", 0) == 0 and e.creditos_utilizados.get("CBS", 0) == 0
    assert any("elegibilidade pendente" in m for m in rodar(d).provisorio)


def test_112_combinacoes_equipes_categorias_e_atribuicao():
    for estrutura, regimes in combinacoes():
        for metodo in ("manter_projecao", "categorias"):
            d = novo(estrutura.value, {k:v.value for k,v in regimes.items()})
            if metodo == "categorias": categorias(d)
            Cenario.model_validate(d)
            r = rodar(d)
            assert r.consolidado.resultado is not None, (estrutura, regimes, metodo, r.pendencias)
            equipes = [p for e in r.empresas for p in e.pessoal]
            assert len(equipes) == 2 and sum(p["quantidade"] for p in equipes) == 20
            for e in r.empresas:
                for equipe in e.pessoal:
                    assert equipe["atividade"] in [a.value for a in e.atividades]
                    assert equipe["cpp_anual"] == (0 if e.regime.value.startswith("simples") else D("80400"))


def test_componentes_detalhados_e_modalidade_inativa():
    d = novo()
    p = d["pessoal"]["armazenagem"]
    p.update(encargos_no_simples=None, encargos_fora_do_simples=None, encargos_componentes={"cpp":"0.268","fgts":"0.08","ferias":"0.10","decimo_terceiro":"0.08","beneficios":"0.04","outros_encargos":"0"})
    assert pj(rodar(d), "pj2").pessoal[0]["custo_anual"] == 470400
    d["regimes"]["pj2"] = "simples_regular"
    p["encargos_componentes"]["cpp"] = None
    assert pj(rodar(d), "pj2").pessoal[0]["custo_anual"] == 390000
    p.update(forma="terceirizacao", preco_mensal=2000, quantidade_funcionarios="não aplicável",remuneracao_media_mensal=-10)
    validado = Cenario.model_validate(d).model_dump(mode="json")
    assert pj(rodar(validado), "pj2").pessoal[0]["custo_anual"] == 24000


def test_receita_bruta_e_presuncao_independentes_e_inelegibilidade():
    d = novo(regimes={"pj1":"lucro_presumido","pj2":"lucro_presumido","pj3":"lucro_presumido"})
    for b in d["config"]["bases_cf"]:
        b.update(receita_comercio=600000,receita_sujeita_presuncao=300000,historico_receita=None)
    e = pj(rodar(d), "pj1")
    assert e.receita == 7200000
    # Receita bruta controla o fator; base tributável controla a presunção.
    from motor.lucro import lucro_presumido
    from motor import carregar
    from motor.estrutura import Atividade
    imposto = lucro_presumido({Atividade.COMERCIO:D("3600000")},{Atividade.COMERCIO:(D("0.08"),D("0.12"))},carregar(),D("7200000"))
    assert e.tributos["IRPJ"] == imposto.irpj
    d["regimes"]["pj1"] = "simples_das"
    d["pessoal"]["armazenagem"]["quantidade_funcionarios"] = None
    e = pj(rodar(d), "pj1")
    assert e.status.value == "inelegivel"
    assert "sem histórico comprovado" in e.motivos[0]


def test_sublimite_somente_ibs_e_pessoal_cf_sem_duplicar_encargos():
    d = categorias(novo(regimes={"pj1":"lucro_presumido","pj2":"simples_das","pj3":"lucro_presumido"}))
    d["galpoes"][0]["receita_terceiros"] = 370000
    e = pj(rodar(d), "pj2")
    assert e.creditos_utilizados["IBS"] == 120
    assert "CBS" not in e.creditos_utilizados
    d = novo()
    d["pessoal"]["comercio"] = {"forma":"direta","custo_total_mensal":10000}
    for b in d["config"]["bases_cf"]: b["custo_pessoal_embutido_anual"] = 120000
    r = rodar(d)
    cf = pj(r,"pj1")
    del d["pessoal"]["comercio"]
    assert cf.resultado == pj(rodar(d),"pj1").resultado


def test_cf_sublimite_substitui_ibs_sem_transportar_credito_para_cbs_das():
    d = categorias(novo(regimes={"pj1":"simples_das","pj2":"lucro_presumido","pj3":"lucro_presumido"}))
    for b in d["config"]["bases_cf"]:
        b.update(receita_comercio=370000,historico_receita=None,debito_ibs_mensal=20,credito_ibs_mensal=5)
    d["config"]["credito_regular_por_atividade"] = {"armazenagem":False,"logistica":False}
    d["config"]["categorias"]["comercio"]["cpv"] = {"custo_bruto_mensal":10890,"percentual_elegivel":"1"}
    e = pj(rodar(d),"pj1")
    assert e.resultado is not None and e.tributos["IBS"] == -60
    assert e.creditos_potenciais == {"IBS":120}
    assert e.creditos_utilizados_totais == {"IBS":120}
    assert "CBS" not in e.tributos
