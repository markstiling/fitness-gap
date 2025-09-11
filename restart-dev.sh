#!/bin/bash

echo "🔄 Restarting development server..."

# Kill any running Next.js processes
echo "⏹️  Stopping existing processes..."
pkill -f "next dev" 2>/dev/null || true

# Clear build cache
echo "🧹 Clearing build cache..."
rm -rf .next

# Wait a moment
sleep 2

# Start development server
echo "🚀 Starting fresh development server..."
npm run dev
