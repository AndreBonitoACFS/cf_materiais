import type { Formulario } from "./modelo";
export const exemploHipotetico = (): Formulario => structuredClone({
  "estrutura": "D",
  "regimes": {
    "pj1": "lucro_presumido",
    "pj2": "lucro_presumido",
    "pj3": "lucro_presumido"
  },
  "galpoes": [
    {
      "receita_cf": "0",
      "receita_terceiros": "15000",
      "custos_operacionais": "3000"
    },
    {
      "receita_cf": "0",
      "receita_terceiros": "0",
      "custos_operacionais": "0"
    },
    {
      "receita_cf": "0",
      "receita_terceiros": "0",
      "custos_operacionais": "0"
    }
  ],
  "logistica": {
    "receita_cf": "0",
    "receita_terceiros": "10000",
    "combustivel": "1000",
    "manutencao": "500",
    "outros_custos": "0",
    "depreciacao_anual": "1200",
    "quantidade_veiculos": "",
    "valor_frota": ""
  },
  "pessoal": {
    "comercio": {},
    "armazenagem": {
      "forma": "terceirizacao",
      "preco_mensal": "0",
      "encargos_no_simples": "60,75448632550184400906715130",
      "encargos_fora_do_simples": "86,34459022705678377342472743",
      "encargos_detalhados": "sim",
      "cpp": "25,590103901554934",
      "fgts": "7,342552001245371",
      "ferias": "9,133187705775248",
      "decimo_terceiro": "7,606341965896161",
      "beneficios": "36,672404652585044",
      "outros_encargos": "0"
    },
    "logistica": {
      "forma": "terceirizacao",
      "preco_mensal": "2000",
      "encargos_no_simples": "60,75448632550184400906715130",
      "encargos_fora_do_simples": "86,34459022705678377342472743",
      "encargos_detalhados": "sim",
      "cpp": "25,590103901554934",
      "fgts": "7,342552001245371",
      "ferias": "9,133187705775248",
      "decimo_terceiro": "7,606341965896161",
      "beneficios": "36,672404652585044",
      "outros_encargos": "0"
    }
  },
  "bases": {
    "simples_das": {
      "campos": {
        "receita_comercio": "100000",
        "resultado_antes_irpj_csll_anual": "240000",
        "debito_ibs_mensal": "0",
        "credito_ibs_mensal": "0",
        "debito_cbs_mensal": "0",
        "credito_cbs_mensal": "0",
        "custo_pessoal_embutido_anual": "0",
        "das_embutido_anual": "0"
      },
      "historico": "",
      "ajustes": [],
      "reconciliacao_confirmada": false
    },
    "simples_regular": {
      "campos": {
        "receita_comercio": "100000",
        "resultado_antes_irpj_csll_anual": "240000",
        "debito_ibs_mensal": "0",
        "credito_ibs_mensal": "0",
        "debito_cbs_mensal": "0",
        "credito_cbs_mensal": "0",
        "custo_pessoal_embutido_anual": "0",
        "das_embutido_anual": "0"
      },
      "historico": "",
      "ajustes": [],
      "reconciliacao_confirmada": false
    },
    "lucro_presumido": {
      "campos": {
        "receita_comercio": "100000",
        "resultado_antes_irpj_csll_anual": "240000",
        "debito_ibs_mensal": "0",
        "credito_ibs_mensal": "0",
        "debito_cbs_mensal": "0",
        "credito_cbs_mensal": "0",
        "custo_pessoal_embutido_anual": "0"
      },
      "historico": "",
      "ajustes": [],
      "reconciliacao_confirmada": false
    },
    "lucro_real": {
      "campos": {
        "receita_comercio": "100000",
        "resultado_antes_irpj_csll_anual": "240000",
        "debito_ibs_mensal": "0",
        "credito_ibs_mensal": "0",
        "debito_cbs_mensal": "0",
        "credito_cbs_mensal": "0",
        "custo_pessoal_embutido_anual": "0"
      },
      "historico": "",
      "ajustes": [],
      "reconciliacao_confirmada": false
    }
  },
  "config": {
    "resultado_referencia_anual": "212640",
    "transporte_enquadramento": "municipal",
    "iss_transporte_municipal": "5",
    "icms_transporte": "12"
  },
  "dedutibilidade": "",
  "creditoDas": "",
  "porPapel": {
    "comercio": {
      "adicoes_irpj": "0",
      "exclusoes_irpj": "0",
      "adicoes_csll": "0",
      "exclusoes_csll": "0",
      "credito_ibs_mensal": "0",
      "credito_cbs_mensal": "0"
    },
    "armazenagem": {
      "adicoes_irpj": "0",
      "exclusoes_irpj": "0",
      "adicoes_csll": "0",
      "exclusoes_csll": "0",
      "credito_ibs_mensal": "0",
      "credito_cbs_mensal": "0"
    },
    "logistica": {
      "adicoes_irpj": "0",
      "exclusoes_irpj": "0",
      "adicoes_csll": "0",
      "exclusoes_csll": "0",
      "credito_ibs_mensal": "0",
      "credito_cbs_mensal": "0"
    },
    "armazenagem+logistica": {
      "adicoes_irpj": "0",
      "exclusoes_irpj": "0",
      "adicoes_csll": "0",
      "exclusoes_csll": "0",
      "credito_ibs_mensal": "0",
      "credito_cbs_mensal": "0"
    },
    "comercio+logistica": {
      "adicoes_irpj": "0",
      "exclusoes_irpj": "0",
      "adicoes_csll": "0",
      "exclusoes_csll": "0",
      "credito_ibs_mensal": "0",
      "credito_cbs_mensal": "0"
    },
    "armazenagem+comercio": {
      "adicoes_irpj": "0",
      "exclusoes_irpj": "0",
      "adicoes_csll": "0",
      "exclusoes_csll": "0",
      "credito_ibs_mensal": "0",
      "credito_cbs_mensal": "0"
    }
  },
  "perfil": {
    "id": "hipotetico",
    "origem": "Exemplo inteiramente hipotético",
    "ano": 2027,
    "data": "2026-10-05",
    "aviso": "Sem histórico real; RBT12 aproximado. Validações jurídicas pendentes.",
    "pendencias": [
      "Município e alíquotas locais não confirmados.",
      "CNAEs e enquadramentos das atividades pendentes.",
      "Titularidade e requisitos societários pendentes."
    ]
  },
  "metodoCredito": "manter_projecao",
  "categorias": {},
  "creditoRegular": {
    "armazenagem": "",
    "logistica": ""
  },
  "tributoAcrescido": false
} as Formulario);
