import { useRef, useState } from "react";
import { Cartao, Selecao } from "./componentes";
import { Dados } from "./Dados";
import {
  ESTRUTURAS, REGIMES, comparar, empresasDe, formularioVazio, comecarEmBranco, nomeAtividade, rotuloCenario, simular,
  type Diferenca, type Estrutura, type Formulario, type Regime, type Resultado,
} from "./modelo";
import { Comparacao, Resultados } from "./Resultados";
import { carregar, lerTrabalho, salvarTrabalho, serializar } from "./configuracoes";
import { exemploHipotetico } from "./perfis";
import { preencherReal, integradaVazia } from "./integrada";
import { DadosIntegrada } from "./DadosIntegrada";

const ETAPAS = ["Estrutura e regimes", "Dados", "Resultados"];

export default function App() {
  const [inicio] = useState(lerTrabalho);
  const [etapa, setEtapa] = useState(() => inicio.form.estrutura && empresasDe(inicio.form.estrutura).every(e => inicio.form.regimes[e.id]) ? 1 : 0);
  const [form, definirForm] = useState<Formulario>(inicio.form);
  const formAtual = useRef(form);
  const [original, setOriginal] = useState<Formulario | null>(inicio.original);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const versao = useRef(0);
  const requisicao = useRef(false);
  const [entradasCalculadas, setEntradasCalculadas] = useState<Formulario | null>(null);
  function setForm(novo: Formulario, origem = original) {
    versao.current += 1;
    definirForm(novo);
    formAtual.current = novo;
    setResultado(null);
    setEntradasCalculadas(null);
    setErro("");
    setComparacao(null);
    try { salvarTrabalho(novo, origem); }
    catch { setErro("Não foi possível guardar a cópia no navegador. Salve a configuração em arquivo."); }
  }
  const [preencher, setPreencher] = useState(false);
  const [guardados, setGuardados] = useState<Formulario[]>([]);
  const [comparacao, setComparacao] = useState<{ resultados: Resultado[]; diferencas: Diferenca[] } | null>(null);
  const [erro, setErro] = useState(inicio.aviso ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [substituicao, setSubstituicao] = useState<{ novo: Formulario; origem: Formulario | null } | null>(null);
  function substituir(novo: Formulario, origem: Formulario | null) {
    if (JSON.stringify(formAtual.current) !== JSON.stringify(formularioVazio())) {
      setSubstituicao({ novo, origem });
      return;
    }
    aplicarSubstituicao(novo, origem);
  }
  function aplicarSubstituicao(novo: Formulario, origem: Formulario | null) {
    setOriginal(origem);
    setForm(structuredClone(novo), origem);
    setGuardados([]);
    setEtapa(novo.estrutura && empresasDe(novo.estrutura).every(e => novo.regimes[e.id]) ? 1 : 0);
    setSubstituicao(null);
  }
  function salvarArquivo() {
    try {
      const blob = new Blob([serializar(form, original)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "cf-materiais-configuracao.json"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setErro((e as Error).message); }
  }

  const ativas = empresasDe(form.estrutura);
  const selecaoCompleta = form.estrutura !== "" && ativas.every((e) => form.regimes[e.id]);

  async function executar(acao: () => Promise<void>) {
    if (requisicao.current) return;
    requisicao.current = true;
    setErro("");
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      requisicao.current = false;
      setOcupado(false);
    }
  }

  const calcular = () =>
    executar(async () => {
      const invalido = document.querySelector<HTMLInputElement>('input[aria-invalid="true"]:not(:disabled)');
      if (invalido) {
        invalido.closest("details")?.setAttribute("open", "");
        invalido.focus();
        throw new Error("Confira o campo destacado antes de calcular.");
      }
      const revisao = versao.current;
      const entradas = structuredClone(form);
      const resposta = await simular(entradas);
      if (revisao !== versao.current) return;
      setResultado(resposta);
      setEntradasCalculadas(entradas);
      setEtapa(2);
    });

  const guardar = () =>
    executar(async () => {
      if (!resultado || !entradasCalculadas) return;
      if (guardados.length >= 8) throw new Error("Você pode comparar até 8 cenários. Limpe os cenários guardados para iniciar outra comparação.");
      const lista = [...guardados, structuredClone(entradasCalculadas)];
      const resposta = lista.length >= 2 ? await comparar(lista) : null;
      setGuardados(lista);
      setComparacao(resposta);
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Simulador tributário — CF Materiais 2027</h1>
        <p className="mt-1 text-sm text-slate-600">
          Simulação pontual de estruturas e regimes. Não substitui apuração fiscal nem parecer jurídico.
        </p>
      </header>
      {substituicao && <div role="dialog" aria-modal="true" aria-labelledby="confirmar-substituicao" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="max-w-md rounded-xl bg-white p-5 shadow-xl">
          <h2 id="confirmar-substituicao" className="font-semibold">Substituir os dados atuais?</h2>
          <p className="my-3 text-sm">A cópia de trabalho será substituída. Salve um arquivo antes se quiser conservar suas edições.</p>
          <div className="flex flex-wrap gap-3">
            <button autoFocus className="rounded-lg border px-3 py-2" onClick={() => setSubstituicao(null)}>Cancelar</button>
            <button className="rounded-lg border px-3 py-2" onClick={salvarArquivo}>Salvar cópia atual</button>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-white" onClick={() => aplicarSubstituicao(substituicao.novo, substituicao.origem)}>Confirmar substituição</button>
          </div>
        </div>
      </div>}
      {preencher && <Cartao titulo="Aplicar base real ECD/ECF 2025">
        <p>Escolha como aplicar os valores históricos. Estrutura e regime atuais serão preservados.</p>
        <button className="m-2 underline" onClick={()=>{setForm(preencherReal(form,true));setPreencher(false);}}>Preencher apenas campos vazios</button>
        <button className="m-2 underline" onClick={()=>{setForm(preencherReal(form,false));setPreencher(false);}}>Substituir pelos dados da base</button>
        <button className="m-2 underline" onClick={()=>setPreencher(false)}>Cancelar</button>
      </Cartao>}
      <Cartao titulo="Dados de partida" nota="A cópia de trabalho é guardada neste navegador. Dados pré-preenchidos continuam editáveis e não confirmam validações jurídicas.">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button className="underline" onClick={()=>setPreencher(true)}>Pré-preencher com base real — ECD/ECF 2025</button>
          <button className="underline" onClick={() => { const f = exemploHipotetico(); substituir(f, structuredClone(f)); }}>Usar dados pré-preenchidos — exemplo hipotético</button>
          <label className="cursor-pointer underline">Carregar demonstração Excel ou configuração
            <input className="sr-only" type="file" accept=".json,application/json" onChange={async e => {
              const arquivo = e.target.files?.[0]; e.target.value = "";
              if (!arquivo) return;
              try { const d = carregar(await arquivo.text()); substituir(d.form, d.original); }
              catch (erro) { setErro((erro as Error).message); }
            }} />
          </label>
          <button className="underline" onClick={salvarArquivo}>Salvar configuração em arquivo</button>
          <button className="underline" disabled={!original} onClick={() => original && substituir(original, original)}>Restaurar demonstração</button>
          <button className="underline" onClick={() => substituir(comecarEmBranco(form), null)}>Iniciar sem pré-preenchimento</button>
        </div>
        {form.perfil && <p className="mt-3 text-sm">{form.perfil.origem} · Ano {form.perfil.ano} · Configuração {form.perfil.data}<br />{form.perfil.aviso}</p>}
      </Cartao>

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
                  <div className="font-semibold">{id === "integrada" ? "CF integrada — um único CNPJ" : `Estrutura ${id}`}</div>
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
          {form.estrutura === "integrada" ? <>
          <div className="flex flex-wrap gap-3">{["LP","LR sem PAT","LR com PAT"].map((nome,i)=><button key={nome} className="rounded border p-2" onClick={()=>setForm({...form,regimes:{...form.regimes,pj1:i===0?"lucro_presumido":"lucro_real"},integrada:{...(form.integrada??integradaVazia()),pat:i===2}})}>Integrada / {nome}</button>)}</div>
          <DadosIntegrada form={form} setForm={setForm}/>
          <button className="underline" disabled={ocupado} onClick={()=>executar(async()=>{
            const revisao=versao.current;
            const fs=[0,1,2].map(i=>({...structuredClone(form),regimes:{...form.regimes,pj1:(i===0?"lucro_presumido":"lucro_real") as Regime},integrada:{...(structuredClone(form.integrada)??integradaVazia()),pat:i===2}}));
            const resposta=await comparar(fs); if(revisao!==versao.current)return;
            setGuardados(fs);setComparacao(resposta);setResultado(resposta.resultados[0]);setEntradasCalculadas(fs[0]);setEtapa(2);
          })}>Comparar Integrada / LP, LR sem PAT e LR com PAT</button>
          </> : <Dados form={form} setForm={setForm} />}
          <Acoes>
            <Botao aoClicar={calcular} desabilitado={ocupado}>
              {ocupado ? "Calculando…" : "Calcular"}
            </Botao>
          </Acoes>
        </div>
      )}

      {etapa === 2 && resultado && entradasCalculadas && (
        <div className="space-y-4">
          <Resultados resultado={resultado} titulo={rotuloCenario(entradasCalculadas)} />
          {entradasCalculadas.estrutura !== "integrada" && <button className="underline" disabled={ocupado} onClick={()=>executar(async()=>{
            const atual=structuredClone(entradasCalculadas);
            const controle={...structuredClone(atual),estrutura:"integrada" as Estrutura,integrada:{...(structuredClone(atual.integrada)??integradaVazia()),pat:false}};
            const revisao=versao.current;const fs=[controle,atual];const resposta=await comparar(fs);if(revisao!==versao.current)return;setGuardados(fs);setComparacao(resposta);
          })}>Comparar cisão com controle integrado do mesmo regime — sem PAT no controle</button>}
          <Acoes>
            <Botao aoClicar={guardar} desabilitado={ocupado || guardados.length >= 8} secundario>
              Guardar cenário para comparar
            </Botao>
          </Acoes>
          <p className="text-sm text-slate-600">{guardados.length}/8 cenários guardados para comparação nesta sessão. O formulário permanece na cópia de trabalho do navegador.</p>
          {guardados.length > 0 && (
            <Comparacao
              rotulos={guardados.map(rotuloCenario)}
              comparacao={comparacao}
              aoLimpar={() => {
                if (requisicao.current) return;
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
