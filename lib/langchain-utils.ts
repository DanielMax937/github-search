import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI } from '@langchain/openai';
import { DocumentChunk } from './types';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o', // Fast and cost-effective
  temperature: 0.7,
  streaming: true,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
});

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
 * Generate RAG response using OpenAI
 */
export async function generateRAGResponse(
  query: string,
  context: string[]
): Promise<AsyncGenerator<string, void, unknown>> {
  const prompt = `You are a helpful AI assistant that answers questions based on the provided context from indexed GitHub repositories.

Context from repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User Question: ${query}

Instructions:
- Answer the question based solely on the provided context
- If the context doesn't contain relevant information, say so
- Be concise but thorough
- Reference specific parts of the context when relevant
- If multiple repositories are relevant, mention which ones

Answer:`;

  try {
    const stream = await chatModel.stream(prompt);

    async function* streamGenerator() {
      for await (const chunk of stream) {
        const text = chunk.content;
        if (typeof text === 'string') {
          yield text;
        }
      }
    }

    return streamGenerator();
  } catch (error) {
    console.error('Error generating RAG response:', error);
    throw error;
  }
}

/**
 * Generate RAG response with translation support
 */
export async function generateRAGResponseWithTranslation(
  query: string,
  context: string[],
  targetLanguage: string = 'en'
): Promise<AsyncGenerator<string, void, unknown>> {
  const languageInstruction = targetLanguage === 'en' 
    ? '' 
    : `\n\nIMPORTANT: You must respond in ${getLanguageNameFromCode(targetLanguage)}. Translate your entire answer to ${getLanguageNameFromCode(targetLanguage)} while keeping technical terms and code snippets in their original form.`;

  const prompt = `You are a helpful AI assistant that answers questions based on the provided context from indexed GitHub repositories.

Context from repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User Question (in English): ${query}

Instructions:
- Answer the question based solely on the provided context
- If the context doesn't contain relevant information, say so
- Be concise but thorough
- Reference specific parts of the context when relevant
- If multiple repositories are relevant, mention which ones${languageInstruction}

Answer:`;

  try {
    const stream = await chatModel.stream(prompt);

    async function* streamGenerator() {
      for await (const chunk of stream) {
        const text = chunk.content;
        if (typeof text === 'string') {
          yield text;
        }
      }
    }

    return streamGenerator();
  } catch (error) {
    console.error('Error generating RAG response with translation:', error);
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
  const prompt = `You are a helpful AI assistant that answers questions based on the provided context from indexed GitHub repositories.

Context from repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User Question: ${query}

Instructions:
- Answer the question based solely on the provided context
- If the context doesn't contain relevant information, say so
- Be concise but thorough
- Reference specific parts of the context when relevant

Answer:`;

  try {
    const response = await chatModel.invoke(prompt);
    return response.content as string;
  } catch (error) {
    console.error('Error generating RAG response:', error);
    throw error;
  }
}

/**
 * Get language name from language code
 */
function getLanguageNameFromCode(languageCode: string): string {
  const languageMap: Record<string, string> = {
    en: 'English',
    zh: 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Russian',
    ar: 'Arabic',
    pt: 'Portuguese',
    it: 'Italian',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
    vi: 'Vietnamese',
    th: 'Thai',
    hi: 'Hindi',
  };

  return languageMap[languageCode] || 'English';
}

