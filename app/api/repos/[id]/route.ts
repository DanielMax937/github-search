import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    const result = await query(
      `SELECT id, name, url, description, analysis_en, analysis_zh, created_at, updated_at 
       FROM repositories 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching repository:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, url, description } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(url);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    const result = await query(
      `UPDATE repositories 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, name, url, description, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating repository:', error);

    return NextResponse.json(
      {
        error: 'Failed to update repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // Step 1: Check if repository exists and get info
    const repoCheck = await query(
      'SELECT id, name FROM repositories WHERE id = $1',
      [id]
    );

    if (repoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    const repoName = repoCheck.rows[0].name;

    // Step 2: Count documents to be deleted
    const docCount = await query(
      'SELECT COUNT(*) as count FROM documents WHERE repository_id = $1',
      [id]
    );

    const documentsCount = parseInt(docCount.rows[0].count);
    console.log(`Deleting repository "${repoName}" (${id}) with ${documentsCount} documents`);

    // Step 3: Delete the repository (CASCADE will automatically delete documents)
    const result = await query(
      'DELETE FROM repositories WHERE id = $1 RETURNING id',
      [id]
    );

    console.log(`Successfully deleted repository "${repoName}" and ${documentsCount} associated documents`);

    return NextResponse.json({
      success: true,
      message: `Repository "${repoName}" deleted successfully`,
      stats: {
        documentsDeleted: documentsCount,
      },
    });
  } catch (error: any) {
    console.error('Error deleting repository:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

