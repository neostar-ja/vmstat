#!/bin/bash
# VMStat - Start Script
# Usage: ./start.sh

set -e

echo "🚀 Starting VMStat Application..."
echo "=================================="

# Navigate to webapp directory
cd "$(dirname "$0")"

# Check if docker compose (v2) is available (preferred)
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ docker compose or docker-compose not found!"
    exit 1
fi

# FORCE CLEANUP to avoid docker-compose state errors
echo "🧹 Cleaning up old containers..."
$COMPOSE_CMD down -v --remove-orphans || true
docker ps -a --filter "name=vmstat" -q | xargs -r docker rm -f || true
docker network rm vmstat-network 2>/dev/null || true

# Build and start containers
echo "📦 Building containers..."
$COMPOSE_CMD build --no-cache

echo "🐳 Starting containers..."
$COMPOSE_CMD up -d

echo ""
echo "✅ VMStat is starting..."
echo "   Frontend: https://10.251.150.222:3345/vmstat/"
echo "   API Docs: https://10.251.150.222:3345/vmstat/api/docs"
echo ""
echo "📊 Container Status:"
$COMPOSE_CMD ps

echo ""
echo "📝 View logs with: docker-compose logs -f"
