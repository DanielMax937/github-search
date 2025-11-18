import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { extractRepoName, isValidGitHubUrl } from '@/lib/git-operations';
import { splitTextIntoChunks } from '@/lib/langchain-utils';
import { saveDocuments } from '@/lib/vector-store';
import { fetchAllDocumentation } from '@/lib/playwright-scraper';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, docsUrl, name, description, maxPages, useJinaAi, language } = body;

    // Validate input
    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    if (!docsUrl || typeof docsUrl !== 'string') {
      return NextResponse.json(
        { error: 'Documentation URL is required' },
        { status: 400 }
      );
    }

    if (!isValidGitHubUrl(repoUrl)) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format' },
        { status: 400 }
      );
    }

    // Validate language
    const docLanguage = language === 'chinese' ? 'chinese' : 'english';
    console.log(`Documentation language: ${docLanguage}`);

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

    // Step 1: Extract repository name
    console.log('Step 1: Processing repository information...');
    const repoName = name && name.trim() ? name.trim() : extractRepoName(repoUrl);

    // Step 2: Fetch documentation content using Playwright
    console.log('Step 2: Fetching documentation from URL...');
    console.log(`Using Jina.ai: ${useJinaAi ? 'Yes' : 'No'}`);
    const documentContent = await fetchAllDocumentation(docsUrl, maxPages || 50, useJinaAi || false);

    if (!documentContent || documentContent.trim().length === 0) {
      throw new Error('No content could be fetched from the documentation URL');
    }

    console.log(`Fetched ${documentContent.length} characters of documentation`);

    // Step 3: Chunk the fetched document
    console.log('Step 3: Chunking document...');
    const chunks = await splitTextIntoChunks(documentContent, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    if (chunks.length === 0) {
      throw new Error('Document chunking produced no results');
    }

    // Step 4: Create repository record with language-specific analysis field
    console.log('Step 4: Creating repository record...');
    const repositoryId = uuidv4();
    const repoDescription = description && description.trim() 
      ? description.trim() 
      : 'Indexed from documentation URL';

    // Store documentation in language-specific field
    if (docLanguage === 'chinese') {
      await query(
        `INSERT INTO repositories (id, name, url, description, analysis_zh)
         VALUES ($1, $2, $3, $4, $5)`,
        [repositoryId, repoName, repoUrl, repoDescription, documentContent]
      );
      console.log('Documentation stored in analysis_zh field');
    } else {
      await query(
        `INSERT INTO repositories (id, name, url, description, analysis_en)
         VALUES ($1, $2, $3, $4, $5)`,
        [repositoryId, repoName, repoUrl, repoDescription, documentContent]
      );
      console.log('Documentation stored in analysis_en field');
    }

    // Step 5: Save chunks with embeddings
    console.log('Step 5: Generating embeddings and saving documents...');
    const documentIds = await saveDocuments(repositoryId, chunks);

    return NextResponse.json({
      success: true,
      repositoryId,
      message: `Successfully indexed repository "${repoName}" from documentation`,
      stats: {
        chunks: chunks.length,
        documents: documentIds.length,
      },
    });
  } catch (error: any) {
    console.error('Error indexing repository from documentation URL:', error);

    return NextResponse.json(
      {
        error: 'Failed to index repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

