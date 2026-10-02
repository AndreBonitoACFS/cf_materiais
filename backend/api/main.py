"""API do simulador: valida entradas, executa o motor e devolve resultados,
memória de cálculo e pendências."""
import json
import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from motor import carregar, cenario_de_dict, comparar, para_dict, simular
from motor.estrutura import NOMES_REGIME, Estrutura, Regime, empresas

from . import schemas

# Diagnóstico no terminal do uvicorn. SIMULADOR_LOG=INFO reduz o detalhe; WARNING mostra só problemas.
logging.basicConfig(
    level=os.environ.get("SIMULADOR_LOG", "DEBUG").upper(),
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("simulador.api")

app = FastAPI(title="Simulador tributário CF Materiais 2027", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def _entrada_invalida(request: Request, erro: RequestValidationError):
    log.warning("422 em %s: entrada recusada pela validação", request.url.path)
    for e in erro.errors():
        log.warning("  %s: %s (recebido: %r)", " > ".join(map(str, e["loc"])), e["msg"], e.get("input"))
    return await request_validation_exception_handler(request, erro)


def _executar(cenario: schemas.Cenario):
    dados = cenario.model_dump(mode="json")
    log.debug("Cenário recebido:\n%s", json.dumps(dados, ensure_ascii=False, indent=2))
    try:
        resultado = simular(cenario_de_dict(dados))
    except ValueError as erro:
        log.warning("422: cenário recusado pelo motor: %s", erro)
        raise HTTPException(status_code=422, detail=str(erro)) from erro
    except Exception:
        log.exception("Erro inesperado no motor")
        raise
    log.info("Simulação concluída: estrutura=%s status=%s", dados["estrutura"], resultado.status.value)
    return resultado


@app.get("/api/estruturas")
def estruturas():
    return {
        "estruturas": [
            {"id": e.value, "empresas": [{"id": pj.id, "nome": pj.nome, "papel": pj.papel} for pj in empresas(e)]}
            for e in Estrutura
        ],
        "regimes": [{"id": r.value, "nome": NOMES_REGIME[r]} for r in Regime],
    }


@app.get("/api/parametros")
def parametros():
    return carregar(2027).descrever()


@app.post("/api/simulacoes")
def simulacao(cenario: schemas.Cenario):
    return para_dict(_executar(cenario))


@app.post("/api/comparacoes")
def comparacao(pedido: schemas.Comparacao):
    resultados = [_executar(c) for c in pedido.cenarios]
    return {
        "resultados": [para_dict(r) for r in resultados],
        "diferencas": [para_dict(comparar(resultados[0], r)) for r in resultados[1:]],
    }
