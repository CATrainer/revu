"""Monetization Templates V2 - 100 Curated Templates.

Templates are organized into 5 categories:
- Digital Products (20 templates)
- Services (20 templates)  
- Physical Products (15 templates)
- Partnerships (20 templates)
- Platform Features (15 templates)
"""

from .digital_products import DIGITAL_PRODUCTS_TEMPLATES
from .services import SERVICES_TEMPLATES
from .physical_products import PHYSICAL_PRODUCTS_TEMPLATES
from .partnerships import PARTNERSHIPS_TEMPLATES
from .platform_features import PLATFORM_FEATURES_TEMPLATES

ALL_TEMPLATES = (
    DIGITAL_PRODUCTS_TEMPLATES +
    SERVICES_TEMPLATES +
    PHYSICAL_PRODUCTS_TEMPLATES +
    PARTNERSHIPS_TEMPLATES +
    PLATFORM_FEATURES_TEMPLATES
)

__all__ = [
    "DIGITAL_PRODUCTS_TEMPLATES",
    "SERVICES_TEMPLATES", 
    "PHYSICAL_PRODUCTS_TEMPLATES",
    "PARTNERSHIPS_TEMPLATES",
    "PLATFORM_FEATURES_TEMPLATES",
    "ALL_TEMPLATES",
]
