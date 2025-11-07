import { OpenAIEmbeddings } from '@langchain/openai';
import { query } from './db';
import { Document } from './types';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small', // 1536 dimensions
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
});

/**
 * Generate embeddings for a given text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embedding = await embeddings.embedQuery(text);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Save document chunks with embeddings to the database
 */
export async function saveDocuments(
  repositoryId: string,
  chunks: { content: string; metadata?: Record<string, any> }[]
): Promise<string[]> {
  const documentIds: string[] = [];

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);
      const id = uuidv4();

      await query(
        `INSERT INTO documents (id, repository_id, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          repositoryId,
          chunk.content,
          JSON.stringify(chunk.metadata || {}),
          `[${embedding.join(',')}]`,
        ]
      );

      documentIds.push(id);
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  return documentIds;
}

/**
 * Perform similarity search across documents
 */
export async function similaritySearch(
  queryText: string,
  options?: {
    repositoryIds?: string[];
    limit?: number;
    threshold?: number;
  }
): Promise<Document[]> {
  const { repositoryIds, limit = 5, threshold = 0.5 } = options || {};

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(queryText);

    // Build query with optional repository filter
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

    if (repositoryIds && repositoryIds.length > 0) {
      sql += ` WHERE d.repository_id = ANY($2)`;
      params.push(repositoryIds);
    }

    sql += `
      ORDER BY d.embedding <=> $1
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await query(sql, params);

    return result.rows.filter((row) => row.similarity >= threshold);
  } catch (error) {
    console.error('Error performing similarity search:', error);
    throw error;
  }
}

/**
 * Delete a specific document by ID
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await query('DELETE FROM documents WHERE id = $1', [documentId]);
}

/**
 * Get all documents for a repository
 */
export async function getDocumentsByRepository(
  repositoryId: string
): Promise<Document[]> {
  const result = await query(
    'SELECT id, repository_id, content, metadata, created_at FROM documents WHERE repository_id = $1 ORDER BY created_at DESC',
    [repositoryId]
  );

  return result.rows;
}

/**
 * Delete all documents for a repository
 */
export async function deleteDocumentsByRepository(
  repositoryId: string
): Promise<void> {
  await query('DELETE FROM documents WHERE repository_id = $1', [repositoryId]);
}

