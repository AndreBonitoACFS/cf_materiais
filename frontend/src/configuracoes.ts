import { formularioVazio, numero, paraApi, type Formulario } from "./modelo";

export const CHAVE = "cf-materiais-config-v3";
const VERSAO = 3;
const NUMERICOS = new Set(["receita_cf", "receita_terceiros", "custos_operacionais", "combustivel", "manutencao", "outros_custos", "depreciacao_anual", "quantidade_veiculos", "valor_frota", "quantidade_funcionarios", "remuneracao_media_mensal", "remuneracao_mensal", "custo_total_mensal", "encargos_no_simples", "encargos_fora_do_simples", "preco_mensal", "receita_comercio", "receita_sujeita_presuncao", "resultado_antes_irpj_csll_anual", "das_embutido_anual", "debito_ibs_mensal", "credito_ibs_mensal", "debito_cbs_mensal", "credito_cbs_mensal", "custo_pessoal_embutido_anual", "resultado_referencia_anual", "iss_transporte_municipal", "icms_transporte", "valor_anual", "adicoes_irpj", "exclusoes_irpj", "adicoes_csll", "exclusoes_csll", "custo_bruto_mensal", "percentual_elegivel"]);

function converter(v: unknown, importar: boolean, chave = ""): unknown {
  if (chave === "despesa_anual") return converter(v, importar, "valor_anual");
  if (chave === "origens") return v; // metadados originais não são entradas editáveis
  if (["receita", "presuncao", "resultado", "alimentacao", "pat_elegivel", "servicos", "aluguel", "acrescimos_irpj", "acrescimos_csll"].includes(chave)) return converter(v, importar, "valor_anual");
  if (chave === "demais_tributos_receita") return converter(v, importar, "percentual_elegivel");
  if (["cpp", "fgts", "ferias", "decimo_terceiro", "beneficios", "outros_encargos"].includes(chave)) return converter(v, importar, "percentual_elegivel");
  if (chave === "credito_adicional_ibs_mensal" || chave === "credito_adicional_cbs_mensal") return converter(v, importar, "credito_ibs_mensal");
  if (NUMERICOS.has(chave) && (v === null || typeof v !== "object")) {
    if (v === null || v === "") return importar ? "" : null;
    if (typeof v !== "string") throw new Error("Valores devem ser textos decimais para preservar precisão.");
    if (importar) {
      if (!/^-?\d+(\.\d+)?$/.test(v)) throw new Error("Valor decimal inválido na configuração.");
      return v.replace(".", ",");
    }
    return numero(v);
  }
  if (Array.isArray(v)) return v.map(x => converter(x, importar));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, converter(x, importar, k)]));
  return v;
}

export interface Configuracao { form: Formulario; original: Formulario | null; aviso?: string }
export function serializar(form: Formulario, original: Formulario | null) {
  paraApi(form);
  return JSON.stringify({ versao: VERSAO, formato: "decimal", form: converter(form, false), original: original ? converter(original, false) : null }, null, 2);
}
export function carregar(texto: string): Configuracao {
  const d = JSON.parse(texto);
  if (d.versao !== VERSAO || d.formato !== "decimal") throw new Error("Versão de configuração incompatível. A folha total antiga não será convertida em salário individual.");
  const validar = (v: unknown): Formulario => {
    const f = converter(v, true) as Formulario;
    if (!f || !["", "A", "B", "C", "D", "integrada"].includes(f.estrutura) || !Array.isArray(f.galpoes) || f.galpoes.length !== 3 || !f.pessoal || !f.bases || !f.config || !f.porPapel || !f.regimes) throw new Error("Arquivo de configuração incompleto.");
    for (const a of ["comercio", "armazenagem", "logistica"] as const) if (!f.pessoal[a]) throw new Error("Configuração de pessoal ausente.");
    if (Object.values(f.regimes).some(r => !["", "simples_das", "simples_regular", "lucro_presumido", "lucro_real"].includes(r))) throw new Error("Regime inválido.");
    paraApi(f);
    return f;
  };
  return { form: validar(d.form), original: d.original ? validar(d.original) : null };
}
export function lerTrabalho(): Configuracao {
  try { const texto = localStorage.getItem(CHAVE); if (texto) {
    const d = JSON.parse(texto);
    if (d.versao === VERSAO && d.formato === "rascunho_pt_br" && d.form?.galpoes?.length === 3 && d.form?.pessoal && d.form?.regimes && d.form?.config && d.form?.bases && d.form?.porPapel) return { form: d.form, original: d.original };
    return carregar(texto);
  } }
  catch { return { form: formularioVazio(), original: null, aviso: "A configuração anterior não pôde ser carregada. Ela foi preservada no navegador; importe uma cópia compatível antes de iniciar novas edições." }; }
  return { form: formularioVazio(), original: null };
}
export function salvarTrabalho(form: Formulario, original: Formulario | null) {
  localStorage.setItem(CHAVE, JSON.stringify({ versao: VERSAO, formato: "rascunho_pt_br", form, original }));
}
