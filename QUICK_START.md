# Quick Start Guide

Get up and running with GitHub Repository Analyzer in 10 minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ installed and running
- [ ] pgvector extension available
- [ ] Gemini CLI installed (`npm install -g @google/generative-ai-cli`)
- [ ] Google API Key obtained

## 6-Step Setup

### Step 1: Install Dependencies (2 min)

```bash
cd /Users/daniel/Desktop/github-search
npm install
```

### Step 2: Install pgvector Extension (2 min)

**This is required before creating the database!**

```bash
# macOS (Homebrew)
brew install pgvector

# Verify installation
ls /opt/homebrew/share/postgresql@*/extension/vector.control
```

If you see the `vector.control` file listed, you're good to go!

### Step 3: Database Setup (3 min)

```bash
# Create database
createdb github_search

# Test connection
psql github_search

# Exit psql
\q
```

### Step 4: Configure Environment (1 min)

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Minimal `.env`:
```env
DATABASE_URL=postgresql://localhost:5432/github_search
GOOGLE_API_KEY=your_actual_api_key_here
```

### Step 5: Run Migrations (1 min)

```bash
npm run db:migrate
```

Expected output:
```
Connected to database
Migration completed successfully
```

**Note:** The migration script is idempotent - it's safe to run multiple times. If it was partially run before, it will complete successfully.

### Step 6: Start Application (1 min)

```bash
npm run dev
```

Visit: http://localhost:3000

## First Test (2 min)

1. Go to http://localhost:3000
2. Enter: `https://github.com/vercel/next.js`
3. Click "Index Repository"
4. Wait ~3-5 minutes
5. Go to "Repositories" tab
6. Select the repo
7. Ask: "What is this project?"

**Note:** During indexing, the repository is cloned to `.temp/` in your project root and automatically cleaned up afterward.

## Troubleshooting

### pgvector Extension Missing

**Error:** `could not open extension control file ".../extension/vector.control"`

**Solution:**
```bash
# Install pgvector
brew install pgvector

# Verify installation
ls /opt/homebrew/share/postgresql@*/extension/vector.control

# Then retry migration
npm run db:migrate
```

### Trigger Already Exists Error

**Error:** `trigger "update_repositories_updated_at" for relation "repositories" already exists`

**Cause:** Migration was partially run before.

**Solution:** This is now fixed! The migration script is idempotent. Just run it again:
```bash
npm run db:migrate
```

Your database is likely already set up correctly. You can verify with:
```bash
psql github_search -c "\dx"  # Should show 'vector' extension
psql github_search -c "\dt"  # Should show 'repositories' and 'documents' tables
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready

# If not, start it
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

### Gemini CLI Not Found

```bash
# Install globally
npm install -g @google/generative-ai-cli

# Verify
which gemini
```

### Port 3000 In Use

```bash
# Use different port
PORT=3001 npm run dev
```

### pgvector Extension Missing

```bash
psql github_search
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

## Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build
npm start

# Run migrations
npm run db:migrate

# Lint
npm run lint
```

## Project Structure

```
github-search/
├── app/              # Next.js pages and API routes
├── lib/              # Core utilities
├── components/       # React components
├── migrations/       # Database migrations
└── scripts/          # Helper scripts
```

## Key Files

- `app/page.tsx` - Index page (submit GitHub URL)
- `app/repos/page.tsx` - Repos list + chat interface
- `app/api/index/route.ts` - Indexing API
- `app/api/chat/route.ts` - RAG chat API
- `lib/vector-store.ts` - Vector operations
- `lib/gemini-cli.ts` - Gemini integration

## API Endpoints

```
POST   /api/index              # Index repository
POST   /api/chat               # RAG chat
GET    /api/repos              # List repositories
GET    /api/repos/[id]         # Get repository
PUT    /api/repos/[id]         # Update repository
DELETE /api/repos/[id]         # Delete repository
POST   /api/repos/[id]/documents    # Add document
DELETE /api/documents/[id]     # Delete document
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_API_KEY` - Google Gemini API key

Optional:
- `GEMINI_CLI_PATH` - Custom path to Gemini CLI (default: `gemini`)
- `NODE_ENV` - Environment (development/production)

## Tips

1. **Indexing Speed**: Larger repos take longer (3-10 min)
2. **Multiple Repos**: Select multiple for comprehensive answers
3. **Document Addition**: Add custom context for better results
4. **Chunk Management**: View/delete chunks in edit page
5. **Chat History**: Persists during session

## Example Questions

After indexing a repository, try:

- "What is this project about?"
- "What technologies are used?"
- "How does authentication work?"
- "Explain the database schema"
- "What are the main features?"
- "How do I get started?"

## Performance Tips

1. Index smaller repos first to test
2. Select specific repos instead of all
3. Ask focused questions for better answers
4. Clear old repos you no longer need

## Next Steps

- Read [README.md](README.md) for full documentation
- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup
- Check [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for technical details

## Support

If you encounter issues:

1. Check error messages in terminal
2. Verify all prerequisites are installed
3. Check database connection
4. Verify API key is valid
5. Review logs for details

## Production Deployment

For production use:

```bash
# Build
npm run build

# Set production env
export NODE_ENV=production
export DATABASE_URL="postgresql://..."

# Start
npm start
```

Consider:
- Use managed PostgreSQL (AWS RDS, Heroku Postgres, etc.)
- Add authentication
- Implement rate limiting
- Use process manager (PM2)
- Set up monitoring

---

**You're Ready!** Start indexing repositories and chatting with your codebase. 🚀

