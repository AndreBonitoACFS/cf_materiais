from decimal import Decimal
from motor.motor import _Contexto
from motor.resultado import para_dict


def test_memoria_distingue_moeda_fator_e_texto():
    ctx = _Contexto(None, None)
    ctx.nota("pj1", "Tributos", "Base", valor=Decimal("100.00"))
    ctx.nota("pj1", "Tributos", "Fator LC 224", valor="1.00", unidade="fator")
    ctx.nota("pj1", "Validação", "Situação", valor="confirmada")
    linhas = para_dict(ctx.memoria)
    assert [linha["unidade"] for linha in linhas] == ["moeda", "fator", "texto"]
    assert linhas[1]["valor"] == "1.00"
