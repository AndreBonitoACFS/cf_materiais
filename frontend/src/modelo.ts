// Estado do formulário e conversão para a API. Campos são texto: "" é campo
// vazio (enviado como null), "0" é zero informado.

export type Regime = "simples_das" | "simples_regular" | "lucro_presumido" | "lucro_real";
export type Estrutura = "A" | "B" | "C" | "D";
export type Atividade = "comercio" | "armazenagem" | "logistica";
type Texto = Record<string, string>;
export type SimNao = "" | "sim" | "nao";

export interface Ajuste {
  id: string;
  tipo: string;
  descricao: string;
  valor_anual: string;
}

export interface Base {
  campos: Texto;
  historico: string;
  ajustes: Ajuste[];
  reconciliacao_confirmada: boolean;
}

export interface Formulario {
  perfil?: { id: string; origem: string; ano: number; data: string; aviso: string; pendencias?: string[] };
  metodoCredito?: "manter_projecao" | "categorias";
  categorias?: Partial<Record<Atividade, Record<string, Texto>>>;
  creditoRegular?: Partial<Record<Atividade, SimNao>>;
  tributoAcrescido?: boolean;
  estrutura: Estrutura | "";
  regimes: Record<string, Regime | "">;
  galpoes: Texto[];
  logistica: Texto;
  pessoal: Record<Atividade, Texto>;
  bases: Partial<Record<Regime, Base>>; // uma base da CF por regime; não é reaproveitada entre regimes
  config: Texto;
  dedutibilidade: SimNao;
  creditoDas: SimNao;
  porPapel: Record<string, Texto>; // vinculada ao papel da empresa, não ao número da PJ
}

export const REGIMES: { id: Regime; nome: string; curto: string }[] = [
  { id: "simples_das", nome: "Simples Nacional — IBS/CBS no DAS", curto: "Simples (DAS)" },
  { id: "simples_regular", nome: "Simples Nacional — IBS/CBS no regime regular", curto: "Simples (regular)" },
  { id: "lucro_presumido", nome: "Lucro Presumido", curto: "Presumido" },
  { id: "lucro_real", nome: "Lucro Real", curto: "Real" },
];

const NOMES: Record<Atividade, string> = { comercio: "CF Principal", armazenagem: "Armazenagem", logistica: "Logística" };

export const ESTRUTURAS: Record<Estrutura, Record<string, Atividade[]>> = {
  A: { pj1: ["comercio"], pj2: ["logistica", "armazenagem"] },
  B: { pj1: ["comercio", "logistica"], pj2: ["armazenagem"] },
  C: { pj1: ["comercio", "armazenagem"], pj2: ["logistica"] },
  D: { pj1: ["comercio"], pj2: ["armazenagem"], pj3: ["logistica"] },
};

export interface Empresa {
  id: string;
  nome: string;
  papel: string;
  atividades: Atividade[];
}

export function empresasDe(estrutura: Estrutura | ""): Empresa[] {
  if (!estrutura) return [];
  return Object.entries(ESTRUTURAS[estrutura]).map(([id, atividades]) => ({
    id,
    atividades,
    nome: atividades.map((a) => NOMES[a]).join(" + "),
    papel: [...atividades].sort().join("+"),
  }));
}

export const nomeAtividade = (a: Atividade) => NOMES[a];
export const eRegular = (r: string) => r !== "" && r !== "simples_das";
export const eSimples = (r: string) => r.startsWith("simples");

export const baseVazia = (): Base => ({ campos: {}, historico: "", ajustes: [], reconciliacao_confirmada: false });

export const formularioVazio = (): Formulario => ({
  estrutura: "",
  regimes: {},
  galpoes: [{}, {}, {}],
  logistica: {},
  pessoal: { comercio: {}, armazenagem: {}, logistica: {} },
  bases: {},
  config: {},
  dedutibilidade: "",
  creditoDas: "",
  porPapel: {},
});

export function comecarEmBranco(atual: Formulario): Formulario {
  const f = formularioVazio();
  f.config = { ...atual.config, resultado_referencia_anual: "" };
  for (const a of ["comercio", "armazenagem", "logistica"] as Atividade[]) {
    for (const k of ["encargos_detalhados", "encargos_no_simples", "encargos_fora_do_simples", "cpp", "fgts", "ferias", "decimo_terceiro", "beneficios", "outros_encargos"]) {
      if (atual.pessoal[a][k] !== undefined) f.pessoal[a][k] = atual.pessoal[a][k];
    }
  }
  return f;
}

/** Padrão brasileiro: ponto agrupa milhares; vírgula separa centavos. */
export function numero(texto: string | undefined): string | null {
  const t = (texto ?? "").trim().replace(/\s|R\$/g, "");
  if (t === "") return null;
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(t)) {
    throw new Error("Informe um número no padrão brasileiro, como 25.000,50. Use vírgula para decimais.");
  }
  return t.replace(/\./g, "").replace(",", ".");
}

export function erroNumero(texto: string | undefined, unidade: string, permiteNegativo = false): string {
  try {
    const n = numero(texto);
    if (n === null) return "";
    if (!permiteNegativo && Number(n) < 0) return "Informe zero ou um valor positivo. O valor não pode ser negativo.";
    if (unidade === "%" && Number(n) > 100) return "Informe um percentual entre 0 e 100.";
    if ((unidade === "veículos" || unidade === "pessoas") && !Number.isInteger(Number(n))) return "Informe uma quantidade inteira.";
    return "";
  } catch (e) { return (e as Error).message; }
}

/** Percentual digitado ("35,5") em fração decimal exata ("0.355"), sem ponto flutuante. */
export function percentual(texto: string | undefined): string | null {
  const n = numero(texto);
  if (n === null || !/^\d+(\.\d+)?$/.test(n)) return n;
  const [inteiro, fracao = ""] = n.split(".");
  const digitos = inteiro.padStart(3, "0");
  return `${digitos.slice(0, -2)}.${digitos.slice(-2)}${fracao}`;
}

const nums = (t: Texto, campos: string[]) => Object.fromEntries(campos.map((c) => [c, numero(t[c])]));
const simNao = (v: SimNao) => (v === "" ? null : v === "sim");

export function paraApi(f: Formulario) {
  const ativas = empresasDe(f.estrutura);
  const regimeCf = f.regimes.pj1;
  const base = regimeCf ? f.bases[regimeCf] : undefined;
  const pessoal = (a: Atividade) => {
    const p = f.pessoal[a];
    if (!p.forma) return null;
    const quantidade = p.forma === "direta" && a !== "comercio" ? numero(p.quantidade_funcionarios) : null;
    const zeroEquipe = quantidade !== null && Number(quantidade) === 0;
    const usaEncargos = p.forma === "direta" && !zeroEquipe && !(a === "comercio" && p.custo_total_mensal);
    const simples = eSimples(f.regimes[ativas.find(e => e.atividades.includes(a))?.id ?? ""] ?? "");
    return {
      forma: p.forma,
      encargos_componentes: usaEncargos && p.encargos_detalhados === "sim" ? Object.fromEntries(["cpp", "fgts", "ferias", "decimo_terceiro", "beneficios", "outros_encargos"].map(k => [k, k === "cpp" && simples ? null : percentual(p[k])])) : {},
      equipe_por_quantidade: a !== "comercio",
      quantidade_funcionarios: quantidade,
      remuneracao_media_mensal: p.forma === "direta" && a !== "comercio" && !zeroEquipe ? numero(p.remuneracao_media_mensal) : null,
      remuneracao_mensal: p.forma === "direta" && a === "comercio" && !p.custo_total_mensal ? numero(p.remuneracao_mensal) : null,
      custo_total_mensal: p.forma === "direta" && a === "comercio" ? numero(p.custo_total_mensal) : null,
      encargos_no_simples: usaEncargos && p.encargos_detalhados !== "sim" ? percentual(p.encargos_no_simples) : null,
      encargos_fora_do_simples: usaEncargos && !simples && p.encargos_detalhados !== "sim" ? percentual(p.encargos_fora_do_simples) : null,
      preco_mensal: p.forma === "terceirizacao" ? numero(p.preco_mensal) : null,
    };
  };
  const historico = (base?.historico ?? "").split(/[;\n]+/).map((v) => numero(v)).filter((v) => v !== null);
  return {
    estrutura: f.estrutura || null,
    regimes: Object.fromEntries(ativas.map((e) => [e.id, f.regimes[e.id] || null])),
    galpoes: f.galpoes.map((g) => nums(g, ["receita_cf", "receita_terceiros", "custos_operacionais"])),
    logistica: {
      ...nums(f.logistica, ["receita_cf", "receita_terceiros", "combustivel", "manutencao", "outros_custos", "depreciacao_anual", "valor_frota"]),
      quantidade_veiculos: numero(f.logistica.quantidade_veiculos),
    },
    pessoal: { comercio: pessoal("comercio"), armazenagem: pessoal("armazenagem"), logistica: pessoal("logistica") },
    config: {
      demais_tributos_receita: percentual(f.config.demais_tributos_receita),
      validacoes_pendentes: f.perfil?.pendencias ?? [],
      metodo_credito: f.metodoCredito ?? "manter_projecao",
      categorias: f.metodoCredito === "categorias" ? Object.fromEntries(Object.entries(f.categorias ?? {}).map(([a, cats]) => [a, Object.fromEntries(Object.entries(cats).map(([nome, c]) => [nome, { custo_bruto_mensal: numero(c.custo_bruto_mensal), percentual_elegivel: percentual(c.percentual_elegivel) }]))])) : {},
      credito_regular_por_atividade: Object.fromEntries((["armazenagem", "logistica"] as Atividade[]).map(a => [a, simNao(f.creditoRegular?.[a] ?? "")])),
      preco_entre_pjs_com_tributo_acrescido: f.tributoAcrescido ?? false,
      bases_cf:
        base && regimeCf
          ? [
              {
                regime: regimeCf,
                ...nums(base.campos, [
                  "receita_comercio", "receita_sujeita_presuncao", "resultado_antes_irpj_csll_anual", "das_embutido_anual", "debito_ibs_mensal",
                  "credito_ibs_mensal", "debito_cbs_mensal", "credito_cbs_mensal", "custo_pessoal_embutido_anual",
                ]),
                historico_receita: historico.length ? historico : null,
                ajustes_ponte: base.ajustes.map((a) => ({ ...a, valor_anual: numero(a.valor_anual) ?? "" })),
                reconciliacao_confirmada: base.reconciliacao_confirmada,
              },
            ]
          : [],
      resultado_referencia_anual: numero(f.config.resultado_referencia_anual),
      transporte_enquadramento: f.config.transporte_enquadramento || null,
      iss_transporte_municipal: percentual(f.config.iss_transporte_municipal),
      icms_transporte: percentual(f.config.icms_transporte),
      dedutibilidade_entre_pjs_confirmada: simNao(f.dedutibilidade),
      credito_fornecedor_das_reconhecido: simNao(f.creditoDas),
      por_papel: Object.fromEntries(
        ativas.map((e) => [
          e.papel,
          nums(f.porPapel[e.papel] ?? {}, ["adicoes_irpj", "exclusoes_irpj", "adicoes_csll", "exclusoes_csll", "credito_ibs_mensal", "credito_cbs_mensal", "credito_adicional_ibs_mensal", "credito_adicional_cbs_mensal"]),
        ]),
      ),
    },
  };
}

// --- Respostas da API ---

export interface ResultadoPJ {
  id: string;
  nome: string;
  papel: string;
  regime: Regime | null;
  status: string;
  motivos: string[];
  receita: string | null;
  receita_entre_pjs: string | null;
  custos: string | null;
  despesas_entre_pjs: string | null;
  tributos: Record<string, string>;
  total_tributos: string | null;
  creditos_utilizados: Record<string, string>;
  saldo_credor_final: Record<string, string>;
  creditos_potenciais: Record<string, string>;
  creditos_utilizados_totais: Record<string, string>;
  pessoal: { atividade: string; quantidade: string | null; folha_anual: string; encargos_sem_cpp_anual: string; cpp_anual: string; custo_anual: string }[];
  pessoal_totais: Record<string, string>;
  resultado: string | null;
  ponte: { descricao: string; valor: string }[];
  apuracao_mensal: { mes: number; receita: string; rbt12: string | null; faixa: number; impedido_sublimite: boolean; das: string }[];
}

export interface Resultado {
  status: string;
  estrutura: Estrutura | null;
  empresas: ResultadoPJ[];
  consolidado: {
    status: string;
    receita_externa: string | null;
    custos_externos: string | null;
    tributos: string | null;
    resultado: string | null;
    referencia: string | null;
    diferenca: string | null;
  };
  pendencias: { mensagem: string; pj: string | null; bloqueante: boolean }[];
  hipoteses: string[];
  memoria: { pj: string | null; etapa: string; descricao: string; formula: string | null; valor: string | null; unidade: "moeda" | "fator" | "texto" }[];
  parametros: { versao: string; vigencia: { inicio: string; fim: string } };
}

export interface Diferenca {
  consolidado: Record<string, string> | null;
  empresas: { papel: string; nome: string; diferenca_resultado: string | null; motivo: string | null }[];
  motivos: string[];
}

async function post<T>(caminho: string, corpo: unknown): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  } catch {
    throw new Error("Não foi possível conectar ao simulador. Tente novamente em instantes.");
  }
  if (!resposta.ok) {
    throw new Error(resposta.status === 422
      ? "Confira os dados informados: valores, percentuais, histórico de receita e identificadores únicos dos ajustes."
      : "Não foi possível concluir o cálculo. Tente novamente em instantes.");
  }
  const dados = await resposta.json();
  return dados;
}

export const simular = (f: Formulario) => post<Resultado>("/api/simulacoes", paraApi(f));
export const comparar = (fs: Formulario[]) =>
  post<{ resultados: Resultado[]; diferencas: Diferenca[] }>("/api/comparacoes", { cenarios: fs.map(paraApi) });

const _moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/** Somente para exibição; os cálculos são feitos em Decimal no motor. */
export const moeda = (v: string | null | undefined) => (v == null ? "indisponível" : _moeda.format(Number(v)));

export const STATUS: Record<string, { nome: string; cor: string }> = {
  aguardando_selecao: { nome: "Aguardando seleção", cor: "bg-slate-200 text-slate-800" },
  dados_incompletos: { nome: "Dados incompletos", cor: "bg-amber-100 text-amber-900" },
  inelegivel: { nome: "Inelegível", cor: "bg-red-100 text-red-900" },
  hipotese_nao_modelada: { nome: "Hipótese não modelada", cor: "bg-purple-100 text-purple-900" },
  simulacao_provisoria: { nome: "Simulação provisória", cor: "bg-sky-100 text-sky-900" },
  calculo_disponivel: { nome: "Cálculo disponível", cor: "bg-emerald-100 text-emerald-900" },
};

export function rotuloCenario(f: Formulario): string {
  const curto = (r: string) => REGIMES.find((x) => x.id === r)?.curto ?? "—";
  return `Estrutura ${f.estrutura} · ${empresasDe(f.estrutura).map((e) => curto(f.regimes[e.id] ?? "")).join(" / ")}`;
}
