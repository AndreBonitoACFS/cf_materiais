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
  return <Cartao titulo="Custos e créditos" info={<>
    <p>Escolha o método de crédito:</p>
    <ul className="list-disc pl-5">
      <li><strong>Manter projeção atual</strong>: usa os créditos informados na configuração da contabilidade. Os campos abaixo ficam bloqueados.</li>
      <li><strong>Substituir créditos pelos das categorias</strong>: libera os campos abaixo.</li>
    </ul>
    <p>Para cada categoria, informe o custo médio mensal e o percentual desse custo que gera crédito. Não inclua salários, encargos nem depreciação.</p>
    <p>Na CF Principal, informe os custos que já estão na base; eles não são descontados de novo. Na Armazenagem, distribua entre as categorias o total dos três galpões. Na Logística, o custo vem do quadro Logística: informe só o percentual.</p>
    <p>Deixe o percentual vazio quando não souber. Se nenhuma parte do custo gerar crédito, digite 0.</p>
  </>}>
    <Selecao rotulo="Método de crédito" valor={form.metodoCredito ?? "manter_projecao"} aoMudar={v => setForm({ ...form, metodoCredito: v as Formulario["metodoCredito"] })} opcoes={[["manter_projecao", "Manter projeção atual"], ["categorias", "Substituir créditos pelos das categorias"]]} />
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
