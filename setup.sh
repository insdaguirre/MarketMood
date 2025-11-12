#!/bin/bash

# Quick setup script for MarketMood

echo "🚀 MarketMood Setup Script"
echo ""

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from example..."
    cp backend/.env.example backend/.env 2>/dev/null || true
    echo "✅ Created backend/.env - Please edit it with your API keys!"
else
    echo "✅ backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env from example..."
    cp frontend/.env.example frontend/.env 2>/dev/null || true
    echo "✅ Created frontend/.env"
else
    echo "✅ frontend/.env already exists"
fi

# Generate secrets if not present
if ! grep -q "JWT_SECRET=" backend/.env || grep -q "JWT_SECRET=$" backend/.env; then
    echo "🔑 Generating JWT_SECRET..."
    JWT_SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env 2>/dev/null || echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
    else
        # Linux
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env 2>/dev/null || echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
    fi
    echo "✅ Generated JWT_SECRET"
fi

if ! grep -q "ADMIN_KEY=" backend/.env || grep -q "ADMIN_KEY=$" backend/.env; then
    echo "🔑 Generating ADMIN_KEY..."
    ADMIN_KEY=$(openssl rand -hex 16)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/ADMIN_KEY=.*/ADMIN_KEY=$ADMIN_KEY/" backend/.env 2>/dev/null || echo "ADMIN_KEY=$ADMIN_KEY" >> backend/.env
    else
        sed -i "s/ADMIN_KEY=.*/ADMIN_KEY=$ADMIN_KEY/" backend/.env 2>/dev/null || echo "ADMIN_KEY=$ADMIN_KEY" >> backend/.env
    fi
    echo "✅ Generated ADMIN_KEY"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Edit backend/.env and add your API keys:"
echo "   - FINNHUB_API_KEY (get at https://finnhub.io/register)"
echo "   - REDDIT_CLIENT_ID & REDDIT_CLIENT_SECRET (create at https://www.reddit.com/prefs/apps)"
echo "   - NEWSAPI_KEY (get at https://newsapi.org/register)"
echo "   - OPENAI_API_KEY (get at https://platform.openai.com/api-keys)"
echo "   - POSTGRES_URL (from Neon or Railway)"
echo "   - REDIS_URL (from Upstash)"
echo ""
echo "2. Install dependencies:"
echo "   npm run install:all"
echo ""
echo "3. Run database migrations:"
echo "   cd backend && npm run db:migrate"
echo ""
echo "4. See DEPLOYMENT.md for Railway deployment instructions"
echo ""
echo "✅ Setup complete!"
