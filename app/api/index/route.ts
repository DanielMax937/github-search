import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cloneRepository, cleanupTempDir, extractRepoName, isValidGitHubUrl, cleanupOldTempDirs } from '@/lib/git-operations';
import { analyzeCodbaseWithGemini } from '@/lib/gemini-cli';
import { splitTextIntoChunks } from '@/lib/langchain-utils';
import { saveDocuments } from '@/lib/vector-store';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    // Clean up old temporary directories before starting
    await cleanupOldTempDirs();

    const body = await request.json();
    const { url } = body;

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Repository URL is required' },
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

    // Step 1: Clone the repository
    console.log('Step 1: Cloning repository...');
    tempDir = await cloneRepository(url);

    // Step 2: Analyze with Gemini CLI
    console.log('Step 2: Analyzing codebase with Gemini CLI...');
    const analysisResult = await analyzeCodbaseWithGemini(tempDir);

    if (!analysisResult || analysisResult.trim().length === 0) {
      throw new Error('Gemini analysis returned empty result');
    }

    // Step 3: Chunk the analysis
    console.log('Step 3: Chunking document...');
    const chunks = await splitTextIntoChunks(analysisResult, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    if (chunks.length === 0) {
      throw new Error('Document chunking produced no results');
    }

    // Step 4: Create repository record
    console.log('Step 4: Creating repository record...');
    const repositoryId = uuidv4();
    const repoName = extractRepoName(url);

    await query(
      `INSERT INTO repositories (id, name, url, description)
       VALUES ($1, $2, $3, $4)`,
      [repositoryId, repoName, url, 'Analyzed by Gemini AI']
    );

    // Step 5: Save chunks with embeddings
    console.log('Step 5: Generating embeddings and saving documents...');
    const documentIds = await saveDocuments(repositoryId, chunks);

    // Step 6: Cleanup
    console.log('Step 6: Cleaning up temporary files...');
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }

    return NextResponse.json({
      success: true,
      repositoryId,
      message: `Successfully indexed repository "${repoName}"`,
      stats: {
        chunks: chunks.length,
        documents: documentIds.length,
      },
    });
  } catch (error: any) {
    console.error('Error indexing repository:', error);

    // Cleanup on error
    if (tempDir) {
      try {
        await cleanupTempDir(tempDir);
      } catch (cleanupError) {
        console.error('Error cleaning up on failure:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to index repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

