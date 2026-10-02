# Memória consolidada de cálculo

## 1. Natureza da referência

Regras documentadas a partir da referência v2.5.2 e da especificação aprovada, com a exclusão integral do Cost Sharing. LP e LR são estimativas anuais; Simples e IBS/CBS usam calendário mensal. As tabelas em `06_REFERENCIA` são parâmetros de consulta, sem fórmulas do recurso excluído. Não houve nova validação jurídica integral ou recálculo no Excel.

## 2. Ordem de processamento

1. Validar estrutura, empresas ativas e regimes.
2. Atribuir comércio, armazenagem e logística às PJs.
3. Normalizar valores para o calendário de 2027, preservando unidades.
4. Preparar a base da CF e substituir parcelas antigas sem duplicação.
5. Calcular receitas e custos das atividades e os fluxos entre PJs.
6. Apurar tributos e créditos por PJ.
7. Consolidar, eliminar fluxos internos de serviços efetivos e calcular diferenças comparáveis.
8. Aplicar a leitura de disponibilidade, hipóteses e limitações.

Custos administrativos pertencem à empresa responsável, sem redistribuição entre CNPJs. Uma despesa já incluída na base permanece nela, salvo substituição efetiva identificada; a retirada do recurso não gera receita, economia, crédito ou devolução de despesa.

## 3. Receitas e custos

Com receita mensal constante: `receita_anual = receita_mensal × 12`.

Com calendário informado: `receita_anual = soma(receita_mês)`.

Na referência da logística, fatores mensais multiplicam as receitas; os custos não usam esses fatores. O padrão é receita constante. Não interpretar fatores de 100% como crescimento de 100%.

Por PJ: somar receita de terceiros e serviços faturados a outras PJs. Excluir referências internas do mesmo CNPJ das bases tributáveis.

Custos da logística, sem tributos apurados separadamente:

`custos_logística = 12 × (combustível + manutenção/demais despesas + outros custos) + depreciação_anual + pessoal_anual`

Essa expressão pressupõe custos mensais constantes. A depreciação entra uma vez; valor da frota não entra nessa soma. Os custos brutos podem conter tributos; créditos devem ser tratados em linha própria, sem deduzir o mesmo crédito no custo e no tributo novamente.

Os custos de armazenagem da referência vêm das premissas/tabelas dos galpões e são agregados no CNPJ. O DAS histórico por galpão não deve ser agregado como se fossem três apurações válidas do modelo atual.

## 4. Base da CF e pessoal

A referência parte do resultado atual da CF antes de IRPJ/CSLL, que já incorpora despesas e tributos indiretos do comércio. A ponte retira receitas repetidas, devolve custos antigos efetivamente substituídos, retira créditos perdidos e inclui os custos simulados nas PJs responsáveis. Não devolve despesa administrativa por remoção do recurso excluído nem distribui esse custo entre PJs.

Não calcular novamente todo o débito do comércio como despesa adicional se ele já está na base. Ao mudar o regime da CF, reconciliar quais parcelas embutidas deixam de ser aplicáveis e quais são substituídas pelo novo regime.

Na contratação direta: `custo_pessoal = remuneração × (1 + encargos_aplicáveis)`.

Na terceirização: custo igual ao preço contratado informado, com crédito apenas quando aplicável. Remover o custo antigo substituído antes de incluir o novo.

Para atividades modeladas nos Anexos I/III, a referência mantém CPP no DAS e não cobra CPP patronal novamente sobre a folha própria. No LP/LR, considerar os encargos fora do DAS conforme as premissas. Anexo IV não é suportado.

A economia de CPP da CF é uma ponte para retirar a parcela antiga já embutida no resultado: reconhecida uma vez, descontando a parcela de folha já substituída por terceirização. Não é um tributo positivo nem crédito de IBS/CBS. Sua entrada exclui parcelas de logística/armazenagem já reconciliadas.

## 5. Lucro Presumido — estimativa anual

Percentuais da referência:

| Atividade | IRPJ | CSLL |
|---|---:|---:|
| Comércio | 8% | 12% |
| Armazenagem | 32% | 32% |
| Transporte de cargas | 8% | 12% |

Para uma PJ, com receita total `R > 0`, limite `L = 5.000.000` e acréscimo `a = 0,10`:

`fator = 1 + a × max(0, R − L) / R`

`base_IRPJ = soma(receita_base_atividade × presunção_IRPJ_atividade) × fator`

`base_CSLL = soma(receita_base_atividade × presunção_CSLL_atividade) × fator`

Sem receita, não dividir por zero. Outras receitas tributáveis não devem receber automaticamente a presunção de armazenagem; os fluxos opcionais da referência têm parâmetros próprios.

`IRPJ = 15% × base_IRPJ + 10% × max(0, base_IRPJ − 240.000)`

`CSLL = 9% × base_CSLL`

Agregação e adicional são por CNPJ, uma única vez. A LC 224 determina limite proporcional ao período e acréscimo proporcional às atividades; a expressão anual acima é a estimativa adotada no modelo. Não apresentá-la como apuração fiscal completa por período. [LC 224/2025, art. 4º, §§4º e 5º](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm).

Presunção nunca entra no Lucro Real ou Simples.

## 6. Lucro Real — estimativa anual

`base_IRPJ = resultado_antes_IRPJ_CSLL + adições_IRPJ − exclusões_IRPJ`

`base_CSLL = resultado_antes_IRPJ_CSLL + adições_CSLL − exclusões_CSLL`

`IRPJ = 15% × max(0, base_IRPJ) + 10% × max(0, base_IRPJ − 240.000)`

`CSLL = 9% × max(0, base_CSLL)`

Aplicar alíquotas à base inteira. Adições e exclusões podem diferir por tributo. Não pressupor compensação de prejuízos fiscais. Tributos já considerados no resultado não podem ser subtraídos novamente ao preparar a base.

A referência adiciona despesas com outras PJs à base da CF quando sua dedutibilidade não foi confirmada. É uma premissa conservadora da simulação, não a afirmação de que toda despesa pendente seja legalmente indedutível. Preservar sua identificação ou fechar outra premissa antes de comparar resultados.

## 7. Simples Nacional — mensal por CNPJ

Apuração usa receita total do CNPJ para faixa/RBT12 e segregação por atividade para os componentes do DAS. Tabelas e partilhas de 2027 precisam ser versionadas, não embutidas na interface.

`alíquota_efetiva = (RBT12 × alíquota_nominal − parcela_a_deduzir) / RBT12`

Quando a regra de início de atividade determina a primeira faixa, usar a correspondente taxa sem dividir por RBT12 zero. Aplicar componentes do anexo à receita da atividade. Comércio usa Anexo I; armazenagem/transporte municipal, Anexo III; transporte intermunicipal/interestadual usa o tratamento específico de substituição da parcela de ISS por ICMS.

Metodologia implementada e documentada na referência de 2027:

- RBT12 com defasagem: 12 meses antecedentes ao mês anterior ao período de apuração.
- CF existente: histórico pertinente; sem histórico, aproximação pela receita anual distribuída, identificada como tal. O histórico disponível abrange dez./2025 a dez./2026.
- PJ 2/3 novas: início em jan./2027; meses 1 e 2 na primeira faixa e, a partir do terceiro, receita média pertinente anualizada segundo a regra de início.
- Limite da receita: R$ 4,8 milhões; sublimite configurado na referência: R$ 3,6 milhões.
- Sublimite é verificado pela receita acumulada e pelos efeitos temporais, não apenas por `RBT12 > sublimite`.
- Empresa existente: excesso de mais de 20% do sublimite gera impedimento no mês seguinte; excesso de até 20% produz efeitos no ano seguinte. Receita anterior acima do sublimite afeta o ano simulado.
- Empresa nova: excesso superior a 20% do sublimite tem efeito retroativo ao início; tratar proporcionalidade ao tempo de atividade se futuramente houver início diferente de janeiro.
- A referência retira IBS, ICMS e ISS do DAS quando ocorre o impedimento e aplica seu tratamento fora do DAS. Não retirar CBS pelo sublimite como se estivesse no mesmo conjunto.
- Acima da quinta faixa, sem impedimento, o modelo utiliza a parcela estadual/municipal/IBS da quinta faixa conforme sua regra específica. Há teto de ISS de 5% e redistribuição da diferença.
- Com opção regular de IBS/CBS, retirar suas parcelas do DAS e apurá-las à parte, sem duplicação. [Receita Federal — adequações de 2027](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/cgsn-atualiza-regras-do-simples-nacional-para-adequacao-a-reforma-tributaria-do-consumo).

Os detalhes constam das fórmulas atuais da T10 e das fontes indicadas no documento 05. São regras da referência a conferir por vigência na implementação, não uma nova homologação jurídica neste pacote.

## 8. IBS/CBS e outros tributos

No regime regular: apurar débitos das operações tributadas, créditos elegíveis e saldos por tributo e mês. Guardar separadamente IBS e CBS.

Para um novo CNPJ sem débito comercial já embutido em base anterior:

`disponível = saldo_credor_anterior + crédito_elegível_mês`

`crédito_utilizado = min(débito_mês, disponível)`

`a_recolher = max(0, débito_mês − crédito_utilizado)`

`saldo_credor_final = disponível − crédito_utilizado`

Na CF, créditos podem compensar também o débito do comércio projetado e embutido na base. Sua ponte incremental precisa considerar esse débito, sem limitar a compensação ao débito dos serviços novos. Não confundir saldo credor, crédito potencial, crédito utilizado e dinheiro recebido; não presumir ressarcimento.

Fornecedor no DAS não transfere automaticamente o DAS total ou a alíquota regular. Considerar o IBS/CBS efetivamente transferível segundo as regras do fornecedor e as condições do adquirente. Um adquirente no DAS não se torna regular por contratar outra empresa.

Crédito não pode incidir indiscriminadamente sobre custo agrupado: folha, IPVA e outros itens podem ter naturezas diferentes. A referência permite crédito elegível agregado ou valor informado pela contabilidade, sem somar os dois métodos. Alíquota sobre preço bruto pode exigir extração do tributo embutido, em vez de multiplicação direta.

ISS de armazenagem é 5% na referência, uma premissa a conferir por município/enquadramento. Transporte exige configuração municipal/intermunicipal/interestadual e as alíquotas aplicáveis, sem modelar rotas. Não fixar ISS em 5% para todo transporte.

IBS e CBS são parâmetros distintos. A CBS regular de 2027 permanece provisória na referência; não apresentá-la como alíquota definitivamente validada.

## 9. Resultado e consolidação

`resultado_PJ = receitas_reconhecidas − custos_reconhecidos − tributos_aplicáveis + efeitos_de_crédito_ainda_não_reconhecidos`

Essa identidade exige uma convenção única para tributos/créditos já incluídos em cada parcela. Na CF, utilizar a ponte, em vez de somar a mesma despesa tributária novamente.

Somar resultados das PJs; eliminar receitas e despesas entre participantes nas linhas consolidadas correspondentes. Não deduzir o valor da eliminação uma segunda vez do resultado líquido já somado. Tributos não desaparecem por serem decorrentes de operações internas ao conjunto.

`diferença = resultado_consolidado_cenário − resultado_referência_comparável`

Desativar essa diferença quando os blocos por empresa não puderem ser remapeados entre estruturas. A consolidação é econômica para simulação, sem afirmar existência ou ausência de grupo econômico.

## 10. Cobertura e limites

- LP/LR anuais estimados, sem compensação de prejuízos no LR.
- RBT12 aproximado quando não informado; distribuição temporal deve ser exposta.
- Comércio no Anexo I sem ST, monofásicos ou benefícios por produto.
- Sexta faixa estendida quando RBT12 supera a tabela: aproximação da referência.
- Teto de ISS aplicado também ao transporte: simplificação declarada da referência.
- Mudança da CF de regime durante 2027 por excesso superior a 20% do limite do Simples: não modelada; resultado indisponível.
- RAD com IBS/CBS no DAS: não modelado.
- Anexo IV e exportação: fora do escopo.
- Para CF impedida pelo sublimite, o IBS do comércio usa a parcela do IBS/CBS líquido projetado distribuída pelos meses: não equivale a escrituração mensal integral.

As confirmações jurídicas não removem essas limitações. Não prometer apuração fiscal integral ou elegibilidade automática.
