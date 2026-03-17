# GitHub Repository Analyzer API Documentation

## Overview

一个强大的 Next.js 应用程序，使用 AI 索引 GitHub 仓库，并通过智能聊天交互帮助您发现适合任务的仓库，基于检索增强生成 (RAG) 技术。

## Service Information

- **Name**: GitHub Repository Analyzer
- **Port**: 3003
- **Base URL**: http://localhost:3003
- **Framework**: Next.js 14.2.18
- **Purpose**: GitHub 仓库智能分析与 RAG 问答系统

## Technology Stack

### Frontend
- Next.js 14+ with App Router
- React 18 with TypeScript
- Tailwind CSS
- React Markdown with syntax highlighting (highlight.js)
- GitHub Flavored Markdown (GFM) support

### Backend & AI
- LangChain.js (文档处理和 RAG)
- OpenAI (embeddings: `text-embedding-3-small`, chat: `gpt-4o-mini`)
- Google Gemini CLI (代码分析)
- PostgreSQL with pgvector (向量存储, 1536 dimensions)
- simple-git (仓库克隆)

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://localhost:5432/github_search

# AI Services
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_GEMINI_BASE_URL=http://your-gemini-base-url
OPENAI_BASE_URL=http://openai-proxy.miracleplus.com/v1
OPENAI_API_KEY=your_openai_key_here

# GitHub (Optional, for higher rate limits)
GITHUB_TOKEN=your_github_token_here

# Configuration
NEXT_PUBLIC_UNINDEXED_REPOS_LIMIT=5
```

## Prerequisites

- **Node.js 18+** and npm/pnpm
- **PostgreSQL 15+** with pgvector extension
- **OpenAI API Key** for embeddings and chat
- **Google API Key** for Gemini CLI code analysis
- **Gemini CLI** (`gemini`) installed

## Available Scripts

```bash
# Development mode (port 3003)
npm run dev

# Production build
npm run build

# Production mode
npm start

# Database migration
npm run db:migrate

# Lint
npm run lint
```

## API Endpoints

### Repository Management

#### Index Repository from URL
```http
POST /api/index
Content-Type: application/json

{
  "repoUrl": "https://github.com/user/repo"
}
```

#### Index Local Repository
```http
POST /api/index-local
Content-Type: application/json

{
  "localPath": "/absolute/path/to/repo"
}
```

#### List All Repositories
```http
GET /api/repos
```

Response:
```json
[
  {
    "id": "uuid",
    "name": "repo-name",
    "url": "https://github.com/user/repo",
    "description": "Repository description",
    "analysis_zh": "中文分析结果",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Single Repository
```http
GET /api/repos/[id]
```

#### Update Repository
```http
PUT /api/repos/[id]
Content-Type: application/json

{
  "name": "new-name",
  "description": "new description"
}
```

#### Delete Repository
```http
DELETE /api/repos/[id]
```

### Document Management

#### Get Repository Documents
```http
GET /api/repos/[id]/documents
```

#### Add New Document
```http
POST /api/repos/[id]/documents
Content-Type: application/json

{
  "content": "Document content",
  "metadata": {}
}
```

#### Delete Document
```http
DELETE /api/documents/[id]
```

### Chat (RAG)

#### Chat with Repositories
```http
POST /api/chat
Content-Type: application/json

{
  "message": "What is this project about?",
  "repositoryIds": ["uuid1", "uuid2"]
}
```

Response: Server-Sent Events (SSE) stream

Events:
- `metadata`: Translation and processing info
- `content`: Streaming response chunks
- `done`: Completion signal
- `error`: Error information

## Key Features

### 1. Repository Indexing
- **从 URL 索引**: 克隆并分析任何公开的 GitHub 仓库
- **从本地索引**: 分析本地仓库（更快，支持私有仓库）

### 2. AI-Powered Chat
- **智能仓库发现**: AI 驱动的聊天帮助您找到完美的仓库
- **多语言支持**: 支持任何语言提问，自动翻译
- **Markdown 渲染**: 富文本 Markdown 支持，代码高亮
- **SSE 流式传输**: 实时响应流

### 3. Repository Management
- **仓库搜索**: 按名称实时搜索过滤仓库
- **文档管理**: 添加、查看、删除每个仓库的文档块
- **多仓库搜索**: 同时查询多个仓库
- **分析查看器**: 查看中英文 AI 分析结果

### 4. Technical Features
- **向量搜索**: 使用 PostgreSQL + pgvector 进行高效相似度搜索
- **可点击引用**: 仓库推荐包含可点击的 URL

## Health Check

检查服务是否运行：

```bash
# Check web service
curl http://localhost:3003

# Check database connection
psql -d github_search -c "SELECT 1"

# Check pgvector extension
psql -d github_search -c "SELECT * FROM pg_extension WHERE extname = 'vector'"
```

## Database Schema

Main tables:
- `repositories`: Repository metadata and Chinese analysis
- `documents`: Chunked documents with embeddings (pgvector)

## Usage Examples

### Indexing a Repository

```bash
# From URL
curl -X POST http://localhost:3003/api/index \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/vercel/next.js"}'

# From local path
curl -X POST http://localhost:3003/api/index-local \
  -H "Content-Type: application/json" \
  -d '{"localPath": "/Users/daniel/projects/my-repo"}'
```

### Chatting with Repositories

```bash
curl -X POST http://localhost:3003/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这个项目是关于什么的？",
    "repositoryIds": ["repo-uuid"]
  }'
```

## Logs

Service logs are stored in `.service.log` in the project root.

```bash
# View logs
tail -f /Users/daniel/Desktop/github-search/.service.log
```

## Common Issues

### PostgreSQL Not Running
```bash
# Start PostgreSQL
brew services start postgresql

# Check status
brew services list
pg_isready
```

### pgvector Extension Missing
```bash
# Install pgvector
brew install pgvector

# Run migrations
npm run db:migrate
```

### Port Already in Use
```bash
lsof -ti:3003 | xargs kill -9
```

### Memory Issues (Large Repositories)
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## Links

- [Next.js Documentation](https://nextjs.org/docs)
- [LangChain.js Documentation](https://js.langchain.com)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Gemini CLI](https://github.com/google/gemini-cli)
