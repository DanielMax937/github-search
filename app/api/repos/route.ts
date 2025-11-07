import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT id, name, url, description, analysis_en, analysis_zh, created_at, updated_at 
       FROM repositories 
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      repositories: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching repositories:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch repositories',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

