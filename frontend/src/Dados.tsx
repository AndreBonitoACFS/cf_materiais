import { Campo, Cartao, Grade, Selecao } from "./componentes";
import {
  REGIMES, baseVazia, eRegular, eSimples, empresasDe, nomeAtividade,
  type Atividade, type Base, type Formulario, type Regime, type SimNao,
} from "./modelo";

type Props = { form: Formulario; setForm: (f: Formulario) => void };
const MES = "R$/mês";
const SIM_NAO: [string, string][] = [["sim", "Sim"], ["nao", "Não"]];
const TIPOS_AJUSTE: [string, string][] = [
  ["custo_antigo_substituido", "Custo antigo substituído (+)"],
  ["tributo_antigo_substituido", "Tributo antigo substituído (+)"],
  ["receita_duplicada", "Receita duplicada (−)"],
  ["credito_antigo_perdido", "Crédito antigo perdido (−)"],
];

export function Dados({ form, setForm }: Props) {
  const ativas = empresasDe(form.estrutura);
  const regimeDe = (a: Atividade) => form.regimes[ativas.find((e) => e.atividades.includes(a))!.id] ?? "";
  const naCf = (a: Atividade) => ativas[0].atividades.includes(a);
  const destinoCf = (a: Atividade) =>
    naCf(a) ? "Referência interna: a atividade está na própria CF, sem faturamento." : "Faturado à CF por outra PJ.";

  const galpao = (i: number, campo: string) => (v: string) =>
    setForm({ ...form, galpoes: form.galpoes.map((g, j) => (j === i ? { ...g, [campo]: v } : g)) });
  const logistica = (campo: string) => (v: string) => setForm({ ...form, logistica: { ...form.logistica, [campo]: v } });
  const pessoal = (a: Atividade, campo: string) => (v: string) =>
    setForm({ ...form, pessoal: { ...form.pessoal, [a]: { ...form.pessoal[a], [campo]: v } } });

  return (
    <>
      <p className="text-sm text-slate-600">
        Informe a <strong>média mensal</strong>; a conversão para o ano é interna. Campo vazio não é zero: digite 0 quando o valor for zero.
      </p>

      <Cartao titulo="Galpões" nota={`Os três galpões são unidades de uma única empresa. ${destinoCf("armazenagem")}`}>
        <div className="space-y-3">
          {form.galpoes.map((g, i) => (
            <div key={i}>
              <div className="mb-1 text-sm font-medium text-slate-500">Galpão {i + 1}</div>
              <Grade>
                <Campo rotulo="Serviços para a CF" unidade={MES} valor={g.receita_cf} aoMudar={galpao(i, "receita_cf")} />
                <Campo rotulo="Serviços para terceiros" unidade={MES} valor={g.receita_terceiros} aoMudar={galpao(i, "receita_terceiros")} />
                <Campo rotulo="Custos operacionais" unidade={MES} valor={g.custos_operacionais} aoMudar={galpao(i, "custos_operacionais")} dica="Sem pessoal." />
              </Grade>
            </div>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="Logística" nota={`Somente frota própria. ${destinoCf("logistica")}`}>
        <Grade>
          <Campo rotulo="Serviços para a CF" unidade={MES} valor={form.logistica.receita_cf} aoMudar={logistica("receita_cf")} />
          <Campo rotulo="Serviços para terceiros" unidade={MES} valor={form.logistica.receita_terceiros} aoMudar={logistica("receita_terceiros")} />
          <Campo rotulo="Combustível" unidade={MES} valor={form.logistica.combustivel} aoMudar={logistica("combustivel")} />
          <Campo
            rotulo="Manutenção e demais despesas da frota" unidade={MES} valor={form.logistica.manutencao} aoMudar={logistica("manutencao")}
            dica="Pneus, seguro, IPVA, licenciamento, rastreamento, pedágios e semelhantes."
          />
          <Campo
            rotulo="Outros custos operacionais" unidade={MES} valor={form.logistica.outros_custos} aoMudar={logistica("outros_custos")}
            dica="Sem pessoal, depreciação e os grupos anteriores."
          />
          <Campo rotulo="Depreciação" unidade="R$/ano" valor={form.logistica.depreciacao_anual} aoMudar={logistica("depreciacao_anual")} dica="Valor anual." />
        </Grade>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-slate-600">Frota (informativo, não gera custo)</summary>
          <div className="mt-2">
            <Grade>
              <Campo rotulo="Quantidade de veículos" unidade="veículos" valor={form.logistica.quantidade_veiculos} aoMudar={logistica("quantidade_veiculos")} />
              <Campo rotulo="Valor total da frota" unidade="R$" valor={form.logistica.valor_frota} aoMudar={logistica("valor_frota")} />
            </Grade>
          </div>
        </details>
      </Cartao>

      <Cartao titulo="Pessoal" nota="Por atividade: contratação direta ou terceirização. O custo fica na empresa responsável pela contratação.">
        <div className="space-y-4">
          {(["armazenagem", "logistica", "comercio"] as Atividade[]).map((a) => {
            const p = form.pessoal[a];
            const simples = eSimples(regimeDe(a));
            return (
              <div key={a}>
                <div className="mb-1 text-sm font-medium text-slate-500">{nomeAtividade(a)}</div>
                <Grade>
                  <Selecao
                    rotulo="Forma de contratação" valor={p.forma ?? ""} aoMudar={pessoal(a, "forma")}
                    opcoes={[["direta", "Contratação direta"], ["terceirizacao", "Terceirização"]]}
                    vazio={a === "comercio" ? "Manter o pessoal da base da CF" : "Selecione…"}
                  />
                  {p.forma === "direta" && (
                    <>
                      <Campo rotulo="Remuneração" unidade={MES} valor={p.remuneracao_mensal} aoMudar={pessoal(a, "remuneracao_mensal")} />
                      {simples ? (
                        <Campo
                          rotulo="Encargos no Simples" unidade="% da remuneração" valor={p.encargos_no_simples} aoMudar={pessoal(a, "encargos_no_simples")}
                          dica="Sem CPP patronal, que está no DAS."
                        />
                      ) : (
                        <Campo
                          rotulo="Encargos fora do Simples" unidade="% da remuneração" valor={p.encargos_fora_do_simples}
                          aoMudar={pessoal(a, "encargos_fora_do_simples")} dica="Inclui a contribuição patronal."
                        />
                      )}
                    </>
                  )}
                  {p.forma === "terceirizacao" && (
                    <Campo rotulo="Preço do serviço contratado" unidade={MES} valor={p.preco_mensal} aoMudar={pessoal(a, "preco_mensal")} />
                  )}
                </Grade>
              </div>
            );
          })}
        </div>
      </Cartao>

      <Contabilidade form={form} setForm={setForm} />
    </>
  );
}

function Contabilidade({ form, setForm }: Props) {
  const ativas = empresasDe(form.estrutura);
  const regimeCf = form.regimes.pj1 as Regime;
  const base: Base = form.bases[regimeCf] ?? baseVazia();
  const setBase = (b: Base) => setForm({ ...form, bases: { ...form.bases, [regimeCf]: b } });
  const campoBase = (campo: string) => (v: string) => setBase({ ...base, campos: { ...base.campos, [campo]: v } });
  const config = (campo: string) => (v: string) => setForm({ ...form, config: { ...form.config, [campo]: v } });
  const papel = (p: string, campo: string) => (v: string) =>
    setForm({ ...form, porPapel: { ...form.porPapel, [p]: { ...form.porPapel[p], [campo]: v } } });
  const ajuste = (i: number, campo: string) => (v: string) =>
    setBase({ ...base, ajustes: base.ajustes.map((a, j) => (j === i ? { ...a, [campo]: v } : a)) });
  const nomeRegime = REGIMES.find((r) => r.id === regimeCf)?.nome;

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold">Configuração da contabilidade / consultoria</summary>
      <p className="mt-1 text-sm text-slate-600">
        Premissas que a contabilidade prepara. O que não estiver configurado aparece como pendência no resultado; nada é presumido.
      </p>

      <h3 className="mt-4 text-sm font-semibold">Base da CF — {nomeRegime}</h3>
      <p className="text-xs text-slate-500">Uma base por regime da CF. Ao trocar o regime, a base de outro regime não é reaproveitada.</p>
      <div className="mt-2">
        <Grade>
          <Campo rotulo="Receita do comércio (projeção 2027)" unidade={MES} valor={base.campos.receita_comercio} aoMudar={campoBase("receita_comercio")} />
          <Campo
            rotulo="Resultado antes de IRPJ/CSLL" unidade="R$/ano" valor={base.campos.resultado_antes_irpj_csll_anual}
            aoMudar={campoBase("resultado_antes_irpj_csll_anual")} dica="Com despesas e tributos indiretos do comércio já embutidos."
          />
          {eSimples(regimeCf) && (
            <Campo
              rotulo="DAS já embutido no resultado" unidade="R$/ano" valor={base.campos.das_embutido_anual} aoMudar={campoBase("das_embutido_anual")}
              dica="Informe 0 se o resultado acima é antes do DAS."
            />
          )}
          {eRegular(regimeCf) && (
            <>
              <Campo rotulo="Débito de IBS do comércio" unidade={MES} valor={base.campos.debito_ibs_mensal} aoMudar={campoBase("debito_ibs_mensal")} />
              <Campo rotulo="Crédito de IBS do comércio" unidade={MES} valor={base.campos.credito_ibs_mensal} aoMudar={campoBase("credito_ibs_mensal")} />
              <Campo rotulo="Débito de CBS do comércio" unidade={MES} valor={base.campos.debito_cbs_mensal} aoMudar={campoBase("debito_cbs_mensal")} />
              <Campo rotulo="Crédito de CBS do comércio" unidade={MES} valor={base.campos.credito_cbs_mensal} aoMudar={campoBase("credito_cbs_mensal")} />
            </>
          )}
          {form.pessoal.comercio.forma && (
            <Campo
              rotulo="Custo de pessoal embutido na base" unidade="R$/ano" valor={base.campos.custo_pessoal_embutido_anual}
              aoMudar={campoBase("custo_pessoal_embutido_anual")} dica="Será substituído, uma única vez, pelo pessoal informado."
            />
          )}
        </Grade>
      </div>
      {eSimples(regimeCf) && (
        <label className="mt-3 block text-sm">
          <span className="font-medium text-slate-700">Histórico de receita bruta — dez./2025 a dez./2026</span>
          <textarea
            value={base.historico}
            onChange={(e) => setBase({ ...base, historico: e.target.value })}
            rows={2}
            placeholder="13 valores separados por ponto e vírgula"
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
          <span className="text-xs text-slate-500">Sem histórico, o RBT12 é aproximado pela receita de 2027 e a simulação fica provisória.</span>
        </label>
      )}

      <h4 className="mt-4 text-sm font-medium">Ajustes da ponte de reconciliação</h4>
      <p className="text-xs text-slate-500">Cada ajuste é identificado e reconhecido uma única vez.</p>
      {base.ajustes.map((a, i) => (
        <div key={i} className="mt-2 grid items-end gap-2 sm:grid-cols-[1fr_1.5fr_1.5fr_1fr_auto]">
          <CampoTexto rotulo="Identificador" valor={a.id} aoMudar={ajuste(i, "id")} />
          <Selecao rotulo="Tipo" valor={a.tipo} aoMudar={ajuste(i, "tipo")} opcoes={TIPOS_AJUSTE} />
          <CampoTexto rotulo="Descrição" valor={a.descricao} aoMudar={ajuste(i, "descricao")} />
          <Campo rotulo="Valor" unidade="R$/ano" valor={a.valor_anual} aoMudar={ajuste(i, "valor_anual")} />
          <button onClick={() => setBase({ ...base, ajustes: base.ajustes.filter((_, j) => j !== i) })} className="pb-2 text-sm text-red-700">
            Remover
          </button>
        </div>
      ))}
      <button
        onClick={() => setBase({ ...base, ajustes: [...base.ajustes, { id: `ajuste-${base.ajustes.length + 1}`, tipo: "custo_antigo_substituido", descricao: "", valor_anual: "" }] })}
        className="mt-2 text-sm font-medium text-slate-900 underline"
      >
        Adicionar ajuste
      </button>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={base.reconciliacao_confirmada} onChange={(e) => setBase({ ...base, reconciliacao_confirmada: e.target.checked })} />
        Reconciliação da base confirmada pela contabilidade
      </label>

      <h3 className="mt-5 text-sm font-semibold">Referência e premissas</h3>
      <div className="mt-2">
        <Grade>
          <Campo
            rotulo="Resultado de referência da CF" unidade="R$/ano" valor={form.config.resultado_referencia_anual}
            aoMudar={config("resultado_referencia_anual")} dica="Situação atual comparável, após tributos."
          />
          <Selecao
            rotulo="Enquadramento do transporte" valor={form.config.transporte_enquadramento ?? ""} aoMudar={config("transporte_enquadramento")}
            opcoes={[["municipal", "Municipal (ISS)"], ["intermunicipal_interestadual", "Intermunicipal/interestadual (ICMS)"]]} vazio="Não configurado"
          />
          {form.config.transporte_enquadramento === "municipal" && (
            <Campo rotulo="ISS do transporte municipal" unidade="%" valor={form.config.iss_transporte_municipal} aoMudar={config("iss_transporte_municipal")} dica="Usado fora do DAS." />
          )}
          {form.config.transporte_enquadramento === "intermunicipal_interestadual" && (
            <Campo rotulo="ICMS do transporte (alíquota média)" unidade="%" valor={form.config.icms_transporte} aoMudar={config("icms_transporte")} />
          )}
          <Selecao
            rotulo="Dedutibilidade das despesas com outras PJs confirmada?" valor={form.dedutibilidade}
            aoMudar={(v) => setForm({ ...form, dedutibilidade: v as SimNao })} opcoes={SIM_NAO} vazio="Não confirmada (adiciona à base do Lucro Real)"
          />
          <Selecao
            rotulo="Reconhecer crédito de fornecedor com IBS/CBS no DAS?" valor={form.creditoDas}
            aoMudar={(v) => setForm({ ...form, creditoDas: v as SimNao })} opcoes={SIM_NAO} vazio="Não configurado (sem crédito)"
          />
        </Grade>
      </div>

      {ativas.map((e) => {
        const regime = form.regimes[e.id] ?? "";
        const c = form.porPapel[e.papel] ?? {};
        if (!eRegular(regime)) return null;
        return (
          <div key={e.id} className="mt-4">
            <h3 className="text-sm font-semibold">{e.nome}</h3>
            <div className="mt-2">
              <Grade>
                {regime === "lucro_real" && (
                  <>
                    <Campo rotulo="Adições — IRPJ" unidade="R$/ano" valor={c.adicoes_irpj} aoMudar={papel(e.papel, "adicoes_irpj")} />
                    <Campo rotulo="Exclusões — IRPJ" unidade="R$/ano" valor={c.exclusoes_irpj} aoMudar={papel(e.papel, "exclusoes_irpj")} />
                    <Campo rotulo="Adições — CSLL" unidade="R$/ano" valor={c.adicoes_csll} aoMudar={papel(e.papel, "adicoes_csll")} />
                    <Campo rotulo="Exclusões — CSLL" unidade="R$/ano" valor={c.exclusoes_csll} aoMudar={papel(e.papel, "exclusoes_csll")} />
                  </>
                )}
                <Campo rotulo="Crédito de IBS sobre aquisições de terceiros" unidade={MES} valor={c.credito_ibs_mensal} aoMudar={papel(e.papel, "credito_ibs_mensal")} dica="Valor informado pela contabilidade." />
                <Campo rotulo="Crédito de CBS sobre aquisições de terceiros" unidade={MES} valor={c.credito_cbs_mensal} aoMudar={papel(e.papel, "credito_cbs_mensal")} dica="Valor informado pela contabilidade." />
              </Grade>
            </div>
          </div>
        );
      })}
    </details>
  );
}

function CampoTexto(props: { rotulo: string; valor: string; aoMudar: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{props.rotulo}</span>
      <input value={props.valor} onChange={(e) => props.aoMudar(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
    </label>
  );
}
