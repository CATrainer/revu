# Repruv - AI-Powered Social Media Management Platform

All-in-one dashboard to supercharge your content creation and brand engagement through intelligent social media monitoring, comment management, and AI-powered insights.

## 🚀 Features

- **Social Media Monitoring** - Track comments and mentions across YouTube, Twitter/X, and other platforms
- **AI-Powered Comment Management** - Generate personalized responses in your brand voice
- **Content Creator Analytics** - Comprehensive insights into engagement and performance
- **Smart Automation** - Set up intelligent workflows for comment moderation and responses
- **AI Assistant** - Get content suggestions and engagement strategies
- **Multi-Platform Integration** - Unified dashboard for all your social media channels

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis
- **Queue**: Celery
- **AI**: OpenAI GPT-4, Anthropic Claude

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI**: React 18 + Tailwind CSS + Shadcn/ui
- **State**: Zustand
- **API Client**: Axios + React Query (TanStack Query)
- **Animations**: Framer Motion

### Infrastructure
- **Hosting**: Vercel (Frontend), Railway (Backend)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Cloudflare R2
- **Email**: Resend
- **Monitoring**: Sentry
- **Social APIs**: YouTube Data API, Twitter/X API, Reddit API

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
   git clone https://github.com/yourusername/Repruv.git
   cd Repruv
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
- `CLAUDE_API_KEY` - Anthropic Claude API key (optional)
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` - Supabase configuration
- `YOUTUBE_API_KEY` - YouTube Data API key for social monitoring
- `CALENDLY_ACCESS_TOKEN` - Calendly integration token

## 👨‍💻 Admin Access

For development and testing purposes, a shared admin account is available (seeded by the demo script):

- Email: `admin@repruv.dev`
- Password: `Demo2025!`

This admin account has full access to:
- User management (view all users, grant/revoke access)
- System administration features
- Platform analytics and insights
- Social media monitoring configuration

⚠️ Security: Change these credentials in production environments.

## 🎯 Dashboard Structure

The platform provides a streamlined dashboard with focused sections:

- **Dashboard** (`/dashboard`) - Main overview with key metrics and activity feed
- **Comments** (`/comments`) - Social media comment management and moderation
- **Automation** (`/automation`) - Workflow automation and rule configuration
- **Analytics** (`/analytics`) - Performance metrics and engagement insights
- **AI Assistant** (`/ai-assistant`) - AI-powered content and strategy suggestions
- **Settings** (`/settings`) - User preferences and platform configuration
- **Social Monitoring** (`/social-monitoring`) - Real-time platform monitoring and alerts

## 🧪 Demo Accounts

These demo users are created by `backend/scripts/seed_demo_accounts.py` for testing:

- Content Creator demo
   - Email: `demo+creator@repruv.app`
   - Password: `Demo2025!`
   - Access: Full platform access with social media monitoring

- Brand Manager demo
   - Email: `demo+brand@repruv.app`
   - Password: `Demo2025!`
   - Access: Brand-focused dashboard with engagement analytics

- Agency Account (Test)
   - Email: `testagency@repruv.com`
   - Password: `TestAgency123!`
   - Access: Full agency dashboard with creator management features
   - Agency Name: Test Agency
   - Agency Slug: `test-agency`

Notes:
- Demo data simulates real social media interactions without affecting external platforms
- Frontend defaults to the production API unless `NEXT_PUBLIC_API_URL` is set
- Override API URL in `frontend/.env.local` for local development
- Agency test account must be created manually in Supabase using the SQL script in `scripts/create_test_agency.sql`

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

Built with ❤️ for content creators, influencers, and brands

Note: Do not store secrets in this README. Place environment variables in the appropriate `.env` files. See `backend/.env.example` and `frontend/.env.example` for templates.
