# NoiseGate

An AI-assisted RSS content reader that filters, deduplicates, and sentiment-scores news from Reddit, BBC, and Hacker News.

## What it is

- A **news aggregator** with AI-powered classification
- **Deduplicates** stories across sources using title similarity
- **Sentiment scoring** (positive/neutral/negative) via OpenAI GPT-4o-mini
- **Category tagging** (world, tech, programming, science, business, local, health)
- **Seen-state tracking** to dim articles you've already read
- Designed for calm, focused news consumption

## What it is not

- Not a social media feed
- Not a real-time news ticker
- Not optimised for breaking news or notifications

This is a tool for catching up on news at your own pace.

## Features

- **AI Classification** - Each article is categorized and sentiment-scored
- **Story Deduplication** - Same story from multiple sources grouped together
- **Sentiment Filtering** - Show only good news, neutral, or bad news
- **Category Filtering** - Focus on topics you care about
- **Blocked Words** - Hide articles containing specific keywords
- **Seen Tracking** - Articles dim after you've read them
- **Hide Articles** - Manually hide stories you don't want to see

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│         Vite + TypeScript + Tailwind + shadcn/ui               │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Amplify Data API
┌────────────────────────────────┼────────────────────────────────┐
│                          DynamoDB                               │
│     Feed  │  FeedItem  │  StoryGroup  │  UserPreferences       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                     Lambda Functions                            │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │    RSS Poller           │  │    AI Processor             │  │
│  │  - Fetches RSS feeds    │  │  - OpenAI GPT-4o-mini       │  │
│  │  - Deduplicates stories │  │  - Batch classification     │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Self-Hosting

NoiseGate is self-hosted using AWS Amplify. You'll need:

- Node.js 20+
- An AWS account
- An OpenAI API key

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and add your OpenAI API key:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your key
   ```

3. Start the development environment:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173

The sandbox secrets are automatically set from `.env.local` when starting the sandbox.

### VSCode Tasks

If using VSCode, run tasks from the Command Palette (Cmd+Shift+P → "Tasks: Run Task"):

- **Dev: Start All** - Start both sandbox and frontend (auto-sets secrets)
- **Sandbox: Start** - Start the Amplify sandbox (auto-sets secrets)
- **Sandbox: Reset** - Delete sandbox and recreate (auto-sets secrets)
- **Frontend: Start** - Start just the frontend dev server
- **Build: All** - Build all workspaces
- **Data: Clear All** - Clear all data from DynamoDB tables

## Project Structure

```
noise-gate/
├── amplify/
│   ├── auth/resource.ts           # Cognito email auth
│   ├── data/resource.ts           # DynamoDB schema
│   ├── functions/
│   │   ├── rss-poll/              # RSS ingestion Lambda
│   │   └── ai-processor/          # AI classification Lambda
│   └── backend.ts
├── frontend/
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── lib/                   # API, auth, utils
│   │   ├── store/                 # Zustand stores
│   │   └── pages/                 # Route pages
│   └── package.json
├── shared/
│   └── src/index.ts               # Shared types
└── package.json                   # Workspace root
```

## RSS Feeds

Currently configured to poll:

- **Reddit** - /r/worldnews, /r/technology, /r/programming
- **BBC** - Top stories
- **Hacker News** - Front page

## Cost Estimate (Personal Use)

- **OpenAI API**: ~$0.20/month (100 items/day, batched with GPT-4o-mini)
- **AWS Amplify**: Free tier covers personal use
- **Total**: <$1/month

## Status

Early MVP built for personal use. Works, but intentionally minimal.

## License

MIT
