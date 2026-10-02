# Especificação consolidada — simulador CF Materiais

## 1. Objetivo

Construir uma ferramenta para o empresário e sua contabilidade inserirem hipóteses e compararem estruturas e regimes em 2027. O foco é uma simulação pontual e intuitiva. O parecer jurídico será independente dos valores escolhidos na ferramenta.

Não construir um sistema de gestão recorrente, escrituração, controle de rotas ou apuração por produto. Tecnologia, linguagem e organização do desenvolvimento ficam a critério do desenvolvedor; o cálculo precisa ser testável separadamente da interface.

## 2. Estruturas aprovadas

| Estrutura | PJ 1 | PJ 2 | PJ 3 |
|---|---|---|---|
| A | CF Principal | Logística + Armazenagem | Não existe |
| B | CF Principal + Logística | Armazenagem | Não existe |
| C | CF Principal + Armazenagem | Logística | Não existe |
| D | CF Principal | Armazenagem | Logística |

Uma PJ significa um único CNPJ e um único regime. Os três galpões são unidades de uma única PJ; não são três contribuintes. Logística é uma única atividade com frota própria na PJ indicada pela estrutura. Não considerar cisão nem transferências automáticas de ativos ou empregados.

Identificar as empresas por IDs estáveis e mapear atividades para elas. Ao mudar a estrutura, não reaproveitar silenciosamente ajustes ou contratos de uma empresa cujo papel mudou.

## 3. Regimes independentes

Cada PJ ativa escolhe uma das quatro opções:

1. Simples Nacional — IBS/CBS no DAS.
2. Simples Nacional — IBS/CBS no regime regular.
3. Lucro Presumido.
4. Lucro Real.

As seleções são independentes. São 16 combinações em A, B e C e 64 em D: 112 combinações teóricas. Elegibilidade precisa ser verificada separadamente; disponibilizar uma opção não torna a empresa apta a utilizá-la.

Nas estruturas A/B/C, a PJ 3 não aparece nem exige dados. Atividades de um mesmo CNPJ podem ter tratamentos tributários por receita, mas compartilham o regime e os limites da PJ.

## 4. Dados operacionais

### CF Principal

Usar uma base da CF preparada pela contabilidade/consultoria, distinguindo dados históricos de projeções de 2027. A base deve informar receitas, resultado antes de IRPJ/CSLL, tributos já embutidos e parcelas das atividades que serão substituídas. Não pedir ao empresário uma reconciliação contábil detalhada na tela principal.

O método final para apresentar essa base ao usuário ainda será definido. O cálculo não pode dispensar sua consistência: despesas ou receitas antigas substituídas devem sair uma vez, e os dados simulados devem entrar uma vez.

### Armazenagem

Para cada um dos três galpões, apenas dois tipos de receita:

- serviços destinados à CF;
- serviços destinados a terceiros.

Custos e pessoal permanecem necessários para calcular resultado, com origem única e sem duplicação. Não criar receitas específicas de movimentação, separação, expedição ou outros subserviços. O detalhamento final dos campos de custo será definido na simplificação.

A apuração tributária soma os galpões no CNPJ responsável. Capacidade e ocupação não são requisitos para o resultado básico.

### Logística

Somente frota própria. A referência atual usa oito entradas principais:

| Entrada | Unidade na referência |
|---|---|
| Receita de serviços para a CF | R$/mês |
| Receita de serviços para terceiros | R$/mês |
| Combustível | R$/mês |
| Manutenção e demais despesas da frota | R$/mês |
| Outros custos operacionais | R$/mês |
| Quantidade de veículos | Número inteiro |
| Valor total da frota | R$ |
| Depreciação informada | R$/ano |

Manutenção e demais despesas agrupam pneus, seguro, IPVA, licenciamento, rastreamento, pedágios, lavagem e semelhantes. Outros custos excluem pessoal, depreciação e os dois grupos anteriores.

Não criar frota locada, transporte terceirizado, frota mista, rotas, quilômetros, entregas expressas, preço por entrega ou financiamento. A opção de pessoal terceirizado não significa que o transporte passe a ser terceirizado.

Quantidade e valor da frota são informações de patrimônio/capacidade; não geram custos ou investimento novo automaticamente. Sua permanência na tela mínima ainda pode ser revista; conservar sua distinção no cálculo.

### Pessoal

Por atividade — CF Principal, Armazenagem e Logística — somente:

- contratação direta;
- terceirização.

Usar base de remuneração/encargos na contratação direta e preço do serviço na terceirização. Duas atividades no mesmo CNPJ podem ter formas de contratação diferentes. Não criar opção mista nem inferir motoristas pelo número de veículos.

Pessoal deve estar contado uma única vez, na empresa responsável pela contratação. Não distribuir pessoal ou despesas administrativas entre PJs por rateio.

## 5. Operações entre empresas

Se a atividade está na própria CF, o valor de serviços destinados à CF é uma referência interna: não há faturamento contra si mesma, tributo, crédito ou contratação entre empresas.

Se a atividade está em outra PJ, a receita do prestador corresponde à aquisição da CF e segue as regras tributárias e de crédito aplicáveis. O consolidado elimina os valores internos, preservando custos reais, tributos e receitas de terceiros.

Exemplos:

- B: logística para CF é interna; armazenagem para CF é entre PJs.
- C: armazenagem para CF é interna; logística para CF é entre PJs.
- A/D: os dois serviços para CF são entre PJs.

## 6. Exclusão de escopo

Cost Sharing foi descartado integralmente. Não haverá seletor, bloco opcional, custo comum distribuído, centralizadora, participantes, direcionadores, reembolsos, hipóteses de incidência/não incidência, crédito ou ajuste tributário desse recurso.

Os custos reais continuam pertencendo à empresa que os suporta, uma única vez. Retirar a funcionalidade não apaga despesas da CF ou das outras empresas. Serviços efetivos de armazenagem/logística faturados entre PJs continuam sujeitos às suas regras próprias; eles não são o recurso excluído.

## 7. Interface pretendida

Fluxo curto:

1. Escolher estrutura e regimes das empresas existentes.
2. Informar os poucos valores operacionais necessários.
3. Ver resultados e comparações.

Mostrar apenas campos aplicáveis e unidades claras. Premissas tributárias, reconciliação e condições de crédito devem ficar em configuração de contabilidade/consultoria, separadas da tela básica. Sua configuração não pode ser silenciosamente inventada.

Não reproduzir a quantidade de abas, espaços em branco e tabelas técnicas da planilha. Também não remover uma dependência essencial do cálculo só para esconder complexidade. Se uma configuração não estiver pronta, indicar o que falta de forma compreensível.

A entrada principal aprovada é **média mensal**, convertida internamente para o ano. Depreciação anual, patrimônio e quantidades mantêm suas unidades explícitas. Para o motor, manter os 12 meses; a apuração do Simples depende do tempo. Distribuição uniforme precisa ser identificada como hipótese, sem equivaler a histórico real. Sazonalidade não é requisito do preenchimento básico.

## 8. Saídas e estados

Apresentar receita externa, custos, tributos, créditos, resultado por PJ, resultado consolidado e diferença contra a referência da CF. Receitas internas faturadas podem aparecer na memória por PJ, mas não como receita externa consolidada.

Exibir separadamente:

- aguardando seleção;
- dados incompletos;
- inelegível, com motivo;
- hipótese não modelada, com motivo;
- simulação provisória;
- cálculo disponível, com as limitações/hipóteses aplicáveis.

Dados insuficientes ou caso não calculável geram resultado indisponível, nunca zero fictício. Zero informado é diferente de campo vazio. Confirmações jurídicas não removem aproximações matemáticas nem transformam uma hipótese fiscal em certeza.

Comparações devem identificar os regimes de cada PJ. As 112 combinações não precisam estar simultaneamente na tela. Ao comparar estruturas, revisar blocos vinculados às empresas e suspender diferenças que não sejam comparáveis.

Não exigir payback, investimentos, RAD, contratos adicionais, sensibilidade ou indicadores gerenciais no fluxo mínimo. Esses blocos existem na referência, mas sua incorporação à ferramenta simples não está fechada.

## 9. Orientação para implementação

Separar mapeamento de atividades, apropriação de receitas/custos, tributação por PJ e consolidação. Manter alíquotas e tabelas por vigência em configuração identificada; usar precisão decimal e política explícita de arredondamento.

Nenhum cálculo pode depender de uma variável do recurso excluído, mesmo oculta ou fixada em zero. Não preservar esse módulo como uma funcionalidade adormecida.

Implementar primeiro os casos definidos. Isolar os pontos pendentes do documento 05, sem assumir regras que possam alterar materialmente o resultado. Conferir fórmulas atuais no material técnico quando necessário, sem copiar o histórico tributário por galpão como apuração de três empresas.
