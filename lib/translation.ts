import { ChatOpenAI } from '@langchain/openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const translationModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o',
  temperature: 0.3, // Lower temperature for more consistent translations
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
});

/**
 * Detect the language of the input text and translate to English if needed
 */
export async function translateToEnglish(
  text: string
): Promise<{ translatedText: string; originalLanguage: string; wasTranslated: boolean }> {
  try {
    const prompt = `Detect the language of the following text and translate it to English if it's not already in English.

Text: "${text}"

Respond in this exact JSON format:
{
  "language": "language name (e.g., English, Chinese, Spanish, French, etc.)",
  "languageCode": "ISO language code (e.g., en, zh, es, fr, etc.)",
  "isEnglish": true or false,
  "translatedText": "the text in English (or original if already English)"
}

Only respond with valid JSON, no additional text.`;

    const response = await translationModel.invoke(prompt);
    const content = response.content as string;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If translation fails, assume English and return original
      return {
        translatedText: text,
        originalLanguage: 'en',
        wasTranslated: false,
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      translatedText: result.translatedText,
      originalLanguage: result.languageCode || 'en',
      wasTranslated: !result.isEnglish,
    };
  } catch (error) {
    console.error('Error in translation to English:', error);
    // Fallback: assume English and return original text
    return {
      translatedText: text,
      originalLanguage: 'en',
      wasTranslated: false,
    };
  }
}

/**
 * Translate text from English to target language
 */
export async function translateFromEnglish(
  text: string,
  targetLanguage: string
): Promise<string> {
  // If target is English, return as-is
  if (targetLanguage === 'en' || targetLanguage === 'English') {
    return text;
  }

  try {
    const prompt = `Translate the following English text to ${targetLanguage}.
Keep the formatting, technical terms, and code snippets intact.

Text to translate:
${text}

Respond with ONLY the translated text, no explanations or additional commentary.`;

    const response = await translationModel.invoke(prompt);
    return response.content as string;
  } catch (error) {
    console.error('Error translating from English:', error);
    // Fallback: return original English text
    return text;
  }
}

/**
 * Get language name from language code
 */
export function getLanguageName(languageCode: string): string {
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

  return languageMap[languageCode] || languageCode;
}

