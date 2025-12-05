# Enso - Intelligent Journaling for Personal Growth

Enso is a mobile-first journaling SaaS that uses Bayesian modeling to predict user commitment follow-through based on Maslow's Hierarchy of Needs.

## Features

- 📝 **Interactive Journaling** - AI-powered journal that responds and engages as you write
- 🎯 **Commitment Tracking** - Make and track personal commitments with success prediction
- 🧠 **Bayesian Prediction** - ML-powered predictions for commitment success probability
- 🔺 **Maslow Integration** - Categorize growth areas by psychological needs hierarchy
- 📊 **Progress Analytics** - Visualize your journey across all life dimensions

## Architecture

```
enso/
├── apps/
│   ├── mobile/          # React Native (Expo) mobile app
│   └── api/             # Node.js backend API
├── packages/
│   ├── core/            # Shared business logic
│   ├── bayesian/        # Bayesian prediction engine
│   └── ai-agent/        # Interactive AI agent
└── docs/                # Documentation
```

## Tech Stack

### Mobile App
- React Native with Expo
- TypeScript
- Zustand (state management)
- React Navigation
- NativeWind (Tailwind for RN)

### Backend
- Node.js with Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis (caching)

### AI/ML
- Bayesian inference for predictions
- LLM integration for interactive journaling
- Embeddings for semantic analysis

## Maslow's Hierarchy of Needs

Enso categorizes user commitments and journal entries across five levels:

1. **Physiological** - Health, sleep, nutrition, exercise
2. **Safety** - Financial security, stability, health security
3. **Love/Belonging** - Relationships, community, connection
4. **Esteem** - Self-confidence, achievement, recognition
5. **Self-Actualization** - Personal growth, creativity, purpose

## Getting Started

```bash
# Install dependencies
npm install

# Start mobile app
npm run mobile

# Start API server
npm run api

# Run all services
npm run dev
```

## License

Proprietary - All rights reserved
