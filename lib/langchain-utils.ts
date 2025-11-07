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
  const prompt = `You are an expert AI assistant helping developers find the most useful repositories from their indexed collection.

Context from YOUR INDEXED repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User's Task/Question: ${query}

CRITICAL RULES:
- You can ONLY recommend repositories from the context provided above
- These are the ONLY repositories available in the user's database
- DO NOT suggest or mention any external repositories or libraries
- DO NOT recommend repositories from your general knowledge
- ONLY work with what is provided in the context

Your Role:
Help users discover which of THEIR INDEXED repositories would be most useful for their specific needs.

Instructions:
1. **Understand the Task**: Analyze what the user is trying to accomplish
2. **Search the Context**: Look ONLY in the provided context for relevant repositories
3. **Identify Matches**: Find which indexed repositories match their needs
4. **Explain Relevance**: For each matching repository from the context, explain:
   - What the repository does
   - Why it's useful for the user's task
   - Key features or capabilities that match their needs
   - Practical use cases or examples from the context
5. **Provide Recommendations**: 
   - Rank the INDEXED repositories by relevance
   - Suggest which repository to use for what purpose
   - Mention if multiple indexed repositories can work together
6. **Be Practical**: Include code examples from the context when available
7. **Be Honest**: If NONE of the indexed repositories match, say clearly:
   "None of your currently indexed repositories match this need. You may need to index additional repositories."

Format your response with:
- Repository names as markdown links: **[Repository-Name](URL)** - Always include the URL from the context
- Bullet points for key features found in the context
- Code snippets from the context when available
- Actionable recommendations based on indexed repos only

IMPORTANT: Each repository recommendation MUST include its URL as a clickable markdown link.
Example format: **[my-awesome-repo](https://github.com/user/my-awesome-repo)**

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
    : `\n\nIMPORTANT: You must respond in ${getLanguageNameFromCode(targetLanguage)}. Translate your entire answer to ${getLanguageNameFromCode(targetLanguage)} while keeping technical terms, repository names, and code snippets in their original form.`;

  const prompt = `You are an expert AI assistant helping developers find the most useful repositories from their indexed collection.

Context from YOUR INDEXED repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User's Task/Question (in English): ${query}

CRITICAL RULES:
- You can ONLY recommend repositories from the context provided above
- These are the ONLY repositories available in the user's database
- DO NOT suggest or mention any external repositories or libraries
- DO NOT recommend repositories from your general knowledge
- ONLY work with what is provided in the context

Your Role:
Help users discover which of THEIR INDEXED repositories would be most useful for their specific needs.

Instructions:
1. **Understand the Task**: Analyze what the user is trying to accomplish
2. **Search the Context**: Look ONLY in the provided context for relevant repositories
3. **Identify Matches**: Find which indexed repositories match their needs
4. **Explain Relevance**: For each matching repository from the context, explain:
   - What the repository does
   - Why it's useful for the user's task
   - Key features or capabilities that match their needs
   - Practical use cases or examples from the context
5. **Provide Recommendations**: 
   - Rank the INDEXED repositories by relevance
   - Suggest which repository to use for what purpose
   - Mention if multiple indexed repositories can work together
6. **Be Practical**: Include code examples from the context when available
7. **Be Honest**: If NONE of the indexed repositories match, say clearly:
   "None of your currently indexed repositories match this need. You may need to index additional repositories."

Format your response with:
- Repository names as markdown links: **[Repository-Name](URL)** - Always include the URL from the context
- Bullet points for key features found in the context
- Code snippets from the context when available
- Actionable recommendations based on indexed repos only

IMPORTANT: Each repository recommendation MUST include its URL as a clickable markdown link.
Example format: **[my-awesome-repo](https://github.com/user/my-awesome-repo)**${languageInstruction}

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
  const prompt = `You are an expert AI assistant helping developers find the most useful repositories from their indexed collection.

Context from YOUR INDEXED repositories:
${context.map((ctx, i) => `[${i + 1}] ${ctx}`).join('\n\n')}

User's Task/Question: ${query}

CRITICAL RULES:
- You can ONLY recommend repositories from the context provided above
- These are the ONLY repositories available in the user's database
- DO NOT suggest or mention any external repositories or libraries
- DO NOT recommend repositories from your general knowledge
- ONLY work with what is provided in the context

Your Role:
Help users discover which of THEIR INDEXED repositories would be most useful for their specific needs.

Instructions:
1. **Understand the Task**: Analyze what the user is trying to accomplish
2. **Search the Context**: Look ONLY in the provided context for relevant repositories
3. **Identify Matches**: Find which indexed repositories match their needs
4. **Explain Relevance**: For each matching repository, explain what it does, why it's useful, and key features from the context
5. **Provide Recommendations**: Rank the INDEXED repositories by relevance and suggest which to use for what purpose
6. **Be Practical**: Include code examples from the context when available
7. **Be Honest**: If NONE of the indexed repositories match, say: "None of your currently indexed repositories match this need. You may need to index additional repositories."

Format your response with:
- Repository names as markdown links: **[Repository-Name](URL)** - Always include the URL from the context
- Bullet points for key features
- Code snippets when available
- Actionable recommendations based on indexed repos only

IMPORTANT: Each repository recommendation MUST include its URL as a clickable markdown link.
Example format: **[my-awesome-repo](https://github.com/user/my-awesome-repo)**

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

