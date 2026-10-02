"""Parâmetros tributários versionados por vigência, com fonte e situação de
validação. Ficam fora da interface; um parâmetro null não é zero."""
import json
from dataclasses import dataclass, replace
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from .estados import Indisponivel, Status

_PASTA = Path(__file__).parent / "parametros"

ROTULOS = {
    "iss_transporte_municipal": "Alíquota de ISS do transporte municipal",
    "icms_transporte": "Alíquota de ICMS do transporte intermunicipal/interestadual",
    "demais_tributos_receita": "Demais tributos sobre a receita",
}


@dataclass(frozen=True)
class Faixa:
    numero: int
    superior: Decimal
    nominal: Decimal
    deducao: Decimal
    partilha: dict


@dataclass(frozen=True)
class Parametros:
    versao: str
    vigencia_inicio: str
    vigencia_fim: str
    origem: dict
    valores: dict  # nome -> Decimal | None
    meta: dict  # nome -> {"fonte", "situacao"}
    anexos: dict  # "I" | "III" -> tuple[Faixa]
    residual_iii: dict

    def obter(self, nome: str) -> Decimal:
        valor = self.valores[nome]
        if valor is None:
            raise Indisponivel(
                Status.DADOS_INCOMPLETOS,
                [f"{ROTULOS.get(nome, nome)} não configurada (sem configuração não é zero)."],
            )
        return valor

    def com_valores(self, **novos) -> "Parametros":
        """Preenche parâmetros com valores configurados pela contabilidade."""
        valores, meta = dict(self.valores), dict(self.meta)
        for nome, valor in novos.items():
            if valor is not None:
                valores[nome] = valor
                meta[nome] = {"fonte": "Configuração da contabilidade", "situacao": "informado_pela_contabilidade"}
        return replace(self, valores=valores, meta=meta)

    def descrever(self) -> dict:
        return {
            "versao": self.versao,
            "vigencia": {"inicio": self.vigencia_inicio, "fim": self.vigencia_fim},
            "origem": self.origem,
            "parametros": {
                nome: {"valor": None if v is None else str(v), **self.meta[nome]} for nome, v in self.valores.items()
            },
        }


def _faixas(linhas) -> tuple:
    return tuple(
        Faixa(
            numero=l["faixa"],
            superior=Decimal(l["superior"]),
            nominal=Decimal(l["nominal"]),
            deducao=Decimal(l["deducao"]),
            partilha={t: Decimal(v) for t, v in l["partilha"].items()},
        )
        for l in linhas
    )


@lru_cache
def carregar(ano: int = 2027) -> Parametros:
    bruto = json.loads((_PASTA / f"{ano}.json").read_text(encoding="utf-8"))
    itens = bruto["parametros"]
    simples = bruto["simples"]
    return Parametros(
        versao=bruto["versao"],
        vigencia_inicio=bruto["vigencia"]["inicio"],
        vigencia_fim=bruto["vigencia"]["fim"],
        origem=bruto["origem"],
        valores={n: None if i["valor"] is None else Decimal(i["valor"]) for n, i in itens.items()},
        meta={n: {"fonte": i["fonte"], "situacao": i["situacao"]} for n, i in itens.items()},
        anexos={"I": _faixas(simples["anexo_I"]), "III": _faixas(simples["anexo_III"])},
        residual_iii={t: Decimal(v) for t, v in simples["residual_anexo_III_iss_limitado"].items()},
    )
