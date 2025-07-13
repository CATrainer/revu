# Revu - AI-Powered Review Management Platform

All-in-one dashboard to supercharge your business through intelligent review management, competitor tracking, and AI-powered insights.

## 🚀 Features

- **Unified Review Management** - Centralize reviews from Google, TripAdvisor, and social media
- **AI-Powered Responses** - Generate personalized responses in your brand voice
- **Competitor Tracking** - Monitor and benchmark against local competitors
- **Smart Analytics** - Natural language queries and comprehensive reporting
- **Automation Rules** - Set up intelligent workflows to save time

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis
- **Queue**: Celery
- **AI**: OpenAI GPT-4

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI**: React 18 + Tailwind CSS + Shadcn/ui
- **State**: Zustand
- **API Client**: Axios + React Query

### Infrastructure
- **Hosting**: Vercel (Frontend), Railway (Backend)
- **Database**: Supabase
- **File Storage**: Cloudflare R2
- **Email**: Resend
- **Monitoring**: Sentry

## 🛠️ Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/revu.git
   cd revu
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis mailhog
   ```

3. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements-dev.txt
   cp .env.example .env
   # Edit .env with your configuration
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

4. **Frontend setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/api/v1/docs
   - Mailhog: http://localhost:8025

## 📝 Environment Variables

See `.env.example` files in both `backend/` and `frontend/` directories for required configuration.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` - Supabase configuration

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
pytest --cov  # With coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:e2e  # End-to-end tests
```

## 🚀 Deployment

### Production Deployment

1. **Backend** - Deployed to Railway
   ```bash
   cd backend
   railway up
   ```

2. **Frontend** - Deployed to Vercel
   ```bash
   cd frontend
   vercel --prod
   ```

## 📖 Documentation

- [Technical Specification](docs/plan.md)
- [API Documentation](http://localhost:8000/api/v1/docs)
- [Component Storybook](http://localhost:6006) (coming soon)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Team

- [Your Name] - Founder & Lead Developer

---

Built with ❤️ for local businesses
