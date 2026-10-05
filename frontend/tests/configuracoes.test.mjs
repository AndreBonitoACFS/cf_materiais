import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function modulo(nome, imports = {}) {
  const src = readFileSync(new URL(`../src/${nome}.ts`, import.meta.url), "utf8");
  let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  for (const [nome, url] of Object.entries(imports)) js = js.replaceAll(`"${nome}"`, JSON.stringify(url));
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const modeloURL = modulo("modelo");
const { paraApi, empresasDe, formularioVazio, comecarEmBranco } = await import(modeloURL);
const { exemploHipotetico } = await import(modulo("perfis"));
const { serializar, carregar, salvarTrabalho, lerTrabalho, CHAVE } = await import(modulo("configuracoes", { "./modelo": modeloURL }));

test("perfil hipotético editável, dados decimais e papéis preparados", () => {
  const f = exemploHipotetico(); f.galpoes[0].receita_terceiros = "25.000";
  assert.equal(exemploHipotetico().galpoes[0].receita_terceiros, "15000");
  assert.equal(paraApi(f).galpoes[0].receita_terceiros, "25000");
  for (const estrutura of ["A", "B", "C", "D"]) for (const e of empresasDe(estrutura)) assert.ok(f.porPapel[e.papel]);
  assert.equal(f.bases.lucro_real.reconciliacao_confirmada, false);
});
test("salvar e importar preservam vazio, precisão, origem e restauração", () => {
  const f = exemploHipotetico(); const original = structuredClone(f);
  f.pessoal.armazenagem.forma = "direta";
  f.pessoal.armazenagem.quantidade_funcionarios = "";
  f.categorias = { logistica:{combustivel:{percentual_elegivel:"50"},manutencao:{percentual_elegivel:"0"},outros:{percentual_elegivel:""}} };
  f.bases.lucro_presumido.campos.receita_comercio = "4117070,7475";
  const json = serializar(f, original);
  assert.equal(JSON.parse(json).form.bases.lucro_presumido.campos.receita_comercio, "4117070.7475");
  assert.equal(JSON.parse(json).form.pessoal.armazenagem.quantidade_funcionarios, null);
  const d = carregar(json);
  assert.deepEqual(d.form, f); assert.deepEqual(d.original, original);
  assert.equal(paraApi(d.form).pessoal.armazenagem.quantidade_funcionarios, null);
  assert.throws(() => carregar(JSON.stringify({versao:1,form:f})), /incompatível/);
});
test("cópia de trabalho guarda inclusive digitação incompleta sem recarregar o perfil", () => {
  const memoria = new Map(); globalThis.localStorage = { getItem:k=>memoria.get(k) ?? null, setItem:(k,v)=>memoria.set(k,v) };
  const f = exemploHipotetico(); f.logistica.combustivel = "1,";
  salvarTrabalho(f, exemploHipotetico()); assert.deepEqual(lerTrabalho().form, f);
  memoria.set(CHAVE,"arquivo inválido"); assert.deepEqual(lerTrabalho().form, formularioVazio());
  assert.equal(memoria.get(CHAVE), "arquivo inválido");
});
test("modalidades inativas não entram no pedido de cálculo", () => {
  const f = exemploHipotetico();
  f.pessoal.logistica.quantidade_funcionarios = "inválido";
  f.pessoal.logistica.remuneracao_media_mensal = "inválido";
  f.categorias = { comercio:{cpv:{custo_bruto_mensal:"inválido",percentual_elegivel:"inválido"}} };
  const d = paraApi(f);
  assert.equal(d.pessoal.logistica.quantidade_funcionarios, null);
  assert.equal(d.pessoal.logistica.remuneracao_media_mensal, null);
  assert.deepEqual(d.config.categorias, {});
});
test("começar em branco limpa os dados econômicos e conserva encargos e parâmetros", () => {
  const f = exemploHipotetico();
  const b = comecarEmBranco(f);
  assert.equal(b.config.iss_transporte_municipal,"5");
  assert.equal(b.pessoal.armazenagem.cpp, f.pessoal.armazenagem.cpp);
  assert.equal(b.pessoal.armazenagem.preco_mensal, undefined);
  assert.deepEqual(b.galpoes,[{},{},{}]);
  assert.deepEqual(b.bases,{});
  assert.equal(b.perfil,undefined);
});
