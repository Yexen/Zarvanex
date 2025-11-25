# Zurvanex - Comprehensive Overview

## App Description
**Zurvanex** is a personal AI chat interface (Neural Time Interface) that provides access to multiple AI providers and models through a unified interface. It supports local models via Ollama and cloud-based models from various providers.

---

## Core Features

### 💬 **Chat Interface**
- Real-time streaming responses from AI models
- Multi-turn conversations with context retention
- Image upload and vision model support
- Message history with timestamps
- Performance metrics (response time, token count)

### 🔐 **Authentication & User Management**
- Supabase authentication (email/password)
- Google OAuth support (configurable)
- User-specific conversation storage
- Secure session management

### 💾 **Data Persistence**
- PostgreSQL database via Supabase
- Real-time conversation sync across devices
- Automatic conversation saving
- Message history with metadata

### 🧠 **Hard Memory Retrieval System**

#### Architecture Overview
The hard memory system consists of multiple layers:
- **Storage Layer**: Supabase (cloud) + IndexedDB (local fallback)
- **Entity Extraction Layer**: AI-powered entity recognition and indexing
- **Retrieval Layer**: Multi-strategy search with lossless context preservation
- **Integration Layer**: Seamless injection into chat conversations

#### Key Files and Components

**lib/hardMemorySupabase.ts** - Primary database interface
- CRUD operations for memories and folders
- Automatic entity indexing when saving memories (lines 112-147)
- Full-text search with tag filtering (lines 376-410)
- Sync between IndexedDB and Supabase

**lib/hardMemoryAI.ts** - Core intelligence layer
- **Query Classification**: Detects factual vs conceptual queries (lines 26-56)
- **Multi-Strategy Retrieval**:
  - Factual queries: Entity search → Keyword search → Semantic search
  - Conceptual queries: Semantic search → Entity/Keyword supplemental
- **Entity-Aware Search**: Searches memories with matching entity tags (lines 88-110)
- **Keyword Search**: Exact phrase, case-sensitive entity, multiple keyword matching (lines 115-180)
- **Lossless Retrieval Strategy** (lines 362-445): 8000 char budget, full memory inclusion or skip (no truncation/compression)

**lib/entityExtractor.ts** - Entity extraction and indexing
- **Entity Types**: PERSON, PLACE, ORG, PRODUCT, BRAND, ANIMAL, PET, UNIVERSITY, CITY, NUMBER, DATE
- **Extraction Strategies**:
  - Domain-specific entities (e.g., "solo" = golden lab, "lilou" = 13-year-old cat)
  - Pattern-based extraction (universities, dates, scores)
  - Capitalized word detection (proper nouns)
  - Number extraction with context
- **Confidence Scoring**: 0.5-0.95 based on extraction method

**database/hard_memory_schema_fixed.sql** - Database schema
- Tables: memory_folders (hierarchical organization), memories (core storage)
- Indexes: GIN index for tag arrays, full-text search, chronological sorting
- Row Level Security (RLS): User-scoped operations

#### Retrieval Flow

**Query Classification** → **Multi-Strategy Search** → **Context Preparation** → **Injection into Chat**

Example: "What's my cat's name?"
1. Classified as FACTUAL (contains "name")
2. Entity extraction finds: "cat"
3. Searches memories with tag `entity:lilou`
4. Returns high-confidence match
5. Full memory content included (no truncation)

#### Storage Architecture

**Dual Storage System:**
- **Supabase (PostgreSQL)**: Primary cloud storage, persistent, multi-device sync
- **IndexedDB (Browser)**: Fallback for offline capability

#### Integration Points

**Auto-integration into all chat providers:**
- components/ChatInterface.tsx (lines 248-252, 350-354, 446-450, 542-546)
- Appended to system prompt before each message
- Transparent to AI model

#### Key Features

1. **Lossless Retrieval**: No compression - preserves complete narrative integrity
2. **Entity-Aware Indexing**: Automatic entity extraction and tagging
3. **Multi-Strategy Search**: Combines entity, keyword, and semantic approaches
4. **Confidence Scoring**: Prioritizes high-confidence matches
5. **Budget Management**: 8000 char context window allocation
6. **Diagnostic Logging**: Extensive tracking for debugging

#### Recent Improvements

- Entity-aware indexing system implementation
- Lossless retrieval strategy (changed from truncation to full-inclusion)
- Comprehensive diagnostic logging
- Memory loading and selection tracking

### 🎨 **User Interface**
- Dark mode design
- Responsive mobile/desktop layout
- Collapsible sidebar with conversation history
- Model selector with provider grouping
- Real-time typing indicators
- Scroll-to-bottom controls

### 📊 **Advanced Features**
- Conversation title auto-generation
- "Save Moment" feature for important exchanges
- Performance tracking and metrics
- Progressive Web App (PWA) support
- Offline capability preparation

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions

### AI Providers
- **Local**: Ollama (localhost:11434)
- **Cloud APIs**: OpenRouter, Groq, OpenAI, Anthropic Claude, Cohere

---

## Project Structure

```
Zurvanex/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── chat/                 # Chat endpoints
│   │       ├── openrouter/       # OpenRouter proxy
│   │       ├── groq/             # Groq proxy
│   │       ├── openai/           # OpenAI proxy
│   │       ├── claude/           # Anthropic proxy
│   │       └── cohere/           # Cohere proxy
│   ├── auth/                     # Auth routes
│   │   └── callback/             # OAuth callback
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
│
├── components/                   # React components
│   ├── ChatInterface.tsx         # Main chat component
│   ├── ChatInput.tsx             # Message input
│   ├── MessageBubble.tsx         # Message display
│   ├── ModelSelector.tsx         # Model picker
│   ├── Sidebar.tsx               # Conversation list
│   ├── Login.tsx                 # Auth UI
│   ├── Settings.tsx              # Settings modal
│   ├── SaveMomentModal.tsx       # Save feature
│   ├── ErrorBoundary.tsx         # Error handling
│   ├── PerformanceChart.tsx      # Metrics display
│   └── gotham/                   # Gotham map components
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Authentication
│   └── useConversations.ts       # Conversation management
│
├── lib/                          # Utility libraries
│   ├── supabase.ts               # Supabase client
│   ├── lmstudio.ts               # Ollama integration
│   ├── openrouter.ts             # OpenRouter client
│   ├── groq.ts                   # Groq client
│   ├── openai.ts                 # OpenAI client
│   ├── claude.ts                 # Anthropic client
│   ├── cohere.ts                 # Cohere client
│   ├── db/                       # Database utilities
│   │   └── memoryDB.ts           # Memory storage
│   └── memory/                   # Memory system
│       ├── extractor.ts          # Memory extraction
│       ├── extractionTrigger.ts  # Extraction logic
│       └── formatter.ts          # Memory formatting
│
├── types/                        # TypeScript types
│   ├── index.ts                  # Main types
│   └── database.ts               # Database types
│
├── public/                       # Static assets
│   ├── Logo.png                  # App logo
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service worker
│
└── Configuration files
    ├── next.config.ts            # Next.js config
    ├── tailwind.config.ts        # Tailwind config
    ├── tsconfig.json             # TypeScript config
    ├── .env.local                # Environment variables
    └── supabase-schema.sql       # Database schema
```

---

## Available Models

### 🆓 **Free Models (OpenRouter)**

1. **x-ai/grok-4.1-fast:free**
   - Name: Grok 4.1 Fast (Free)
   - Description: 2M context, tool calling, reasoning mode
   - Context: 2,097,152 tokens (2M)
   - Thinking Mode: ✅ Yes
   - Free: ✅

2. **z-ai/glm-4.5-air:free**
   - Name: GLM 4.5 Air (Free)
   - Description: MoE model with thinking mode toggle
   - Context: 128,000 tokens
   - Thinking Mode: ✅ Yes
   - Free: ✅

3. **openai/gpt-oss-20b:free**
   - Name: GPT OSS 20B (Free)
   - Description: OpenAI open-weight model
   - Context: 8,192 tokens
   - Thinking Mode: ❌ No
   - Free: ✅

4. **google/gemini-2.0-flash-exp:free**
   - Name: Gemini 2.0 Flash (Free)
   - Description: Google's latest fast multimodal model
   - Context: 1,000,000 tokens
   - Thinking Mode: ❌ No
   - Free: ✅

---

### ⚡ **Groq Models (Fast Inference)**

1. **llama-3.3-70b-versatile**
   - Name: Llama 3.3 70B Versatile
   - Description: Most capable production model, 280 tokens/sec
   - Context: 131,072 tokens
   - Speed: 280 tokens/sec
   - Free: ✅

2. **llama-3.1-8b-instant**
   - Name: Llama 3.1 8B Instant
   - Description: Fast and efficient, 560 tokens/sec
   - Context: 131,072 tokens
   - Speed: 560 tokens/sec
   - Free: ✅

3. **openai/gpt-oss-120b**
   - Name: GPT OSS 120B
   - Description: OpenAI open-weight model, ~500 tokens/sec
   - Context: 8,192 tokens
   - Speed: ~500 tokens/sec
   - Free: ✅

4. **meta-llama/llama-4-scout-17b-16e-instruct**
   - Name: Llama 4 Scout
   - Description: Latest Llama 4, 750 tokens/sec (Preview)
   - Context: 131,072 tokens
   - Speed: 750 tokens/sec
   - Free: ✅

5. **qwen/qwen3-32b**
   - Name: Qwen3 32B
   - Description: Alibaba model, strong reasoning (Preview)
   - Context: 32,768 tokens
   - Free: ✅

6. **moonshotai/kimi-k2-instruct-0905**
   - Name: Kimi K2
   - Description: Moonshot AI model (Preview)
   - Context: 200,000 tokens
   - Free: ✅

---

### 🤖 **OpenAI Models (Premium)**

1. **gpt-4o**
   - Name: GPT-4o
   - Description: Most capable GPT-4 model, multimodal
   - Context: 128,000 tokens
   - Vision: ✅ Yes
   - Free: ❌ No (Requires API key)

2. **gpt-4o-mini**
   - Name: GPT-4o Mini
   - Description: Affordable and fast, multimodal
   - Context: 128,000 tokens
   - Vision: ✅ Yes
   - Free: ❌ No

3. **o1**
   - Name: o1
   - Description: Advanced reasoning model
   - Context: 200,000 tokens
   - Thinking Mode: ✅ Yes
   - Free: ❌ No

4. **o1-mini**
   - Name: o1 Mini
   - Description: Fast reasoning model
   - Context: 128,000 tokens
   - Thinking Mode: ✅ Yes
   - Free: ❌ No

5. **gpt-4-turbo**
   - Name: GPT-4 Turbo
   - Description: Previous flagship model
   - Context: 128,000 tokens
   - Vision: ✅ Yes
   - Free: ❌ No

---

### 🧑‍💻 **Anthropic Claude Models (Premium)**

1. **claude-sonnet-4-20250514**
   - Name: Claude 4 Sonnet
   - Description: Most intelligent model, balanced performance
   - Context: 200,000 tokens
   - Thinking Mode: ✅ Yes
   - Vision: ✅ Yes
   - Free: ❌ No

2. **claude-opus-4-20250514**
   - Name: Claude 4 Opus
   - Description: Most capable model for complex tasks
   - Context: 200,000 tokens
   - Thinking Mode: ✅ Yes
   - Vision: ✅ Yes
   - Free: ❌ No

3. **claude-3-5-sonnet-20241022**
   - Name: Claude 3.5 Sonnet
   - Description: Previous flagship model
   - Context: 200,000 tokens
   - Vision: ✅ Yes
   - Free: ❌ No

4. **claude-3-5-haiku-20241022**
   - Name: Claude 3.5 Haiku
   - Description: Fast and affordable
   - Context: 200,000 tokens
   - Vision: ✅ Yes
   - Free: ❌ No

---

### 🌐 **Cohere Models (Premium)**

1. **command-a-03-2025**
   - Name: Command A (March 2025)
   - Description: Main model for general tasks and conversations
   - Context: 128,000 tokens
   - Free: ❌ No

2. **command-a-reasoning-08-2025**
   - Name: Command A Reasoning (Aug 2025)
   - Description: Deep reasoning model for complex problem-solving
   - Context: 128,000 tokens
   - Thinking Mode: ✅ Yes
   - Free: ❌ No

3. **command-a-translate-08-2025**
   - Name: Command A Translate (Aug 2025)
   - Description: Specialized model for translation tasks
   - Context: 128,000 tokens
   - Free: ❌ No

4. **command-a-vision-07-2025**
   - Name: Command A Vision (July 2025)
   - Description: Model with image analysis capabilities
   - Context: 128,000 tokens
   - Vision: ✅ Yes
   - Free: ❌ No

---

### 🖥️ **Ollama (Local Models)**

Any model installed locally via Ollama will appear automatically, including:
- Llama models (various sizes)
- Mistral models
- Qwen models with vision support
- Custom/fine-tuned models
- And many more from Ollama's library

**Note**: Ollama models run locally and require Ollama to be installed and running at `http://localhost:11434`

---

## Environment Variables

### Required (Supabase)
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional (AI Provider API Keys)
```bash
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-claude-key
COHERE_API_KEY=your-cohere-key
```

### Optional (Ollama)
```bash
NEXT_PUBLIC_OLLAMA_API=http://localhost:11434  # Default
```

---

## Database Schema (Supabase)

### Conversations Table
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- title: text
- model_id: text
- messages: jsonb
- created_at: timestamp
- updated_at: timestamp
```

### Row Level Security (RLS)
- Users can only access their own conversations
- Automatic user_id validation on all operations
- Secure by default

---

## Key Technologies & Integrations

### Core Technologies
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Supabase**: Backend-as-a-Service (Auth + Database + Realtime)
- **Tailwind CSS**: Utility-first CSS framework

### AI Integrations
- **Ollama**: Local LLM runtime
- **OpenRouter**: Multi-model API aggregator
- **Groq**: Ultra-fast inference engine
- **OpenAI**: GPT models and o1 reasoning
- **Anthropic**: Claude models
- **Cohere**: Command models

### Features
- **Server-Sent Events (SSE)**: Streaming responses
- **Real-time Subscriptions**: Supabase Realtime
- **Progressive Web App**: Offline support
- **Service Worker**: Caching strategy

---

## Model Capabilities Summary

| Feature | Providers |
|---------|-----------|
| **Free Models** | OpenRouter (4), Groq (6) |
| **Thinking/Reasoning** | o1, Claude 4, Grok 4.1, GLM 4.5, Cohere Reasoning |
| **Vision/Multimodal** | GPT-4o, Claude, Gemini, Cohere Vision, Local Vision models |
| **Large Context (>128K)** | Claude (200K), o1 (200K), Grok (2M), Gemini (1M), Groq Llama (131K) |
| **Ultra-Fast Inference** | Groq (280-750 tokens/sec) |
| **Local/Private** | Ollama (any installed model) |

---

## Deployment

### Production (Vercel)
- **URL**: https://zurvanex.vercel.app/
- **Platform**: Vercel (automatic deployments from GitHub)
- **Environment**: Serverless functions for API routes
- **Region**: Auto-selected based on user location

### Local Development
- **URL**: http://localhost:3002 (or any available port)
- **Command**: `npm run dev`
- **Hot Reload**: Enabled
- **Local Ollama**: Accessible at localhost:11434

---

## Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Yexen/Zurvanex
cd Zurvanex
npm install
```

### 2. Configure Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
OPENROUTER_API_KEY=your-key  # Optional for free models
```

### 3. Set Up Database
- Create Supabase project
- Run `supabase-schema.sql`
- Enable Email authentication

### 4. Run Development Server
```bash
npm run dev
```

### 5. (Optional) Install Ollama
For local models:
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3.3
ollama serve
```

---

## Future Enhancements

### Planned Features
- Google OAuth integration
- Advanced memory system with search
- Gotham 3D map integration
- Custom model fine-tuning support
- Voice input/output
- Multi-user collaboration
- Export conversations (PDF, Markdown)

---

## Support & Resources

- **GitHub**: https://github.com/Yexen/Zurvanex
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Ollama**: https://ollama.ai
- **OpenRouter**: https://openrouter.ai

---

*Last Updated: January 2025*
*Version: 1.0.0*
