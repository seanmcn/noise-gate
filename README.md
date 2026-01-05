# MinFeed

A minimal, AI-powered RSS reader that filters noise and surfaces what matters.

## Overview

MinFeed aggregates RSS feeds, deduplicates stories across sources, and uses AI to classify, score, and summarize each article. The result is a calm, keyboard-navigable feed where you control what you see.

**Key capabilities:**
- **AI Classification** — Category, sentiment, importance score, and summary for each article
- **Story Deduplication** — Same story from multiple sources grouped together
- **Custom Sources** — Add your own RSS feeds alongside system defaults
- **Filtering** — By sentiment, category, or blocked keywords
- **Keyboard Navigation** — Browse entirely with `j`/`k`/`o` keys

## Features

### Feed Intelligence
- **Sentiment Analysis** — Positive, neutral, or negative with confidence score
- **Category Tagging** — World, Tech, Programming, Science, Business, Sports, Gaming, Entertainment, and more
- **Importance Scoring** — 0-100 score highlighting significant stories
- **AI Summaries** — TL;DR and "Why it matters" for each article

### Source Management
- **System Sources** — Curated defaults (BBC, Hacker News, Reddit tech subs)
- **Custom Sources** — Add up to 3 personal RSS feeds
- **Health Monitoring** — Auto-disables failing sources, shows error status
- **Per-Source Toggle** — Enable/disable sources without removing them

### Reading Experience
- **Story Grouping** — Collapse duplicates to see one article per story
- **Read Tracking** — Articles dim after you've opened them
- **Hide Articles** — Manually hide stories you don't want
- **Blocked Words** — Filter out topics by keyword

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `j` | Next article |
| `k` | Previous article |
| `o` / `Enter` | Open article |
| `m` | Mark as read |
| `?` | Show shortcuts |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│              TypeScript · Tailwind · Zustand · Radix UI          │
└────────────────────────────────┬────────────────────────────────┘
                                 │ AWS Amplify Data API
┌────────────────────────────────┼────────────────────────────────┐
│                           DynamoDB                               │
│   Source · UserSourceSubscription · FeedItem · StoryGroup        │
│                      UserPreferences                             │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                      Lambda Functions                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  RSS Poller  │  │ AI Processor │  │   Content    │           │
│  │              │  │              │  │   Enricher   │           │
│  │ Fetches and  │  │ Classifies,  │  │              │           │
│  │ deduplicates │  │ scores, and  │  │ Extracts     │           │
│  │ RSS feeds    │  │ summarizes   │  │ full article │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    Source    │  │     Feed     │  │     Data     │           │
│  │    Seeder    │  │    Preview   │  │    Cleanup   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Self-Hosting

MinFeed runs on AWS Amplify. You'll need:
- Node.js 20+
- AWS account
- OpenAI API key

### Quick Start

```bash
# Install dependencies
npm install

# Configure OpenAI key
cp .env.local.example .env.local
# Edit .env.local with your OPENAI_API_KEY

# Start development environment
npm run dev
```

Open http://localhost:3000

### VSCode Tasks

Run from Command Palette (`Cmd+Shift+P` → "Tasks: Run Task"):

| Task | Description |
|------|-------------|
| Dev: Start All | Start sandbox + frontend |
| Sandbox: Start | Start Amplify sandbox only |
| Sandbox: Reset | Delete and recreate sandbox |
| Frontend: Start | Start frontend dev server |
| Data: Clear All | Clear all DynamoDB data |
| Data: Seed Sources | Seed system RSS sources |

## Project Structure

```
min-feed/
├── amplify/
│   ├── auth/resource.ts              # Cognito authentication
│   ├── data/resource.ts              # DynamoDB schema
│   ├── functions/
│   │   ├── rss-poll/                 # RSS fetching & deduplication
│   │   ├── ai-processor/             # OpenAI classification
│   │   ├── content-enricher/         # Article content extraction
│   │   ├── feed-preview/             # Preview feeds before adding
│   │   ├── source-seeder/            # Seed default sources
│   │   └── data-cleanup/             # TTL and orphan cleanup
│   └── backend.ts
├── frontend/
│   ├── src/
│   │   ├── components/               # UI components
│   │   ├── pages/                    # Route pages
│   │   ├── store/                    # Zustand state
│   │   └── lib/                      # API, auth, utilities
│   └── package.json
├── shared/
│   └── src/index.ts                  # Shared types
└── package.json                      # Workspace root
```

## Default Sources

System sources seeded on first run:
- **Hacker News** — Front page
- **BBC News** — Top stories
- **BBC Technology** — Tech news
- **Reddit** — r/technology, r/programming

## Cost Estimate

For personal use (~100 articles/day):
- **OpenAI API**: ~$0.20/month (GPT-4o-mini batch processing)
- **AWS Amplify**: Free tier
- **Total**: < $1/month

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind, Zustand, Radix UI
**Backend:** AWS Lambda, DynamoDB, AppSync, Amplify
**AI:** OpenAI GPT-4o-mini
**Content:** Mozilla Readability, Linkedom

## License

MIT
