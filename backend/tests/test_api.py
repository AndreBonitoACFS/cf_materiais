from fastapi.testclient import TestClient

from api.main import app
from conftest import dados

cliente = TestClient(app)


def test_estruturas_e_parametros():
    corpo = cliente.get("/api/estruturas").json()
    assert [e["id"] for e in corpo["estruturas"]] == ["integrada", "A", "B", "C", "D"]
    assert len(corpo["regimes"]) == 4
    parametros = cliente.get("/api/parametros").json()
    assert parametros["parametros"]["cbs"]["situacao"] == "provisorio"
    assert parametros["parametros"]["icms_transporte"]["valor"] is None


def test_simulacao_devolve_resultados_memoria_e_pendencias():
    resposta = cliente.post("/api/simulacoes", json=dados("D"))
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["status"] == "simulacao_provisoria"
    assert len(corpo["empresas"]) == 3 and corpo["memoria"] and corpo["hipoteses"]
    assert isinstance(corpo["consolidado"]["resultado"], str)  # decimal como texto, sem ponto flutuante


def test_campo_vazio_nao_vira_zero_e_entrada_invalida_e_recusada():
    d = dados("D")
    d["galpoes"][0]["receita_terceiros"] = None
    corpo = cliente.post("/api/simulacoes", json=d).json()
    assert corpo["status"] == "dados_incompletos" and corpo["consolidado"]["resultado"] is None
    d["galpoes"][0]["receita_terceiros"] = -1
    assert cliente.post("/api/simulacoes", json=d).status_code == 422
    assert cliente.post("/api/simulacoes", json={"estrutura": "E"}).status_code == 422
    assert cliente.post("/api/simulacoes", json={"campo_desconhecido": 1}).status_code == 422
    assert cliente.post("/api/simulacoes", json={}).json()["status"] == "aguardando_selecao"


def test_comparacao_entre_cenarios():
    a = dados("A", {"pj1": "lucro_real", "pj2": "simples_das"})
    corpo = cliente.post("/api/comparacoes", json={"cenarios": [a, dados("D")]}).json()
    assert len(corpo["resultados"]) == 2 and len(corpo["diferencas"]) == 1
    assert corpo["diferencas"][0]["consolidado"]["resultado"] is not None
