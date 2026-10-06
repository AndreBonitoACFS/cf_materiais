# Entrega — documento 07

Versão funcional: **07-integrada-2027**, 06/10/2026. Prévia local: http://127.0.0.1:5173/. Alterações locais; publicação na Vercel não realizada. Os documentos e arquivos contábeis originais foram preservados. As alterações que já existiam no espaço de trabalho foram mantidas.

## Implementado

- Estrutura integrada com somente PJ 1 / CNPJ 63.715.056/0001-42; sem faturamento, ISS ou créditos internos. Custos, pessoal, frota e aluguel externo permanecem uma única vez na DRE histórica.
- Controles compartilhando a mesma operação: Integrada / LP, LR sem PAT e LR com PAT. Comparação simultânea com discriminação de tributos e efeitos separados.
- Perfil ECD/ECF 2025 com quatro trimestres, valores anuais originais, CMV, despesas, pessoal, aluguel externo, alimentação candidata, contas analíticas e identificação dos arquivos. Divergências ECD/ECF e alimentação/parecer explicitadas.
- Pré-preenchimento com escolha entre apenas vazios e substituição dos campos da base. Zero manual preservado na primeira opção. Estrutura, regime, PAT e demais dados de sessões existentes preservados. Primeira abertura vazia, sem exemplo hipotético automático. Limpeza exige confirmação.
- PAT não confirma automaticamente inscrição, empregados ou despesas. Uso da alimentação contabilizada exige hipótese explícita. Elegibilidade confirmada exige referência à evidência; esta referência continua sujeita à conferência contábil.
- PAT trimestral: 90% × mínimo entre 15% da despesa elegível e 4% do IRPJ básico. Não altera adicional, CSLL, resultado antes IRCS ou tributos indiretos. Ausência de valor elegível permanece pendência; zero informado é zero incentivo.
- Média PAT manual com redistribuição uniforme explícita e decimal exato. O perfil conserva os trimestres históricos. Médias exibidas não são usadas para reconstruir o anual.
- LP trimestral com excesso acima de R$ 1,25 milhão por PJ e acréscimo relativo de 10% nas presunções. Serviços externos e receita de aluguel têm classificação própria; acréscimos integrais separados.
- PAT nas estruturas separadas vinculado ao papel da PJ em LR, com despesa própria e memória; sem copiar alimentação do controle integrado. O motor anterior dessas estruturas permanece anual e declara a distribuição uniforme como estimativa.
- Comparação de cisão com controle integrado do mesmo regime. Requer preparação das entradas de ambos os cenários para que a operação seja comparável; não distribui custos de galpões artificialmente.
- Exportação e reimportação preservam dados, origens, trimestres, parâmetros PAT, evidências, vazios, zeros e pendências.

## Validação

77 testes do motor e 12 da interface passaram; compilação de produção concluída. Fluxo verificado na interface local: pré-preenchimento sem alterar a estrutura anterior → seleção integrada → hipótese explícita de ajustes zero → hipótese PAT → comparação dos três controles. API respondeu 200 e resultados renderizaram.

Casos isolados do documento:

| Caso | IRPJ básico | Adicional | PAT | IRPJ líquido | CSLL |
|---|---:|---:|---:|---:|---:|
| LR: base 1 milhão, despesa elegível 100 mil | 150.000,00 | 94.000,00 | 5.400,00 | 238.600,00 | 90.000,00 |
| LR: base 1 milhão, despesa elegível 10 mil | 150.000,00 | 94.000,00 | 1.350,00 | 242.650,00 | 90.000,00 |
| LP: comércio 2 milhões/trimestre | 24.900,00 | 10.600,00 | Não se aplica | 35.500,00 | 22.410,00 |

No LP do último caso, bases IRPJ R$ 166.000,00 e CSLL R$ 249.000,00. Fronteira de R$ 1,25 milhão e limite único para múltiplas atividades testados. Componentes arredondados em Decimal para centavos, metade para cima, por trimestre; totais somam os componentes. Testes exigem igualdade em centavos.

## Exemplo com o perfil histórico

Somente para comparação: ajustes fiscais/acréscimos/receitas segregadas não comprovados = zero por hipótese explícita; todo o candidato de alimentação usado como hipótese elegível pendente. A memória reproduzível está em [MEMORIA_REGRAS_07.json](MEMORIA_REGRAS_07.json).

| Componente anual | Integrada / LP | Integrada / LR sem PAT | Integrada / LR com PAT |
|---|---:|---:|---:|
| IRPJ básico | 590.264,27 | 611.801,25 | 611.801,25 |
| Adicional IRPJ | 369.509,51 | 383.867,51 | 383.867,51 |
| PAT utilizado | Não se aplica | 0,00 | 22.024,84 |
| IRPJ líquido | 959.773,78 | 995.668,76 | 973.643,92 |
| CSLL | 531.237,83 | 367.080,76 | 367.080,76 |
| IBS / CBS / demais tributos / total devido / caixa | n/d | n/d | n/d |

Efeito LP → LR antes do PAT, restrito ao IRPJ/CSLL: R$ 128.262,09. Efeito PAT: R$ 22.024,84. Soma condicional desses efeitos: R$ 150.286,93; não é constante, meta, carga total ou caixa. O valor recalculado difere em quatro centavos do valor citado no documento; esta versão soma componentes trimestrais arredondados, sem forçar a reprodução da análise anterior. Resultado histórico após IRPJ/CSLL não equivale à DRE fiscal reconstruída de 2027.

## Pendências objetivas

- Conciliação ECD × ECF: resultado R$ 2.918,03; alimentação × parecer R$ 9.298,58; receitas acessórias × P200.
- Evidências de inscrição PAT, modalidade, empregados abrangidos, limites individuais e elegibilidade efetiva das despesas. Outros incentivos concorrentes e saldos anteriores não modelados, assumidos ausentes.
- Adições/exclusões, prejuízos compensáveis e reconstrução da DRE fiscal de 2027. Compensação entre trimestres não aplicada.
- Ajustes do limite LP permitidos entre períodos ainda não implementados; cálculo adota quatro limites trimestrais completos e declara essa limitação.
- Integração fiscal IBS/CBS e demonstração de créditos potenciais, disponíveis, utilizados e acumulados: pendentes de documentação. Sem crédito automático de CMV, folha ou depreciação. Carga total permanece n/d.
- Caixa depende de guias, retenções, compensações, vencimentos e fluxo documentado; permanece n/d.
- Comparações de cisão continuam exigindo bases compatíveis, transferência efetiva de custos e atualização da despesa PAT por PJ; sem divisão de custos histórica comprovada não há atribuição automática.

Configuração PAT versionada para 2027 em `backend/motor/integrada.py`, com fator aplicado uma vez e fonte [LC 224/2025, art. 4º](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm), conforme fórmula conservadora solicitada no documento 07. A consulta direta ao PDF da Receita informado no documento falhou; não foi tratada como confirmação independente de requisitos individuais.
