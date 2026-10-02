"""Motor de cálculo do simulador tributário CF Materiais 2027.
Independente da interface e da API."""
from .comparacao import comparar
from .entradas import Cenario, cenario_de_dict
from .estados import Status
from .estrutura import Atividade, Estrutura, Regime, combinacoes, empresas
from .motor import simular
from .parametros import carregar
from .resultado import para_dict

__all__ = [
    "Atividade", "Cenario", "Estrutura", "Regime", "Status",
    "carregar", "cenario_de_dict", "combinacoes", "comparar", "empresas", "para_dict", "simular",
]
