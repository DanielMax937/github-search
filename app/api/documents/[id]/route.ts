import { NextRequest, NextResponse } from 'next/server';
import { deleteDocument } from '@/lib/vector-store';
import { query } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // Verify document exists
    const result = await query('SELECT id FROM documents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    await deleteDocument(id);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete document',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

