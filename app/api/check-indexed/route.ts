import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    // Query database to check which URLs are already indexed
    const indexedResult = await query(
      `SELECT url FROM repositories WHERE url = ANY($1::text[])`,
      [urls]
    );

    const indexedUrls = new Set(indexedResult.rows.map((row: any) => row.url));

    // Query blocked repositories
    const blockedResult = await query(
      `SELECT url FROM blocked_repositories WHERE url = ANY($1::text[])`,
      [urls]
    );

    const blockedUrls = new Set(blockedResult.rows.map((row: any) => row.url));

    // Return which URLs are indexed and which are not
    const urlsStatus = urls.map(url => ({
      url,
      isIndexed: indexedUrls.has(url),
      isBlocked: blockedUrls.has(url),
    }));

    return NextResponse.json({
      urlsStatus,
      indexedCount: indexedUrls.size,
      unindexedCount: urls.length - indexedUrls.size,
    });
  } catch (error: any) {
    console.error('Error checking indexed repos:', error);

    return NextResponse.json(
      {
        error: 'Failed to check indexed repositories',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
