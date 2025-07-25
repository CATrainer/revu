# Import all models so Alembic can detect them
from app.core.database import Base  # noqa
from app.models import *  # noqa

# This file ensures all models are imported before 
# initializing the database