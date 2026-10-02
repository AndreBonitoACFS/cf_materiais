# Simulador tributário — CF Materiais 2027

Compara estruturas empresariais (A/B/C/D) e regimes por CNPJ, com resultados por empresa, consolidado e memória de cálculo. A especificação está nos documentos `00` a `06` desta pasta.

## Organização

| Pasta | Conteúdo |
|---|---|
| `backend/motor` | Motor de cálculo em Python + `Decimal`, independente da interface |
| `backend/motor/parametros/2027.json` | Parâmetros tributários por vigência, com fonte e situação de validação |
| `backend/api` | API FastAPI + Pydantic |
| `backend/tests` | pytest: exemplos do pacote, critérios de aceite e API |
| `frontend` | Interface React + TypeScript + Vite + Tailwind, em três etapas |

Módulos do motor: `estrutura` (mapeamento de atividades), `entradas`, `lucro` (Presumido e Real), `simples`, `ibs_cbs`, `motor` (apropriação, tributação por PJ, ponte da CF e consolidação), `comparacao`, `estados`, `decimais` (arredondamento).

## Executar

```powershell
# API (http://127.0.0.1:8010, documentação em /docs)
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -e ".[dev]"
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python -m uvicorn api.main:app --reload --port 8010

# Interface (http://localhost:5173), em outro terminal
cd frontend
npm install
npm run dev
```

## Arredondamento

Cálculos intermediários em `Decimal` com 28 dígitos, sem arredondar. Arredonda-se para centavos (meia unidade para cima) em cada componente mensal de tributo e em cada tributo anual estimado. Os totais somam valores já arredondados. Não há tolerância nos testes além da soma de componentes mensais do DAS.

## Estados do resultado

Aguardando seleção, dados incompletos, inelegível, hipótese não modelada, simulação provisória e cálculo disponível. Caso não calculável não tem valores (nunca zero fictício). Campo vazio (`null`) é diferente de zero informado.

## Decisões de modelagem a validar

Estas escolhas preenchem pontos que o pacote deixa em aberto. Cada uma aparece no resultado como hipótese ou pendência.

- **Base da CF**: uma base por regime da CF, preparada pela contabilidade (receita do comércio, resultado antes de IRPJ/CSLL com tributos indiretos embutidos, DAS embutido, débitos e créditos de IBS/CBS do comércio, histórico de receita). Sem base para o regime escolhido, a CF fica com dados incompletos.
- **Ponte da CF**: ajustes identificados por `id` único (custo ou tributo antigo substituído, receita duplicada, crédito antigo perdido). O motor acrescenta receitas, custos, tributos e créditos novos.
- **Configuração por empresa** (adições/exclusões do Lucro Real, créditos informados): vinculada ao papel da empresa (por exemplo, `armazenagem+logistica`), não ao número da PJ. Se a estrutura muda o papel, a configuração não é reaproveitada.
- **Encargos de pessoal**: dois percentuais informados, um para o Simples (sem CPP patronal) e outro fora do Simples.
- **Créditos de IBS/CBS**: sobre serviços de outra PJ no regime regular, o crédito é o débito do fornecedor. Fornecedor com IBS/CBS no DAS só gera crédito se a contabilidade confirmar, limitado às parcelas de IBS/CBS do DAS. Créditos sobre demais custos só entram quando informados.
- **Débito de IBS/CBS**: alíquota sobre a receita informada. A extração de tributo embutido no preço existe (`ibs_cbs.tributo_embutido`), mas não é aplicada.
- **Simples acima da quinta faixa**: parcela de ICMS/ISS/IBS pela quinta faixa no sublimite, reconstruída a partir da descrição do documento 02. Torna a simulação provisória; conferir com a T10 da referência.

## Não implementado (pendências identificadas)

- Transporte intermunicipal/interestadual no Simples (substituição da parcela de ISS por ICMS): hipótese não modelada.
- Exclusão do Simples por excesso superior a 20% do limite durante 2027: hipótese não modelada.
- ISS do transporte municipal, ICMS do transporte e demais tributos sobre a receita: sem valor na referência. Os dois primeiros podem ser configurados pela contabilidade; o terceiro não é aplicado.
- Fatores mensais de receita: o motor aceita calendário de 12 meses por campo (API), mas a interface só pede a média mensal.
- Elegibilidade além dos limites de receita do Simples.
- PostgreSQL: simulações não são salvas. Ao acrescentar, usar colunas `numeric`.
