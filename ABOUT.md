# Zurvanex - Complete System Documentation

## Overview

**Zurvanex** (Neural Time Interface) is a sophisticated personal AI chat application that provides unified access to multiple AI providers and models while maintaining intelligent, personalized memory of your interactions. Built with Next.js 15, TypeScript, and Supabase, Zurvanex combines cutting-edge AI capabilities with advanced memory systems to deliver truly personalized conversational experiences.

---

## Core Philosophy

Zurvanex is designed around three key principles:

1. **Provider Agnostic**: Seamlessly switch between local models (Ollama) and cloud providers (OpenRouter, Groq, OpenAI, Anthropic, Cohere)
2. **Intelligent Memory**: Advanced multi-layered memory system that understands context, entities, and relationships
3. **Personal & Private**: User-owned data with local-first architecture and optional cloud sync

---

## Feature Overview

### 💬 Chat Interface

**Real-Time Streaming Responses**
- Server-Sent Events (SSE) for streaming responses from all AI models
- Multi-turn conversations with full context retention
- Progressive rendering of AI responses

**Multimodal Support**
- Image upload and analysis with vision-capable models (GPT-4o, Claude, Gemini, Cohere Vision)
- Image preview and management within conversations
- Base64 image encoding for API compatibility

**Rich Message Display**
- Syntax highlighting for code blocks
- Markdown rendering with CommonMark specification
- Message timestamps and metadata
- Performance metrics (response time, token count, tokens/sec)

**User Experience**
- Auto-scroll with manual override
- Collapsible sidebar for conversation history
- Dark mode optimized design
- Responsive mobile and desktop layouts
- Real-time typing indicators

---

### 🧠 Advanced Memory Systems

Zurvanex implements two complementary memory systems working in harmony:

#### 1. Hard Memory System (Supabase-Based)

**Architecture**
- **Storage Layer**: PostgreSQL via Supabase (cloud) + IndexedDB (local fallback)
- **Entity Extraction Layer**: AI-powered entity recognition and indexing
- **Retrieval Layer**: Multi-strategy search with lossless context preservation
- **Integration Layer**: Seamless injection into chat conversations

**Key Files**
- `lib/hardMemorySupabase.ts` - Primary database interface (lines 112-147: entity indexing, lines 376-410: full-text search)
- `lib/hardMemoryAI.ts` - Intelligence layer with query classification and multi-strategy retrieval (lines 362-445: lossless strategy)
- `lib/entityExtractor.ts` - Entity extraction (PERSON, PLACE, ORG, PRODUCT, BRAND, ANIMAL, PET, UNIVERSITY, CITY, NUMBER, DATE)
- `database/hard_memory_schema_fixed.sql` - PostgreSQL schema with GIN indexes and RLS

**Entity-Aware Indexing**
- Automatic extraction of 11 entity types during memory save
- Domain-specific entity recognition (e.g., pet names, universities, brands)
- Pattern-based extraction with confidence scoring (0.5-0.95)
- Capitalized word detection for proper nouns

**Multi-Strategy Retrieval**
- **Factual queries**: Entity search → Keyword search → Semantic search
- **Conceptual queries**: Semantic search → Entity/Keyword supplemental
- Lossless retrieval strategy (8000 char budget, full memory inclusion with no truncation)

**Database Schema**
```sql
memory_folders:
  - Hierarchical folder organization
  - User-scoped with RLS policies
  - Parent-child relationships

memories:
  - Core storage with full-text search
  - Tag arrays with GIN indexes
  - Automatic entity tagging
  - Chronological sorting
```

#### 2. Smart Search System (Client-Side)

**Architecture Overview**
A sophisticated AI-powered search system that runs locally using free models and optional paid embeddings:

**Core Components**

**Intent Classification** (`lib/intentClassifier.ts`)
- Uses free Gemini 2.0 Flash model via OpenRouter
- Classifies queries into 6 types: FACTUAL, NARRATIVE, CONCEPTUAL, RELATIONAL, EMOTIONAL, TASK
- Low temperature (0.3) for consistent classification
- Determines optimal retrieval strategy based on intent

**Smart Keyword Extraction** (`lib/keywordExtractor.ts`)
- AI-powered extraction using free Gemini model
- Extracts 5 keyword categories:
  - **Entities**: Proper nouns, names, places, brands
  - **Concepts**: Abstract ideas, themes, topics
  - **Temporal**: Time references (dates, "recently", "when I was")
  - **Relational**: Relationship words (partner, uncle, friend)
  - **Emotional**: Emotional context (struggling, happy, worried)
- Regex fallback when AI fails

**Entity Indexer** (`lib/entityIndexer.ts`)
- Builds fast lookup table for instant factual answers
- 8 entity types: PERSON, ANIMAL, PLACE, BRAND, PRODUCT, ORG, CONCEPT, EVENT
- Processes text in 15k char chunks with rate limiting
- Stores structured facts for each entity
- Links entities to relevant chunks

**Hybrid Search** (`lib/hybridSearcher.ts`)
Combines three search methods with intelligent ranking:

1. **Exact Text Search**
   - Fast, local substring matching
   - Searches entities, concepts, and relational terms
   - Deduplication of results

2. **Semantic Search**
   - OpenAI text-embedding-3-small (~$0.00002 per 1K tokens)
   - Cosine similarity matching (threshold: 0.7)
   - TF-IDF fallback when no API key
   - 150-dimension vocabulary for fallback

3. **Entity Index Search**
   - Instant lookup from pre-built index
   - Returns chunks linked to entities
   - Includes contextual snippets

**Ranking & Context Assembly**
- Intent-based score bonuses:
  - FACTUAL: +5 for exact matches, +3 for entity matches
  - CONCEPTUAL: +3 for semantic matches
  - NARRATIVE: +2 for semantic, preserves sequence order
  - RELATIONAL: +5 for entity matches
  - EMOTIONAL: +2 for semantic and entity matches
- Token budget management (default: 4000 tokens)
- Core identity always loaded (unless TASK intent)
- Lossless chunk loading (no truncation)

**Embedding Service** (`lib/embeddingService.ts`)
- Primary: OpenAI text-embedding-3-small (1536 dimensions)
- Batch processing (100 texts per request)
- Rate limiting (100ms between batches)
- TF-IDF fallback (150 dimensions)
- Cosine similarity computation

**Personalization Indexer** (`lib/personalizationIndexer.ts`)
One-time indexing operation:
1. Split text into ~1500 char chunks
2. Build entity index (AI-powered)
3. Link chunks to entities
4. Generate embeddings (optional)
5. Store in IndexedDB

**Smart Search Orchestrator** (`lib/smartSearch.ts`)
Main entry point for every message:
```typescript
1. Classify Intent → Free Gemini
2. Extract Keywords → Free Gemini
3. Load Entity Index → IndexedDB
4. Lookup Entity Facts → Instant
5. Generate Query Embedding → OpenAI (optional)
6. Hybrid Search → 3 methods combined
7. Rank Results → Intent-aware scoring
8. Assemble Context → Budget-managed
9. Build System Prompt → Structured format
```

**Integration**
- Runs on every user message
- Appends context to system prompt
- Transparent to AI model
- Comprehensive debug logging

**Storage**
- IndexedDB (browser-local)
- Dual stores: `personalization` and `entityIndex`
- Offline-capable
- Per-user isolation

---

### 🎨 User Interface

**Modern Dark Design**
- Custom CSS variables for consistent theming
- Smooth animations with Framer Motion
- Glass-morphism effects and gradients
- Accessible color contrast

**Components Architecture**
- `ChatInterface.tsx` - Main orchestrator (700+ lines)
- `MessageBubble.tsx` - Individual message rendering
- `ChatInput.tsx` - Multi-line input with image support
- `ModelSelector.tsx` - Grouped provider/model picker
- `Sidebar.tsx` - Conversation history with search
- `MemoryPanel.tsx` - Hard Memory management UI
- `Settings.tsx` - Configuration modal
- `PerformanceChart.tsx` - Metrics visualization

**Responsive Design**
- Mobile-first approach
- Collapsible sidebar (auto-hide on mobile)
- Touch-optimized controls
- Keyboard shortcuts

---

### 🔐 Authentication & Security

**Supabase Authentication**
- Email/password authentication
- Google OAuth support (configurable)
- Secure session management with JWT
- Automatic token refresh

**Row Level Security (RLS)**
```sql
-- Users can only access their own data
CREATE POLICY "Users can only access own conversations"
  ON conversations
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own memories"
  ON memories
  FOR ALL
  USING (auth.uid() = user_id);
```

**API Key Management**
- Server-side environment variables
- Client-side encrypted storage
- Never exposed to browser console
- Optional user-provided keys

---

### 📊 Advanced Features

#### Conversation Management

**Auto-Generated Titles**
- AI-powered title generation using fast models
- Contextual summaries of conversation topics
- Fallback to first message excerpt

**Save Moment Feature**
- Capture important exchanges to Hard Memory
- One-click save with custom tags
- Timestamp and source tracking

**Conversation Analytics**
- Message count and total tokens
- Average response time
- Model usage statistics
- Export to JSON/Markdown

**Search & Filter**
- Full-text search across all conversations
- Filter by date range
- Sort by relevance or chronology

#### Performance Tracking

**Real-Time Metrics**
- Tokens per second (for Groq models)
- Response latency
- Token count (input/output)
- Model performance comparison

**Historical Charts**
- Response time trends
- Token usage over time
- Model efficiency comparison
- Built with Recharts

#### Progressive Web App (PWA)

**Offline Support**
- Service worker with caching strategy
- IndexedDB for local data
- Background sync (planned)
- Automatic updates

**Installation**
- Add to home screen (mobile)
- Desktop app experience
- Native-like navigation
- Push notifications (planned)

---

## Technical Stack

### Frontend

**Framework & Language**
- Next.js 15.0.3 (App Router)
- React 19.0.0
- TypeScript 5.6.3

**Styling & UI**
- Tailwind CSS 3.4.15
- Framer Motion 11.11.17 (animations)
- Custom CSS variables
- Responsive design

**State Management**
- React hooks (useState, useEffect, useCallback)
- Custom hooks (`useAuth`, `useConversations`)
- Context API for global state

**Data Storage**
- IndexedDB (personalization, entity index)
- LocalStorage (settings, cache)
- Supabase Realtime (cloud sync)

### Backend

**Runtime & Framework**
- Node.js (Next.js API routes)
- Serverless functions (Vercel)

**Database & Auth**
- Supabase (PostgreSQL + Auth + Realtime)
- Row Level Security policies
- Real-time subscriptions
- Automatic migrations

**API Integrations**
- OpenRouter API (multi-model aggregator)
- Groq API (ultra-fast inference)
- OpenAI API (GPT models, embeddings)
- Anthropic API (Claude models)
- Cohere API (Command models)
- Ollama (local models via HTTP)

### AI Providers & Models

#### 🆓 Free Models (OpenRouter)

**x-ai/grok-4.1-fast:free**
- 2M context window
- Tool calling support
- Reasoning mode
- Thinking toggle available

**z-ai/glm-4.5-air:free**
- MoE architecture
- 128K context
- Thinking mode toggle

**openai/gpt-oss-20b:free**
- Open-weight model
- 8K context
- Fast inference

**google/gemini-2.0-flash-exp:free**
- Latest multimodal model
- 1M context window
- Vision support

#### ⚡ Groq Models (Ultra-Fast)

**llama-3.3-70b-versatile**
- 280 tokens/sec
- 131K context
- Most capable

**llama-3.1-8b-instant**
- 560 tokens/sec
- 131K context
- Fastest

**openai/gpt-oss-120b**
- ~500 tokens/sec
- 8K context
- Open-weight

**meta-llama/llama-4-scout-17b-16e-instruct**
- 750 tokens/sec (Preview)
- 131K context
- Latest Llama

**qwen/qwen3-32b**
- 32K context
- Strong reasoning
- Preview model

**moonshotai/kimi-k2-instruct-0905**
- 200K context
- Preview model
- Moonshot AI

#### 🤖 OpenAI Models (Premium)

**gpt-4o**
- Most capable GPT-4
- 128K context
- Vision support
- Multimodal

**gpt-4o-mini**
- Affordable and fast
- 128K context
- Vision support

**o1**
- Advanced reasoning
- 200K context
- Thinking mode
- Extended inference time

**o1-mini**
- Fast reasoning
- 128K context
- Thinking mode

**gpt-4-turbo**
- Previous flagship
- 128K context
- Vision support

#### 🧑‍💻 Anthropic Claude (Premium)

**claude-sonnet-4-20250514**
- Most intelligent
- 200K context
- Thinking mode
- Vision support

**claude-opus-4-20250514**
- Most capable for complex tasks
- 200K context
- Thinking mode
- Vision support

**claude-3-5-sonnet-20241022**
- Previous flagship
- 200K context
- Vision support

**claude-3-5-haiku-20241022**
- Fast and affordable
- 200K context
- Vision support

#### 🌐 Cohere Models (Premium)

**command-a-03-2025**
- General tasks
- 128K context

**command-a-reasoning-08-2025**
- Deep reasoning
- 128K context
- Thinking mode

**command-a-translate-08-2025**
- Translation specialist
- 128K context

**command-a-vision-07-2025**
- Image analysis
- 128K context
- Vision support

#### 🖥️ Ollama (Local)

Any model from Ollama's library:
- Llama models (various sizes)
- Mistral models
- Qwen models (with vision)
- Custom fine-tuned models
- Requires Ollama running at `localhost:11434`

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
│   ├── auth/                     # Authentication routes
│   │   └── callback/             # OAuth callback
│   ├── memories/                 # Memory management page
│   │   └── page.tsx              # Memory UI
│   ├── debug/                    # Debug utilities
│   │   └── page.tsx              # Debug console
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with metadata
│   └── page.tsx                  # Main chat page
│
├── components/                   # React components
│   ├── ChatInterface.tsx         # Main chat orchestrator (700+ lines)
│   ├── ChatInput.tsx             # Multi-line input with image upload
│   ├── MessageBubble.tsx         # Message rendering with markdown
│   ├── ModelSelector.tsx         # Provider-grouped model picker
│   ├── Sidebar.tsx               # Conversation history with search
│   ├── Login.tsx                 # Authentication UI
│   ├── Settings.tsx              # Configuration modal
│   ├── SettingsExtended.tsx      # Advanced settings
│   ├── MemoryPanel.tsx           # Hard Memory management
│   ├── MemoryEditor.tsx          # Memory creation/editing
│   ├── FolderTree.tsx            # Hierarchical folder navigation
│   ├── SaveMomentModal.tsx       # Quick save to memory
│   ├── UserProfile.tsx           # User account management
│   ├── PerformanceChart.tsx      # Metrics visualization
│   ├── ConversationAnalysisModal.tsx  # Analytics UI
│   ├── ErrorBoundary.tsx         # Error handling wrapper
│   ├── PWAInstallButton.tsx      # PWA installation prompt
│   └── PWARegister.tsx           # Service worker registration
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Authentication state management
│   └── useConversations.ts       # Conversation CRUD operations
│
├── lib/                          # Utility libraries
│   ├── supabase.ts               # Supabase client initialization
│   ├── lmstudio.ts               # Ollama/LM Studio integration
│   ├── openrouter.ts             # OpenRouter client
│   ├── groq.ts                   # Groq client
│   ├── openai.ts                 # OpenAI client
│   ├── claude.ts                 # Anthropic client
│   ├── cohere.ts                 # Cohere client
│   │
│   ├── hardMemorySupabase.ts     # Hard Memory: Supabase interface
│   ├── hardMemoryAI.ts           # Hard Memory: AI retrieval logic
│   ├── entityExtractor.ts        # Hard Memory: Entity extraction
│   │
│   ├── smartSearch.ts            # Smart Search: Main orchestrator
│   ├── intentClassifier.ts       # Smart Search: Intent classification
│   ├── keywordExtractor.ts       # Smart Search: Keyword extraction
│   ├── entityIndexer.ts          # Smart Search: Entity index builder
│   ├── hybridSearcher.ts         # Smart Search: Hybrid search logic
│   ├── embeddingService.ts       # Smart Search: Embeddings
│   ├── personalizationIndexer.ts # Smart Search: Indexing utility
│   ├── memoryStorage.ts          # Smart Search: IndexedDB interface
│   │
│   ├── memory.ts                 # Legacy memory system
│   ├── personalization.ts        # Personalization utilities
│   ├── smartTitles.ts            # AI-powered title generation
│   ├── exportConversation.ts     # Export utilities
│   │
│   ├── db/                       # Database utilities
│   │   └── memoryDB.ts           # IndexedDB operations
│   │
│   ├── memory/                   # Memory extraction system
│   │   ├── extractor.ts          # Memory extraction logic
│   │   ├── extractionTrigger.ts  # Trigger detection
│   │   ├── extractionPrompt.ts   # AI prompts for extraction
│   │   └── formatter.ts          # Memory formatting
│   │
│   └── llm/                      # LLM utilities
│       └── qwenClient.ts         # Qwen model client
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Main types (Message, Conversation, etc.)
│   └── database.ts               # Database schema types
│
├── database/                     # Database schemas
│   ├── supabase-schema.sql       # Main Supabase schema
│   └── hard_memory_schema_fixed.sql  # Hard Memory schema
│
├── public/                       # Static assets
│   ├── Logo.png                  # Application logo
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   ├── icons/                    # PWA icons (various sizes)
│   └── screenshots/              # PWA screenshots
│
└── Configuration files
    ├── next.config.ts            # Next.js configuration
    ├── tailwind.config.ts        # Tailwind CSS configuration
    ├── tsconfig.json             # TypeScript configuration
    ├── postcss.config.js         # PostCSS configuration
    ├── .env.local                # Environment variables (gitignored)
    ├── .eslintrc.json            # ESLint rules
    └── package.json              # Dependencies and scripts
```

---

## Environment Variables

### Required (Supabase)

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional (AI Provider API Keys)

```bash
# Free models access (OpenRouter)
OPENROUTER_API_KEY=your-openrouter-key

# Ultra-fast inference (Groq)
GROQ_API_KEY=your-groq-key

# Premium models (OpenAI)
OPENAI_API_KEY=your-openai-key

# Claude models (Anthropic)
ANTHROPIC_API_KEY=your-claude-key

# Command models (Cohere)
COHERE_API_KEY=your-cohere-key
```

### Optional (Ollama)

```bash
NEXT_PUBLIC_OLLAMA_API=http://localhost:11434  # Default
```

### Optional (Features)

```bash
# Enable Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  model_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own conversations"
  ON conversations
  FOR ALL
  USING (auth.uid() = user_id);
```

### Hard Memory Schema

```sql
CREATE TABLE memory_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES memory_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES memory_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT, -- 'manual', 'save_moment', 'import'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_folder_id ON memories(folder_id);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_content ON memories USING GIN(to_tsvector('english', content));

-- RLS Policies
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own memories"
  ON memories
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own folders"
  ON memory_folders
  FOR ALL
  USING (auth.uid() = user_id);
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- (Optional) Ollama for local models
- (Optional) API keys for premium models

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Yexen/Zurvanex.git
cd Zurvanex
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run `database/supabase-schema.sql` in SQL Editor
   - Run `database/hard_memory_schema_fixed.sql` in SQL Editor
   - Enable Email authentication in Auth settings
   - (Optional) Configure Google OAuth

4. **Configure environment variables**

Create `.env.local`:
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional (for free models)
OPENROUTER_API_KEY=sk-or-v1-...

# Optional (for premium models)
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...
```

5. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: Install Ollama

For local models:
```bash
# Install from https://ollama.ai

# Pull a model
ollama pull llama3.3

# Start Ollama server
ollama serve
```

Models will automatically appear in Zurvanex when Ollama is running.

---

## Deployment

### Vercel (Recommended)

1. **Connect GitHub repository**
   - Import project in Vercel dashboard
   - Select Zurvanex repository

2. **Configure environment variables**
   - Add all variables from `.env.local`
   - Use Vercel's environment variable UI

3. **Deploy**
   - Automatic deployments on git push
   - Preview deployments for PRs

**Production URL**: https://zurvanex.vercel.app/

### Firebase (Alternative)

```bash
npm run deploy
```

Deploys to Firebase Hosting (requires `firebase.json` configuration).

---

## Model Capabilities Matrix

| Feature | Providers |
|---------|-----------|
| **Free Models** | OpenRouter (4), Groq (6) |
| **Thinking/Reasoning** | o1, Claude 4, Grok 4.1, GLM 4.5, Cohere Reasoning |
| **Vision/Multimodal** | GPT-4o, Claude, Gemini, Cohere Vision, Qwen |
| **Large Context (>128K)** | Claude (200K), o1 (200K), Grok (2M), Gemini (1M), Groq Llama (131K) |
| **Ultra-Fast Inference** | Groq (280-750 tokens/sec) |
| **Local/Private** | Ollama (any installed model) |
| **Embeddings** | OpenAI text-embedding-3-small |

---

## Usage Patterns

### Basic Chat

1. **Select a model** from the dropdown
2. **Type your message** in the input field
3. **Press Enter** or click Send
4. **Stream the response** in real-time

### Using Vision Models

1. **Select a vision-capable model** (GPT-4o, Claude, Gemini, Cohere Vision)
2. **Click the image icon** to upload
3. **Select an image** (PNG, JPG, WebP)
4. **Add your question** about the image
5. **Send** to get analysis

### Hard Memory Management

1. **Open Memory Panel** from sidebar
2. **Create folders** for organization
3. **Add memories** manually or via "Save Moment"
4. **Tag memories** for better retrieval
5. **Memories auto-inject** into relevant conversations

### Smart Search Setup

1. **Go to Settings** → Personalization
2. **Paste your bio/context** (any length)
3. **Provide OpenRouter API key** (for free Gemini)
4. **(Optional) Add OpenAI key** for semantic search
5. **Click "Index Personalization"**
6. **Wait for processing** (entities + embeddings)
7. **Done!** Smart search runs on every message

### Save Moment Feature

1. **Find an important exchange** in conversation
2. **Click "Save Moment"** button
3. **Review extracted content**
4. **Add title and tags**
5. **Select folder** (optional)
6. **Save to Hard Memory**

---

## Performance Optimization

### Token Budget Management

**Hard Memory System**
- Default budget: 8000 characters
- Lossless strategy: Full memory or skip (no truncation)
- Entity facts loaded first (instant)

**Smart Search System**
- Default budget: 4000 tokens (~16000 chars)
- Core identity always loaded
- Ranked chunks fill remaining budget
- Stops when budget exhausted

### Caching Strategy

**Browser Cache**
- IndexedDB for personalization chunks
- Entity index cached locally
- Embeddings stored (no regeneration)

**API Caching**
- Supabase query caching
- Conversation list cached (1 minute)
- Model list cached (session)

### Rate Limiting

**Smart Search**
- Gemini calls: 1 per message
- Embedding batches: 100ms delay
- Entity extraction: 1 second between chunks

**API Routes**
- No artificial rate limits
- Provider-specific limits apply

---

## Security Best Practices

### API Key Management

**Server-Side Keys** (`.env.local`)
- Never committed to git
- Used in API routes only
- Not exposed to client

**Client-Side Keys** (optional)
- User provides own keys
- Stored in browser only
- Cleared on logout

### Data Privacy

**Local-First Architecture**
- Smart Search runs in browser
- Personalization data in IndexedDB
- Optional cloud sync via Supabase

**User Data Isolation**
- RLS policies enforce user boundaries
- No cross-user data access
- Secure session tokens

### Authentication Security

- HTTPS only in production
- Secure httpOnly cookies
- PKCE flow for OAuth
- Automatic token refresh

---

## Troubleshooting

### Ollama Not Connecting

**Problem**: "No Ollama models available"

**Solutions**:
1. Ensure Ollama is running: `ollama serve`
2. Check URL in settings: `http://localhost:11434`
3. Verify CORS if using custom domain
4. Check firewall settings

### Hard Memory Not Loading

**Problem**: "Memory retrieval failed"

**Solutions**:
1. Check Supabase connection
2. Verify RLS policies are enabled
3. Ensure user is authenticated
4. Check browser console for errors

### Smart Search Not Working

**Problem**: "No personalization data found"

**Solutions**:
1. Complete indexing setup first
2. Provide OpenRouter API key (free tier works)
3. Check IndexedDB is enabled
4. Verify browser supports IndexedDB
5. Clear and re-index if corrupt

### Slow Performance

**Problem**: "App feels sluggish"

**Solutions**:
1. Reduce token budget in settings
2. Clear old conversations
3. Limit indexed personalization text
4. Use faster models (Groq, GPT-4o-mini)
5. Disable embeddings (use TF-IDF)

---

## Roadmap & Future Enhancements

### Planned Features

**Memory & Personalization**
- [ ] Automatic memory extraction from conversations
- [ ] Memory importance scoring
- [ ] Temporal memory (recency decay)
- [ ] Memory fusion (merge similar memories)
- [ ] Multi-modal memory (images, audio)

**Search & Retrieval**
- [ ] Advanced semantic search (better embeddings)
- [ ] Hybrid ranking improvements
- [ ] Memory graph visualization
- [ ] Relationship mapping
- [ ] Timeline view

**User Experience**
- [ ] Voice input/output
- [ ] Real-time collaboration
- [ ] Conversation branching
- [ ] Message editing
- [ ] Conversation templates

**Integrations**
- [ ] Google OAuth completion
- [ ] Export to PDF, Markdown, HTML
- [ ] Import from ChatGPT, Claude
- [ ] Calendar integration
- [ ] Note-taking app sync (Notion, Obsidian)

**Developer Features**
- [ ] API documentation
- [ ] Webhook support
- [ ] Custom model fine-tuning
- [ ] Plugin system
- [ ] Embedding service selection

**Performance**
- [ ] Edge function optimization
- [ ] Better caching strategies
- [ ] Lazy loading components
- [ ] Virtual scrolling for long conversations
- [ ] Progressive rendering

---

## Contributing

Zurvanex is a personal project but contributions are welcome!

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run lint`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Functional components with hooks
- Comprehensive type definitions
- Inline documentation for complex logic

---

## Resources & Links

**Project**
- GitHub: https://github.com/Yexen/Zurvanex
- Live Demo: https://zurvanex.vercel.app/
- Documentation: This file

**Services**
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- Ollama: https://ollama.ai

**AI Providers**
- OpenRouter: https://openrouter.ai
- Groq: https://groq.com
- OpenAI: https://platform.openai.com
- Anthropic: https://console.anthropic.com
- Cohere: https://cohere.com

**Community**
- Discord: (coming soon)
- Twitter: (coming soon)

---

## License

Private project - All rights reserved.

---

## Acknowledgments

**Technologies**
- Next.js team for amazing framework
- Supabase for backend infrastructure
- Vercel for hosting
- Anthropic, OpenAI, Cohere, Meta for AI models

**Libraries**
- Framer Motion for animations
- Tailwind CSS for styling
- Recharts for visualizations

---

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: (your email)
- Twitter: (your twitter)

---

**Last Updated**: January 2025
**Version**: 2.0.0
**Author**: Yekta

---

*Built with ❤️ using Next.js, TypeScript, and Claude*
