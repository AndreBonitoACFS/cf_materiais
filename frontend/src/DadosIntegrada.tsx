import { Campo, Cartao, Selecao } from "./componentes";
import { moeda, numero, type Formulario } from "./modelo";
import { integradaVazia, AVISO, trimestreDaMedia } from "./integrada";
import { useState } from "react";

export function DadosIntegrada({form,setForm}:{form:Formulario;setForm:(f:Formulario)=>void}) {
  const [mediaPat,setMediaPat]=useState("");
  const [erroMedia,setErroMedia]=useState("");
  const d = form.integrada ?? integradaVazia();
  const atualizar = (novo:typeof d) => setForm({...form,integrada:novo});
  const campo = (i:number,k:string,v:string) => atualizar({...d,trimestres:d.trimestres.map((q,j)=>j===i?{...q,[k]:v}:q),origens:{...d.origens,[`edicao_${k}_${i+1}`]:{valor_manual:v,unidade:"R$/trimestre",ano:2027,fonte:"Usuário",transformacao:"Substituição direta do trimestre; histórico original preservado",validacao:"Hipótese 2027 — pendente"}}});
  const lr = form.regimes.pj1 === "lucro_real";
  return <>
    <Cartao titulo="CF integrada — um único CNPJ" nota={AVISO}>
      <p className="text-sm">Três galpões, logística, pessoal, alimentação, frota e aluguel externo já incluídos no resultado. Não há repasses internos. Os valores são compartilhados entre LP e LR.</p>
      <p className="mt-2 text-sm">Estimativa com base histórica. IBS/CBS, carga total e caixa efetivo: n/d enquanto a integração fiscal estiver pendente.</p>
      <button className="my-3 underline" onClick={()=>atualizar({...d,trimestres:d.trimestres.map(q=>({...q,adicoes_irpj:"0",exclusoes_irpj:"0",adicoes_csll:"0",exclusoes_csll:"0",acrescimos_irpj:"0",acrescimos_csll:"0",servicos:"0",aluguel:"0"}))})}>Adotar hipótese explícita: ajustes fiscais e receitas segregadas não comprovados = zero</button>
      {lr && <>
        <Selecao rotulo="Simular incentivo PAT?" valor={d.pat?"sim":"nao"} aoMudar={v=>atualizar({...d,pat:v==="sim"})} opcoes={[["nao","Não"],["sim","Sim"]]} />
        {d.pat && <div className="my-3 space-y-3">
          <Campo rotulo="Despesa de alimentação elegível ao PAT — média mensal" unidade="R$/mês" valor={mediaPat} aoMudar={setMediaPat} dica="Entrada manual; ao aplicar, redistribui uniformemente em quatro trimestres. O candidato ECD mantém os fatores históricos."/>
          <button className="underline" onClick={()=>{try{const valor=trimestreDaMedia(mediaPat);atualizar({...d,trimestres:d.trimestres.map(q=>({...q,pat_elegivel:valor})),origens:{...d.origens,pat_manual:{valor_original:mediaPat,unidade:"R$/mês",ano:2027,fonte:"Usuário",transformacao:"Distribuição uniforme: cada trimestre = 3 × média; anual = 12 × média",validacao:"Elegibilidade pendente"}}});setErroMedia("");}catch(e){setErroMedia((e as Error).message);}}}>Aplicar média mensal — redistribuição uniforme</button>
          {erroMedia&&<p role="alert" className="text-red-700">{erroMedia}</p>}
          <Selecao rotulo="Elegibilidade" valor={d.elegibilidade} aoMudar={v=>atualizar({...d,elegibilidade:v,hipotese_pat:false})} opcoes={[["pendente","Pendente"],["confirmada","Confirmada"],["nao_elegivel","Não elegível"]]} />
          <label className="block text-sm">Evidência: inscrição/período, documentos, empregados e limites<input className="block w-full rounded border p-2" value={d.evidencia} onChange={e=>atualizar({...d,evidencia:e.target.value})}/></label>
          <button className="underline" onClick={()=>atualizar({...d,elegibilidade:"pendente",hipotese_pat:true,trimestres:d.trimestres.map(q=>({...q,pat_elegivel:q.alimentacao??""}))})}>Usar esse total como hipótese de elegibilidade</button>
          <p className="text-sm">{d.hipotese_pat ? "Estimativa PAT — elegibilidade pendente" : "Sem valor elegível ou evidência: n/d / pendente. Zero informado é incentivo zero."}</p>
        </div>}
      </>}
      {!lr && <p>PAT: Não se aplica. Alimentação permanece na DRE.</p>}
    </Cartao>
    {Object.keys(d.origens).length>0&&<Cartao titulo="Base histórica documentada — valores originais">
      <div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr><th className="text-left">Campo / origem</th><th>Anual preservado</th><th>Média mensal exibida</th></tr></thead><tbody>
      {Object.entries({receita:"Receita bruta — ECD",cmv:"CMV — ECD",despesas:"Despesas (incluem pessoal e alimentação) — ECD",aluguel_externo:"Aluguel externo (já nas despesas) — ECD",resultado:"Resultado antes IRCS — ECD",presuncao:"Receita sujeita à presunção — ECF",alimentacao:"Alimentação contabilizada — candidato ECD"}).map(([k,n])=>{const origem=d.origens[k] as {valor_original?:string}|undefined;return <tr key={k}><td className="text-left">{n}</td><td>{moeda(origem?.valor_original)}</td><td>{origem?.valor_original?moeda(String(Number(origem.valor_original)/12)):"n/d"}</td></tr>})}
      </tbody></table></div>
      <p className="mt-2 text-sm">CMV, despesas e pessoal são detalhamentos da mesma DRE. Não serão somados novamente ao resultado. Alterações manuais dos trimestres preservam os originais nesta memória.</p>
    </Cartao>}
    {d.trimestres.map((q,i)=><Cartao key={i} titulo={`${i+1}º trimestre — Histórico 2025 / Hipótese 2027`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries({receita:"Receita bruta ECD",presuncao:"Receita comercial sujeita à presunção ECF",resultado:"Resultado antes IRPJ/CSLL ECD",alimentacao:"Alimentação contabilizada — valor candidato",...(lr?{adicoes_irpj:"Adições IRPJ",exclusoes_irpj:"Exclusões IRPJ",adicoes_csll:"Adições CSLL",exclusoes_csll:"Exclusões CSLL"}:{servicos:"Serviços externos segregados",aluguel:"Receita externa de aluguel",acrescimos_irpj:"Acréscimos integrais IRPJ",acrescimos_csll:"Acréscimos integrais CSLL"}),...(lr&&d.pat?{pat_elegivel:"Despesa de alimentação elegível ao PAT"}:{})}).map(([k,n])=><Campo key={k} rotulo={n} unidade="R$/trimestre" valor={q[k]} aoMudar={v=>campo(i,k,v)}/>)}
      </div>
    </Cartao>)}
    <Cartao titulo="Médias mensais — exibição; cálculo preserva trimestres e centavos">
      {(["receita","presuncao","resultado","alimentacao"] as const).map(k=> {
        let valores:(string|null)[]=[]; try {valores=d.trimestres.map(q=>numero(q[k]));}catch{return null;}
        return <p key={k}>{k}: {valores.some(v=>v===null)?"n/d":moeda(String(valores.reduce((s,v)=>s+Number(v),0)/12))} / mês</p>;
      })}
      <details><summary>Origens e validação por campo</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(d.origens,null,2)}</pre></details>
    </Cartao>
  </>;
}
