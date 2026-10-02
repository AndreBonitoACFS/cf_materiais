import type { ReactNode } from "react";

export function Cartao({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold">{titulo}</h2>
      {nota && <p className="mt-1 text-sm text-slate-600">{nota}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Campo numérico em texto: vazio permanece vazio (não é zero). */
export function Campo(props: { rotulo: string; unidade: string; valor: string | undefined; aoMudar: (v: string) => void; dica?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{props.rotulo}</span>
      <span className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-slate-900">
        <input
          inputMode="decimal"
          value={props.valor ?? ""}
          onChange={(e) => props.aoMudar(e.target.value)}
          className="w-full min-w-0 rounded-lg px-2 py-1.5 outline-none"
        />
        <span className="whitespace-nowrap px-2 text-xs text-slate-500">{props.unidade}</span>
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
