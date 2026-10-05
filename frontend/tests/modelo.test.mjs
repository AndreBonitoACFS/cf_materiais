import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("../src/modelo.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { numero, percentual, erroNumero, formularioVazio, paraApi, simular } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("digitação e colagem no padrão brasileiro preservam vazio e zero", () => {
  for (const [input, output] of [["25000", "25000"], ["25.000", "25000"], ["25.000,00", "25000.00"], ["25000,50", "25000.50"], ["0", "0"], ["", null], [" R$ 25.000,50 ", "25000.50"]]) assert.equal(numero(input), output);
  for (const input of ["25.50", "25.000.00", "abc", "1,2,3"]) assert.throws(() => numero(input), /padrão brasileiro/);
  assert.equal(percentual("35,5"), "0.355");
});
test("orientações para negativos, texto, percentuais e quantidade", () => {
  assert.match(erroNumero("-3000", "R$/mês"), /negativo/);
  assert.match(erroNumero("abc", "R$"), /padrão brasileiro/);
  assert.match(erroNumero("101", "%"), /entre 0 e 100/);
  assert.equal(erroNumero("100", "%"), "");
  assert.equal(erroNumero("-3000", "R$", true), "");
  assert.match(erroNumero("1,5", "veículos"), /inteira/);
});
test("25.000 mensais são enviados como vinte e cinco mil", () => {
  const f = formularioVazio(); f.galpoes[0].receita_terceiros = "25.000";
  assert.equal(paraApi(f).galpoes[0].receita_terceiros, "25000");
  assert.equal(paraApi(f).galpoes[0].receita_cf, null);
});
test("falha da API não revela mensagem técnica nem entrada financeira", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: [{ msg: "Input should be greater than or equal to 0", input: -3000 }] }), { status: 422 });
  try { await assert.rejects(simular(formularioVazio()), /Confira os dados informados/); }
  finally { globalThis.fetch = old; }
});
