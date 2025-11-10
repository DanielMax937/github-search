import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidGitRepository, getRemoteUrl, extractRepoNameFromPath } from '@/lib/git-operations';
import { analyzeCodbaseWithGemini } from '@/lib/gemini-cli';
import { splitTextIntoChunks } from '@/lib/langchain-utils';
import { saveDocuments } from '@/lib/vector-store';
import { translateFromEnglish } from '@/lib/translation';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localPath } = body;

    // Validate input
    if (!localPath || typeof localPath !== 'string') {
      return NextResponse.json(
        { error: 'Local path is required' },
        { status: 400 }
      );
    }

    // Step 1: Validate local path is a git repository
    console.log('Step 1: Validating local git repository...');
    const isValid = await isValidGitRepository(localPath);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid git repository. Make sure the path exists and contains a .git directory' },
        { status: 400 }
      );
    }

    // Step 2: Extract repository information
    console.log('Step 2: Extracting repository information...');
    let repoUrl: string;
    try {
      repoUrl = await getRemoteUrl(localPath);
      console.log(`Found remote URL: ${repoUrl}`);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Could not find remote URL for this repository. Make sure it has a remote configured.' },
        { status: 400 }
      );
    }

    const repoName = extractRepoNameFromPath(localPath);

    // Check if repository already exists
    const existingRepo = await query(
      'SELECT id FROM repositories WHERE url = $1',
      [repoUrl]
    );

    if (existingRepo.rows.length > 0) {
      return NextResponse.json(
        { error: 'Repository already indexed' },
        { status: 409 }
      );
    }

    // Step 3: Analyze with Gemini CLI (using local path directly)
    console.log('Step 3: Analyzing codebase with Gemini CLI...');
    const analysisResult = await analyzeCodbaseWithGemini(localPath);

    if (!analysisResult || analysisResult.trim().length === 0) {
      throw new Error('Gemini analysis returned empty result');
    }

    // Step 4: Translate analysis to Chinese
    console.log('Step 4: Translating analysis to Chinese...');
    const analysisZh = await translateFromEnglish(analysisResult, 'Chinese');
    console.log('Translation to Chinese completed');

    // Step 5: Chunk the analysis
    console.log('Step 5: Chunking document...');
    const chunks = await splitTextIntoChunks(analysisResult, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    if (chunks.length === 0) {
      throw new Error('Document chunking produced no results');
    }

    // Step 6: Create repository record with both English and Chinese analysis
    console.log('Step 6: Creating repository record...');
    const repositoryId = uuidv4();

    await query(
      `INSERT INTO repositories (id, name, url, description, analysis_en, analysis_zh)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [repositoryId, repoName, repoUrl, 'Analyzed by Gemini AI from local repository', analysisResult, analysisZh]
    );

    // Step 7: Save chunks with embeddings
    console.log('Step 7: Generating embeddings and saving documents...');
    const documentIds = await saveDocuments(repositoryId, chunks);

    return NextResponse.json({
      success: true,
      repositoryId,
      message: `Successfully indexed local repository "${repoName}"`,
      stats: {
        chunks: chunks.length,
        documents: documentIds.length,
      },
    });
  } catch (error: any) {
    console.error('Error indexing local repository:', error);

    return NextResponse.json(
      {
        error: 'Failed to index local repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

