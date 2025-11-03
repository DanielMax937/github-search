# Setup Guide - GitHub Repository Analyzer

This guide will walk you through setting up the GitHub Repository Analyzer from scratch.

## Part 1: System Prerequisites

### 1. Install Node.js (v18 or higher)

**macOS:**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

### 2. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 3. Install pgvector Extension

**macOS:**
```bash
brew install pgvector
```

**Ubuntu/Debian:**
```bash
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**From Source (All Platforms):**
```bash
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

### 4. Install Gemini CLI

Follow the official Gemini CLI installation instructions:

```bash
# Using npm (recommended)
npm install -g @google/generative-ai-cli

# Or download binary from GitHub
# https://github.com/google/generative-ai-cli
```

Verify installation:
```bash
gemini --version
```

## Part 2: Database Setup

### 1. Create PostgreSQL User and Database

```bash
# Connect to PostgreSQL
psql postgres

# Create user (replace with your desired credentials)
CREATE USER github_user WITH PASSWORD 'your_secure_password';

# Create database
CREATE DATABASE github_search OWNER github_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE github_search TO github_user;

# Exit psql
\q
```

### 2. Test Database Connection

```bash
psql -U github_user -d github_search -h localhost
```

If successful, you'll see the PostgreSQL prompt.

## Part 3: Google API Setup

### 1. Get Google API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the generated API key
5. Store it securely (you'll need it for `.env`)

## Part 4: Application Setup

### 1. Install Project Dependencies

```bash
cd /Users/daniel/Desktop/github-search
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

### 3. Edit `.env` File

```bash
nano .env  # or use your preferred editor
```

Add your actual credentials:

```env
# Database Connection
DATABASE_URL=postgresql://github_user:your_secure_password@localhost:5432/github_search

# Google Gemini API
GOOGLE_API_KEY=AIzaSy...your_actual_api_key_here

# Gemini CLI Path (leave default if installed globally)
GEMINI_CLI_PATH=gemini

# Environment
NODE_ENV=development
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

### 4. Run Database Migrations

```bash
npm run db:migrate
```

You should see:
```
Connected to database
Migration completed successfully
```

### 5. Verify Database Schema

```bash
psql -U github_user -d github_search -h localhost
```

Check tables:
```sql
\dt

-- Should show:
-- repositories
-- documents

\d repositories
\d documents

\q
```

## Part 5: Start the Application

### 1. Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.5s
```

### 2. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## Part 6: Test the Application

### Test 1: Index a Repository

1. Go to home page
2. Enter a test repository URL: `https://github.com/vercel/next.js`
3. Click "Index Repository"
4. Wait for completion (may take 3-5 minutes)

### Test 2: Chat with Repository

1. Go to Repositories page (`/repos`)
2. Select the indexed repository
3. Ask: "What is this project about?"
4. Verify you get a response

### Test 3: Document Management

1. Click edit icon on a repository
2. Add a new document: "This is additional context about the project"
3. Verify it appears in the document list
4. Try deleting a document chunk

## Part 7: Troubleshooting

### Issue: "Gemini CLI not found"

**Solution:**
```bash
# Check if gemini is in PATH
which gemini

# If not found, install again
npm install -g @google/generative-ai-cli

# Or update .env with full path
GEMINI_CLI_PATH=/usr/local/bin/gemini
```

### Issue: "Database connection failed"

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Test connection manually:
   ```bash
   psql "postgresql://github_user:your_password@localhost:5432/github_search"
   ```

3. Check PostgreSQL logs:
   ```bash
   # macOS
   tail -f /usr/local/var/log/postgresql@15.log
   
   # Ubuntu
   sudo tail -f /var/log/postgresql/postgresql-15-main.log
   ```

### Issue: "pgvector extension not found"

**Solution:**
```bash
psql -U github_user -d github_search

CREATE EXTENSION IF NOT EXISTS vector;
\dx  -- List extensions
```

### Issue: "Google API Key invalid"

**Solutions:**
1. Verify API key in `.env` has no spaces
2. Check key is enabled in Google Cloud Console
3. Try creating a new API key
4. Verify billing is enabled (if required)

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use different port
PORT=3001 npm run dev

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

## Part 8: Production Deployment

### Build for Production

```bash
npm run build
```

### Set Production Environment Variables

```bash
export NODE_ENV=production
export DATABASE_URL="postgresql://user:pass@production-db:5432/github_search"
export GOOGLE_API_KEY="your_production_key"
```

### Start Production Server

```bash
npm start
```

## Part 9: Advanced Configuration

### Customize Chunk Size

Edit `lib/langchain-utils.ts`:

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,      // Increase for larger chunks
  chunkOverlap: 300,    // Increase overlap
});
```

### Use Different Embedding Model

Edit `lib/vector-store.ts`:

```typescript
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: 'models/embedding-001',  // Change model here
});
```

### Configure Connection Pool

Edit `lib/db.ts`:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,                    // Increase pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

## Part 10: Maintenance

### Update Dependencies

```bash
npm update
npm audit fix
```

### Backup Database

```bash
pg_dump -U github_user github_search > backup.sql
```

### Restore Database

```bash
psql -U github_user github_search < backup.sql
```

### Monitor Application

```bash
# Watch logs in development
npm run dev

# In production, use process manager
pm2 start npm --name "github-search" -- start
pm2 logs github-search
```

## 🎉 You're All Set!

Your GitHub Repository Analyzer is now ready to use. Happy coding!

For more information, see the main [README.md](README.md).

