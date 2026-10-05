# Implementação das regras atuais — 05/10/2026

## Uso

Na abertura, escolha **Usar dados pré-preenchidos — exemplo hipotético** ou **Começar em branco**. Para a demonstração histórica, importe o arquivo local `.config-local/demonstracao-excel.json` usando **Carregar demonstração Excel ou configuração**. Esse arquivo está excluído do Git e do pacote público; faça uma cópia privada para levar a configuração para outro computador.

O formulário é uma cópia editável. A cópia de trabalho e o perfil original são guardados no navegador sob `cf-materiais-config-v3`. **Salvar configuração em arquivo** exporta um JSON versão 3, com decimais em texto sem separador de milhar. Resultados e comparações não são persistidos. Arquivos antigos incompatíveis não são migrados automaticamente.

**Restaurar demonstração** volta ao original importado/carregado. **Começar em branco** limpa as entradas econômicas, bases e equipes; preserva parâmetros profissionais e configuração dos encargos. Ambas as ações pedem confirmação no aplicativo antes de substituir dados. Não apagam arquivos anteriormente exportados. Limpar os dados do navegador remove a cópia de trabalho.

## Cálculo e interface

- Equipes de armazenagem e logística: quantidade inteira × remuneração média individual. Uma equipe de armazenagem cobre os três galpões. Quantidade zero dispensa remuneração e encargos. Campo ausente não vira zero.
- Encargos podem ser informados por componentes (CPP, FGTS, férias, 13º, benefícios e outros) ou pelos totais com/sem CPP. O Simples não acrescenta CPP patronal nos Anexos I/III modelados, inclusive com IBS/CBS regulares. Percentuais históricos são estimativas de custo, não taxas universais.
- Terceirização usa somente o preço ativo. Campos da alternativa inativa não são enviados ao cálculo. Folha, encargos, CPP, pessoas e custo aparecem por atividade e por PJ responsável.
- O pessoal principal pode continuar embutido na base ou receber custo total com encargos, aplicado uma vez; a ponte substitui o custo anterior identificado.
- CMV, CPV e CSP da CF parametrizam créditos, sem descontar os custos outra vez. Armazenagem exige reconciliar a soma das quatro categorias com os três galpões. Logística vincula as categorias aos valores operacionais existentes.
- **Manter projeção** conserva o método anterior. **Categorias** extrai IBS/CBS da parcela elegível de custos brutos e substitui créditos operacionais, em vez de somá-los. Créditos adicionais documentados, como os de pessoal terceirizado, têm campos separados; não repetir as mesmas notas.
- A CF mantém seus débitos projetados e usa somente a diferença entre créditos utilizados antes e depois. Débitos, créditos utilizados e saldos são calculados por tributo e mês. No sublimite, créditos de IBS só entram nos meses em que ele sai do DAS; CBS não recebe esses créditos.
- Receita bruta e receita sujeita à presunção são campos separados. Receita bruta mantém seu uso para limites e fator anual LC 224.
- Créditos de serviços regulares entre empresas têm estado por atividade: pendente, confirmado elegível ou confirmado não elegível. Pendência não libera crédito. Serviços internos no mesmo CNPJ não faturam contra a própria empresa.
- A opção de tributos acrescidos usa preço-base dos serviços para CF e terceiros: acrescenta IBS/CBS à receita bruta da prestadora e ao pagamento da CF, mantendo as bases de ISS/IRPJ/CSLL no preço-base. Eliminações de receita/despesa usam o fluxo bruto.
- Cada edição invalida resultado e comparação atuais. O cálculo usa uma cópia identificada das entradas; respostas de cálculos anteriores são descartadas se o formulário foi alterado.

## Perfis e limitações

O exemplo público é exclusivamente hipotético. As quatro bases da CF e os seis papéis individuais/combinados estão preparados. Os resultados documentados permanecem: D/LP/LP/LP = **R$ 375.180,00**; CF LP/armazenagem Simples DAS/logística LR = **R$ 391.531,20**; esse último caso com terceiros do primeiro galpão a R$ 25 mil/mês = **R$ 499.131,20**.

O perfil histórico mistura fontes de 2025 com hipóteses identificadas para 2027. Quantidade e salário individual da armazenagem permanecem desconhecidos: o cenário inicial não libera consolidado até o usuário informar a equipe ou uma terceirização. Não inferir empregados a partir do total da folha. A CF no Simples permanece inelegível na receita desse perfil, sem apresentar a aproximação como faturamento comprovado de 2026.

As pendências de município, enquadramentos, titularidade, reconciliação, dedutibilidade e créditos permanecem identificadas. A taxa de CBS é provisória. Não houve apuração fiscal independente nem leitura direta da ECD/ECF/planilhas de origem nesta implementação; os valores e mapeamentos foram extraídos das especificações fornecidas.

Detalhes privados da reconciliação com o Excel estão em `.config-local/RELATORIO_EXCEL.md`, excluído do Git. A configuração mantém o pessoal principal histórico embutido, sem substituir automaticamente pelo valor didático antigo. A reprodução da folha total anterior foi verificada exclusivamente em cópia de teste descartável; essa equipe não integra o perfil salvo.

Compatibilidade técnica: clientes antigos podem optar explicitamente por `equipe_por_quantidade=false` para informar folha total. O formulário novo sempre exige quantidade para as atividades de serviço; arquivos antigos não são convertidos em salários individuais.

## Verificação

- 65 testes do backend, incluindo a bateria existente, os novos campos, teto/saldo, substituição, componentes, sublimite e receita/base presumida independentes.
- As 112 combinações A/B/C/D verificadas com pessoal completo, nos dois métodos de crédito (224 cenários).
- As 112 combinações do perfil público passaram pela transformação real do formulário e pelo esquema da API.
- 9 testes do frontend: precisão, persistência, cópia original, formatos, campos inativos e limpeza sem apagar parâmetros.
- Compilação de produção concluída. Conferência no navegador: perfil, cálculo, bloqueio por quantidade ausente, resultado invalidado após edição e restauração da cópia ao reabrir.

Esta entrega registra a implementação e as verificações locais. O envio ao GitHub e a disponibilização do site são etapas separadas.
