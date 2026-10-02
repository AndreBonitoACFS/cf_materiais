# Fontes e decisões pendentes

## Referência técnica

Planilha consultada na preparação: `CF Materiais - Simulacao Tributaria Reorganizacao 2027 - v2.5.2.xlsx`. Não acompanha a entrega atual porque ainda contém o módulo descartado.

SHA-256 esperado: `22e1fa3d6f747126aead26cd5df4258e5f1f2bd268ae0d0d970ef30775bcb139`.

Os documentos deste pacote foram consolidados a partir das instruções aprovadas, das regras registradas para essa versão e da leitura de suas fórmulas atuais. Os históricos foram consultados na preparação, mas não integram a entrega.

## Onde conferir no arquivo

| Assunto | Local |
|---|---|
| Estrutura e regimes selecionados | 01. Painel |
| Presunções, alíquotas, ajustes e condições | 02. Estrutura e Premissas |
| Base histórica e projeção CF | 03. Situação Atual da CF |
| Receitas/custos dos galpões | 04. Dados da Armazenagem; Premissas; Receitas e Gastos Mensais |
| Logística e reconciliação | 05. Dados da Logística e Frota |
| Pessoal | 06. Pessoal e Implantação, somente blocos de pessoal |
| Motor anual por empresa e consolidação | T8 Cálculo dos Cenários, coluna C (caso do Painel) |
| Motor mensal por empresa | T10 Apuração mensal, linhas com Caso = C |
| Resultados e comparação | 07. Resultados; 08. Comparação de Cenários |
| Verificações da referência | T9 Controles |

As abas G1/G2/G3 contêm cálculos operacionais/creditícios reaproveitados, mas sua apuração histórica de DAS por galpão não define os CNPJs do simulador atual. Consultar as dependências sem restabelecer três empresas de armazenagem.

## Fontes normativas para implementação

- [LC 123/2006](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm): Simples, CPP, limites, anexos e créditos; considerar redação com efeitos no período simulado.
- [LC 214/2025](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm): IBS/CBS, regimes e alterações do Simples.
- [LC 227/2026](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm): alterações e partilhas pertinentes.
- [LC 224/2025, art. 4º](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm): acréscimo da presunção sobre excedente e proporcionalidade por período/atividade.
- [Lei 9.249/1995](https://www.planalto.gov.br/ccivil_03/leis/l9249.htm): alíquotas, adicional e presunções.
- [Resolução CGSN 140/2018](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=compilado), com alterações vigentes, inclusive 190/191 de 2026. A referência registra uso do texto do DOU da Resolução 190, de 04/08/2026, publicado em 10/08/2026.
- [Receita Federal — adequação do Simples à reforma](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/cgsn-atualiza-regras-do-simples-nacional-para-adequacao-a-reforma-tributaria-do-consumo): identificação das alterações e efeitos de 2027. Notícia não substitui os dispositivos.

Este pacote não é um parecer jurídico. Na configuração da ferramenta, registrar dispositivo, vigência e premissa usada. A lista de fontes não equivale à validação integral de todos os tratamentos.

## Decisões a fechar, sem presumir

| Ponto | Estado e consequência |
|---|---|
| Unidade principal dos valores | Definida: média mensal, convertida internamente para o ano; unidades excepcionais explícitas e calendário do Simples preservado |
| Campos mínimos finais | Simplificação da planilha/interface em andamento; não copiar todos os campos da referência |
| Custos da armazenagem/pessoal | Definir apresentação simples e fonte única, preservando os custos reais |
| Base preparada da CF | Fechar quais números a contabilidade entrega e como a reconciliação fica configurada |
| CBS regular de 2027 | Parâmetro provisório da referência; não chamar de definitivo |
| Recursos adicionais | RAD, implantação, payback, contratos adicionais e sensibilidade não estão confirmados para a ferramenta mínima |

Cost Sharing foi descartado totalmente: não há hipótese desse recurso a implementar ou validar. Os demais pontos pendentes devem ser isolados, sem bloquear desenvolvimento das estruturas e cálculos já definidos nem liberar números arbitrários.
