"""Estimativa de aquisições elegíveis; não altera o custo econômico existente."""
from decimal import Decimal
from .decimais import ZERO, MESES, soma
from .estrutura import Atividade
from .estados import Indisponivel, Status

NOMES = {
    Atividade.COMERCIO: ("cmv", "cpv", "csp"),
    Atividade.ARMAZENAGEM: ("materiais", "energia", "servicos", "outros"),
    Atividade.LOGISTICA: ("combustivel", "manutencao", "outros"),
}


def estimar(ctx, atividade):
    dados = ctx.cenario.config.categorias.get(atividade.value, {})
    custos, bases, faltantes = [], [], []
    lg = ctx.cenario.logistica
    vinculos = {"combustivel": lg.combustivel, "manutencao": lg.manutencao, "outros": lg.outros_custos}
    for nome in NOMES[atividade]:
        cat = dados.get(nome) or {}
        if atividade is Atividade.LOGISTICA:
            rec = vinculos[nome]
            custo = rec.anual() / MESES if rec.informado else None
        else:
            valor = cat.get("custo_bruto_mensal")
            custo = None if valor in (None, "") else Decimal(str(valor))
        perc = cat.get("percentual_elegivel")
        perc = None if perc in (None, "") else Decimal(str(perc))
        if custo is None or custo < 0 or (custo > 0 and perc is None) or (perc is not None and not ZERO <= perc <= 1):
            faltantes.append(f"Categorias de {atividade.value}: conferir custo e parcela elegível de {nome}.")
            continue
        custos.append(custo)
        bases.append(custo * (perc or ZERO) / (1 + ctx.p.obter("ibs") + ctx.p.obter("cbs")))
    if atividade is Atividade.ARMAZENAGEM:
        if not all(g.custos_operacionais.informado for g in ctx.cenario.galpoes):
            faltantes.append("Categorias da armazenagem: custos dos galpões ausentes.")
        elif abs(soma(custos) * MESES - soma(g.custos_operacionais.anual() for g in ctx.cenario.galpoes)) > Decimal("0.01"):
            faltantes.append("Reconciliação CSP: categorias da armazenagem diferem do custo dos três galpões.")
    if faltantes:
        raise Indisponivel(Status.DADOS_INCOMPLETOS, faltantes)
    base = soma(bases)
    return {"IBS": base * ctx.p.obter("ibs"), "CBS": base * ctx.p.obter("cbs")}
