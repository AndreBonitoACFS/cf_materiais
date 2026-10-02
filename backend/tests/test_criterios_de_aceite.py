"""Critérios de aceite de 04_TESTES_E_EXEMPLOS.md."""
import re
from decimal import Decimal
from pathlib import Path

import pytest

from conftest import base_cf, dados, pj, rodar
from motor import Status, combinacoes, comparar
from motor.estados import COM_VALORES
from motor.estrutura import Atividade
from motor.ibs_cbs import apurar, tributo_embutido
from motor.lucro import lucro_presumido
from motor.simples import apurar_simples, rbt12_mensal

D = Decimal


def test_112_combinacoes_sao_aceitas():
    todas = list(combinacoes())
    assert len(todas) == 112
    for estrutura, regimes in todas:
        r = rodar(dados(estrutura.value, {id: reg.value for id, reg in regimes.items()}))
        assert r.status in COM_VALORES, (estrutura, regimes, r.pendencias)
        assert len(r.empresas) == (3 if estrutura.value == "D" else 2)
        c = r.consolidado
        assert c.receita_externa - c.custos_externos - c.tributos == c.resultado
        assert c.resultado == sum(e.resultado for e in r.empresas)


def test_regimes_mistos_sao_independentes():
    a = rodar(dados("D", {"pj1": "lucro_real", "pj2": "lucro_presumido", "pj3": "simples_das"}))
    b = rodar(dados("D", {"pj1": "lucro_real", "pj2": "simples_das", "pj3": "simples_das"}))
    assert [e.regime.value for e in b.empresas] == ["lucro_real", "simples_das", "simples_das"]
    assert pj(a, "pj3").tributos == pj(b, "pj3").tributos
    assert pj(a, "pj2").tributos != pj(b, "pj2").tributos


def test_tres_galpoes_formam_um_unico_cnpj(p):
    d = dados("D", {"pj1": "lucro_real", "pj2": "lucro_presumido", "pj3": "lucro_real"})
    for g in d["galpoes"]:
        g.update(receita_cf=0, receita_terceiros=100000)
    armazenagem = pj(rodar(d), "pj2")
    assert armazenagem.receita == D("3600000.00")
    # Base de 32% × 3,6 mi = 1.152.000: um único adicional de IRPJ, não três.
    unico = lucro_presumido({Atividade.ARMAZENAGEM: D(3600000)}, {Atividade.ARMAZENAGEM: (D("0.32"), D("0.32"))}, p)
    assert armazenagem.tributos["IRPJ"] == unico.irpj == D("264000.00")


@pytest.mark.parametrize("estrutura,interna", [("B", "logistica"), ("C", "armazenagem")])
def test_servico_interno_a_cf_nao_gera_receita_tributo_nem_credito(estrutura, interna):
    regimes = {"pj1": "lucro_real", "pj2": "lucro_real"}
    com, sem = dados(estrutura, regimes), dados(estrutura, regimes)
    if interna == "logistica":
        sem["logistica"]["receita_cf"] = 0
    else:
        for g in sem["galpoes"]:
            g["receita_cf"] = 0
    a, b = rodar(com), rodar(sem)
    # O valor destinado à própria CF é referência interna: não altera nada na PJ 1.
    assert pj(a, "pj1").receita == pj(b, "pj1").receita
    assert pj(a, "pj1").tributos == pj(b, "pj1").tributos
    assert pj(a, "pj1").creditos_utilizados == pj(b, "pj1").creditos_utilizados
    assert pj(a, "pj1").resultado == pj(b, "pj1").resultado


@pytest.mark.parametrize("estrutura", ["A", "D"])
def test_servicos_entre_pjs_sao_eliminados_e_tributos_permanecem(estrutura):
    ids = ("pj1", "pj2", "pj3") if estrutura == "D" else ("pj1", "pj2")
    r = rodar(dados(estrutura, dict.fromkeys(ids, "lucro_real")))
    faturado_a_cf = D(12 * (10000 + 5000 + 0 + 12000))
    assert sum(e.receita_entre_pjs for e in r.empresas) == faturado_a_cf
    assert pj(r, "pj1").despesas_entre_pjs == faturado_a_cf
    assert r.consolidado.receita_externa == sum(e.receita for e in r.empresas) - faturado_a_cf
    assert r.consolidado.tributos == sum(e.total_tributos for e in r.empresas)
    assert r.consolidado.resultado == sum(e.resultado for e in r.empresas)
    assert pj(r, "pj2").tributos["ISS"] > 0  # o tributo da operação interna não desaparece


def test_receita_de_terceiros_entra_uma_unica_vez():
    regimes = {"pj1": "lucro_real", "pj2": "lucro_real"}
    r = rodar(dados("B", regimes))
    assert r.consolidado.receita_externa == D(12 * (200000 + 45000 + 20000))
    # Receita que já constava da base da CF: a ponte a retira uma vez.
    d = dados("B", regimes)
    for base in d["config"]["bases_cf"]:
        base["ajustes_ponte"] = [{"id": "rec-log", "tipo": "receita_duplicada", "descricao": "Fretes a terceiros", "valor_anual": 240000}]
    assert pj(r, "pj1").resultado_antes_irpj_csll - pj(rodar(d), "pj1").resultado_antes_irpj_csll == D(240000)


def test_custo_antigo_substituido_sai_uma_vez_e_ajuste_nao_se_repete():
    d = dados("A", {"pj1": "simples_das", "pj2": "simples_das"})
    antes = pj(rodar(d), "pj1").resultado
    ajuste = {"id": "frete-antigo", "tipo": "custo_antigo_substituido", "descricao": "Frete antigo", "valor_anual": 100000}
    for base in d["config"]["bases_cf"]:
        base["ajustes_ponte"] = [ajuste]
    assert pj(rodar(d), "pj1").resultado - antes == D(100000)
    d["config"]["bases_cf"][0]["ajustes_ponte"] = [ajuste, ajuste]
    with pytest.raises(ValueError):
        rodar(d)


def test_valor_e_quantidade_da_frota_nao_viram_custo():
    regimes = {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "lucro_real"}
    a, b = dados("D", regimes), dados("D", regimes)
    b["logistica"].update(valor_frota=9000000, quantidade_veiculos=40)
    assert pj(rodar(a), "pj3").custos == pj(rodar(b), "pj3").custos
    b["logistica"]["depreciacao_anual"] = 12000 + 5000  # a depreciação entra uma vez
    assert pj(rodar(b), "pj3").custos - pj(rodar(a), "pj3").custos == D(5000)


def test_pessoal_direto_ou_terceirizado_sem_manter_as_duas_despesas():
    regimes = {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "lucro_real"}
    direto, terceirizado = dados("D", regimes), dados("D", regimes)
    terceirizado["pessoal"]["logistica"].update(forma="terceirizacao", preco_mensal=9000)
    fixos = D(12 * 8000 + 12000)
    assert pj(rodar(direto), "pj3").custos == fixos + D(5000) * 12 * D("1.60")
    assert pj(rodar(terceirizado), "pj3").custos == fixos + D(9000) * 12


def test_cpp_nao_e_cobrada_fora_do_das_no_simples():
    lr = rodar(dados("D", {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "lucro_real"}))
    sn = rodar(dados("D", {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "simples_das"}))
    fixos = D(12 * 8000 + 12000)
    assert pj(sn, "pj3").custos == fixos + D(5000) * 12 * D("1.35")  # encargos sem CPP patronal
    assert pj(lr, "pj3").custos == fixos + D(5000) * 12 * D("1.60")


def test_alterar_presuncao_nao_modifica_lucro_real_nem_simples(p):
    alterado = p.com_valores(presuncao_irpj_armazenagem=D("0.50"), presuncao_csll_armazenagem=D("0.50"))
    for regime, muda in (("lucro_real", False), ("simples_das", False), ("simples_regular", False), ("lucro_presumido", True)):
        d = dados("D", {"pj1": "lucro_real", "pj2": regime, "pj3": "lucro_real"})
        assert (pj(rodar(d), "pj2").tributos != pj(rodar(d, alterado), "pj2").tributos) is muda


@pytest.mark.parametrize("receita,fator", [("4999999.99", "1"), ("5000000", "1"), ("5000000.01", None), ("10000000", "1.05")])
def test_limite_da_lc_224_por_cnpj(receita, fator, p):
    r = lucro_presumido({Atividade.LOGISTICA: D(receita)}, {Atividade.LOGISTICA: (D("0.08"), D("0.12"))}, p)
    if fator is None:
        assert r.fator_lc224 > 1
    else:
        assert r.fator_lc224 == D(fator)
    assert lucro_presumido({Atividade.LOGISTICA: D(0)}, {Atividade.LOGISTICA: (D("0.08"), D("0.12"))}, p).total == 0


def test_simples_mesma_receita_anual_com_sazonalidade_gera_das_distinto(p):
    uniforme = {Atividade.ARMAZENAGEM: [D(100000)] * 12}
    sazonal = {Atividade.ARMAZENAGEM: [D(190000)] * 6 + [D(10000)] * 6}
    a = apurar_simples(uniforme, nova=True, regular=False, historico=None, p=p)
    b = apurar_simples(sazonal, nova=True, regular=False, historico=None, p=p)
    assert sum(uniforme[Atividade.ARMAZENAGEM]) == sum(sazonal[Atividade.ARMAZENAGEM])
    assert a.das_anual != b.das_anual


def test_rbt12_com_defasagem_e_regra_de_inicio():
    historico = tuple(D(i) for i in range(1, 14))  # dez./2025 = 1 … dez./2026 = 13
    ano = [D(100)] * 12
    existente = rbt12_mensal(ano, nova=False, historico=historico)
    assert existente[0] == sum(range(1, 13))  # jan./2027: dez./2025 a nov./2026
    assert existente[1] == sum(range(2, 14))  # fev./2027: jan. a dez./2026
    assert existente[2] == sum(range(3, 14)) + 100  # mar./2027: fev./2026 a jan./2027
    nova = rbt12_mensal([D(10), D(30), D(50)] + [D(0)] * 9, nova=True, historico=None)
    assert nova[:2] == [None, None]  # meses 1 e 2 na primeira faixa
    assert nova[2] == D(10) * 12  # mês 3: receita de janeiro anualizada
    assert nova[3] == D(20) * 12  # mês 4: média de jan. e fev. anualizada


def test_sublimite_empresa_nova(p):
    def ap(mensal):
        return apurar_simples({Atividade.ARMAZENAGEM: [D(mensal)] * 12}, nova=True, regular=False, historico=None, p=p)

    assert not any(m.impedido for m in ap(300000).meses)  # 3,6 mi: no sublimite
    assert not any(m.impedido for m in ap(360000).meses)  # 4,32 mi: excesso de até 20%, efeito no ano seguinte
    impedida = ap(370000)  # 4,44 mi: mais de 20% acima, efeito retroativo ao início
    assert all(m.impedido for m in impedida.meses)
    for mes in impedida.meses:
        componentes = mes.por_atividade[Atividade.ARMAZENAGEM]
        assert "ISS" not in componentes and "IBS" not in componentes and "CBS" in componentes


def test_sublimite_fora_do_das_e_cobrado_a_parte():
    d = dados("D", {"pj1": "lucro_real", "pj2": "simples_das", "pj3": "lucro_real"})
    for g in d["galpoes"]:
        g.update(receita_cf=0, receita_terceiros=125000)  # 4,5 mi no ano
    armazenagem = pj(rodar(d), "pj2")
    assert armazenagem.tributos["ISS"] == D(4500000) * D("0.05")
    assert armazenagem.tributos["IBS"] == D(4500000) * D("0.001")


def test_sublimite_empresa_existente_vale_a_partir_do_mes_seguinte(p):
    receitas = {Atividade.COMERCIO: [D(400000)] * 12}  # acumula 4,4 mi (> 4,32 mi) em novembro
    ap = apurar_simples(receitas, nova=False, regular=False, historico=(D(250000),) * 13, p=p)
    assert [m.impedido for m in ap.meses] == [False] * 11 + [True]
    anterior_acima = apurar_simples({Atividade.COMERCIO: [D(100000)] * 12}, nova=False, regular=False, historico=(D(320000),) * 13, p=p)
    assert all(m.impedido for m in anterior_acima.meses)  # 2026 acima do sublimite afeta 2027


def test_limite_do_simples():
    def com_receita_mensal(valor, regime="simples_das"):
        d = dados("D", {"pj1": "lucro_real", "pj2": regime, "pj3": "lucro_real"})
        for g in d["galpoes"]:
            g.update(receita_cf=0, receita_terceiros=valor)
        return pj(rodar(d), "pj2")

    assert com_receita_mensal(140000).status in COM_VALORES  # 5,04 mi: até 20% acima, efeito no ano seguinte
    excedida = com_receita_mensal(170000)  # 6,12 mi: mais de 20% acima
    assert excedida.status is Status.HIPOTESE_NAO_MODELADA and excedida.resultado is None

    d = dados("D", {"pj1": "simples_das", "pj2": "lucro_real", "pj3": "lucro_real"})
    d["config"]["bases_cf"] = [base_cf("simples_das", historico_receita=[450000] * 13)]
    cf = pj(rodar(d), "pj1")
    assert cf.status is Status.INELEGIVEL and "limite" in cf.motivos[0]

    d["config"]["bases_cf"] = [base_cf("simples_das", receita_comercio=500000)]
    r = rodar(d)
    assert pj(r, "pj1").status is Status.HIPOTESE_NAO_MODELADA  # mudança de regime da CF durante 2027
    assert r.consolidado.resultado is None and r.status is Status.HIPOTESE_NAO_MODELADA


def test_nenhum_vestigio_do_recurso_descartado():
    raiz = Path(__file__).parents[1]
    padrao = re.compile(r"cost[\s_-]*sharing|centralizadora|reembolso", re.IGNORECASE)
    for arquivo in [*raiz.glob("motor/**/*"), *raiz.glob("api/**/*.py")]:
        if arquivo.is_file() and arquivo.suffix in (".py", ".json"):
            assert not padrao.search(arquivo.read_text(encoding="utf-8")), arquivo


def test_das_total_nao_e_credito_e_adquirente_no_das_nao_tem_credito():
    d = dados("A", {"pj1": "lucro_real", "pj2": "simples_das"})
    cf = pj(rodar(d), "pj1")
    das_fornecedor = pj(rodar(d), "pj2").tributos["DAS"]
    assert 0 < cf.creditos_utilizados["IBS"] + cf.creditos_utilizados["CBS"] < das_fornecedor / 4
    d["config"]["credito_fornecedor_das_reconhecido"] = None  # não configurado: nenhum crédito presumido
    r = rodar(d)
    assert pj(r, "pj1").creditos_utilizados == {} and r.status is Status.SIMULACAO_PROVISORIA
    no_das = pj(rodar(dados("A", {"pj1": "simples_das", "pj2": "lucro_real"})), "pj1")
    assert no_das.creditos_utilizados == {} and "IBS" not in no_das.tributos


def test_credito_da_cf_compensa_tambem_o_debito_do_comercio():
    cf = pj(rodar(dados("A", {"pj1": "lucro_real", "pj2": "lucro_real"})), "pj1")
    credito_cbs = D(12 * 27000) * D("0.088")
    assert cf.creditos_utilizados["CBS"] == credito_cbs
    assert cf.tributos["CBS"] == -credito_cbs  # efeito incremental sobre o débito embutido na base


def test_comparacao_entre_estruturas_remapeia_ou_suspende():
    a = rodar(dados("A", {"pj1": "lucro_real", "pj2": "lucro_real"}))
    d = rodar(dados("D", {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "lucro_real"}))
    comparacao = comparar(a, d)
    assert comparacao["consolidado"]["resultado"] == d.consolidado.resultado - a.consolidado.resultado
    por_papel = {e["papel"]: e for e in comparacao["empresas"]}
    assert por_papel["comercio"]["diferenca_resultado"] is not None
    assert por_papel["armazenagem"]["diferenca_resultado"] is None and por_papel["armazenagem"]["motivo"]


def test_configuracao_por_empresa_nao_e_reaproveitada_quando_o_papel_muda():
    regimes = {"pj1": "lucro_real", "pj2": "lucro_real"}
    a = dados("A", regimes)
    a["config"]["por_papel"] = {"armazenagem+logistica": {"adicoes_irpj": 500000, "adicoes_csll": 500000}}
    b = dados("B", regimes)
    b["config"]["por_papel"] = a["config"]["por_papel"]
    assert pj(rodar(a), "pj2").tributos["IRPJ"] > pj(rodar(dados("A", regimes)), "pj2").tributos["IRPJ"]
    assert pj(rodar(b), "pj2").tributos == pj(rodar(dados("B", regimes)), "pj2").tributos


def test_branco_bloqueia_e_zero_e_dado_informado():
    regimes = {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "lucro_real"}
    d = dados("D", regimes)
    d["logistica"]["combustivel"] = None
    r = rodar(d)
    logistica = pj(r, "pj3")
    assert logistica.status is Status.DADOS_INCOMPLETOS and logistica.resultado is None and logistica.tributos == {}
    assert "Logística: combustível" in logistica.motivos
    assert r.consolidado.resultado is None
    d["logistica"]["combustivel"] = 0
    assert pj(rodar(d), "pj3").status in COM_VALORES


def test_estados_de_selecao_e_configuracao_pendente():
    assert rodar({}).status is Status.AGUARDANDO_SELECAO
    assert rodar(dados("D", {"pj1": "lucro_real", "pj2": "lucro_real"})).status is Status.AGUARDANDO_SELECAO
    d = dados("D", {"pj1": "lucro_real", "pj2": "lucro_real", "pj3": "lucro_real"})
    d["config"]["iss_transporte_municipal"] = None  # parâmetro sem configuração não é zero
    assert pj(rodar(d), "pj3").status is Status.DADOS_INCOMPLETOS
    d["config"].update(transporte_enquadramento="intermunicipal_interestadual", icms_transporte="0.12")
    assert pj(rodar(d), "pj3").tributos["ICMS"] == D(12 * 32000) * D("0.12")
    d["regimes"]["pj3"] = "simples_das"
    assert pj(rodar(d), "pj3").status is Status.HIPOTESE_NAO_MODELADA
    d = dados("A", {"pj1": "lucro_presumido", "pj2": "lucro_real"})
    d["config"]["bases_cf"] = [base_cf("lucro_real")]
    cf = pj(rodar(d), "pj1")
    assert cf.status is Status.DADOS_INCOMPLETOS and "Lucro Presumido" in cf.motivos[0]


def test_confirmacoes_nao_removem_aproximacoes():
    r = rodar(dados("A", {"pj1": "lucro_real", "pj2": "lucro_real"}))
    assert r.status is Status.SIMULACAO_PROVISORIA  # CBS regular de 2027 é provisória
    assert any("CBS" in texto for texto in r.provisorio)
    assert any("estimativa anual" in texto for texto in r.hipoteses)
    sem_cbs = rodar(dados("A", {"pj1": "simples_das", "pj2": "simples_das"}))
    assert sem_cbs.status is Status.CALCULO_DISPONIVEL and sem_cbs.hipoteses


def test_receita_zero_nao_divide_por_zero():
    d = dados("D", {"pj1": "simples_das", "pj2": "simples_regular", "pj3": "lucro_presumido"})
    for g in d["galpoes"]:
        g.update(receita_cf=0, receita_terceiros=0)
    d["logistica"].update(receita_cf=0, receita_terceiros=0)
    r = rodar(d)
    assert r.status in COM_VALORES
    assert pj(r, "pj2").tributos["DAS"] == 0 and pj(r, "pj3").tributos["IRPJ"] == 0


def test_saldo_credor_e_transportado_sem_ressarcimento():
    meses = apurar([D(100), D(100), D(500)], [D(300), D(0), D(50)])
    assert [m.a_recolher for m in meses] == [0, 0, D(350)]
    assert [m.saldo_final for m in meses] == [D(200), D(100), 0]
    assert [m.utilizado for m in meses] == [D(100), D(100), D(150)]
    assert tributo_embutido(D("1089.00"), D("0.089")) == D("89.00")


def test_teto_do_iss_no_anexo_iii(p):
    # RBT12 de 3 mi na quinta faixa: efetiva 16,812% > gatilho de 14,92537%.
    receitas = {Atividade.ARMAZENAGEM: [D(250000)] * 12}
    ap = apurar_simples(receitas, nova=False, regular=False, historico=(D(250000),) * 13, p=p)
    mes = ap.meses[0]
    efetiva = mes.aliquotas["III"]
    assert efetiva == D("0.16812") and efetiva > p.obter("simples_iss_gatilho")
    componentes = mes.por_atividade[Atividade.ARMAZENAGEM]
    assert componentes["ISS"] == D(250000) * D("0.05")
    assert abs(mes.das - D(250000) * efetiva) <= D("0.03")  # a redistribuição preserva o total
