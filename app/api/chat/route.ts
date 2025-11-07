import { NextRequest } from 'next/server';
import { similaritySearch } from '@/lib/vector-store';
import { generateRAGResponse, generateRAGResponseWithTranslation } from '@/lib/langchain-utils';
import { translateToEnglish, getLanguageName } from '@/lib/translation';

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

    // Step 1: Translate question to English
    console.log('Translating question to English...');
    const { translatedText, originalLanguage, wasTranslated } = await translateToEnglish(message);
    
    if (wasTranslated) {
      console.log(`Detected language: ${getLanguageName(originalLanguage)}`);
      console.log(`Translated question: ${translatedText}`);
    }

    // Step 2: Perform similarity search with English query
    console.log('Performing similarity search with English query...');
    const relevantDocs = await similaritySearch(translatedText, {
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

    // Step 3: Generate RAG response and translate back if needed
    console.log('Generating RAG response...');
    const stream = await generateRAGResponseWithTranslation(
      translatedText,
      context,
      originalLanguage
    );

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
        'X-Original-Language': originalLanguage,
        'X-Was-Translated': wasTranslated.toString(),
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

