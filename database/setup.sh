#!/bin/bash
# Quick setup script for TimescaleDB
# Run: bash database/setup.sh

set -e

echo "🚀 Setting up TimescaleDB for PolyTrade..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start TimescaleDB container
echo "📦 Starting TimescaleDB container..."
docker-compose up -d timescaledb

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is healthy
for i in {1..30}; do
    if docker-compose exec -T timescaledb pg_isready -U polytrade > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to start. Check logs: docker-compose logs timescaledb"
        exit 1
    fi
    sleep 1
done

# Run migrations
echo ""
echo "📊 Running database migrations..."
docker-compose exec -T timescaledb psql -U polytrade -d polytrade < database/migrations/001_create_price_history.sql

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create .env.local with: DATABASE_URL=postgresql://polytrade:polytrade_dev_password@localhost:5432/polytrade"
echo "2. Test connection: docker-compose exec timescaledb psql -U polytrade -d polytrade -c 'SELECT * FROM price_history LIMIT 1;'"
echo ""
echo "🔍 Useful commands:"
echo "  - View logs: docker-compose logs -f timescaledb"
echo "  - Connect to DB: docker-compose exec timescaledb psql -U polytrade -d polytrade"
echo "  - Stop DB: docker-compose down"
echo "  - Start DB: docker-compose up -d"

