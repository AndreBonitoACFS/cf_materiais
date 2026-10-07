import { erroNumero, moeda, numero } from "./modelo";
import { useId, useState, type ReactNode } from "react";

export function Cartao({ titulo, info, children }: { titulo: string; info?: ReactNode; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        {info && <BotaoInfo rotulo={titulo} aberto={aberto} alternar={() => setAberto(!aberto)} painel={id} />}
      </div>
      {info && aberto && <PainelInfo id={id}>{info}</PainelInfo>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Botão "i" que abre as instruções de preenchimento de um quadro. */
export function BotaoInfo(props: { rotulo: string; aberto: boolean; alternar: () => void; painel: string }) {
  return (
    <button
      type="button"
      aria-expanded={props.aberto}
      aria-controls={props.painel}
      aria-label={`Como preencher: ${props.rotulo}`}
      title="Como preencher"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.alternar(); }}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold italic ${
        props.aberto ? "border-slate-900 bg-slate-900 text-white" : "border-slate-400 text-slate-600 hover:bg-slate-100"
      }`}
    >
      i
    </button>
  );
}

export function PainelInfo({ id, children }: { id: string; children: ReactNode }) {
  return <div id={id} className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{children}</div>;
}

/** Instrução comum a todos os campos em reais. */
export const FORMATO_VALORES = "Digite os valores no padrão brasileiro: 25.000 são vinte e cinco mil reais e 25,50 são vinte e cinco reais e cinquenta centavos. Se o valor for zero, digite 0; um campo vazio é tratado como valor não informado.";

/** Campo numérico em texto: vazio permanece vazio (não é zero). */
export function Campo(props: { rotulo: string; unidade: string; valor: string | undefined; aoMudar: (v: string) => void; dica?: string }) {
  const id = useId();
  const erro = erroNumero(props.valor, props.unidade, /Resultado|Referência/i.test(props.rotulo));
  const reconhecido = !erro ? numero(props.valor) : null;
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{props.rotulo}</span>
      <span className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-slate-900">
        <input
          inputMode="decimal"
          aria-label={props.rotulo}
          aria-invalid={!!erro}
          aria-describedby={id}
          value={props.valor ?? ""}
          onChange={(e) => props.aoMudar(e.target.value)}
          className="w-full min-w-0 rounded-lg px-2 py-1.5 outline-none"
        />
        <span className="whitespace-nowrap px-2 text-xs text-slate-500">{props.unidade}</span>
      </span>
      <span id={id} className={`mt-0.5 block text-xs ${erro ? "text-red-700" : "text-slate-500"}`}>
        {erro || (reconhecido !== null && props.unidade.startsWith("R$") ? `Valor reconhecido: ${moeda(reconhecido)}` : "")}
      </span>
      {props.dica && <span className="mt-0.5 block text-xs text-slate-500">{props.dica}</span>}
    </label>
  );
}

export function Selecao(props: { rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: [string, string][]; vazio?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{props.rotulo}</span>
      <select
        value={props.valor}
        onChange={(e) => props.aoMudar(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5"
      >
        <option value="">{props.vazio ?? "Selecione…"}</option>
        {props.opcoes.map(([id, nome]) => (
          <option key={id} value={id}>
            {nome}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Grade({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
