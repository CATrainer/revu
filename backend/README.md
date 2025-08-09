# Repruv Backend API

FastAPI-based backend for the Repruv review management platform.


## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for local development)

### Setup

1. **Run the setup script** (recommended):
   ```bash
   chmod +x scripts/setup_dev.sh
   ./scripts/setup_dev.sh
   ```

2. **Or set up manually**:
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements-dev.txt

   # Copy environment variables
   cp .env.example .env
   # Edit .env with your configuration

   # Start services with Docker
   docker-compose up -d postgres redis mailhog

   # Run database migrations
   alembic upgrade head
   ```

3. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload
   ```

4. **Access the API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/api/v1/docs
   - Health: http://localhost:8000/health

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/           # API endpoints
│   ├── core/          # Core functionality (DB, security, config)
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   ├── tasks/         # Celery background tasks
│   └── main.py        # FastAPI app entry point
├── alembic/           # Database migrations
├── scripts/           # Utility scripts
├── tests/             # Test files
├── requirements.txt   # Production dependencies
└── docker-compose.yml # Local development services
```

## 🧪 Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## 🔧 Background Tasks

Start Celery workers for background task processing:

```bash
# Start worker
celery -A app.core.celery worker --loglevel=info

# Start beat scheduler
celery -A app.core.celery beat --loglevel=info

# Monitor with Flower (optional)
celery -A app.core.celery flower
```

## 🗄️ Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## 🚀 Deployment

### Railway Deployment

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and initialize:
   ```bash
   railway login
   railway init
   ```

3. Add environment variables:
   ```bash
   railway variables set KEY=value
   ```

4. Deploy:
   ```bash
   railway up
   ```

### Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `SECRET_KEY`: Secret key for JWT tokens

## 📝 API Documentation

Once the server is running, visit http://localhost:8000/api/v1/docs for interactive API documentation.

### Key Endpoints

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/reviews` - List reviews
- `POST /api/v1/ai/generate-response` - Generate AI response
- `GET /api/v1/analytics/dashboard` - Analytics data

## 🐛 Troubleshooting

### Windows Users
If you encounter issues installing dependencies:
```bash
pip install -r requirements-windows.txt
```

### Database Connection Issues
Ensure PostgreSQL is running and the connection string in `.env` is correct.

### Redis Connection Issues
Check that Redis is running on the correct port (default: 6379).

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Celery Documentation](https://docs.celeryproject.org/)