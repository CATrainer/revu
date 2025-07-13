#!/bin/bash

# Setup script for Revu backend development environment

echo "🚀 Setting up Revu backend development environment..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.11"

if [[ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]]; then
    echo "❌ Python $required_version or higher is required. Found: $python_version"
    exit 1
fi

echo "✅ Python version: $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements-dev.txt

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p alembic/versions

# Check if Docker is running
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "🐳 Docker is running"
        
        # Ask if user wants to start services
        read -p "Do you want to start PostgreSQL and Redis using Docker? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🚀 Starting Docker services..."
            docker-compose up -d postgres redis mailhog
            
            # Wait for services to be ready
            echo "⏳ Waiting for services to be ready..."
            sleep 5
            
            # Run database migrations
            read -p "Do you want to create the database tables? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "🗄️ Creating database tables..."
                python scripts/init_db.py
            fi
        fi
    else
        echo "⚠️  Docker is installed but not running. Please start Docker to use local services."
    fi
else
    echo "⚠️  Docker is not installed. You'll need to set up PostgreSQL and Redis manually."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Run 'source venv/bin/activate' to activate the virtual environment"
echo "3. Run 'uvicorn app.main:app --reload' to start the development server"
echo "4. Visit http://localhost:8000/api/v1/docs for API documentation"
echo ""
echo "For background tasks:"
echo "- Celery worker: celery -A app.core.celery worker --loglevel=info"
echo "- Celery beat: celery -A app.core.celery beat --loglevel=info"
echo "- Flower (monitoring): celery -A app.core.celery flower"