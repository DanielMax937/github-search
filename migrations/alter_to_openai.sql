-- Migration script to switch from Gemini (768d) to OpenAI (1536d) embeddings
-- Run this ONLY if you already have an existing database with Gemini embeddings

-- WARNING: This will delete all existing documents and their embeddings
-- Make sure to re-index your repositories after running this migration

BEGIN;

-- Drop the existing index on embeddings
DROP INDEX IF EXISTS idx_documents_embedding;

-- Delete all existing documents (they have 768d embeddings)
DELETE FROM documents;

-- Alter the embedding column to use 1536 dimensions
ALTER TABLE documents 
  ALTER COLUMN embedding TYPE vector(1536);

-- Recreate the index with the new dimension
CREATE INDEX idx_documents_embedding 
  ON documents 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

COMMIT;

-- After running this migration, you need to re-index all your repositories
-- Go to the app and index them again with the new OpenAI embeddings

