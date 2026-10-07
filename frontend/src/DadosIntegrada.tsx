import { Campo, Cartao, Selecao } from "./componentes";
import { moeda, numero, type Formulario } from "./modelo";
import { integradaVazia, trimestreDaMedia } from "./integrada";
import { useState } from "react";

export function DadosIntegrada({form,setForm}:{form:Formulario;setForm:(f:Formulario)=>void}) {
  const [mediaPat,setMediaPat]=useState("");
  const [erroMedia,setErroMedia]=useState("");
  const d = form.integrada ?? integradaVazia();
  const atualizar = (novo:typeof d) => setForm({...form,integrada:novo});
  const campo = (i:number,k:string,v:string) => atualizar({...d,trimestres:d.trimestres.map((q,j)=>j===i?{...q,[k]:v}:q),origens:{...d.origens,[`edicao_${k}_${i+1}`]:{valor_manual:v,unidade:"R$/trimestre",ano:2027,fonte:"Usuário",transformacao:"Substituição direta do trimestre; histórico original preservado",validacao:"Hipótese 2027 — pendente"}}});
  const lr = form.regimes.pj1 === "lucro_real";
  return <>
    <Cartao titulo="CF integrada — um único CNPJ" info={<>
      <p>Nesta estrutura toda a operação fica em um único CNPJ. Galpões, logística, pessoal, alimentação, frota e aluguel externo já estão no resultado da base: não os informe separadamente.</p>
      <p>Os dados são informados por trimestre, nos quadros abaixo, e valem para o Lucro Presumido e para o Lucro Real. Ao usar a base ECD/ECF 2025, os valores de 2025 são repetidos para 2027, sem crescimento ou inflação; edite os trimestres se quiser outra hipótese.</p>
      <p>O botão "Adotar hipótese explícita" preenche com 0 os ajustes fiscais e as receitas segregadas de todos os trimestres. Use-o quando esses valores não existirem.</p>
      <p>No Lucro Real, escolha se quer simular o PAT. Informe a média mensal da alimentação elegível e clique em "Aplicar média mensal": o valor é distribuído igualmente nos quatro trimestres. Outra opção é usar como hipótese o total de alimentação contabilizado. Indique a elegibilidade e use "Observações" para anotações livres. Um 0 informado significa incentivo zero.</p>
    </>}>
      <button className="mb-3 underline" onClick={()=>atualizar({...d,trimestres:d.trimestres.map(q=>({...q,adicoes_irpj:"0",exclusoes_irpj:"0",adicoes_csll:"0",exclusoes_csll:"0",acrescimos_irpj:"0",acrescimos_csll:"0",servicos:"0",aluguel:"0"}))})}>Adotar hipótese explícita: ajustes fiscais e receitas segregadas não comprovados = zero</button>
      {lr && <>
        <Selecao rotulo="Simular incentivo PAT?" valor={d.pat?"sim":"nao"} aoMudar={v=>atualizar({...d,pat:v==="sim"})} opcoes={[["nao","Não"],["sim","Sim"]]} />
        {d.pat && <div className="my-3 space-y-3">
          <Campo rotulo="Despesa de alimentação elegível ao PAT — média mensal" unidade="R$/mês" valor={mediaPat} aoMudar={setMediaPat} dica="Entrada manual; ao aplicar, redistribui uniformemente em quatro trimestres. O candidato ECD mantém os fatores históricos."/>
          <button className="underline" onClick={()=>{try{const valor=trimestreDaMedia(mediaPat);atualizar({...d,trimestres:d.trimestres.map(q=>({...q,pat_elegivel:valor})),origens:{...d.origens,pat_manual:{valor_original:mediaPat,unidade:"R$/mês",ano:2027,fonte:"Usuário",transformacao:"Distribuição uniforme: cada trimestre = 3 × média; anual = 12 × média",validacao:"Elegibilidade pendente"}}});setErroMedia("");}catch(e){setErroMedia((e as Error).message);}}}>Aplicar média mensal — redistribuição uniforme</button>
          {erroMedia&&<p role="alert" className="text-red-700">{erroMedia}</p>}
          <Selecao rotulo="Elegibilidade" valor={d.elegibilidade} aoMudar={v=>atualizar({...d,elegibilidade:v,hipotese_pat:false})} opcoes={[["pendente","Pendente"],["confirmada","Confirmada"],["nao_elegivel","Não elegível"]]} />
          <label className="block text-sm"><span className="font-medium text-slate-700">Observações</span><textarea rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5" value={d.evidencia} onChange={e=>atualizar({...d,evidencia:e.target.value})}/></label>
          <button className="underline" onClick={()=>atualizar({...d,elegibilidade:"pendente",hipotese_pat:true,trimestres:d.trimestres.map(q=>({...q,pat_elegivel:q.alimentacao??""}))})}>Usar esse total como hipótese de elegibilidade</button>
          {d.hipotese_pat && <p className="text-sm">Usando o total de alimentação contabilizado como hipótese.</p>}
        </div>}
      </>}
      {!lr && <p className="text-sm">PAT: não se aplica ao Lucro Presumido.</p>}
    </Cartao>
    {Object.keys(d.origens).length>0&&<Cartao titulo="Base histórica documentada — valores originais" info={<>
      <p>Tabela só para consulta, com os valores originais da ECD/ECF 2025. Nada é preenchido aqui.</p>
      <p>Para alterar um valor, edite o trimestre correspondente nos quadros abaixo. Os valores originais continuam registrados nesta tabela.</p>
    </>}>
      <div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr><th className="text-left">Campo / origem</th><th>Anual preservado</th><th>Média mensal exibida</th></tr></thead><tbody>
      {Object.entries({receita:"Receita bruta — ECD",cmv:"CMV — ECD",despesas:"Despesas (incluem pessoal e alimentação) — ECD",aluguel_externo:"Aluguel externo (já nas despesas) — ECD",resultado:"Resultado antes IRCS — ECD",presuncao:"Receita sujeita à presunção — ECF",alimentacao:"Alimentação contabilizada — candidato ECD"}).map(([k,n])=>{const origem=d.origens[k] as {valor_original?:string}|undefined;return <tr key={k}><td className="text-left">{n}</td><td>{moeda(origem?.valor_original)}</td><td>{origem?.valor_original?moeda(String(Number(origem.valor_original)/12)):"n/d"}</td></tr>})}
      </tbody></table></div>
    </Cartao>}
    {d.trimestres.map((q,i)=><Cartao key={i} titulo={`${i+1}º trimestre — Histórico 2025 / Hipótese 2027`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries({receita:"Receita bruta ECD",presuncao:"Receita comercial sujeita à presunção ECF",resultado:"Resultado antes IRPJ/CSLL ECD",alimentacao:"Alimentação contabilizada — valor candidato",...(lr?{adicoes_irpj:"Adições IRPJ",exclusoes_irpj:"Exclusões IRPJ",adicoes_csll:"Adições CSLL",exclusoes_csll:"Exclusões CSLL"}:{servicos:"Serviços externos segregados",aluguel:"Receita externa de aluguel",acrescimos_irpj:"Acréscimos integrais IRPJ",acrescimos_csll:"Acréscimos integrais CSLL"}),...(lr&&d.pat?{pat_elegivel:"Despesa de alimentação elegível ao PAT"}:{})}).map(([k,n])=><Campo key={k} rotulo={n} unidade="R$/trimestre" valor={q[k]} aoMudar={v=>campo(i,k,v)}/>)}
      </div>
    </Cartao>)}
    <Cartao titulo="Médias mensais" info={<p>Quadro só para consulta. Cada média é a soma dos quatro trimestres dividida por 12. Para alterar, edite os trimestres acima.</p>}>
      {Object.entries({receita:"Receita bruta",presuncao:"Receita sujeita à presunção",resultado:"Resultado antes de IRPJ/CSLL",alimentacao:"Alimentação contabilizada"}).map(([k,n])=> {
        let valores:(string|null)[]=[]; try {valores=d.trimestres.map(q=>numero(q[k]));}catch{return null;}
        return <p key={k} className="text-sm">{n}: {valores.some(v=>v===null)?"n/d":moeda(String(valores.reduce((s,v)=>s+Number(v),0)/12))} / mês</p>;
      })}
    </Cartao>
  </>;
}
