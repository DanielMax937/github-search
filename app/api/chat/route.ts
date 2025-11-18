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
    const searchScope = repositoryIds && repositoryIds.length > 0 
      ? `${repositoryIds.length} selected repositories`
      : 'all repositories';
    console.log(`Performing similarity search in ${searchScope}...`);
    
    const relevantDocs = await similaritySearch(translatedText, {
      repositoryIds: repositoryIds && repositoryIds.length > 0 ? repositoryIds : undefined,
      limit: 5,
      threshold: 0.1,
    });

    if (relevantDocs.length === 0) {
      const errorMessage = repositoryIds && repositoryIds.length > 0
        ? 'No relevant context found in the selected repositories. Try selecting different repositories or rephrasing your question.'
        : 'No relevant context found. Please index at least one repository first.';
      
      return new Response(
        JSON.stringify({
          error: errorMessage,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract context from documents with repository information
    const context = relevantDocs.map((doc) => {
      const repoName = doc.repository_name || 'Unknown Repository';
      const repoUrl = doc.repository_url || '';
      return `Repository: ${repoName}\nURL: ${repoUrl}\n\n${doc.content}`;
    });

    // Step 3: Generate RAG response and translate back if needed
    console.log('Generating RAG response...');
    const stream = await generateRAGResponseWithTranslation(
      translatedText,
      context,
      originalLanguage
    );

    // Create a ReadableStream for SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata as first event
          const metadata = {
            originalLanguage,
            wasTranslated,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'metadata', data: metadata })}\n\n`)
          );

          // Stream content chunks
          for await (const chunk of stream) {
            const data = {
              type: 'content',
              data: chunk,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = {
            type: 'error',
            data: error instanceof Error ? error.message : 'Unknown error',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in nginx
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

