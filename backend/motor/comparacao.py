"""Comparação entre cenários. Empresas são remapeadas pelo papel; quando o
papel não existe nos dois cenários, a diferença por empresa fica suspensa."""
from .estados import COM_VALORES
from .resultado import Resultado


def comparar(base: Resultado, outro: Resultado) -> dict:
    saida = {"consolidado": None, "empresas": [], "motivos": []}
    if base.consolidado.resultado is None or outro.consolidado.resultado is None:
        saida["motivos"].append("Diferença consolidada suspensa: há cenário sem resultado calculado.")
    else:
        saida["consolidado"] = {
            campo: None if getattr(outro.consolidado, campo) is None or getattr(base.consolidado, campo) is None else getattr(outro.consolidado, campo) - getattr(base.consolidado, campo)
            for campo in ("receita_externa", "custos_externos", "tributos", "resultado")
        }
    por_papel = {e.papel: e for e in base.empresas}
    for empresa in outro.empresas:
        par = por_papel.get(empresa.papel)
        if par is None:
            saida["empresas"].append({"papel": empresa.papel, "nome": empresa.nome, "diferenca_resultado": None,
                                      "motivo": "Sem empresa com o mesmo papel no cenário de base: diferença suspensa."})
        elif par.status not in COM_VALORES or empresa.status not in COM_VALORES or par.resultado is None or empresa.resultado is None:
            saida["empresas"].append({"papel": empresa.papel, "nome": empresa.nome, "diferenca_resultado": None,
                                      "motivo": "Resultado indisponível em um dos cenários."})
        else:
            saida["empresas"].append({"papel": empresa.papel, "nome": empresa.nome,
                                      "diferenca_resultado": empresa.resultado - par.resultado, "motivo": None})
    return saida
