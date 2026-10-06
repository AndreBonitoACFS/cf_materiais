import { Cartao } from "./componentes";
import { REGIMES, STATUS, moeda, type Diferenca, type Resultado, type ResultadoPJ } from "./modelo";

function Selo({ status }: { status: string }) {
  const s = STATUS[status] ?? { nome: status, cor: "bg-slate-200" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cor}`}>{s.nome}</span>;
}

function Linha({ rotulo, valor, forte, recuo }: { rotulo: string; valor: string | null | undefined; forte?: boolean; recuo?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-sm ${forte ? "border-t border-slate-200 font-semibold" : ""}`}>
      <span className={recuo ? "pl-4 text-slate-500" : "text-slate-700"}>{rotulo}</span>
      <span className="tabular-nums">{moeda(valor)}</span>
    </div>
  );
}

const pjNome = (id: string) => id.toUpperCase().replace("PJ", "PJ ");
const temValores = (status: string) => status === "calculo_disponivel" || status === "simulacao_provisoria";

function Empresa({ e }: { e: ResultadoPJ }) {
  const creditos = Object.entries(Object.keys(e.creditos_utilizados_totais ?? {}).length ? e.creditos_utilizados_totais : e.creditos_utilizados);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{pjNome(e.id)} — {e.nome}</div>
          <div className="text-xs text-slate-500">{REGIMES.find((r) => r.id === e.regime)?.nome}</div>
        </div>
        <Selo status={e.status} />
      </div>
      {temValores(e.status) ? (
        <div className="mt-2">
          <Linha rotulo="Receita" valor={e.receita} />
          {Number(e.receita_entre_pjs) > 0 && <Linha rotulo="da qual, faturada à CF" valor={e.receita_entre_pjs} recuo />}
          <Linha rotulo={e.ponte.length ? "Custos (com tributos embutidos na base)" : "Custos"} valor={e.custos} />
          {Number(e.despesas_entre_pjs) > 0 && <Linha rotulo="dos quais, serviços de outras PJs" valor={e.despesas_entre_pjs} recuo />}
          <Linha rotulo="Tributos calculados" valor={e.total_tributos} />
          {Object.entries(e.tributos).map(([nome, valor]) => (
            <Linha key={nome} rotulo={e.ponte.length && (nome === "IBS" || nome === "CBS") ? `${nome} (efeito incremental)` : nome} valor={valor} recuo />
          ))}
          {creditos.map(([nome, valor]) => (
            <Linha key={nome} rotulo={`Crédito de ${nome} utilizado`} valor={valor} recuo />
          ))}
          {Object.entries(e.creditos_potenciais ?? {}).map(([nome, valor]) => <Linha key={`pot-${nome}`} rotulo={`Crédito de ${nome} potencial`} valor={valor} recuo />)}
          {Object.entries(e.saldo_credor_final).map(([nome, valor]) => <Linha key={`saldo-${nome}`} rotulo={`Saldo credor de ${nome} (sem caixa automático)`} valor={valor} recuo />)}
          {(e.pessoal ?? []).map(p => <div key={p.atividade} className="my-3 border-t pt-2">
            <p className="text-sm font-medium">Pessoal — {p.atividade} · {p.quantidade ?? "Terceirização: empregados próprios não se aplicam"}{p.quantidade !== null ? " pessoas" : ""}</p>
            {p.folha_anual !== null && <>
            <Linha rotulo="Folha anual" valor={p.folha_anual} />
            <Linha rotulo="Encargos sem CPP" valor={p.encargos_sem_cpp_anual} />
            <Linha rotulo="CPP adicional" valor={p.cpp_anual} />
            </>}
            <Linha rotulo="Custo anual de pessoal" valor={p.custo_anual} />
          </div>)}
          {(e.pessoal?.length ?? 0) > 0 && <div className="my-3 border-t pt-2">
            <p className="text-sm font-medium">Total desta PJ: {e.pessoal_totais?.quantidade ?? "0"} empregados próprios projetados</p>
            <Linha rotulo="Folha total anual" valor={e.pessoal_totais?.folha_anual} />
            <Linha rotulo="Encargos totais sem CPP" valor={e.pessoal_totais?.encargos_sem_cpp_anual} />
            <Linha rotulo="CPP total adicional" valor={e.pessoal_totais?.cpp_anual} />
            <Linha rotulo="Pessoal direto e terceirizado — total anual" valor={e.pessoal_totais?.custo_anual} />
          </div>}
          <Linha rotulo={e.nome.includes("63.715.056") ? "Resultado histórico após IRPJ/CSLL — estimativa" : "Resultado"} valor={e.resultado} forte />
        </div>
      ) : (
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
          {e.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Resultados({ resultado, titulo }: { resultado: Resultado; titulo: string }) {
  const c = resultado.consolidado;
  const avisos = resultado.pendencias.filter((p) => !p.bloqueante);
  const etapasComValor = resultado.memoria;
  return (
    <>
      <Cartao titulo={titulo}>
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Selo status={resultado.status} />
          <span className="text-slate-500">
            Parâmetros {resultado.parametros.versao}, vigência {resultado.parametros.vigencia.inicio} a {resultado.parametros.vigencia.fim}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {resultado.empresas.map((e) => (
            <Empresa key={e.id} e={e} />
          ))}
        </div>
      </Cartao>

      <Cartao titulo="Consolidado">
        {c.resultado === null ? (
          <p className="text-sm text-slate-700">Indisponível: há empresa sem resultado calculado. Nenhum valor é exibido no lugar.</p>
        ) : (
          <div className="max-w-md">
            <Linha rotulo="Receita externa" valor={c.receita_externa} />
            <Linha rotulo="Custos externos" valor={c.custos_externos} />
            <Linha rotulo="Tributos" valor={c.tributos} />
            <Linha rotulo={resultado.estrutura === "integrada" ? "Resultado histórico após IRPJ/CSLL" : "Resultado consolidado"} valor={c.resultado} forte />
            <Linha rotulo="Referência da CF" valor={c.referencia} />
            <Linha rotulo="Diferença contra a referência" valor={c.diferenca} forte />
          </div>
        )}
      </Cartao>

      {avisos.length > 0 && (
        <Cartao titulo="Validações pendentes">
          <ul className="list-disc pl-5 text-sm text-slate-700">
            {avisos.map((p) => (
              <li key={p.mensagem}>{p.mensagem}</li>
            ))}
          </ul>
        </Cartao>
      )}

      {resultado.hipoteses.length > 0 && (
        <Cartao titulo="Hipóteses e limitações">
          <ul className="list-disc pl-5 text-sm text-slate-700">
            {resultado.hipoteses.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Cartao>
      )}

      {etapasComValor.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">Memória de cálculo</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-3">Empresa</th>
                  <th className="py-1 pr-3">Etapa</th>
                  <th className="py-1 pr-3">Item</th>
                  <th className="py-1 pr-3">Fórmula</th>
                  <th className="py-1 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {etapasComValor.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-1 pr-3 whitespace-nowrap">{l.pj ? pjNome(l.pj) : "Conjunto"}</td>
                    <td className="py-1 pr-3 whitespace-nowrap">{l.etapa}</td>
                    <td className="py-1 pr-3">{l.descricao}</td>
                    <td className="py-1 pr-3 font-mono text-xs text-slate-600">{l.formula}</td>
                    <td className="py-1 text-right tabular-nums whitespace-nowrap">
                      {l.valor === null ? "" : l.unidade === "moeda" ? moeda(l.valor) : l.valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultado.empresas.filter((e) => e.apuracao_mensal.length > 0).map((e) => (
            <div key={e.id} className="mt-4 overflow-x-auto">
              <h3 className="text-sm font-semibold">Simples Nacional mês a mês — {pjNome(e.id)}</h3>
              <table className="mt-1 w-full text-right text-sm tabular-nums">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-1 text-left">Mês</th>
                    <th>Receita</th>
                    <th>RBT12</th>
                    <th>Faixa</th>
                    <th>Sublimite</th>
                    <th>DAS</th>
                  </tr>
                </thead>
                <tbody>
                  {e.apuracao_mensal.map((m) => (
                    <tr key={m.mes} className="border-t border-slate-100">
                      <td className="py-1 text-left">{m.mes}</td>
                      <td>{moeda(m.receita)}</td>
                      <td>{m.rbt12 === null ? "início de atividade" : moeda(m.rbt12)}</td>
                      <td>{m.faixa}</td>
                      <td>{m.impedido_sublimite ? "impedido" : "—"}</td>
                      <td>{moeda(m.das)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </details>
      )}
    </>
  );
}

export function Comparacao(props: {
  rotulos: string[];
  comparacao: { resultados: Resultado[]; diferencas: Diferenca[] } | null;
  aoLimpar: () => void;
}) {
  const { rotulos, comparacao } = props;
  return (
    <>
    {comparacao && comparacao.resultados.every(r=>r.estrutura==="integrada") && <Cartao titulo="LP → LR antes do PAT e efeito isolado do PAT">
      <div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr><th className="text-left">Tributo</th>{rotulos.map((n,i)=><th key={i}>{n}</th>)}</tr></thead><tbody>
      {["IRPJ básico","Adicional IRPJ","PAT utilizado","IRPJ líquido","CSLL","IBS","CBS","Demais tributos","Total devido","Caixa efetivo"].map(k=><tr key={k}><td className="text-left">{k}</td>{comparacao.resultados.map((r,i)=><td key={i}>{k==="PAT utilizado"&&r.empresas[0]?.regime==="lucro_presumido"?"Não se aplica":moeda(r.empresas[0]?.tributos[k])}</td>)}</tr>)}
      </tbody></table></div>
      {(()=>{const [lp,lr,pat]=comparacao.resultados.map(r=>r.empresas[0]?.tributos);const total=(t:typeof lp)=>t?.["IRPJ líquido"]!=null&&t?.CSLL!=null?Number(t["IRPJ líquido"])+Number(t.CSLL):null;const a=total(lp),b=total(lr),c=total(pat);return <div className="mt-3 text-sm"><p>Efeito LP → LR antes do PAT (IRPJ/CSLL; economia positiva): {a!==null&&b!==null?moeda(String(a-b)):"n/d"}</p><p>Efeito isolado PAT: {b!==null&&c!==null?moeda(String(b-c)):"n/d / pendente"}</p><p>Diferença total e caixa: n/d — componentes fiscais incompletos.</p></div>})()}
    </Cartao>}
    <Cartao titulo="Comparação de cenários" nota="As diferenças são calculadas contra o primeiro cenário guardado.">
      {!comparacao ? (
        <p className="text-sm text-slate-700">
          1 cenário guardado ({rotulos[0]}). Volte à etapa 1, altere a estrutura ou os regimes, calcule e guarde outro cenário para comparar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm tabular-nums">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1 text-left">Cenário</th>
                <th>Situação</th>
                <th>Tributos</th>
                <th>Resultado consolidado</th>
                <th>Diferença de resultado contra o 1º</th>
              </tr>
            </thead>
            <tbody>
              {comparacao.resultados.map((r, i) => {
                const d = i > 0 ? comparacao.diferencas[i - 1] : null;
                return (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-1 text-left">
                      {rotulos[i]}
                      {d?.empresas.map((e) => (
                        <div key={e.papel} className="text-xs text-slate-500">
                          {e.nome}: {e.diferenca_resultado === null ? e.motivo : moeda(e.diferenca_resultado)}
                        </div>
                      ))}
                    </td>
                    <td><Selo status={r.status} /></td>
                    <td>{moeda(r.consolidado.tributos)}</td>
                    <td>{moeda(r.consolidado.resultado)}</td>
                    <td>{i === 0 ? "base" : d?.consolidado ? moeda(d.consolidado.resultado) : "suspensa"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={props.aoLimpar} className="mt-3 text-sm text-red-700">
        Limpar cenários guardados
      </button>
    </Cartao>
    </>
  );
}
