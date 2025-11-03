import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentChunk } from './types';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Split text into chunks for embedding
 */
export async function splitTextIntoChunks(
  text: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }
): Promise<DocumentChunk[]> {
  const { chunkSize = 1000, chunkOverlap = 200 } = options || {};

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.createDocuments([text]);

  return chunks.map((chunk, index) => ({
    content: chunk.pageContent,
    metadata: {
      ...chunk.metadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));
}

/**
 * Generate RAG response using Gemini
 */
export async function generateRAGResponse(
  query: string,
  context: string[]
): Promise<AsyncGenerator<string, void, unknown>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a helpful AI assistant that answers questions based on the provided context from indexed GitHub repositories.

Context from repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User Question: ${query}

Instructions:
- Answer the question based solely on the provided context
- If the context doesn't contain relevant information, say so
- Be concise but thorough
- Reference specific parts of the context when relevant
- If multiple repositories are relevant, mention which ones

Answer:
`.trim();

  try {
    const result = await model.generateContentStream(prompt);

    async function* streamGenerator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield text;
      }
    }

    return streamGenerator();
  } catch (error) {
    console.error('Error generating RAG response:', error);
    throw error;
  }
}

/**
 * Generate a non-streaming RAG response
 */
export async function generateRAGResponseSync(
  query: string,
  context: string[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a helpful AI assistant that answers questions based on the provided context from indexed GitHub repositories.

Context from repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User Question: ${query}

Instructions:
- Answer the question based solely on the provided context
- If the context doesn't contain relevant information, say so
- Be concise but thorough
- Reference specific parts of the context when relevant

Answer:
`.trim();

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating RAG response:', error);
    throw error;
  }
}

