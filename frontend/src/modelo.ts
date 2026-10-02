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

/** Converte "1.234,56" ou "1234.56" em texto decimal; "" vira null. */
export function numero(texto: string | undefined): string | null {
  const t = (texto ?? "").trim().replace(/\s|R\$/g, "");
  if (t === "") return null;
  return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
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
    return {
      forma: p.forma,
      remuneracao_mensal: numero(p.remuneracao_mensal),
      encargos_no_simples: percentual(p.encargos_no_simples),
      encargos_fora_do_simples: percentual(p.encargos_fora_do_simples),
      preco_mensal: numero(p.preco_mensal),
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
      bases_cf:
        base && regimeCf
          ? [
              {
                regime: regimeCf,
                ...nums(base.campos, [
                  "receita_comercio", "resultado_antes_irpj_csll_anual", "das_embutido_anual", "debito_ibs_mensal",
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
          nums(f.porPapel[e.papel] ?? {}, ["adicoes_irpj", "exclusoes_irpj", "adicoes_csll", "exclusoes_csll", "credito_ibs_mensal", "credito_cbs_mensal"]),
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
  memoria: { pj: string | null; etapa: string; descricao: string; formula: string | null; valor: string | null }[];
  parametros: { versao: string; vigencia: { inicio: string; fim: string } };
}

export interface Diferenca {
  consolidado: Record<string, string> | null;
  empresas: { papel: string; nome: string; diferenca_resultado: string | null; motivo: string | null }[];
  motivos: string[];
}

async function post<T>(caminho: string, corpo: unknown): Promise<T> {
  console.log(`[api] POST ${caminho} — enviado`, corpo);
  let resposta: Response;
  try {
    resposta = await fetch(caminho, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  } catch (e) {
    console.error(`[api] POST ${caminho} — sem resposta (a API está rodando na porta 8010?)`, e);
    throw e;
  }
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null);
    console.error(`[api] POST ${caminho} — erro ${resposta.status}`, erro);
    const detalhe = erro?.detail;
    const texto = Array.isArray(detalhe)
      ? detalhe.map((d: { loc: string[]; msg: string }) => `${d.loc.slice(1).join(" › ")}: ${d.msg}`).join("\n")
      : (detalhe ??
        // O proxy do Vite responde 5xx sem corpo quando não consegue conectar à API.
        (erro === null && resposta.status >= 500
          ? `Erro ${resposta.status} sem detalhe: a API não respondeu. Confira se ela está rodando na porta 8010 e veja o terminal do uvicorn.`
          : `Erro ${resposta.status}`));
    throw new Error(texto);
  }
  const dados = await resposta.json();
  console.log(`[api] POST ${caminho} — recebido`, dados);
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
