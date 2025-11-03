# Implementation Guide - GitHub Repository Analyzer

This guide provides detailed technical explanations of the key components and workflows.

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Routes Explained](#api-routes-explained)
4. [Core Workflows](#core-workflows)
5. [Key Code Examples](#key-code-examples)
6. [Best Practices](#best-practices)

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Index Page │  │  Repos Page  │  │   Edit Page  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Routes (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/index   │  │  /api/chat   │  │  /api/repos  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Libraries (lib/)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ git-operations │ gemini-cli │ langchain-utils │ db   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│   File System   │  │  Gemini API  │  │  PostgreSQL  │
│   (Temp Repos)  │  │              │  │  + pgvector  │
└─────────────────┘  └──────────────┘  └──────────────┘
```

### Data Flow

```
1. User submits GitHub URL
   ↓
2. Clone repository to temp directory
   ↓
3. Run Gemini CLI analysis on codebase
   ↓
4. Chunk analysis output with LangChain
   ↓
5. Generate embeddings for each chunk
   ↓
6. Store in PostgreSQL with pgvector
   ↓
7. Cleanup temp directory
```

## Database Schema

### Repositories Table

```sql
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Stores metadata about indexed repositories.

**Fields:**
- `id`: Unique identifier (UUID)
- `name`: Repository name (extracted from URL)
- `url`: GitHub repository URL (unique constraint)
- `description`: Optional description
- `created_at/updated_at`: Timestamps

### Documents Table

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(768), -- Gemini embedding-001 dimension
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_documents_repository_id ON documents(repository_id);
CREATE INDEX idx_documents_embedding ON documents 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Purpose:** Stores document chunks with vector embeddings for similarity search.

**Fields:**
- `id`: Unique identifier (UUID)
- `repository_id`: Foreign key to repositories (cascade delete)
- `content`: Text content of the chunk
- `metadata`: JSON metadata (chunk index, total chunks, etc.)
- `embedding`: 768-dimensional vector for semantic search
- `created_at`: Timestamp

**Indexes:**
- B-tree index on `repository_id` for fast lookups
- IVFFlat index on `embedding` for approximate nearest neighbor search

## API Routes Explained

### POST /api/index

**Purpose:** Index a new GitHub repository

**Request Body:**
```typescript
{
  url: string  // GitHub repository URL
}
```

**Workflow:**

```typescript
1. Validate GitHub URL format
2. Check if repository already exists (409 if duplicate)
3. Clone repository to temp directory
4. Execute Gemini CLI analysis
5. Chunk the analysis output (1000 chars, 200 overlap)
6. Generate embeddings for each chunk
7. Save to database:
   - Create repository record
   - Save all document chunks with embeddings
8. Cleanup temp directory
9. Return success with stats
```

**Response:**
```typescript
{
  success: true,
  repositoryId: string,
  message: string,
  stats: {
    chunks: number,
    documents: number
  }
}
```

**Error Handling:**
- 400: Invalid URL or missing parameters
- 409: Repository already indexed
- 500: Server error (with details)

### POST /api/chat

**Purpose:** RAG-based chat with indexed repositories

**Request Body:**
```typescript
{
  message: string,           // User's question
  repositoryIds?: string[]   // Optional: specific repos to search
}
```

**Workflow:**

```typescript
1. Validate message
2. Generate embedding for user query
3. Perform cosine similarity search in database
   - Search across specified repos (or all if none specified)
   - Limit to top 5 most relevant chunks
   - Threshold: 0.3 similarity minimum
4. Extract content from matched documents
5. Build prompt with context
6. Stream response from Gemini model
7. Return streaming text response
```

**Response:** Streaming text (Server-Sent Events)

**Prompt Structure:**
```
You are a helpful AI assistant...

Context from repositories:
[1] <chunk 1 content>
[2] <chunk 2 content>
...

User Question: <user query>

Instructions: Answer based on context...
```

### GET /api/repos

**Purpose:** List all indexed repositories

**Response:**
```typescript
{
  repositories: Repository[],
  count: number
}
```

### GET/PUT/DELETE /api/repos/[id]

**GET**: Retrieve single repository details
**PUT**: Update repository metadata (name, url, description)
**DELETE**: Delete repository and all associated documents (cascade)

### POST /api/repos/[id]/documents

**Purpose:** Add new supplementary document to repository

**Request Body:**
```typescript
{
  content: string  // Document text
}
```

**Workflow:**
```typescript
1. Verify repository exists
2. Chunk the new content
3. Generate embeddings
4. Save all chunks to database
5. Return stats
```

### DELETE /api/documents/[id]

**Purpose:** Delete a specific document chunk

## Core Workflows

### 1. Repository Indexing Workflow

**File:** `app/api/index/route.ts`

```typescript
export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const { url } = await request.json();
    
    // Validation
    if (!isValidGitHubUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Check duplicates
    const existing = await query('SELECT id FROM repositories WHERE url = $1', [url]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Already indexed' }, { status: 409 });
    }

    // Step 1: Clone
    tempDir = await cloneRepository(url);

    // Step 2: Analyze with Gemini
    const analysisResult = await analyzeCodbaseWithGemini(tempDir);

    // Step 3: Chunk
    const chunks = await splitTextIntoChunks(analysisResult, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Step 4: Create repo record
    const repositoryId = uuidv4();
    const repoName = extractRepoName(url);
    await query(
      'INSERT INTO repositories (id, name, url, description) VALUES ($1, $2, $3, $4)',
      [repositoryId, repoName, url, 'Analyzed by Gemini AI']
    );

    // Step 5: Save documents with embeddings
    const documentIds = await saveDocuments(repositoryId, chunks);

    // Step 6: Cleanup
    await cleanupTempDir(tempDir);

    return NextResponse.json({
      success: true,
      repositoryId,
      message: `Successfully indexed "${repoName}"`,
      stats: { chunks: chunks.length, documents: documentIds.length }
    });
  } catch (error) {
    // Cleanup on error
    if (tempDir) await cleanupTempDir(tempDir);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. RAG Chat Workflow

**File:** `app/api/chat/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const { message, repositoryIds } = await request.json();

    // Perform similarity search
    const relevantDocs = await similaritySearch(message, {
      repositoryIds,
      limit: 5,
      threshold: 0.3,
    });

    if (relevantDocs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No relevant context found' }),
        { status: 404 }
      );
    }

    // Extract context
    const context = relevantDocs.map((doc) => doc.content);

    // Generate streaming response
    const stream = await generateRAGResponse(message, context);

    // Create ReadableStream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
```

### 3. Vector Similarity Search

**File:** `lib/vector-store.ts`

```typescript
export async function similaritySearch(
  queryText: string,
  options?: {
    repositoryIds?: string[];
    limit?: number;
    threshold?: number;
  }
): Promise<Document[]> {
  const { repositoryIds, limit = 5, threshold = 0.5 } = options || {};

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(queryText);

  // Build SQL with cosine similarity
  let sql = `
    SELECT 
      d.id,
      d.repository_id,
      d.content,
      d.metadata,
      d.created_at,
      1 - (d.embedding <=> $1) as similarity
    FROM documents d
  `;

  const params: any[] = [`[${queryEmbedding.join(',')}]`];

  // Optional repository filter
  if (repositoryIds && repositoryIds.length > 0) {
    sql += ` WHERE d.repository_id = ANY($2)`;
    params.push(repositoryIds);
  }

  // Order by similarity, limit results
  sql += `
    ORDER BY d.embedding <=> $1
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  const result = await query(sql, params);

  // Filter by threshold
  return result.rows.filter((row) => row.similarity >= threshold);
}
```

**Explanation:**
- `<=>` is pgvector's cosine distance operator
- `1 - distance` gives similarity score (0-1)
- `ORDER BY embedding <=>` uses the IVFFlat index
- Filters results by similarity threshold

## Key Code Examples

### 1. Gemini CLI Integration

**File:** `lib/gemini-cli.ts`

```typescript
export async function analyzeCodbaseWithGemini(repoPath: string): Promise<string> {
  const prompt = `
Analyze this entire codebase and provide:

1. **Project Overview**
   - What is this project?
   - Main technologies and frameworks
   - Architecture and structure

2. **Use Cases**
   - What problems does it solve?
   - Main features and capabilities
  `.trim();

  const command = `cd "${repoPath}" && ${GEMINI_CLI_PATH} --non-interactive "${prompt}"`;

  const { stdout, stderr } = await execAsync(command, {
    maxBuffer: 10 * 1024 * 1024,  // 10MB
    timeout: 300000,               // 5 minutes
  });

  return stdout.trim();
}
```

**Key Points:**
- Uses `--non-interactive` flag for automation
- Large buffer for big outputs
- 5-minute timeout for large repos
- Executes in repository directory context

### 2. Document Chunking

**File:** `lib/langchain-utils.ts`

```typescript
export async function splitTextIntoChunks(
  text: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }
): Promise<DocumentChunk[]> {
  const { chunkSize = 1000, chunkOverlap = 200 } = options || {};

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.createDocuments([text]);

  return chunks.map((chunk, index) => ({
    content: chunk.pageContent,
    metadata: {
      ...chunk.metadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));
}
```

**Why RecursiveCharacterTextSplitter?**
- Tries to split on natural boundaries (paragraphs, sentences)
- Maintains context with overlap
- Respects maximum chunk size

**Parameters:**
- `chunkSize: 1000` - ~1000 characters per chunk
- `chunkOverlap: 200` - 200 character overlap between chunks
- Separators in priority order: paragraphs → lines → sentences → words → chars

### 3. Embedding Generation

**File:** `lib/vector-store.ts`

```typescript
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: 'models/embedding-001',
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding = await embeddings.embedQuery(text);
  return embedding;  // Returns 768-dimensional vector
}
```

**About Gemini Embeddings:**
- Model: `embedding-001`
- Dimensions: 768
- Max input: 2048 tokens
- Output: Dense vector representation

### 4. Streaming Chat Response

**File:** `components/chat-interface.tsx`

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  // Add user message
  setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

  // Fetch with streaming
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: userMessage, repositoryIds }),
  });

  // Read stream
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  let assistantMessage = '';

  // Add empty assistant message
  setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

  // Stream chunks
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    assistantMessage += chunk;

    // Update last message
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = {
        role: 'assistant',
        content: assistantMessage,
      };
      return newMessages;
    });
  }
}
```

**Benefits:**
- Real-time response display
- Better perceived performance
- Progressive rendering of long answers

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  // Operation
} catch (error: any) {
  console.error('Error context:', error);
  return NextResponse.json(
    {
      error: 'User-friendly message',
      details: error.message,
    },
    { status: 500 }
  );
}
```

### 2. Resource Cleanup

Always clean up resources:

```typescript
let tempDir: string | null = null;

try {
  tempDir = await cloneRepository(url);
  // ... operations ...
} finally {
  if (tempDir) {
    await cleanupTempDir(tempDir);
  }
}
```

### 3. Database Connection Pooling

Use connection pooling for better performance:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 4. Input Validation

Always validate user input:

```typescript
if (!url || typeof url !== 'string') {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}

if (!isValidGitHubUrl(url)) {
  return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
}
```

### 5. Semantic Chunking

Optimize chunk size based on your use case:

- **Smaller chunks (500-800)**: Better precision, more specific answers
- **Larger chunks (1500-2000)**: More context, better for broad questions
- **Overlap (15-20%)**: Maintains context across boundaries

### 6. Vector Search Optimization

Tune similarity search parameters:

```typescript
const relevantDocs = await similaritySearch(query, {
  limit: 5,        // Top K results
  threshold: 0.3,  // Minimum similarity (0-1)
});
```

- Lower threshold = more results, less precise
- Higher threshold = fewer results, more precise
- Optimal threshold: 0.3-0.5 for most use cases

## Performance Considerations

### 1. Indexing Performance

- Large repos can take 3-10 minutes
- Bottlenecks: Git clone, Gemini analysis, embedding generation
- Optimization: Process in background, show progress

### 2. Search Performance

- Vector search with IVFFlat is O(√n) not O(n)
- Tune `lists` parameter based on dataset size
- Rule of thumb: `lists = sqrt(num_rows)`

### 3. Memory Management

For large repositories:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### 4. Database Indexing

Monitor query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM documents
ORDER BY embedding <=> '[...]'
LIMIT 5;
```

## Security Considerations

1. **API Key Protection**: Never commit `.env` file
2. **Input Validation**: Sanitize all user inputs
3. **SQL Injection**: Use parameterized queries
4. **Rate Limiting**: Implement for API routes
5. **CORS**: Configure for production

## Next Steps

1. Add authentication (NextAuth.js)
2. Implement rate limiting
3. Add progress indicators for long operations
4. Implement caching for embeddings
5. Add support for private repositories
6. Implement batch indexing
7. Add export/import functionality

For more information, see the main [README.md](README.md).

