import { formularioVazio, numero, type Formulario } from "./modelo";

export const AVISO = "Base econômica de 2025 repetida para simular 2027, sem crescimento ou inflação. Não é previsão nem apuração fiscal de 2027.";
export const PENDENCIAS = [
  "Resultado ECD R$ 4.078.675,07 × ECF P150 R$ 4.075.757,04: diferença R$ 2.918,03 pendente de conciliação.",
  "Alimentação ECD R$ 473.779,29 × parecer R$ 483.077,87: diferença R$ 9.298,58. Lanches/copa não incluídos no candidato PAT.",
  "Receitas acessórias ECD × ajustes acessórios P200 zerados: conciliação fiscal pendente.",
  "PAT, folha/eSocial, créditos IBS/CBS, benefícios ZFM e reconstrução fiscal da DRE não confirmados.",
];
export function integradaVazia(): NonNullable<Formulario["integrada"]> {
  return { trimestres: Array.from({length:4}, () => ({})), pat:false, elegibilidade:"pendente", hipotese_pat:false, evidencia:"", origens:{} };
}
/** Média manual redistribuída uniformemente: trimestre = 3 × média, em decimal exato. */
export function trimestreDaMedia(texto:string):string {
  const s=(numero(texto)??"").replace(".",",");
  if (!s) return "";
  if (!/^\d+(,\d{1,2})?$/.test(s)) throw new Error("Informe a média mensal com até duas casas decimais.");
  const [a,b=""]=s.split(","); const c=(BigInt(a)*100n+BigInt(b.padEnd(2,"0")))*3n;
  return `${c/100n},${(c%100n).toString().padStart(2,"0")}`;
}
export function baseReal(): Formulario {
  const f = formularioVazio();
  f.estrutura = "integrada"; f.regimes = {pj1:"lucro_presumido"};
  f.integrada = integradaVazia();
  const receita = ["10227223,94","12089156,99","12901910,25","14186557,79"];
  const presuncao = ["9092778,76","11055488,23","11908251,25","13115017,12"];
  const resultado = ["1018109,75","1146733,62","1072630,56","841201,14"];
  const alimentacao = ["132965,51","123920,63","108116,96","108776,19"];
  f.integrada.trimestres = receita.map((r,i) => ({receita:r,presuncao:presuncao[i],resultado:resultado[i],alimentacao:alimentacao[i]}));
  const origem = (valor:string, fonte:string, conta:string) => ({valor_original:valor,unidade:"R$ anual",ano:2025,fonte,conta_registro:conta,transformacao:"Original anual em centavos; média mensal somente exibida = anual / 12; trimestres históricos preservados",validacao:"Histórico conferido no documento 07; validação fiscal pendente"});
  f.integrada.origens = {
    contas_analiticas: CONTAS_ECD,
    arquivos: {ecd: "SpedContabil-63715056000142_13200237307_11_20250101_20251231_G.txt",ecd_sha256:"abc75b4099d5f6ce26bc428422fcbcb41038c1af1104c5e296431ee1cd85a16f",ecf:"SpedECF-63715056000142-Original-dez.2025.txt",ecf_sha256:"9b4cbfca631eedc66f3dc338e2ed988b783e411dbee419802a52fcde7fac21b5"},
    receita:origem("49404848.97","ECD 2025","1974SPED I355 392823,392915,393007,393102"),
    cmv:origem("27195331.78","ECD 2025","2219SPED I355 392832,392922,393015,393111"),
    despesas:origem("13190941.20","ECD 2025","Soma contas analíticas de despesas do Anexo B; excluídos CMV, deduções de vendas e IRPJ/CSLL; inclui pessoal/encargos/alimentação"),
    aluguel_externo:origem("856059.22","ECD 2025","2667SPED I355 392867,392957,393051,393148; despesa já na DRE"),
    resultado:origem("4078675.07","ECD 2025","Soma analíticas Anexo B; excluídas 3430SPED/3437SPED"),
    presuncao:origem("45171535.36","ECF 2025","P200 código 4; linhas 8803,9828,10851,11874"),
    alimentacao:origem("473779.29","ECD 2025","2317SPED,2485SPED,2835SPED I355"),
    pessoal: {vendas:"1855142.57",administracao:"963655.38",logistica:"2759821.36",fonte:"ECD 2025 2247SPED/2744SPED/2408SPED; detalhamentos já incluídos na DRE"},
  };
  for (const [k, valores] of Object.entries({receita,presuncao,resultado,alimentacao})) {
    f.integrada.origens[k] = {...f.integrada.origens[k] as object,trimestres_originais:valores.map(v=>v.replace(",","."))};
  }
  f.perfil = {id:"ecd-ecf-2025-v07",origem:"ECD/ECF 2025 — documento 07",ano:2025,data:"06/10/2026",aviso:AVISO,pendencias:PENDENCIAS};
  return f;
}
/** Preserva seleção, zero manual e os campos que não pertencem ao perfil. */
export function preencherReal(atual:Formulario, apenasVazios:boolean):Formulario {
  const base = baseReal(); const f = structuredClone(atual);
  const vazia = JSON.stringify(atual) === JSON.stringify(formularioVazio());
  if (vazia) { f.estrutura=base.estrutura; f.regimes=base.regimes; }
  f.integrada ??= integradaVazia();
  base.integrada!.trimestres.forEach((q,i) => {
    for (const [k,v] of Object.entries(q)) if (!apenasVazios || f.integrada!.trimestres[i][k] == null || f.integrada!.trimestres[i][k] === "") f.integrada!.trimestres[i][k]=v;
  });
  f.integrada.origens = {
    contas_analiticas: CONTAS_ECD,
    arquivos: {ecd: "SpedContabil-63715056000142_13200237307_11_20250101_20251231_G.txt",ecd_sha256:"abc75b4099d5f6ce26bc428422fcbcb41038c1af1104c5e296431ee1cd85a16f",ecf:"SpedECF-63715056000142-Original-dez.2025.txt",ecf_sha256:"9b4cbfca631eedc66f3dc338e2ed988b783e411dbee419802a52fcde7fac21b5"},...f.integrada.origens,...base.integrada!.origens};
  f.perfil={...base.perfil!,pendencias:[...new Set([...(atual.perfil?.pendencias??[]),...PENDENCIAS])]};
  return f;
}

const CONTAS_ECD = [
  {
    "conta": "1974SPED",
    "nome": "Receita de Vendas",
    "saldo_original": "-49404848.97",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392823, 392915, 393007, 393102",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2002SPED",
    "nome": "Devolucao/Cancelamento Concedido",
    "saldo_original": "4612659.35",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392824, 392916, 393008, 393103",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2016SPED",
    "nome": "(-) PIS Faturamento",
    "saldo_original": "43615.94",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392825, 392917, 393009, 393104",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2023SPED",
    "nome": "(-) COFINS Faturamento",
    "saldo_original": "225416.01",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392826, 392918, 393010, 393105",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2037SPED",
    "nome": "(-) ICMS",
    "saldo_original": "380486.65",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392827, 392919, 393011, 393106",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2058SPED",
    "nome": "(-) Rendimento de Aplicacao Financeira",
    "saldo_original": "-4517.01",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392828, 392920, 393012, 393107",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2072SPED",
    "nome": "Descontos Obtidos",
    "saldo_original": "-7288.46",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392829, 393013, 393108",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2079SPED",
    "nome": "Juros Ativo",
    "saldo_original": "-12.40",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393109",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2170SPED",
    "nome": "Bonificacao",
    "saldo_original": "-200459.16",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392830, 392921, 393014, 393110",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2177SPED",
    "nome": "Outras Receitas Operacionais",
    "saldo_original": "-110000.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392831",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2219SPED",
    "nome": "(-) CMV",
    "saldo_original": "27195331.78",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392832, 392922, 393015, 393111",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2254SPED",
    "nome": "Salarios e Ordenados - Vendas",
    "saldo_original": "196580.31",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392833, 392923, 393016, 393112",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2268SPED",
    "nome": "Ferias - Vendas",
    "saldo_original": "74430.31",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392834, 392924, 393017, 393113",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2275SPED",
    "nome": "13º Salario - Vendas",
    "saldo_original": "36562.53",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392835, 392925, 393018, 393114",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2282SPED",
    "nome": "Indenizacao Trabalhista/Aviso Previo - Vendas",
    "saldo_original": "14390.84",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392836, 392926",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2289SPED",
    "nome": "INSS - Vendas",
    "saldo_original": "379711.17",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392837, 392927, 393019, 393115",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2303SPED",
    "nome": "FGTS - Vendas",
    "saldo_original": "107792.60",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392838, 392928, 393020, 393116",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2310SPED",
    "nome": "Vale Transporte - Vendas",
    "saldo_original": "64389.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392839, 392929, 393021, 393117",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2317SPED",
    "nome": "Vale Alimentacao/Refeicao - Vendas",
    "saldo_original": "35585.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392840, 392930, 393022, 393118",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2359SPED",
    "nome": "Hora Extra - Vendas",
    "saldo_original": "299565.25",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392841, 392931, 393023, 393119",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2366SPED",
    "nome": "Quebra de Caixa - Vendas",
    "saldo_original": "3534.69",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392842, 392932, 393024",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2380SPED",
    "nome": "Gratificacao - Vendas",
    "saldo_original": "172504.70",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392843, 392933, 393025, 393120",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2394SPED",
    "nome": "Comissao - Vendas",
    "saldo_original": "444613.73",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392844, 392934, 393026, 393121",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2401SPED",
    "nome": "FGTS Rescisorio - Vendas",
    "saldo_original": "25482.44",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392845, 392935, 393027, 393122",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2415SPED",
    "nome": "Salarios e Ordenados - Logistica",
    "saldo_original": "800732.61",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392846, 392936, 393028, 393123",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2436SPED",
    "nome": "Ferias - Logistica",
    "saldo_original": "134822.82",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392848, 392938, 393030, 393124",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2443SPED",
    "nome": "13º Salario - Logistica",
    "saldo_original": "112283.74",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392849, 392939, 393031, 393125",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2450SPED",
    "nome": "Indenizacao Trabalhista/Aviso Previo - Logistica",
    "saldo_original": "1182.45",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392850",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2457SPED",
    "nome": "INSS - Logistica",
    "saldo_original": "377757.48",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392851, 392940, 393032, 393126",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2464SPED",
    "nome": "Medicina Ocupacional - Logistica",
    "saldo_original": "120.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393127",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2471SPED",
    "nome": "FGTS - Logistica",
    "saldo_original": "108389.71",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392852, 392941, 393033, 393128",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2478SPED",
    "nome": "Vale Transporte - Logistica",
    "saldo_original": "126749.40",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392853, 392942, 393034, 393129",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2485SPED",
    "nome": "Vale Alimentacao/Refeicao - Logistica",
    "saldo_original": "335849.79",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392854, 392943, 393035, 393130",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2499SPED",
    "nome": "Assistencia Medica Hospitalar - Logistica",
    "saldo_original": "52735.35",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392855, 392944, 393036, 393131",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2506SPED",
    "nome": "Uniformes e Identificacoes - Logistica",
    "saldo_original": "24205.20",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393037, 393132",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2513SPED",
    "nome": "E.P.I - Logistica",
    "saldo_original": "1693.09",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393038, 393133",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2527SPED",
    "nome": "Hora Extra - Logistica",
    "saldo_original": "423134.78",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392856, 392945, 393039, 393134",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2548SPED",
    "nome": "Gratificacao - Logistica",
    "saldo_original": "12937.33",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392857, 392946, 393040, 393135",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2562SPED",
    "nome": "Comissao - Logistica",
    "saldo_original": "239381.08",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392947, 393041, 393136",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2429SPED",
    "nome": "FGTS Rescisorio - Logistica",
    "saldo_original": "7846.53",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392847, 392937, 393029",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2576SPED",
    "nome": "Agua e Esgoto",
    "saldo_original": "21895.82",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392858, 392948, 393042, 393137",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2583SPED",
    "nome": "Combustiveis e Lubrificantes",
    "saldo_original": "169257.59",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392859, 392949, 393043, 393138",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2590SPED",
    "nome": "Energia Eletrica",
    "saldo_original": "210501.17",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392860, 392950, 393044, 393139",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2597SPED",
    "nome": "Lanches e Refeicoes",
    "saldo_original": "129.69",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393140",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2604SPED",
    "nome": "Manutencao de Veiculos",
    "saldo_original": "89171.12",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392861, 392951, 393045, 393141",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2611SPED",
    "nome": "Manutencao e Conserv Instalacoes Proprias",
    "saldo_original": "234526.86",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392862, 392952, 393046, 393142",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2618SPED",
    "nome": "Frete",
    "saldo_original": "318626.50",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392863, 392953, 393047, 393143",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2625SPED",
    "nome": "Materiais de Expediente",
    "saldo_original": "156.74",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393144",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2639SPED",
    "nome": "Diaria de Motorista",
    "saldo_original": "62675.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392864, 392954, 393048, 393145",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2646SPED",
    "nome": "Seguro de Veiculo",
    "saldo_original": "12964.94",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392865, 392955, 393049, 393146",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2660SPED",
    "nome": "Seguranca e Vigilancia",
    "saldo_original": "50550.50",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392866, 392956, 393050, 393147",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2667SPED",
    "nome": "Aluguel de Imoveis",
    "saldo_original": "856059.22",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392867, 392957, 393051, 393148",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2681SPED",
    "nome": "Embalagens",
    "saldo_original": "24721.10",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392868, 392958, 393052, 393149",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2688SPED",
    "nome": "Rastreamento de Veiculos",
    "saldo_original": "633.03",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392869",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2695SPED",
    "nome": "Bens de pequeno valor",
    "saldo_original": "252.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393053",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2702SPED",
    "nome": "Devolucoes de Clientes",
    "saldo_original": "106.01",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393150",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2709SPED",
    "nome": "Aluguel Equipamentos e veiculos",
    "saldo_original": "9246.64",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392870, 392959, 393054",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2730SPED",
    "nome": "Propaganda e Publicidade",
    "saldo_original": "845956.11",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392871, 392960, 393055, 393151",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2751SPED",
    "nome": "Salarios e Ordenados - Adm",
    "saldo_original": "163544.47",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392872, 392961, 393056, 393152",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2758SPED",
    "nome": "Pro-Labore - Adm",
    "saldo_original": "53900.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392873, 392962, 393057, 393153",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2765SPED",
    "nome": "Ferias - Adm",
    "saldo_original": "79995.05",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392874, 392963, 393058, 393154",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2772SPED",
    "nome": "13º Salario - Adm",
    "saldo_original": "84683.84",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392875, 392964, 393059, 393155",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2779SPED",
    "nome": "Indenizacoes Aviso Previo/Trabalhistas - Adm",
    "saldo_original": "1642.43",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392876",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2800SPED",
    "nome": "Hora Extra - Adm",
    "saldo_original": "34410.91",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392877, 392965, 393060, 393156",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2814SPED",
    "nome": "INSS - Adm",
    "saldo_original": "78674.61",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392878, 392966, 393061, 393157",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2821SPED",
    "nome": "FGTS - Adm",
    "saldo_original": "19489.33",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392879, 392967, 393062, 393158",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2828SPED",
    "nome": "Vale Transporte - Adm",
    "saldo_original": "62244.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392880, 392968, 393063, 393159",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2835SPED",
    "nome": "Vale Alimentacao/Refeicao - Adm",
    "saldo_original": "102344.50",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392881, 392969, 393064, 393160",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2842SPED",
    "nome": "Seguro de Vida em Grupo - Adm",
    "saldo_original": "50002.72",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393065",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2849SPED",
    "nome": "Assistencia Medica e Hospitalar - Adm",
    "saldo_original": "59890.41",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392970, 393066, 393161",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2856SPED",
    "nome": "Uniformes e Identificacoes - Adm",
    "saldo_original": "5877.20",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393067",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2898SPED",
    "nome": "FGTS Rescisorio - Adm",
    "saldo_original": "3387.47",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393068",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3654SPED",
    "nome": "Gratificacao - Adm",
    "saldo_original": "163568.44",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392913, 393003, 393098, 393191",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2912SPED",
    "nome": "Assessoria Juridica - Adm",
    "saldo_original": "19884.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392882, 392971, 393069, 393162",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2919SPED",
    "nome": "Consultoria e Assessoria Contabil- Adm",
    "saldo_original": "39307.65",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392883, 392972",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2933SPED",
    "nome": "Limpeza e Conservacao - Adm",
    "saldo_original": "20109.33",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392884, 392973, 393070, 393163",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2940SPED",
    "nome": "Manutencao de Equipamentos - Adm",
    "saldo_original": "2216.54",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392974, 393164",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2947SPED",
    "nome": "Suporte de Sistemas e TI - Adm",
    "saldo_original": "84156.21",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392885, 392975, 393071, 393165",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2954SPED",
    "nome": "Agua, Esgoto e Taxas - Adm",
    "saldo_original": "2277.76",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392886, 393166",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2968SPED",
    "nome": "Bens de Pequeno Valor - Adm",
    "saldo_original": "1561.42",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392887, 392976",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2982SPED",
    "nome": "Combustiveis e Lubrificantes - Adm",
    "saldo_original": "40501.35",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392888, 392977, 393072",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "2996SPED",
    "nome": "Copias e Reproducoes Graficas - Adm",
    "saldo_original": "1000.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392978, 393073, 393167",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3010SPED",
    "nome": "Despesas c/ Custas Judiciais - Adm",
    "saldo_original": "3229.26",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392979, 393074, 393168",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3017SPED",
    "nome": "Despesa com Conducao/Taxi - Adm",
    "saldo_original": "1442.20",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392889, 392980, 393169",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3031SPED",
    "nome": "Doacoes Contribuicoes - Adm",
    "saldo_original": "70.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392890, 392981, 393075",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3059SPED",
    "nome": "Manutencao de Obras Concluidas - Adm",
    "saldo_original": "689968.80",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392891, 392982, 393076, 393170",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3073SPED",
    "nome": "Manutencao e Conser. de Instalacoes Proprias - Adm",
    "saldo_original": "3120.00",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393171",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3087SPED",
    "nome": "Materiais de Expediente - Adm",
    "saldo_original": "16571.93",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392892, 392983, 393077, 393172",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3122SPED",
    "nome": "Seguros Diversos - Adm",
    "saldo_original": "23819.65",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392893, 392984, 393078, 393173",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3136SPED",
    "nome": "Suprimentos de Copa - Adm",
    "saldo_original": "17163.44",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392894, 392985, 393079",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3143SPED",
    "nome": "Taxas e Emolumentos - Adm",
    "saldo_original": "10445.88",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392895, 392986, 393080, 393174",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3150SPED",
    "nome": "Telefone/ Internet - Adm",
    "saldo_original": "25992.90",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392896, 392987, 393081, 393175",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3157SPED",
    "nome": "Viagens e Estadias - Adm",
    "saldo_original": "4815.58",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392897",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3164SPED",
    "nome": "Mensalidades e Anuidades - Adm",
    "saldo_original": "2600.44",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392898, 392988, 393082, 393176",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3171SPED",
    "nome": "Despesas com Depreciacao /Amortizacao - Adm",
    "saldo_original": "213940.06",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392899, 392989, 393083, 393177",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3192SPED",
    "nome": "Servicos Prestados - Adm",
    "saldo_original": "705708.06",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392900, 392990, 393084, 393178",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3675SPED",
    "nome": "Despesa com Material de Consumo",
    "saldo_original": "57940.49",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393004, 393099",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3213SPED",
    "nome": "Alvara - Adm",
    "saldo_original": "4279.74",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392901, 392991, 393085",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3220SPED",
    "nome": "ICMS Diferenca de Aliquota - Adm",
    "saldo_original": "375.77",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392902, 392992, 393086, 393179",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3227SPED",
    "nome": "IPTU - Adm",
    "saldo_original": "17909.46",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392903, 392993, 393087, 393180",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3234SPED",
    "nome": "IPVA - Adm",
    "saldo_original": "35524.54",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392904, 392994, 393088, 393181",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3689SPED",
    "nome": "Taxa Suframa",
    "saldo_original": "91984.26",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393005, 393100, 393192",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3276SPED",
    "nome": "Despesas Bancarias - Adm",
    "saldo_original": "43583.89",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392905, 392995, 393089, 393182",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3283SPED",
    "nome": "IOC/ IOF - Adm",
    "saldo_original": "79774.42",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392906, 392996, 393090, 393183",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3290SPED",
    "nome": "Juros de Mora - Adm",
    "saldo_original": "11081.69",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392907, 392997, 393091, 393184",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3297SPED",
    "nome": "Multas - Adm",
    "saldo_original": "573.40",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 393092, 393185",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3311SPED",
    "nome": "Taxa de Cartao de Credito/Debito - Adm",
    "saldo_original": "1147567.70",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392908, 392998, 393093, 393186",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3318SPED",
    "nome": "Juros s/ Emprestimos e Financiamentos - Adm",
    "saldo_original": "409339.15",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392909, 392999, 393094, 393187",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3381SPED",
    "nome": "Perdas/ Roubo",
    "saldo_original": "875054.88",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392910, 393000, 393095, 393188",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3430SPED",
    "nome": "IRPJ",
    "saldo_original": "881017.12",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392911, 393001, 393096, 393189",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  },
  {
    "conta": "3437SPED",
    "nome": "CSLL",
    "saldo_original": "488731.38",
    "unidade": "R$ anual",
    "ano": 2025,
    "fonte": "ECD 2025",
    "registro": "I355: 392912, 393002, 393097, 393190",
    "transformacao": "D positivo; C negativo; resultado = inverso da soma, excluindo 3430SPED/3437SPED",
    "validacao": "Conferido no Anexo B do documento 07"
  }
];
