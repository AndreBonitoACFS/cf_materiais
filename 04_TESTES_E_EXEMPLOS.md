# Exemplos e critérios de aceite

`04_EXEMPLOS_NUMERICOS.json` contém casos hipotéticos, com entradas, resultados esperados e alcance de cada teste. A aritmética foi conferida durante o preparo do pacote, fora da planilha. Esses exemplos não constituem validação completa do motor tributário.

## Exemplos numéricos incluídos

- Lucro Real com base negativa, R$ 200 mil, R$ 1 milhão e bases distintas para IRPJ/CSLL.
- Lucro Presumido de armazenagem abaixo e acima do limite anual usado na estimativa da LC 224.
- Custo básico da logística e margem antes de tributos.
- Simples de uma empresa nova de armazenagem na primeira faixa, com IBS/CBS dentro/fora do DAS, somente para os primeiros meses e conforme os parâmetros da referência.
- Custos administrativos permanecem na empresa responsável, sem desaparecimento ou duplicação.

## Critérios de aceite do desenvolvimento

| Teste | Comportamento esperado |
|---|---|
| A/B/C/D × regimes | Aceitar as 112 combinações teóricas, separando elegibilidade de cálculo |
| Regimes mistos | Mudar regime da PJ 2 sem mudar os seletores da PJ 1/PJ 3 |
| Três galpões | Somar receitas em um único CNPJ; um único adicional/limite/apuração |
| B, logística para CF | Sem receita tributável interna e sem crédito |
| C, armazenagem para CF | Sem receita tributável interna e sem crédito |
| A/D, serviços para CF | Receita/despesa entre empresas e eliminação econômica correta |
| Receitas para terceiros | Entrar uma vez, mesmo quando já constavam da base da CF |
| Custos antigos substituídos | Retirar uma vez e incluir o custo simulado uma vez |
| Frota | Valor patrimonial não vira custo; depreciação entra uma vez |
| Pessoal | Trocar contratação direta/terceirização sem manter ambas as despesas |
| CPP | No Simples modelado, sem CPP patronal duplicada fora do DAS; ponte antiga sem dupla economia |
| Presunção | Alterar percentuais não modifica LR/Simples |
| Limite da LC 224 | Conferir abaixo, no ponto e acima de R$ 5 milhões por CNPJ |
| Simples e sazonalidade | Mesma receita anual com distribuição distinta pode gerar DAS distinto |
| RBT12 | Conferir defasagem, histórico e regras de início conforme a vigência usada |
| Sublimite | Conferir R$ 3,6 mi e excesso de 20%, temporalidade e IBS/ICMS/ISS fora do DAS |
| Limite do Simples | Conferir R$ 4,8 mi e excesso de 20%; hipóteses sem troca de regime modelada ficam indisponíveis |
| Recurso descartado | Nenhum campo, cálculo, seletor ou pendência de Cost Sharing |
| Despesas administrativas | Permanecem na empresa responsável e entram uma única vez no conjunto |
| Créditos | Não usar o DAS total como crédito e não presumir crédito de adquirente no DAS |
| Comparação entre estruturas | Remapear participantes ou suspender diferença, sem reaproveitamento silencioso |
| Branco × zero | Branco obrigatório bloqueia; zero permitido é dado informado |
| Confirmação jurídica | Não elimina aproximações ou casos não modelados |
| Integridade | Nenhuma divisão por zero, erro oculto ou resultado falso em caso incompleto |

Conferir os demais cálculos contra a referência somente em casos sem o recurso descartado, com as mesmas entradas, parâmetros, unidades e hipóteses. A v2.5.2 não é a especificação integral do produto, pois ainda contém o módulo excluído.

Definir arredondamento fiscal/monetário antes da homologação. Não aceitar tolerância de R$ 1,00 para esconder erro de centavos. Usar números decimais; documentar qualquer diferença causada pela convenção de arredondamento entre Excel e a ferramenta.
