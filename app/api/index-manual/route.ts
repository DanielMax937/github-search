import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { extractRepoName, isValidGitHubUrl } from '@/lib/git-operations';
import { splitTextIntoChunks } from '@/lib/langchain-utils';
import { saveDocuments } from '@/lib/vector-store';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, document, name, description } = body;

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    if (!document || typeof document !== 'string' || document.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }

    if (!isValidGitHubUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format' },
        { status: 400 }
      );
    }

    // Check if repository already exists
    const existingRepo = await query(
      'SELECT id FROM repositories WHERE url = $1',
      [url]
    );

    if (existingRepo.rows.length > 0) {
      return NextResponse.json(
        { error: 'Repository already indexed' },
        { status: 409 }
      );
    }

    // Step 1: Extract repository name
    console.log('Step 1: Processing repository information...');
    const repoName = name && name.trim() ? name.trim() : extractRepoName(url);

    // Step 2: Chunk the provided document
    console.log('Step 2: Chunking document...');
    const chunks = await splitTextIntoChunks(document, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    if (chunks.length === 0) {
      throw new Error('Document chunking produced no results');
    }

    // Step 3: Create repository record (without Gemini analysis)
    console.log('Step 3: Creating repository record...');
    const repositoryId = uuidv4();
    const repoDescription = description && description.trim() 
      ? description.trim() 
      : 'Manually indexed with custom documents';

    await query(
      `INSERT INTO repositories (id, name, url, description)
       VALUES ($1, $2, $3, $4)`,
      [repositoryId, repoName, url, repoDescription]
    );

    // Step 4: Save chunks with embeddings
    console.log('Step 4: Generating embeddings and saving documents...');
    const documentIds = await saveDocuments(repositoryId, chunks);

    return NextResponse.json({
      success: true,
      repositoryId,
      message: `Successfully indexed repository "${repoName}" with manual documents`,
      stats: {
        chunks: chunks.length,
        documents: documentIds.length,
      },
    });
  } catch (error: any) {
    console.error('Error indexing repository with manual documents:', error);

    return NextResponse.json(
      {
        error: 'Failed to index repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

