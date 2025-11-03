# GitHub Repository Analyzer - Project Plan

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components (optional but recommended)

### Backend & AI
- **LangChain.js** - Document processing, chunking, embeddings
- **@google/generative-ai** - Gemini API integration
- **Google Generative AI Embeddings** - Vector embeddings
- **simple-git** - Git operations
- **child_process** - Execute gemini-cli

### Database
- **PostgreSQL 15+** with **pgvector** extension
- **node-postgres (pg)** - Database driver
- **@langchain/community** - Vector store integrations

### Utilities
- **zod** - Schema validation
- **uuid** - Unique identifiers

---

## 🗄️ Database Schema

### Tables

#### 1. `repositories`
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

#### 2. `documents`
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(768), -- Gemini embedding dimension
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON documents(repository_id);
```

---

## 📁 File Structure

```
github-search/
├── app/
│   ├── api/
│   │   ├── index/
│   │   │   └── route.ts              # POST: Index a repository
│   │   ├── chat/
│   │   │   └── route.ts              # POST: RAG chat endpoint
│   │   ├── repos/
│   │   │   ├── route.ts              # GET: List all repos
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET, PUT, DELETE: Single repo
│   │   │       └── documents/
│   │   │           └── route.ts      # GET, POST, DELETE: Documents
│   │   └── documents/
│   │       └── [id]/
│   │           └── route.ts          # DELETE: Delete specific document
│   ├── repos/
│   │   ├── page.tsx                  # Repository list & RAG chat
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx          # Edit & manage repo
│   ├── page.tsx                      # Main indexing page
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
├── lib/
│   ├── db.ts                         # Database connection
│   ├── vector-store.ts               # Vector operations
│   ├── git-operations.ts             # Git clone/download
│   ├── gemini-cli.ts                 # Gemini CLI integration
│   ├── langchain-utils.ts            # LangChain utilities
│   └── types.ts                      # TypeScript types
├── components/
│   ├── chat-interface.tsx            # RAG chat UI
│   ├── repo-list.tsx                 # Repository list
│   └── document-manager.tsx          # Document management
├── migrations/
│   └── init.sql                      # Database initialization
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🔄 API Endpoints

### 1. **POST /api/index**
- **Purpose:** Index a new GitHub repository
- **Input:** `{ url: string }`
- **Process:**
  1. Clone repository to temp directory
  2. Run gemini-cli on codebase
  3. Chunk and embed the output
  4. Save to database
- **Output:** `{ repositoryId: string, message: string }`

### 2. **POST /api/chat**
- **Purpose:** RAG-based chat with indexed repositories
- **Input:** `{ message: string, repositoryIds?: string[] }`
- **Process:**
  1. Embed user query
  2. Similarity search across documents
  3. Generate answer with Gemini
  4. Stream response
- **Output:** Streaming text response

### 3. **GET /api/repos**
- **Purpose:** List all indexed repositories
- **Output:** Array of repositories

### 4. **GET/PUT/DELETE /api/repos/[id]**
- **Purpose:** Manage single repository
- **PUT Input:** `{ name?: string, url?: string }`

### 5. **POST /api/repos/[id]/documents**
- **Purpose:** Add new document to repository
- **Input:** `{ content: string }`
- **Process:** Chunk, embed, and save

### 6. **DELETE /api/documents/[id]**
- **Purpose:** Delete specific document chunk

---

## 🔑 Key Features

### 1. Repository Indexing
- Clone GitHub repos using `simple-git`
- Analyze entire codebase with `gemini-cli` in non-interactive mode
- Generate project overview and use cases
- Chunk documents with `RecursiveCharacterTextSplitter`
- Create embeddings with `GoogleGenerativeAIEmbeddings`

### 2. RAG Chat
- Real-time similarity search across all indexed repositories
- Context-aware responses using Gemini
- Streaming responses for better UX

### 3. Document Management
- CRUD operations on repositories
- View, add, and delete document chunks
- Update repository metadata

---

## 🚀 Development Steps

1. Initialize Next.js project with TypeScript
2. Set up PostgreSQL with pgvector
3. Install dependencies
4. Create database schema
5. Implement database utilities
6. Build API routes
7. Create frontend components
8. Test indexing workflow
9. Test RAG chat
10. Implement document management UI

