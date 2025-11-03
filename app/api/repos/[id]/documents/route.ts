import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsByRepository, saveDocuments } from '@/lib/vector-store';
import { splitTextIntoChunks } from '@/lib/langchain-utils';
import { query } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // Verify repository exists
    const repoResult = await query(
      'SELECT id FROM repositories WHERE id = $1',
      [id]
    );

    if (repoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    const documents = await getDocumentsByRepository(id);

    return NextResponse.json({
      documents,
      count: documents.length,
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Verify repository exists
    const repoResult = await query(
      'SELECT id FROM repositories WHERE id = $1',
      [id]
    );

    if (repoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    // Chunk the content
    const chunks = await splitTextIntoChunks(content, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Save documents with embeddings
    const documentIds = await saveDocuments(id, chunks);

    return NextResponse.json({
      success: true,
      message: 'Document added successfully',
      documentIds,
      chunksCreated: chunks.length,
    });
  } catch (error: any) {
    console.error('Error adding document:', error);

    return NextResponse.json(
      {
        error: 'Failed to add document',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

