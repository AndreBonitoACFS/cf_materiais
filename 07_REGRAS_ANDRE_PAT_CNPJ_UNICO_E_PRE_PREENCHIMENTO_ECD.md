# CF Materiais — PAT, estrutura com um CNPJ e pré-preenchimento

**Para:** André — desenvolvimento de https://cf-materiais.vercel.app/  
**Data:** 06/10/2026. **Ano simulado:** 2027. **Base econômica histórica:** 2025.

## 1. Escopo deste incremento

Implementar:

1. **CF integrada — um único CNPJ**, reunindo comércio, logística e os três galpões.
2. Nessa estrutura, **Lucro Presumido** ou **Lucro Real**, comparando LR sem PAT e LR com PAT.
3. Botão **“Pré-preencher com base real — ECD/ECF 2025”** e opção **“Iniciar sem pré-preenchimento”**.
4. Memória de cálculo com a origem dos valores e o efeito isolado do PAT.

Este documento contém as regras atuais deste incremento. Preservar os cenários existentes. Não reintroduzir Cost Sharing nem usar exemplos hipotéticos antigos como dados do cliente. Não modificar os arquivos originais do projeto.

## 2. Estrutura integrada: regras

- Somente **PJ 1 — CF Materiais**, CNPJ 63.715.056/0001-42. Os três galpões são unidades da mesma empresa.
- O regime da PJ 1 vale para todas as atividades. Ocultar os seletores tributários de PJ 2 e PJ 3.
- Serviços internos de logística/armazenagem não geram faturamento entre empresas, despesas intercompany, ISS de serviço prestado a si próprio ou créditos internos de IBS/CBS.
- Custos, pessoal e frota continuam na CF, uma única vez. Não retirar custos como se a atividade tivesse sido transferida.
- Contratos reais com fornecedores externos continuam na DRE. Aluguel externo não fica zerado só porque os galpões estão no mesmo CNPJ.
- Receitas reais de serviços a terceiros continuam sendo receitas externas, com classificação própria. A base disponível não comprova receita segregada de logística/armazenagem: não inventar valor nem confundir com repasses internos.
- No consolidado, apresentar somente pessoas jurídicas existentes, sem uma sociedade dos galpões fictícia com valores zero.

Criar três controles comparáveis: **Integrada / LP**, **Integrada / LR sem PAT**, **Integrada / LR com PAT**. Usar a mesma operação, custos, receitas e hipóteses fiscais. Trocar regime/PAT não pode mudar os dados silenciosamente.

## 3. Botões e usabilidade

### Pré-preencher com base real — ECD/ECF 2025

Carregar os valores deste documento. Em sessão vazia, iniciar na estrutura integrada, LP, ano 2027, PAT desativado. A escolha de pré-preenchimento não altera silenciosamente estrutura/regime de uma sessão existente.

Se já houver dados, oferecer **“Preencher apenas campos vazios”** ou **“Substituir pelos dados da base”**. Zero informado não é vazio. Nunca sobrescrever valores manuais sem essa escolha.

### Iniciar sem pré-preenchimento

Iniciar vazio, sem transformar ausências em zero. Confirmar antes de limpar uma sessão preenchida. Mudar estrutura/regime não limpa nem reaplica o perfil.

Exibir: **“Base econômica de 2025 repetida para simular 2027, sem crescimento ou inflação. Não é previsão nem apuração fiscal de 2027.”**

Guardar por campo: valor original, unidade, ano, fonte, conta/registro, transformação e validação. Mostrar média mensal = anual / 12, mas preservar o anual em centavos; arredondar a média apenas para exibição. Não reconstruir o anual pela média já arredondada.

Para IRPJ/CSLL, conservar os quatro trimestres históricos. Se o usuário substituir o histórico por uma média, informar a redistribuição escolhida: fatores históricos ou uniforme. Não inventar sazonalidade documentada onde ela não existe.

## 4. O que o perfil carrega e o que não confirma

A última ECD localizada no projeto é de **2025**. As contas analíticas e os trimestres conferidos estão no anexo deste arquivo.

- Receita bruta, CMV, despesas, pessoal contabilizado e alimentação: **ECD 2025**.
- Receita sujeita à presunção: **ECF 2025**, identificada separadamente.
- Bases/créditos IBS/CBS: precisam da **projeção fiscal/documentos fiscais**, não são informação da ECD.
- Quantidade de empregados, salário individual e elegibilidade PAT: dependem de folha/eSocial/documentos. Não reutilizar “10 funcionários × R$ 4 mil” como dado real.
- Custos por galpão: não há segregação comprovada. Na estrutura integrada, manter o total na CF, sem exigir uma divisão artificial.
- Adições/exclusões e prejuízos compensáveis do LR: não comprovados pela ECD. Zero somente como hipótese explícita, com leitura provisória.
- Inscrição e despesas elegíveis PAT, créditos disponíveis e benefícios ZFM: não ficam confirmados pelo botão.

O **resultado antes IRPJ/CSLL da ECD é R$ 4.078.675,07**, conferido pela soma das contas analíticas, excluindo IRPJ/CSLL. A ECF P150 apresenta **R$ 4.075.757,04**: diferença de **R$ 2.918,03**, pendente de conciliação. Usar a origem ECD no perfil pedido e mostrar a divergência; não substituir sem explicação.

As três contas de vale-alimentação/refeição da ECD somam **R$ 473.779,29**. O parecer utilizou R$ 483.077,87: diferença de R$ 9.298,58. O botão usa o candidato extraído da ECD, não o valor do parecer como se fosse o mesmo. Lanches/copa não são automaticamente alimentação elegível PAT.

As contas de pessoal já incluem encargos e alimentação. Seus totais são detalhamentos da DRE: não somar alimentação ou encargos novamente. Na base histórica, não reaplicar percentuais de encargos sobre um custo total que já os contém.

## 5. Lucro Real integrado

Utilizar resultado antes IRPJ/CSLL, com ajustes separados de IRPJ e CSLL:

    Base_IRPJ = resultado_antes_IRCS + adicoes_IRPJ - exclusoes_IRPJ - compensacao_validada_IRPJ
    Base_CSLL = resultado_antes_IRCS + adicoes_CSLL - exclusoes_CSLL - compensacao_validada_CSLL
    IRPJ_basico = 15% × max(Base_IRPJ, 0)
    Adicional_IRPJ = 10% × max(Base_IRPJ - 20.000 × meses_do_periodo, 0)
    IRPJ_antes_PAT = IRPJ_basico + Adicional_IRPJ
    CSLL = 9% × max(Base_CSLL, 0)
    IRPJ_liquido = IRPJ_antes_PAT - PAT_utilizado

Comparação trimestral: limite do adicional R$ 60 mil por trimestre completo. A visão anual soma os trimestres. Não compensar automaticamente prejuízo de um trimestre contra lucro de outro. Se compensação não estiver implementada/documentada, declarar que não foi considerada.

Logística e armazenagem internas já estão no resultado. Não deduzir novamente serviços fictícios adquiridos da própria CF. Nas estruturas separadas, continuar tributando a prestadora e eliminando economicamente o faturamento interno no consolidado.

O resultado histórico repetido é uma aproximação para LR 2027; tributos recuperáveis/não recuperáveis e mudanças operacionais podem exigir reconstrução da DRE. Exibir “Estimativa com base histórica”, não “Lucro Real apurado”.

## 6. Lucro Presumido integrado

Segregar receitas externas por atividade. Para comércio em 2027: presunção IRPJ 8% e CSLL 12%, com acréscimo de 10% nos percentuais sobre a parcela excedente prevista na LC 224/2025. Não acrescentar dez pontos percentuais.

Comércio puro, trimestre completo, sem ajuste entre períodos:

    Excesso = max(receita_comercial_trimestral - 1.250.000, 0)
    Base_IRPJ_LP = receita_comercial_trimestral × 8% + Excesso × 0,8% + acrescimos_integrais_IRPJ
    Base_CSLL_LP = receita_comercial_trimestral × 12% + Excesso × 1,2% + acrescimos_integrais_CSLL
    IRPJ_LP = Base_IRPJ_LP × 15% + max(Base_IRPJ_LP - 60.000, 0) × 10%
    CSLL_LP = Base_CSLL_LP × 9%
    PAT_LP = 0 / Não se aplica

Para atividades múltiplas, limite por PJ, distribuição proporcional do excesso e ajustes permitidos entre períodos. Não repetir R$ 5 milhões de limite por atividade. Comércio, aluguel e serviços externos não podem receber todos 8%/12%.

Receitas acessórias da ECD já estão no resultado contábil. Sua tributação no LP deve seguir a conciliação fiscal: não aplicar presunção comercial automaticamente a rendimentos financeiros ou ganhos de capital. O P200 histórico consultado tem ajustes acessórios zerados; manter a divergência com as receitas acessórias contábeis como pendência fiscal.

No LP, despesas de logística/armazenagem e PAT não reduzem a base presumida. Continuam despesas econômicas.

## 7. PAT: interface e cálculo

### 7.1 Interface simples

Na PJ em LR, mostrar **“Simular incentivo PAT?” — Não / Sim**. Se Sim:

1. **Despesa de alimentação elegível ao PAT — média mensal**, com detalhamento trimestral na área contábil.
2. **Elegibilidade — Pendente / Confirmada / Não elegível**.

Guardar na área contábil: inscrição/período, documentos, empregados abrangidos, despesas elegíveis e limites aplicáveis. Confirmação precisa de evidência. Não pressupor direito ao incentivo só porque a empresa paga alimentação.

R$ 473.779,29 aparece como **“Alimentação contabilizada — valor candidato”**. Não carregar automaticamente como despesa elegível confirmada. Permitir **“Usar esse total como hipótese de elegibilidade”** para apresentação; números ficam “Estimativa PAT — elegibilidade pendente”.

Sem valor elegível ou hipótese autorizada, PAT fica **n/d / pendente**, não zero como se ausência de direito estivesse comprovada. O cenário sem PAT permanece calculável. No LP/Simples, incentivo “Não se aplica”; conservar a despesa de alimentação na DRE e os dados para eventual retorno ao LR.

### 7.2 Fórmula conservadora para 2027

Por período e CNPJ, sem outros incentivos concorrentes ou saldos anteriores:

    D = despesas de custeio elegíveis ao PAT no período
    I15 = IRPJ básico exclusivamente à alíquota de 15%
    PAT_sem_reducao = min(15% × D, 4% × I15)
    PAT_2027 = 90% × PAT_sem_reducao
    IRPJ_liquido = I15 + adicional_IRPJ - PAT_2027
    CSLL_com_PAT = CSLL_sem_PAT

O fator 90% incorpora a redução do incentivo adotada para 2027 conforme LC 224/2025 e orientação da Receita. Configuração versionada por ano e fonte; não aplicar 90% duas vezes.

PAT reduz exclusivamente o IRPJ permitido. **Não reduz adicional IRPJ, CSLL, IBS/CBS, ISS ou ICMS.** Alimentação já na DRE não é deduzida outra vez da base por ativar o incentivo.

Outros incentivos que consumam limites precisam de controle antes da utilização; sem implementação, declarar ausência como hipótese. Excedentes e saldos de anos anteriores exigem memória própria; não transportar automaticamente na primeira entrega.

Elegibilidade de empregados/despesas, modalidade e limites individuais devem ser confirmados pela contabilidade sob as normas aplicáveis. Não depender de tese judicial/decisão específica não documentada.

### 7.3 Outras empresas/estruturas

Calcular PAT somente na PJ em LR que tenha programa, empregados e despesas elegíveis. Não aplicar à sociedade dos galpões no LP. Se despesas/empregados forem transferidos, atualizar resultado, despesa elegível e limite da CF: não congelar o PAT do controle.

## 8. IBS/CBS e caixa

Não usar CMV × alíquota como crédito automático: CMV é custo contábil, não o conjunto de aquisições fiscais do período. Folha e depreciação também não são bases automáticas de crédito. Aquisição de ativo se analisa separadamente.

No LP/LR, manter regime regular IBS/CBS conforme configuração fiscal aplicável. Mudança de regime IRPJ/CSLL ou ativação PAT não exclui créditos nem muda alíquotas automaticamente.

Se integrar a projeção fiscal existente, identificar “Projeção fiscal complementar — base econômica 2025”. A CBS de 8,8% da projeção é provisória. Energia fiscal R$ 176.021,28 difere da energia ECD R$ 210.501,17: não somar as duas como compras diferentes.

Mostrar débito, crédito potencial, disponível, utilizado, acumulado e imposto devido, por PJ e imposto. Não copiar totais antigos de tributos indiretos como nova apuração. Se a integração fiscal estiver pendente, mostrar IRPJ/CSLL separadamente e carga total n/d.

Separar tributos devidos de desembolso efetivo. Sem guias, retenções, compensações, vencimentos e fluxo documentado, caixa efetivo fica n/d. Crédito futuro não equivale a economia imediata.

## 9. Comparação obrigatória

Mostrar, nas três versões integradas: IRPJ básico, adicional, PAT utilizado, IRPJ líquido, CSLL, IBS e CBS separados, demais tributos, total devido e caixa quando documentado.

Destacar:

- Efeito da mudança LP → LR **antes do PAT**.
- Efeito isolado do PAT.
- Diferença total, quando os componentes estão completos.

R$ 150.286,89 não é valor fixo nem meta: era um resultado condicional da análise anterior. Recalcular pelos dados/ajustes atuais. Mensagens: Histórico 2025 / Hipótese 2027 / Validação pendente / Não se aplica / Dados incompletos.

## 10. Testes de aceite

1. Integrada tem só uma PJ, sem faturamento interno ou duplicação de custos.
2. Perfil carrega receita bruta R$ 49.404.848,97, CMV R$ 27.195.331,78, resultado antes IRCS R$ 4.078.675,07 e alimentação candidata R$ 473.779,29; conferir trimestres.
3. Receita de presunção R$ 45.171.535,36 marcada **ECF**; divergências ECD/ECF e alimentação/parecer visíveis.
4. Botão não confirma PAT/créditos, não apaga dados sem escolha e preserva zero manual.
5. Teste LR trimestral: base R$ 1 milhão, despesa PAT elegível R$ 100 mil, sem outros ajustes/incentivos/saldos → IR básico R$ 150 mil; adicional R$ 94 mil; PAT R$ 5.400; IR líquido R$ 238.600; CSLL R$ 90 mil com e sem PAT.
6. Mesma base, despesa elegível R$ 10 mil → PAT R$ 1.350; IR líquido R$ 242.650; CSLL R$ 90 mil.
7. Base IRPJ zero/negativa → PAT utilizável zero; não gerar imposto negativo ou crédito IBS/CBS.
8. LP/Simples: PAT não se aplica; alimentação permanece como despesa econômica.
9. Ligar PAT não subtrai alimentação novamente da base LR nem altera CSLL/adicional/IBS/CBS.
10. Despesa elegível vazia é pendência; zero informado produz incentivo zero; dados não elegíveis não autorizam benefício.
11. Comércio LP 2027, receita trimestral R$ 2 milhões, demais ajustes zero → base IRPJ R$ 166 mil; IRPJ R$ 35.500; base CSLL R$ 249 mil; CSLL R$ 22.410. Fronteira R$ 1,25 milhão sem majoração.
12. Alterar presunção LP não muda LR.
13. Média apenas exibida não perde centavos do anual; não multiplicar por 12 duas vezes.
14. Exportar/reimportar cenário preserva valores, origens, trimestres, parâmetros e pendências.
15. Comparação com cisão usa também controle integrado **do mesmo regime**, separando efeito da estrutura e do regime.

Testes numéricos 5, 6 e 11 são casos isolados, não a apuração documental da CF. Tolerância de centavos declarada; não forçar o perfil real a reproduzir hipóteses.

## 11. Referências legais e entrega

- [RIR/2018, arts. 641–646](https://www2.camara.leg.br/legin/fed/decret/2018/decreto-9580-22-novembro-2018-787360-normaatualizada-pe.html): incentivo PAT e requisitos.
- [LC 224/2025, art. 4º](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm): redução do incentivo e majoração das presunções.
- [Receita Federal, Perguntas e Respostas, pergunta 21](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/beneficios-fiscais/perguntas-e-respostas-reducao-dos-incentivos-e-beneficios-tributarios.pdf): aplicação da redução ao PAT. Conteúdo localizado na busca oficial; download direto apresentou erro nesta consulta.

Consulta em 06/10/2026. Cálculos do simulador são estimativas enquanto a documentação/ajustes não estiverem confirmados.

**Entregar:** prévia da ferramenta, versão/commit, resultados dos testes, memória por tributo e lista objetiva do que ainda estiver pendente. Este arquivo basta para este incremento; não enviar prompts antigos ou milhares de cenários como instruções concorrentes.


## Anexo A — Base trimestral real para o pré-preenchimento

| Trimestre | Receita bruta ECD — R$ | Receita ECF sujeita à presunção — R$ | Resultado ECD antes IRCS — R$ | Alimentação candidata ECD — R$ |
|---|---:|---:|---:|---:|
| 1º | 10.227.223,94 | 9.092.778,76 | 1.018.109,75 | 132.965,51 |
| 2º | 12.089.156,99 | 11.055.488,23 | 1.146.733,62 | 123.920,63 |
| 3º | 12.901.910,25 | 11.908.251,25 | 1.072.630,56 | 108.116,96 |
| 4º | 14.186.557,79 | 13.115.017,12 | 841.201,14 | 108.776,19 |

Receita ECF: P200 código 4, linhas 8803, 9828, 10851, 11874. Resultado ECD: soma das contas analíticas abaixo por encerramento, excluídas contas 3430SPED e 3437SPED.

### Pessoal — totais históricos já incluídos na DRE

| Grupo | Total anual — R$ | Composição |
|---|---:|---|
| Vendas — 2247SPED | 1.855.142,57 | Soma das contas analíticas filhas, inclusive despesas/encargos/benefícios já registrados |
| Administração — 2744SPED | 963.655,38 | Soma das contas analíticas filhas, inclusive despesas/encargos/benefícios já registrados |
| Logística — 2408SPED | 2.759.821,36 | Soma das contas analíticas filhas, inclusive despesas/encargos/benefícios já registrados |

Não somar esses totais ao anexo B: são agrupamentos das mesmas contas. Não atribuir todo o INSS contabilizado automaticamente à CPP normativa sem conferir composição.

## Anexo B — Contas de resultado com saldo anual na ECD

Saldo contábil: **D positivo; C negativo**. Para o resultado, inverter o sinal da soma; para resultado antes IRCS, excluir apenas as contas de IRPJ/CSLL indicadas. Não somar contas sintéticas ou resumos a estas contas.

| Conta | Nome | Saldo anual — R$ | Registro / linhas de origem |
|---|---|---:|---|
| 1974SPED | Receita de Vendas | -49.404.848,97 | I355: 392823, 392915, 393007, 393102 |
| 2002SPED | Devolucao/Cancelamento Concedido | 4.612.659,35 | I355: 392824, 392916, 393008, 393103 |
| 2016SPED | (-) PIS Faturamento | 43.615,94 | I355: 392825, 392917, 393009, 393104 |
| 2023SPED | (-) COFINS Faturamento | 225.416,01 | I355: 392826, 392918, 393010, 393105 |
| 2037SPED | (-) ICMS | 380.486,65 | I355: 392827, 392919, 393011, 393106 |
| 2058SPED | (-) Rendimento de Aplicacao Financeira | -4.517,01 | I355: 392828, 392920, 393012, 393107 |
| 2072SPED | Descontos Obtidos | -7.288,46 | I355: 392829, 393013, 393108 |
| 2079SPED | Juros Ativo | -12,40 | I355: 393109 |
| 2170SPED | Bonificacao | -200.459,16 | I355: 392830, 392921, 393014, 393110 |
| 2177SPED | Outras Receitas Operacionais | -110.000,00 | I355: 392831 |
| 2219SPED | (-) CMV | 27.195.331,78 | I355: 392832, 392922, 393015, 393111 |
| 2254SPED | Salarios e Ordenados - Vendas | 196.580,31 | I355: 392833, 392923, 393016, 393112 |
| 2268SPED | Ferias - Vendas | 74.430,31 | I355: 392834, 392924, 393017, 393113 |
| 2275SPED | 13º Salario - Vendas | 36.562,53 | I355: 392835, 392925, 393018, 393114 |
| 2282SPED | Indenizacao Trabalhista/Aviso Previo - Vendas | 14.390,84 | I355: 392836, 392926 |
| 2289SPED | INSS - Vendas | 379.711,17 | I355: 392837, 392927, 393019, 393115 |
| 2303SPED | FGTS - Vendas | 107.792,60 | I355: 392838, 392928, 393020, 393116 |
| 2310SPED | Vale Transporte - Vendas | 64.389,00 | I355: 392839, 392929, 393021, 393117 |
| 2317SPED | Vale Alimentacao/Refeicao - Vendas | 35.585,00 | I355: 392840, 392930, 393022, 393118 |
| 2359SPED | Hora Extra - Vendas | 299.565,25 | I355: 392841, 392931, 393023, 393119 |
| 2366SPED | Quebra de Caixa - Vendas | 3.534,69 | I355: 392842, 392932, 393024 |
| 2380SPED | Gratificacao - Vendas | 172.504,70 | I355: 392843, 392933, 393025, 393120 |
| 2394SPED | Comissao - Vendas | 444.613,73 | I355: 392844, 392934, 393026, 393121 |
| 2401SPED | FGTS Rescisorio - Vendas | 25.482,44 | I355: 392845, 392935, 393027, 393122 |
| 2415SPED | Salarios e Ordenados - Logistica | 800.732,61 | I355: 392846, 392936, 393028, 393123 |
| 2436SPED | Ferias - Logistica | 134.822,82 | I355: 392848, 392938, 393030, 393124 |
| 2443SPED | 13º Salario - Logistica | 112.283,74 | I355: 392849, 392939, 393031, 393125 |
| 2450SPED | Indenizacao Trabalhista/Aviso Previo - Logistica | 1.182,45 | I355: 392850 |
| 2457SPED | INSS - Logistica | 377.757,48 | I355: 392851, 392940, 393032, 393126 |
| 2464SPED | Medicina Ocupacional - Logistica | 120,00 | I355: 393127 |
| 2471SPED | FGTS - Logistica | 108.389,71 | I355: 392852, 392941, 393033, 393128 |
| 2478SPED | Vale Transporte - Logistica | 126.749,40 | I355: 392853, 392942, 393034, 393129 |
| 2485SPED | Vale Alimentacao/Refeicao - Logistica | 335.849,79 | I355: 392854, 392943, 393035, 393130 |
| 2499SPED | Assistencia Medica Hospitalar - Logistica | 52.735,35 | I355: 392855, 392944, 393036, 393131 |
| 2506SPED | Uniformes e Identificacoes - Logistica | 24.205,20 | I355: 393037, 393132 |
| 2513SPED | E.P.I - Logistica | 1.693,09 | I355: 393038, 393133 |
| 2527SPED | Hora Extra - Logistica | 423.134,78 | I355: 392856, 392945, 393039, 393134 |
| 2548SPED | Gratificacao - Logistica | 12.937,33 | I355: 392857, 392946, 393040, 393135 |
| 2562SPED | Comissao - Logistica | 239.381,08 | I355: 392947, 393041, 393136 |
| 2429SPED | FGTS Rescisorio - Logistica | 7.846,53 | I355: 392847, 392937, 393029 |
| 2576SPED | Agua e Esgoto | 21.895,82 | I355: 392858, 392948, 393042, 393137 |
| 2583SPED | Combustiveis e Lubrificantes | 169.257,59 | I355: 392859, 392949, 393043, 393138 |
| 2590SPED | Energia Eletrica | 210.501,17 | I355: 392860, 392950, 393044, 393139 |
| 2597SPED | Lanches e Refeicoes | 129,69 | I355: 393140 |
| 2604SPED | Manutencao de Veiculos | 89.171,12 | I355: 392861, 392951, 393045, 393141 |
| 2611SPED | Manutencao e Conserv Instalacoes Proprias | 234.526,86 | I355: 392862, 392952, 393046, 393142 |
| 2618SPED | Frete | 318.626,50 | I355: 392863, 392953, 393047, 393143 |
| 2625SPED | Materiais de Expediente | 156,74 | I355: 393144 |
| 2639SPED | Diaria de Motorista | 62.675,00 | I355: 392864, 392954, 393048, 393145 |
| 2646SPED | Seguro de Veiculo | 12.964,94 | I355: 392865, 392955, 393049, 393146 |
| 2660SPED | Seguranca e Vigilancia | 50.550,50 | I355: 392866, 392956, 393050, 393147 |
| 2667SPED | Aluguel de Imoveis | 856.059,22 | I355: 392867, 392957, 393051, 393148 |
| 2681SPED | Embalagens | 24.721,10 | I355: 392868, 392958, 393052, 393149 |
| 2688SPED | Rastreamento de Veiculos | 633,03 | I355: 392869 |
| 2695SPED | Bens de pequeno valor | 252,00 | I355: 393053 |
| 2702SPED | Devolucoes de Clientes | 106,01 | I355: 393150 |
| 2709SPED | Aluguel Equipamentos e veiculos | 9.246,64 | I355: 392870, 392959, 393054 |
| 2730SPED | Propaganda e Publicidade | 845.956,11 | I355: 392871, 392960, 393055, 393151 |
| 2751SPED | Salarios e Ordenados - Adm | 163.544,47 | I355: 392872, 392961, 393056, 393152 |
| 2758SPED | Pro-Labore - Adm | 53.900,00 | I355: 392873, 392962, 393057, 393153 |
| 2765SPED | Ferias - Adm | 79.995,05 | I355: 392874, 392963, 393058, 393154 |
| 2772SPED | 13º Salario - Adm | 84.683,84 | I355: 392875, 392964, 393059, 393155 |
| 2779SPED | Indenizacoes Aviso Previo/Trabalhistas - Adm | 1.642,43 | I355: 392876 |
| 2800SPED | Hora Extra - Adm | 34.410,91 | I355: 392877, 392965, 393060, 393156 |
| 2814SPED | INSS - Adm | 78.674,61 | I355: 392878, 392966, 393061, 393157 |
| 2821SPED | FGTS - Adm | 19.489,33 | I355: 392879, 392967, 393062, 393158 |
| 2828SPED | Vale Transporte - Adm | 62.244,00 | I355: 392880, 392968, 393063, 393159 |
| 2835SPED | Vale Alimentacao/Refeicao - Adm | 102.344,50 | I355: 392881, 392969, 393064, 393160 |
| 2842SPED | Seguro de Vida em Grupo - Adm | 50.002,72 | I355: 393065 |
| 2849SPED | Assistencia Medica e Hospitalar - Adm | 59.890,41 | I355: 392970, 393066, 393161 |
| 2856SPED | Uniformes e Identificacoes - Adm | 5.877,20 | I355: 393067 |
| 2898SPED | FGTS Rescisorio - Adm | 3.387,47 | I355: 393068 |
| 3654SPED | Gratificacao - Adm | 163.568,44 | I355: 392913, 393003, 393098, 393191 |
| 2912SPED | Assessoria Juridica - Adm | 19.884,00 | I355: 392882, 392971, 393069, 393162 |
| 2919SPED | Consultoria e Assessoria Contabil- Adm | 39.307,65 | I355: 392883, 392972 |
| 2933SPED | Limpeza e Conservacao - Adm | 20.109,33 | I355: 392884, 392973, 393070, 393163 |
| 2940SPED | Manutencao de Equipamentos - Adm | 2.216,54 | I355: 392974, 393164 |
| 2947SPED | Suporte de Sistemas e TI - Adm | 84.156,21 | I355: 392885, 392975, 393071, 393165 |
| 2954SPED | Agua, Esgoto e Taxas - Adm | 2.277,76 | I355: 392886, 393166 |
| 2968SPED | Bens de Pequeno Valor - Adm | 1.561,42 | I355: 392887, 392976 |
| 2982SPED | Combustiveis e Lubrificantes - Adm | 40.501,35 | I355: 392888, 392977, 393072 |
| 2996SPED | Copias e Reproducoes Graficas - Adm | 1.000,00 | I355: 392978, 393073, 393167 |
| 3010SPED | Despesas c/ Custas Judiciais - Adm | 3.229,26 | I355: 392979, 393074, 393168 |
| 3017SPED | Despesa com Conducao/Taxi - Adm | 1.442,20 | I355: 392889, 392980, 393169 |
| 3031SPED | Doacoes Contribuicoes - Adm | 70,00 | I355: 392890, 392981, 393075 |
| 3059SPED | Manutencao de Obras Concluidas - Adm | 689.968,80 | I355: 392891, 392982, 393076, 393170 |
| 3073SPED | Manutencao e Conser. de Instalacoes Proprias - Adm | 3.120,00 | I355: 393171 |
| 3087SPED | Materiais de Expediente - Adm | 16.571,93 | I355: 392892, 392983, 393077, 393172 |
| 3122SPED | Seguros Diversos - Adm | 23.819,65 | I355: 392893, 392984, 393078, 393173 |
| 3136SPED | Suprimentos de Copa - Adm | 17.163,44 | I355: 392894, 392985, 393079 |
| 3143SPED | Taxas e Emolumentos - Adm | 10.445,88 | I355: 392895, 392986, 393080, 393174 |
| 3150SPED | Telefone/ Internet - Adm | 25.992,90 | I355: 392896, 392987, 393081, 393175 |
| 3157SPED | Viagens e Estadias - Adm | 4.815,58 | I355: 392897 |
| 3164SPED | Mensalidades e Anuidades - Adm | 2.600,44 | I355: 392898, 392988, 393082, 393176 |
| 3171SPED | Despesas com Depreciacao /Amortizacao - Adm | 213.940,06 | I355: 392899, 392989, 393083, 393177 |
| 3192SPED | Servicos Prestados - Adm | 705.708,06 | I355: 392900, 392990, 393084, 393178 |
| 3675SPED | Despesa com Material de Consumo | 57.940,49 | I355: 393004, 393099 |
| 3213SPED | Alvara - Adm | 4.279,74 | I355: 392901, 392991, 393085 |
| 3220SPED | ICMS Diferenca de Aliquota - Adm | 375,77 | I355: 392902, 392992, 393086, 393179 |
| 3227SPED | IPTU - Adm | 17.909,46 | I355: 392903, 392993, 393087, 393180 |
| 3234SPED | IPVA - Adm | 35.524,54 | I355: 392904, 392994, 393088, 393181 |
| 3689SPED | Taxa Suframa | 91.984,26 | I355: 393005, 393100, 393192 |
| 3276SPED | Despesas Bancarias - Adm | 43.583,89 | I355: 392905, 392995, 393089, 393182 |
| 3283SPED | IOC/ IOF - Adm | 79.774,42 | I355: 392906, 392996, 393090, 393183 |
| 3290SPED | Juros de Mora - Adm | 11.081,69 | I355: 392907, 392997, 393091, 393184 |
| 3297SPED | Multas - Adm | 573,40 | I355: 393092, 393185 |
| 3311SPED | Taxa de Cartao de Credito/Debito - Adm | 1.147.567,70 | I355: 392908, 392998, 393093, 393186 |
| 3318SPED | Juros s/ Emprestimos e Financiamentos - Adm | 409.339,15 | I355: 392909, 392999, 393094, 393187 |
| 3381SPED | Perdas/ Roubo | 875.054,88 | I355: 392910, 393000, 393095, 393188 |
| 3430SPED | IRPJ | 881.017,12 | I355: 392911, 393001, 393096, 393189 |
| 3437SPED | CSLL | 488.731,38 | I355: 392912, 393002, 393097, 393190 |

## Anexo C — Identificação dos arquivos conferidos

- ECD: **SpedContabil-63715056000142_13200237307_11_20250101_20251231_G.txt**. SHA-256: abc75b4099d5f6ce26bc428422fcbcb41038c1af1104c5e296431ee1cd85a16f.
- ECF: **SpedECF-63715056000142-Original-dez.2025.txt**. SHA-256: 9b4cbfca631eedc66f3dc338e2ed988b783e411dbee419802a52fcde7fac21b5.
- Exercício 2025; ECD com quatro encerramentos I350/I355. Cadastro de contas I050. Últimas pastas disponíveis: 2021 a 2025.
- Extração conferida diretamente contra os arquivos originais nesta preparação; fontes preservadas. Em importação futura, considerar centros de custo, escrituração substituta e evitar duplicação de saldos/encerramentos.
- O arquivo é autossuficiente para o perfil resumido e as regras deste incremento. Não é necessário enviar a ECD/ECF bruta ou todos os prompts históricos ao André para começar.
