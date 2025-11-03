# Architecture Documentation

## System Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router) + React 18 + TypeScript               │
│  - Server Components for initial render                         │
│  - Client Components for interactivity                          │
│  - Tailwind CSS for styling                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  REST API Routes:                                               │
│  - POST /api/index        (Repository indexing)                │
│  - POST /api/chat         (RAG chat with streaming)            │
│  - GET/PUT/DELETE /api/repos/*  (CRUD operations)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Business Logic Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  Core Libraries (lib/):                                         │
│  - git-operations.ts    (Repository cloning)                   │
│  - gemini-cli.ts        (AI analysis)                          │
│  - langchain-utils.ts   (Chunking, RAG)                        │
│  - vector-store.ts      (Embeddings, search)                   │
│  - db.ts                (Database operations)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                  ┌───────────┼───────────┐
                  ▼           ▼           ▼
         ┌────────────┐ ┌────────┐ ┌──────────────┐
         │ File System│ │ Gemini │ │ PostgreSQL   │
         │ (Temp)     │ │ API    │ │ + pgvector   │
         └────────────┘ └────────┘ └──────────────┘
```

## Data Flow Diagrams

### 1. Repository Indexing Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Submit GitHub URL
     ▼
┌────────────────┐
│  Index Page    │
└────┬───────────┘
     │ 2. POST /api/index
     ▼
┌────────────────────────────────────────────────────────┐
│  API Route: /api/index                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │  1. Validate URL                                  │ │
│  │  2. Check if exists (prevent duplicates)          │ │
│  │  3. Clone repository to /tmp/repo-{timestamp}     │ │
│  │  4. Execute: gemini --non-interactive <prompt>    │ │
│  │  5. Receive AI analysis (project overview + uses) │ │
│  │  6. Chunk text (RecursiveCharacterTextSplitter)   │ │
│  │     - chunkSize: 1000                             │ │
│  │     - chunkOverlap: 200                           │ │
│  │  7. For each chunk:                               │ │
│  │     a. Generate 768d embedding vector             │ │
│  │     b. Save to database with metadata             │ │
│  │  8. Delete temporary repository                   │ │
│  └──────────────────────────────────────────────────┘ │
└────┬───────────────────────────────────────────────────┘
     │ 3. Return { repositoryId, stats }
     ▼
┌────────────────┐
│  Success Page  │
└────────────────┘
```

### 2. RAG Chat Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Type question + select repos
     ▼
┌────────────────┐
│  Chat UI       │
└────┬───────────┘
     │ 2. POST /api/chat
     ▼
┌────────────────────────────────────────────────────────┐
│  API Route: /api/chat                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │  1. Validate message                              │ │
│  │  2. Generate query embedding (768d vector)        │ │
│  │  3. Vector similarity search:                     │ │
│  │     SELECT *, 1 - (embedding <=> query) as sim   │ │
│  │     FROM documents                                │ │
│  │     WHERE repository_id IN (selected)             │ │
│  │     ORDER BY embedding <=> query                  │ │
│  │     LIMIT 5                                       │ │
│  │  4. Filter by threshold (>= 0.3)                  │ │
│  │  5. Build prompt:                                 │ │
│  │     - System instructions                         │ │
│  │     - Context from top matches                    │ │
│  │     - User question                               │ │
│  │  6. Stream response from Gemini                   │ │
│  └──────────────────────────────────────────────────┘ │
└────┬───────────────────────────────────────────────────┘
     │ 3. Stream text chunks
     ▼
┌────────────────┐
│  Chat UI       │ (Updates in real-time)
└────────────────┘
```

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────────────────┐
│         repositories            │
├─────────────────────────────────┤
│ id (PK)          UUID           │
│ name             VARCHAR(255)   │
│ url              VARCHAR(500)   │◄───┐
│ description      TEXT           │    │
│ created_at       TIMESTAMP      │    │
│ updated_at       TIMESTAMP      │    │
└─────────────────────────────────┘    │
                                       │ 1:N
                                       │
┌──────────────────────────────────────┼──┐
│            documents                 │  │
├──────────────────────────────────────┴──┤
│ id (PK)             UUID                │
│ repository_id (FK)  UUID                │
│ content             TEXT                │
│ metadata            JSONB               │
│ embedding           vector(768)         │
│ created_at          TIMESTAMP           │
└─────────────────────────────────────────┘

Indexes:
- idx_documents_repository_id (B-tree)
- idx_documents_embedding (IVFFlat)
```

### Vector Index Explanation

**IVFFlat Index:**
- Inverted File Index with Flat compression
- Splits space into "lists" (clusters)
- Search only relevant clusters (approximate nearest neighbor)
- Trade-off: Speed vs. accuracy

```sql
CREATE INDEX idx_documents_embedding 
ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Parameters:**
- `lists = 100`: Number of clusters (tune based on data size)
- `vector_cosine_ops`: Cosine distance operator
- Recommended: `lists = sqrt(num_rows)`

## Component Architecture

### Frontend Components

```
app/
├── layout.tsx                    (Root layout with navigation)
├── page.tsx                      (Index page - repository submission)
├── repos/
│   ├── page.tsx                  (List + Chat page)
│   └── [id]/
│       └── edit/
│           └── page.tsx          (Edit + Document Management)

components/
├── chat-interface.tsx            (Chat UI with streaming)
├── repo-list.tsx                 (Repository list with selection)
└── document-manager.tsx          (Document CRUD operations)
```

**Component Responsibilities:**

1. **chat-interface.tsx**
   - Display chat messages
   - Handle user input
   - Stream API responses
   - Manage message state

2. **repo-list.tsx**
   - Display repositories
   - Handle selection (checkboxes)
   - Edit/Delete actions
   - Show metadata

3. **document-manager.tsx**
   - List document chunks
   - Add new documents
   - Delete chunks
   - Show chunk metadata

### API Layer

```
app/api/
├── index/
│   └── route.ts                  (POST - Index repository)
├── chat/
│   └── route.ts                  (POST - RAG chat)
├── repos/
│   ├── route.ts                  (GET - List all)
│   └── [id]/
│       ├── route.ts              (GET/PUT/DELETE - Single repo)
│       └── documents/
│           └── route.ts          (GET/POST - Repo documents)
└── documents/
    └── [id]/
        └── route.ts              (DELETE - Single document)
```

### Library Layer

```
lib/
├── db.ts
│   ├── pool              (PostgreSQL connection pool)
│   ├── query()           (Execute parameterized queries)
│   └── getClient()       (Get client from pool)
│
├── vector-store.ts
│   ├── generateEmbedding()       (Text → 768d vector)
│   ├── saveDocuments()           (Batch save with embeddings)
│   ├── similaritySearch()        (Vector search)
│   ├── deleteDocument()          (Delete by ID)
│   └── getDocumentsByRepository() (Get all for repo)
│
├── git-operations.ts
│   ├── cloneRepository()         (Clone to temp dir)
│   ├── cleanupTempDir()          (Delete temp dir)
│   ├── extractRepoName()         (Parse name from URL)
│   └── isValidGitHubUrl()        (Validate URL format)
│
├── gemini-cli.ts
│   ├── analyzeCodbaseWithGemini() (Run CLI analysis)
│   └── checkGeminiCLI()          (Verify CLI exists)
│
├── langchain-utils.ts
│   ├── splitTextIntoChunks()     (Chunk with metadata)
│   ├── generateRAGResponse()     (Stream response)
│   └── generateRAGResponseSync() (Non-streaming response)
│
└── types.ts                      (TypeScript interfaces)
```

## Security Architecture

### Input Validation

```typescript
// URL validation
function isValidGitHubUrl(url: string): boolean {
  const githubRegex = /^(https:\/\/github\.com\/|git@github\.com:)[\w-]+\/[\w.-]+/;
  return githubRegex.test(url);
}

// SQL injection prevention
await query('SELECT * FROM repositories WHERE id = $1', [id]);
// ✓ Parameterized query

// NOT THIS:
await query(`SELECT * FROM repositories WHERE id = '${id}'`);
// ✗ SQL injection vulnerable
```

### Environment Variables

```
Secrets (never commit):
- GOOGLE_API_KEY
- DATABASE_URL

Configuration:
- NODE_ENV
- GEMINI_CLI_PATH
```

### Error Handling

```typescript
try {
  // Operation
} catch (error: any) {
  console.error('Detailed error:', error);  // For developers
  return NextResponse.json(
    {
      error: 'User-friendly message',        // For users
      details: error.message                  // Additional context
    },
    { status: 500 }
  );
}
```

## Performance Optimization

### 1. Database Connection Pooling

```typescript
const pool = new Pool({
  max: 20,                      // Max connections
  idleTimeoutMillis: 30000,     // Close idle after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});
```

### 2. Vector Search Optimization

```sql
-- Tune based on dataset size
CREATE INDEX WITH (lists = sqrt(num_rows));

-- For 10,000 rows: lists = 100
-- For 100,000 rows: lists = 316
-- For 1,000,000 rows: lists = 1000
```

### 3. Chunking Strategy

```
Small chunks (500-800):
  ✓ More precise answers
  ✓ Better for specific questions
  ✗ May miss broader context

Large chunks (1500-2000):
  ✓ More context per chunk
  ✓ Better for broad questions
  ✗ Less precise matching

Recommended: 1000 chars with 200 overlap
```

### 4. Caching Opportunities

```typescript
// Future optimization: Cache embeddings
const cache = new Map<string, number[]>();

function getCachedEmbedding(text: string) {
  if (cache.has(text)) {
    return cache.get(text);
  }
  const embedding = await generateEmbedding(text);
  cache.set(text, embedding);
  return embedding;
}
```

## Scalability Considerations

### Current Limits

- Single server architecture
- Synchronous indexing (blocks request)
- No request queuing
- In-memory session state

### Scale-Up Path

1. **Background Jobs**
   - Use Bull/BullMQ for job queue
   - Process indexing asynchronously
   - Show progress updates via WebSocket

2. **Horizontal Scaling**
   - Deploy multiple Next.js instances
   - Use Redis for shared state
   - Load balancer in front

3. **Database Scaling**
   - Read replicas for queries
   - Partitioning for large datasets
   - Separate vector store (Pinecone, Weaviate)

4. **Caching Layer**
   - Redis for session data
   - Cache embeddings
   - Cache frequently accessed repos

## Monitoring & Observability

### Key Metrics to Track

1. **Indexing Performance**
   - Average time per repository
   - Success/failure rate
   - Queue depth

2. **Search Performance**
   - Query latency (p50, p95, p99)
   - Similarity scores
   - Result relevance

3. **Database Performance**
   - Connection pool utilization
   - Query execution time
   - Index effectiveness

4. **API Performance**
   - Request rate
   - Error rate
   - Response time

### Logging Strategy

```typescript
// Structured logging
console.log({
  timestamp: new Date().toISOString(),
  level: 'info',
  operation: 'index_repository',
  repository: repoName,
  duration: endTime - startTime,
  chunks: chunksCreated,
});
```

## Future Enhancements

### Phase 2 Features

1. **Authentication & Authorization**
   - User accounts (NextAuth.js)
   - Per-user repositories
   - Sharing capabilities

2. **Advanced Search**
   - Filter by repository
   - Filter by date
   - Hybrid search (keyword + semantic)

3. **Collaboration**
   - Share conversations
   - Collaborative annotations
   - Team workspaces

4. **Analytics**
   - Usage statistics
   - Popular queries
   - Search quality metrics

### Phase 3 Features

1. **Multi-Source Support**
   - GitLab repositories
   - Bitbucket repositories
   - Local folder upload

2. **Advanced AI Features**
   - Code generation
   - Bug detection
   - Documentation generation

3. **API & Integrations**
   - REST API for external access
   - Webhooks for events
   - Slack/Discord bots

## Development Workflow

### Local Development

```bash
# Start PostgreSQL
brew services start postgresql

# Start dev server
npm run dev

# In another terminal, monitor logs
tail -f .next/server-log.txt
```

### Testing Strategy

```typescript
// Unit tests (lib/)
- Test utility functions
- Mock external dependencies

// Integration tests (API routes)
- Test with test database
- Mock Gemini API

// E2E tests
- Test full user workflows
- Use Playwright
```

### Deployment Pipeline

```
1. Code pushed to GitHub
   ↓
2. CI runs (GitHub Actions)
   - Linting
   - Type checking
   - Tests
   ↓
3. Build Next.js
   ↓
4. Deploy to hosting
   - Vercel (easiest)
   - AWS/GCP/Azure
   - Docker container
   ↓
5. Run migrations
   ↓
6. Health check
```

---

This architecture is designed to be:
- **Modular**: Clear separation of concerns
- **Scalable**: Can grow with demand
- **Maintainable**: Well-organized codebase
- **Extensible**: Easy to add new features

