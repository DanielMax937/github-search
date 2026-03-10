import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO blocked_repositories (url)
      VALUES ($1)
      ON CONFLICT (url) DO NOTHING
      `,
      [url]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error blocking repository:', error);

    return NextResponse.json(
      {
        error: 'Failed to block repository',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

