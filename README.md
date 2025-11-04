# GitHub Repository Analyzer

A powerful Next.js application that indexes GitHub repositories using AI and enables intelligent chat interactions through Retrieval-Augmented Generation (RAG).

## 🌟 Features

- **🔍 Repository Indexing**: Clone and analyze any GitHub repository using Gemini AI
- **💬 RAG Chat Interface**: Ask questions about indexed repositories with AI-powered responses
- **📚 Document Management**: Add, view, and delete document chunks for each repository
- **🎯 Multi-Repository Search**: Query across multiple repositories simultaneously
- **⚡ Streaming Responses**: Real-time streaming chat responses for better UX
- **🗄️ Vector Search**: Efficient similarity search using PostgreSQL with pgvector

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling

### Backend & AI
- **LangChain.js** for document processing and embeddings
- **Google Gemini AI** for code analysis and chat
- **PostgreSQL with pgvector** for vector storage
- **simple-git** for repository cloning

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn
- **PostgreSQL 15+** with pgvector extension
- **Gemini CLI** (`gemini`) - [Installation guide](https://github.com/google/gemini-cli)
- **Google API Key** for Gemini API access

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
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_CLI_PATH=gemini
NODE_ENV=development
```

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
- Repository is cloned to a temporary directory
- Gemini CLI analyzes the entire codebase
- Output is chunked and embedded using LangChain
- Chunks are stored in the vector database

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
- `GOOGLE_API_KEY` - Google API key
- `NODE_ENV=production`

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues and questions, please open a GitHub issue.

