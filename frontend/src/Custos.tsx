import { Campo, Cartao, Grade, Selecao } from "./componentes";
import { numero, moeda, type Atividade, type Formulario } from "./modelo";

const CATEGORIAS: Record<Atividade, [string, string][]> = {
  comercio: [["cmv", "Mercadorias revendidas — CMV"], ["cpv", "Produtos fabricados — CPV"], ["csp", "Serviços próprios vendidos — CSP"]],
  armazenagem: [["materiais", "Insumos e materiais"], ["energia", "Energia e utilidades"], ["servicos", "Serviços adquiridos"], ["outros", "Outros custos não segregados"]],
  logistica: [["combustivel", "Combustível"], ["manutencao", "Manutenção, seguro e demais despesas"], ["outros", "Outros custos operacionais"]],
};
export function Custos({ form, setForm }: { form: Formulario; setForm: (f: Formulario) => void }) {
  const editar = (a: Atividade, nome: string, campo: string, valor: string) => setForm({ ...form, categorias: { ...form.categorias, [a]: { ...form.categorias?.[a], [nome]: { ...form.categorias?.[a]?.[nome], [campo]: valor } } } });
  const lg: Record<string, string | undefined> = { combustivel: form.logistica.combustivel, manutencao: form.logistica.manutencao, outros: form.logistica.outros_custos };
  return <Cartao titulo="Custos e créditos" nota="Estimativa sujeita à conferência. Salários, encargos e depreciação integram o custo, mas não geram crédito automático. Fornecedores no DAS e operações especiais ficam fora da parcela estimada pelas alíquotas regulares.">
    <Selecao rotulo="Método de crédito" valor={form.metodoCredito ?? "manter_projecao"} aoMudar={v => setForm({ ...form, metodoCredito: v as Formulario["metodoCredito"] })} opcoes={[["manter_projecao", "Manter projeção atual"], ["categorias", "Substituir créditos pelos das categorias"]]} />
    <p className="my-3 text-sm text-slate-600">Na CF, estes custos já integram a base e não serão descontados novamente. Na armazenagem, redistribua o total dos três galpões entre as categorias. A logística usa os custos já informados. Percentual vazio permanece desconhecido.</p>
    {(Object.keys(CATEGORIAS) as Atividade[]).map(a => <details key={a} className="mt-3 rounded-lg border p-3" open={form.metodoCredito === "categorias"}>
      <summary className="cursor-pointer font-medium">{a === "comercio" ? "CF Principal" : a === "armazenagem" ? "Armazenagem" : "Logística"}</summary>
      {CATEGORIAS[a].map(([nome, titulo]) => {
        const c = form.categorias?.[a]?.[nome] ?? {};
        let vinculado: string | null = null;
        try { if (a === "logistica") vinculado = numero(lg[nome]); } catch { /* campo operacional já mostra o erro */ }
        return <fieldset key={nome} className="mt-3" disabled={form.metodoCredito !== "categorias"}><Grade>
          {a === "logistica" ? <p className="text-sm">{titulo}<br />Custo vinculado: {moeda(vinculado)}/mês</p> : <Campo rotulo={titulo} unidade="R$/mês" valor={c.custo_bruto_mensal} aoMudar={v => editar(a, nome, "custo_bruto_mensal", v)} />}
          <Campo rotulo={`Parcela elegível — ${titulo}`} unidade="%" valor={c.percentual_elegivel} aoMudar={v => editar(a, nome, "percentual_elegivel", v)} />
        </Grade></fieldset>;
      })}
    </details>)}
  </Cartao>;
}
