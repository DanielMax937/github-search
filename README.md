# GitHub Repository Analyzer

A powerful Next.js application that indexes GitHub repositories using AI and helps you **discover the right repositories for your tasks** through intelligent chat interactions powered by Retrieval-Augmented Generation (RAG).

## 🌟 Features

- **🔍 Repository Indexing**: Clone and analyze any GitHub repository using Gemini AI
- **💬 Smart Repository Discovery**: AI-powered chat helps you find the perfect repository for your task
- **🌍 Multi-Language Support**: Ask questions in any language - automatic translation powered by OpenAI
- **📝 Markdown Rendering**: Rich markdown support in chat with syntax highlighting for code
- **📡 SSE Streaming**: Server-Sent Events for reliable real-time response streaming
- **🔎 Repository Search**: Filter repositories by name with real-time search
- **📚 Document Management**: Add, view, and delete document chunks for each repository
- **🎯 Multi-Repository Search**: Query across multiple repositories simultaneously
- **🗄️ Vector Search**: Efficient similarity search using PostgreSQL with pgvector
- **🌓 Analysis Viewer**: View AI analysis results in both Chinese and English with language toggle

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Markdown** with syntax highlighting (highlight.js)
- **GitHub Flavored Markdown (GFM)** support

### Backend & AI
- **LangChain.js** for document processing and RAG
- **OpenAI** for embeddings (`text-embedding-3-small`) and chat (`gpt-4o-mini`)
- **Google Gemini CLI** for initial code analysis
- **PostgreSQL with pgvector** for vector storage (1536 dimensions)
- **simple-git** for repository cloning

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn
- **PostgreSQL 15+** with pgvector extension
- **OpenAI API Key** for embeddings and chat ([Get one here](https://platform.openai.com/api-keys))
- **Google API Key** for Gemini CLI code analysis ([Get one here](https://makersuite.google.com/app/apikey))
- **Gemini CLI** (`gemini`) - [Installation guide](https://github.com/google/gemini-cli)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd github-search
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL with pgvector

Install PostgreSQL and the pgvector extension:

```bash
# macOS
brew install postgresql pgvector

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
# Follow pgvector installation from: https://github.com/pgvector/pgvector
```

Create a database:

```bash
createdb github_search
```

### 4. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/github_search
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional, defaults to OpenAI API
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_CLI_PATH=gemini
NODE_ENV=development
```

**Note:** 
- `OPENAI_API_KEY` is used for embeddings and chat responses
- `OPENAI_BASE_URL` (optional) - Use custom endpoint/proxy (defaults to `https://api.openai.com/v1`)
- `GOOGLE_API_KEY` is only used for Gemini CLI code analysis

### 5. Run database migrations

```bash
npm run db:migrate
```

This will create the necessary tables and set up the pgvector extension.

### 6. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage

### Indexing a Repository

1. Navigate to the home page (`/`)
2. Enter a GitHub repository URL (e.g., `https://github.com/user/repo`)
3. Click "Index Repository"
4. Wait for the process to complete (this may take a few minutes)

**What happens during indexing:**
- Repository is cloned to `.temp/` directory in project root
- Gemini CLI analyzes the entire codebase (generates overview and use cases)
- Analysis is automatically translated to Chinese and saved in database
- Output is chunked and embedded using LangChain
- Chunks are stored in the vector database with embeddings
- Temporary directory is automatically cleaned up after indexing

**📝 Analysis Storage:**
- English analysis is chunked and embedded for RAG search
- Chinese translation (`analysis_zh`) is stored in the `repositories` table
- You can access the Chinese analysis via API: `GET /api/repos/{id}` → `analysis_zh` field

### Chatting with Repositories

1. Navigate to the Repositories page (`/repos`)
2. Select one or more repositories using checkboxes
3. Type your question in the chat interface
4. Receive AI-generated responses based on the repository context

**Example questions:**
- "What is this project about?"
- "How does authentication work?"
- "What are the main features?"
- "Explain the database schema"

**🌍 Multi-Language Support:**

The chat interface now supports automatic translation! You can ask questions in any language:

- **Chinese (中文)**: "这个项目是关于什么的？"
- **Spanish (Español)**: "¿De qué trata este proyecto?"
- **French (Français)**: "De quoi parle ce projet ?"
- **Japanese (日本語)**: "このプロジェクトは何についてですか？"
- **Korean (한국어)**: "이 프로젝트는 무엇에 관한 것인가요?"
- And many more...

**How it works:**
1. Your question is automatically detected and translated to English
2. RAG search is performed with the English query
3. The answer is generated and translated back to your language
4. Technical terms and code snippets remain in their original form

### Managing Repositories

1. Click the edit icon next to any repository
2. Update the name, URL, or description
3. Add new supplementary documents
4. View and delete existing document chunks
5. Delete the entire repository if needed

## 🔄 API Endpoints

### Repository Management

- `POST /api/index` - Index a new repository
- `GET /api/repos` - List all repositories
- `GET /api/repos/[id]` - Get single repository
- `PUT /api/repos/[id]` - Update repository
- `DELETE /api/repos/[id]` - Delete repository

### Document Management

- `GET /api/repos/[id]/documents` - Get repository documents
- `POST /api/repos/[id]/documents` - Add new document
- `DELETE /api/documents/[id]` - Delete document

### Chat

- `POST /api/chat` - RAG chat endpoint (streaming)

## 📁 Project Structure

```
github-search/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── index/           # Repository indexing
│   │   ├── chat/            # RAG chat
│   │   ├── repos/           # Repository management
│   │   └── documents/       # Document management
│   ├── repos/               # Frontend pages
│   ├── page.tsx             # Home page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── chat-interface.tsx  # Chat UI
│   ├── repo-list.tsx       # Repository list
│   └── document-manager.tsx # Document management
├── lib/                     # Utility libraries
│   ├── db.ts               # Database connection
│   ├── vector-store.ts     # Vector operations
│   ├── git-operations.ts   # Git utilities
│   ├── gemini-cli.ts       # Gemini CLI integration
│   ├── langchain-utils.ts  # LangChain utilities
│   └── types.ts            # TypeScript types
├── migrations/             # Database migrations
└── scripts/                # Utility scripts
```

## 🔧 Configuration

### Gemini CLI

The application uses `gemini-cli` to analyze repositories. Ensure it's installed and accessible:

```bash
which gemini
```

If installed in a custom location, update the `GEMINI_CLI_PATH` in `.env`.

### Embedding Model

The application uses Google's `embedding-001` model (768 dimensions). This is configured in `lib/vector-store.ts`.

### Chunking Parameters

Document chunking can be customized in `lib/langchain-utils.ts`:

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // Characters per chunk
  chunkOverlap: 200,    // Overlap between chunks
});
```

## 🐛 Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env`
- Ensure pgvector extension is installed: `SELECT * FROM pg_extension WHERE extname = 'vector';`

### pgvector Extension Error

**Error during migration:** `could not open extension control file ".../extension/vector.control"`

**Solution:**
```bash
# macOS
brew install pgvector

# Verify installation
ls /opt/homebrew/share/postgresql@*/extension/vector.control

# Then retry migration
npm run db:migrate
```

### Gemini CLI Not Found

- Install gemini-cli: Follow [official instructions](https://github.com/google/gemini-cli)
- Update `GEMINI_CLI_PATH` in `.env`

### Memory Issues

For large repositories, increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Temporary Directory Cleanup

Repositories are cloned to `.temp/` in the project root during indexing. They are automatically cleaned up after processing. If you need to manually clean up:

```bash
# Remove all temporary directories
rm -rf .temp

# Or check what's in there
ls -la .temp
```

Note: The application automatically removes temp directories older than 1 hour on each new indexing operation.

### Custom OpenAI Endpoint

You can use a custom OpenAI endpoint by setting `OPENAI_BASE_URL`:

```bash
# Use OpenAI-compatible API (e.g., Azure OpenAI, LocalAI, etc.)
OPENAI_BASE_URL=https://your-custom-endpoint.com/v1

# Use a proxy
OPENAI_BASE_URL=https://your-proxy.com/openai/v1

# Use Azure OpenAI
OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
```

**Common use cases:**
- **Azure OpenAI**: Use your Azure OpenAI deployment
- **OpenAI-compatible APIs**: LocalAI, FastChat, vLLM, etc.
- **Proxy/Gateway**: Route through your own infrastructure
- **Regional endpoints**: Use region-specific endpoints

**Note:** If not set, defaults to `https://api.openai.com/v1`

## 💬 Chat Features

### Flexible Repository Selection
- **Select specific repositories**: Choose one or more repositories to narrow your search
- **Search all repositories**: When no repositories are selected, the system automatically searches across ALL indexed repositories
- The chat interface clearly shows which repositories are being searched

### Server-Sent Events (SSE)
The chat interface uses **Server-Sent Events** for reliable real-time streaming:
- Structured event messages (metadata, content, done, error)
- Better error handling and recovery
- Metadata support for translation information
- Industry-standard streaming protocol

### Markdown Rendering
AI responses support rich markdown formatting:
- **Code blocks** with syntax highlighting (180+ languages)
- **Tables**, **lists**, and **blockquotes**
- **Links** (open in new tab)
- **GitHub Flavored Markdown (GFM)** features
- **Dark mode** compatible styling

#### Example Chat Queries:
The chat is optimized for **repository discovery** - helping you find the right tools from your indexed collection:

```
"I need a library for authentication in Node.js"
"Which repository can help me build a REST API?"
"I'm looking for a tool to manage database migrations"
"What's the best option for real-time communication?"
"用中文告诉我哪个项目适合做前端开发" (Ask in any language)
```

**Important**: The AI will ONLY recommend from your **indexed repositories**:
- ✅ Searches through YOUR indexed repositories
- ✅ Recommends only what you've already indexed
- ✅ Based on actual code analysis from your database
- ❌ Will NOT suggest external repositories from the internet
- ❌ Will NOT recommend libraries from general knowledge

The AI will:
- Identify relevant repositories from YOUR indexed collection
- Provide **clickable repository URLs** in every recommendation
- Explain why each indexed repository matches your needs
- Provide practical usage examples from your repositories
- Rank your indexed repositories by relevance
- Suggest how your repositories can work together
- Clearly state if none of your repositories match (suggesting you index more)

**Clickable Links**: Every repository recommendation includes a markdown link so you can click directly to view the repository on GitHub.

For detailed information about chat features, see [CHAT_IMPROVEMENTS.md](./CHAT_IMPROVEMENTS.md).

## 🚢 Production Deployment

### Build the application

```bash
npm run build
```

### Start production server

```bash
npm start
```

### Environment Variables

Ensure all production environment variables are set:

- `DATABASE_URL` - Production PostgreSQL connection
- `OPENAI_API_KEY` - OpenAI API key (for embeddings and chat)
- `GOOGLE_API_KEY` - Google API key (for Gemini CLI code analysis)
- `NODE_ENV=production`

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues and questions, please open a GitHub issue.

