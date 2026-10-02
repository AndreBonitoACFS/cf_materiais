# Interface simplificada — orientação de desenvolvimento

## Objetivo

Permitir uma simulação pontual com poucas escolhas e valores fáceis de identificar. As estruturas A/B/C/D e os regimes por CNPJ continuam aprovados. Cost Sharing está excluído, inclusive como recurso opcional.

## Fluxo básico

1. Escolher estrutura e regime de cada empresa ativa.
2. Informar receitas e custos operacionais.
3. Ver resultados por empresa e consolidados.

Não pedir dados da PJ 3 fora de D. Mostrar o nome/atividades de cada PJ ao lado do seu regime. Usar campos com unidade e indicação curta do que incluem.

## Proposta de campos

| Bloco | Campos principais |
|---|---|
| Estrutura | A/B/C/D; regime de cada PJ ativa |
| Galpões | Para cada galpão: receita para CF, receita para terceiros e custos operacionais sem pessoal |
| Logística | Receita para CF/terceiros; combustível; manutenção/demais despesas; outros custos; depreciação |
| Pessoal | Direta/terceirização por atividade e base de custo correspondente |
| CF | Base de referência preparada pela contabilidade/consultoria |

Na logística, quantidade de veículos e valor da frota existem na referência e são informativos. Não exigem destaque no preenchimento mínimo nem geram custos automaticamente.

Esta tabela orienta a próxima simplificação; o formato final dos custos dos galpões e da base da CF ainda será fechado. Não substituir falta de dado contábil por zero ou por despesa presumida.

## Configuração contábil separada

Alíquotas, partilhas, histórico de receitas, encargos, créditos elegíveis e reconciliação da base devem ficar em configuração de contabilidade/consultoria. A tela básica não precisa pedir esses dados novamente se já estiverem configurados e identificados.

Para a reconciliação, conservar custo antigo uma vez ou substituí-lo uma vez. A interface não deve expor ao empresário uma sequência de ajustes que ele não consegue identificar. Se a base não estiver pronta, mostrar a pendência específica.

## Unidade e calendário

O preenchimento principal é por **média mensal**, aprovado pelo usuário. Converter receitas e custos recorrentes em valores anuais internamente, usando 12 meses uniformes no caso básico. Manter a depreciação identificada como anual e não multiplicar patrimônio ou quantidade por 12. Preservar o calendário necessário ao Simples; distribuição uniforme é hipótese e não histórico real.

## Resultado

Mostrar por PJ: receita, custos, tributos, créditos usados e resultado. No conjunto: receitas externas, custos externos, tributos, resultado consolidado e diferença contra referência comparável.

Os detalhes de cálculo ficam em uma memória consultável. Casos incompletos, inelegíveis ou não modelados não recebem resultado fictício. Validações pendentes e aproximações devem acompanhar os números disponíveis.

Não incluir payback, RAD, contratos adicionais, indicadores de entregas ou simulação de rotas no fluxo mínimo. Uma despesa administrativa existente continua na empresa responsável; não haverá distribuição entre PJs.
