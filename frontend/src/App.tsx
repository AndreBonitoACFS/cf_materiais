import { useState } from "react";
import { Cartao, Selecao } from "./componentes";
import { Dados } from "./Dados";
import {
  ESTRUTURAS, REGIMES, comparar, empresasDe, formularioVazio, nomeAtividade, rotuloCenario, simular,
  type Diferenca, type Estrutura, type Formulario, type Regime, type Resultado,
} from "./modelo";
import { Comparacao, Resultados } from "./Resultados";

const ETAPAS = ["Estrutura e regimes", "Dados", "Resultados"];

export default function App() {
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState<Formulario>(formularioVazio);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [guardados, setGuardados] = useState<Formulario[]>([]);
  const [comparacao, setComparacao] = useState<{ resultados: Resultado[]; diferencas: Diferenca[] } | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const ativas = empresasDe(form.estrutura);
  const selecaoCompleta = form.estrutura !== "" && ativas.every((e) => form.regimes[e.id]);

  async function executar(acao: () => Promise<void>) {
    setErro("");
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      console.error("[app] ação falhou; formulário no momento do erro:", form, e);
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  const calcular = () =>
    executar(async () => {
      setResultado(await simular(form));
      setEtapa(2);
    });

  const guardar = () =>
    executar(async () => {
      const lista = [...guardados, structuredClone(form)];
      setGuardados(lista);
      setComparacao(lista.length >= 2 ? await comparar(lista) : null);
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Simulador tributário — CF Materiais 2027</h1>
        <p className="mt-1 text-sm text-slate-600">
          Simulação pontual de estruturas e regimes. Não substitui apuração fiscal nem parecer jurídico.
        </p>
      </header>

      <nav className="mb-6 flex gap-2">
        {ETAPAS.map((nome, i) => (
          <button
            key={nome}
            onClick={() => setEtapa(i)}
            disabled={(i >= 1 && !selecaoCompleta) || (i === 2 && !resultado)}
            className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${
              etapa === i ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"
            }`}
          >
            <span className="mr-2 font-semibold">{i + 1}</span>
            {nome}
          </button>
        ))}
      </nav>

      {erro && <pre className="mb-4 whitespace-pre-wrap rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{erro}</pre>}

      {etapa === 0 && (
        <div className="space-y-4">
          <Cartao titulo="Estrutura">
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(ESTRUTURAS) as Estrutura[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setForm({ ...form, estrutura: id })}
                  className={`rounded-lg border p-3 text-left ${form.estrutura === id ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-300"}`}
                >
                  <div className="font-semibold">Estrutura {id}</div>
                  <ul className="mt-1 text-sm text-slate-600">
                    {empresasDe(id).map((e) => (
                      <li key={e.id}>
                        {e.id.toUpperCase().replace("PJ", "PJ ")}: {e.nome}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </Cartao>
          {form.estrutura && (
            <Cartao titulo="Regime de cada empresa" nota="Cada CNPJ escolhe o seu regime de forma independente. Escolher uma opção não torna a empresa apta a utilizá-la.">
              <div className="grid gap-4 sm:grid-cols-3">
                {ativas.map((e) => (
                  <Selecao
                    key={e.id}
                    rotulo={`${e.id.toUpperCase().replace("PJ", "PJ ")} — ${e.atividades.map(nomeAtividade).join(" + ")}`}
                    valor={form.regimes[e.id] ?? ""}
                    aoMudar={(v) => setForm({ ...form, regimes: { ...form.regimes, [e.id]: v as Regime | "" } })}
                    opcoes={REGIMES.map((r) => [r.id, r.nome])}
                  />
                ))}
              </div>
            </Cartao>
          )}
          <Acoes>
            <Botao aoClicar={() => setEtapa(1)} desabilitado={!selecaoCompleta}>
              Informar dados
            </Botao>
          </Acoes>
        </div>
      )}

      {etapa === 1 && (
        <div className="space-y-4">
          <Dados form={form} setForm={setForm} />
          <Acoes>
            <Botao aoClicar={calcular} desabilitado={ocupado}>
              {ocupado ? "Calculando…" : "Calcular"}
            </Botao>
          </Acoes>
        </div>
      )}

      {etapa === 2 && resultado && (
        <div className="space-y-4">
          <Resultados resultado={resultado} titulo={rotuloCenario(form)} />
          <Acoes>
            <Botao aoClicar={guardar} desabilitado={ocupado} secundario>
              Guardar cenário para comparar
            </Botao>
          </Acoes>
          {guardados.length > 0 && (
            <Comparacao
              rotulos={guardados.map(rotuloCenario)}
              comparacao={comparacao}
              aoLimpar={() => {
                setGuardados([]);
                setComparacao(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Acoes({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}

function Botao(props: { aoClicar: () => void; desabilitado?: boolean; secundario?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.aoClicar}
      disabled={props.desabilitado}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 ${
        props.secundario ? "border border-slate-300 bg-white" : "bg-slate-900 text-white"
      }`}
    >
      {props.children}
    </button>
  );
}
