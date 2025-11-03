import { NextRequest } from 'next/server';
import { similaritySearch } from '@/lib/vector-store';
import { generateRAGResponse } from '@/lib/langchain-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, repositoryIds } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Perform similarity search
    console.log('Performing similarity search...');
    const relevantDocs = await similaritySearch(message, {
      repositoryIds,
      limit: 5,
      threshold: 0.3,
    });

    if (relevantDocs.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No relevant context found in indexed repositories',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract context from documents
    const context = relevantDocs.map((doc) => doc.content);

    // Generate streaming response
    console.log('Generating RAG response...');
    const stream = await generateRAGResponse(message, context);

    // Create a ReadableStream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate response',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

