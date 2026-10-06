from decimal import Decimal as D
import pytest
from fastapi.testclient import TestClient
from api.main import app
from motor.integrada import trimestre
from motor.estrutura import Regime


def q(resultado="1000000", pat="100000"):
    return dict(resultado=resultado, receita="2000000", presuncao="2000000", servicos="0", aluguel="0", adicoes_irpj="0", exclusoes_irpj="0", adicoes_csll="0", exclusoes_csll="0", acrescimos_irpj="0", acrescimos_csll="0", pat_elegivel=pat)


@pytest.mark.parametrize("despesa,incentivo,liquido", [("100000","5400","238600"),("10000","1350","242650")])
def test_pat_aceite(despesa,incentivo,liquido):
    r = trimestre(Regime.LUCRO_REAL,q(pat=despesa),True,hipotese=True)
    assert r["IRPJ básico"] == D("150000")
    assert r["Adicional IRPJ"] == D("94000")
    assert r["PAT utilizado"] == D(incentivo)
    assert r["IRPJ líquido"] == D(liquido)
    assert r["CSLL"] == D("90000")


@pytest.mark.parametrize("resultado", ["0","-1000"])
def test_sem_base_sem_beneficio(resultado):
    r = trimestre(Regime.LUCRO_REAL,q(resultado),True,hipotese=True)
    assert r["PAT utilizado"] == r["IRPJ líquido"] == D(0)


def test_pendente_zero_e_evidencia():
    assert trimestre(Regime.LUCRO_REAL,q(pat=None),True,hipotese=True)["PAT utilizado"] is None
    assert trimestre(Regime.LUCRO_REAL,q(pat="0"),True)["PAT utilizado"] == 0
    assert trimestre(Regime.LUCRO_REAL,q(),True,"confirmada")["PAT utilizado"] is None
    assert trimestre(Regime.LUCRO_REAL,q(),True,"nao_elegivel",True)["PAT utilizado"] == 0
    assert trimestre(Regime.LUCRO_REAL,q(),True,"confirmada",evidencia="Inscrição/documentos")["PAT utilizado"] == 5400


def test_pat_isolado():
    a = trimestre(Regime.LUCRO_REAL,q())
    b = trimestre(Regime.LUCRO_REAL,q(),True,hipotese=True)
    for k in ("Base IRPJ","Base CSLL","CSLL","Adicional IRPJ"):
        assert a[k] == b[k]


def test_lp_e_fronteira():
    r = trimestre(Regime.LUCRO_PRESUMIDO,q(),True,hipotese=True)
    assert [r[k] for k in ("Base IRPJ","IRPJ líquido","Base CSLL","CSLL","PAT utilizado")] == list(map(D,("166000","35500","249000","22410","0")))
    b = q(); b["presuncao"]="1250000"
    assert trimestre(Regime.LUCRO_PRESUMIDO,b)["Base IRPJ"] == 100000


def test_limite_unico_multiplas_atividades():
    b=q();b["presuncao"]="1000000";b["servicos"]="1000000"
    assert trimestre(Regime.LUCRO_PRESUMIDO,b)["Base IRPJ"] == D("415000")


def test_api_comparacao_parcial_e_cnpj_unico():
    cliente=TestClient(app)
    cenarios=[{"estrutura":"integrada","regimes":{"pj1":r},"config":{"integrada":{"trimestres":[q()]*4,"pat":pat,"hipotese_pat":True}}} for r,pat in [("lucro_presumido",False),("lucro_real",False),("lucro_real",True)]]
    resposta=cliente.post("/api/comparacoes",json={"cenarios":cenarios})
    assert resposta.status_code == 200, resposta.text
    for r in resposta.json()["resultados"]:
        assert len(r["empresas"]) == 1
        e=r["empresas"][0]
        assert e["receita_entre_pjs"] == e["despesas_entre_pjs"] == "0"
        assert r["consolidado"]["tributos"] is None
        assert e["tributos"]["Caixa efetivo"] is None


def test_prejuizos_nao_compensados_e_campos_vazios():
    cliente=TestClient(app)
    c={"estrutura":"integrada","regimes":{"pj1":"lucro_real"},"config":{"integrada":{"trimestres":[q("-1000000"),q(),q("0"),q("0")]}}}
    r=cliente.post("/api/simulacoes",json=c).json()
    assert r["empresas"][0]["tributos"]["IRPJ líquido"] == "244000.00"
    del c["config"]["integrada"]["trimestres"][1]["adicoes_irpj"]
    r=cliente.post("/api/simulacoes",json=c).json()
    assert r["status"] == "dados_incompletos"


def test_api_rejeita_negativo_e_flag_invalida():
    c={"estrutura":"integrada","regimes":{"pj1":"lucro_real"},"config":{"integrada":{"trimestres":[q(pat="-1")]*4}}}
    assert TestClient(app).post("/api/simulacoes",json=c).status_code == 422


def test_pat_por_pj_na_cisao_nao_copia_controle():
    from conftest import dados, rodar, pj
    d=dados()
    a=rodar(d)
    d["config"]["pat_por_papel"]={"armazenagem":{"ativo":True,"despesa_anual":"100000","hipotese":True}}
    b=rodar(d)
    assert pj(a,"pj2").tributos["IRPJ"] > pj(b,"pj2").tributos["IRPJ"]
    assert pj(a,"pj2").tributos["CSLL"] == pj(b,"pj2").tributos["CSLL"]
    assert pj(a,"pj2").custos == pj(b,"pj2").custos
    assert pj(a,"pj3").tributos == pj(b,"pj3").tributos
    for k in ("IBS","CBS"):
        assert pj(a,"pj2").tributos[k] == pj(b,"pj2").tributos[k]
