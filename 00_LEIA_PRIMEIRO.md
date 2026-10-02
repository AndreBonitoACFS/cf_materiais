# CF Materiais — pacote para desenvolvimento

Preparado para André em 01/10/2026.

## Finalidade

Desenvolver uma ferramenta simples para simular estruturas empresariais e regimes tributários. A planilha existente é uma referência dos cálculos; a interface da ferramenta não deve reproduzir sua quantidade de campos, abas e controles.

Este pacote reúne somente a especificação consolidada. Não contém prompts históricos, changelogs ou instruções de versões substituídas.

## Ordem de leitura

1. **01_ESPECIFICACAO_E_PROMPT.md**: objetivo, estruturas, entradas e comportamento esperado. Pode ser usado como prompt de desenvolvimento, junto aos demais documentos.
2. **02_REGRAS_DE_CALCULO.md**: fórmulas, metodologia, tributos e limites da referência existente.
3. **03_INTERFACE_SIMPLIFICADA.md**: proposta de poucos campos e separação das configurações contábeis.
4. **04_TESTES_E_EXEMPLOS.md** e **04_EXEMPLOS_NUMERICOS.json**: exemplos hipotéticos e critérios de aceite.
5. **05_FONTES_E_PONTOS_A_DEFINIR.md**: fontes e decisões que ainda precisam ser fechadas.

**06_REFERENCIA/** contém somente parâmetros e tabelas tributárias extraídos da referência. A planilha v2.5.2 e suas fórmulas brutas não acompanham este pacote: ainda contêm o recurso retirado do escopo. Os exemplos são hipotéticos.

## Como resolver diferenças

- As decisões de produto estão no documento 01; a proposta de simplificação está no documento 03.
- **Cost Sharing está totalmente fora do escopo**, por decisão comunicada após consulta a Fabrício. Não implementar rateio entre PJs, centralizadora, participantes, reembolsos ou hipóteses de IBS/CBS para esse recurso.
- A planilha v2.5.2 foi consultada somente para os demais cálculos existentes, com as limitações do documento 02. Seus módulos não definidos neste pacote não são requisitos do software.
- A entrada principal foi definida: **média mensal**, convertida internamente para o ano. Depreciação permanece identificada como anual; patrimônio e quantidade não são multiplicados por 12. A apresentação da base da CF e os detalhes dos campos de custo ainda precisam de implementação e conferência.
- Não extrapolar uma regra de outro regime para preencher lacunas; apresentar a pendência correspondente.

## Alcance da conferência deste pacote

Foram conferidos o hash da referência consultada, os parâmetros extraídos, a integridade do pacote e a aritmética dos exemplos próprios. Não foi repetida a bateria de recálculo no Excel nem realizada auditoria jurídica integral neste preparo. Relatórios anteriores de testes não são apresentados aqui como testes novos.

Nenhuma planilha ou fonte original foi alterada. O pacote foi preparado para o usuário encaminhar; não foi enviado ao destinatário.
