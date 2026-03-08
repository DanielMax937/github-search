import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load .env file explicitly to ensure it overrides system environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

const execAsync = promisify(exec);

const GEMINI_CLI_PATH = process.env.GEMINI_CLI_PATH || 'gemini';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_GEMINI_BASE_URL = process.env.GOOGLE_GEMINI_BASE_URL;

/**
 * Analyze a codebase using gemini-cli in non-interactive mode
 */
export async function analyzeCodbaseWithGemini(
  repoPath: string
): Promise<string> {
  const prompt = `
Analyze this entire codebase and provide a comprehensive overview. 

Please structure your response in two sections:

1. **Project Overview**
   - What is this project?
   - What are the main technologies and frameworks used?
   - What is the overall architecture and structure?
   - What are the key files and directories?

2. **Use Cases**
   - What problems does this project solve?
   - What are the main features and capabilities?
   - What scenarios or "scenes" can this be used for?
   - Who would benefit from using this project?

Be detailed and thorough in your analysis.

Analysis result should be English.
`.trim();

  try {
    console.log(`Analyzing codebase at ${repoPath} with Gemini CLI`);

    // Build environment variables for gemini-cli
    // Start with system environment, then explicitly override with .env values
    const env: Record<string, string> = { ...process.env };
    
    // Force override with .env values to ensure they take precedence over zshrc
    if (GOOGLE_API_KEY) {
      env.GOOGLE_API_KEY = GOOGLE_API_KEY;
      console.log('Using GOOGLE_API_KEY from .env file');
    }
    
    if (GOOGLE_GEMINI_BASE_URL) {
      env.GOOGLE_GEMINI_BASE_URL = GOOGLE_GEMINI_BASE_URL;
      console.log(`Using GOOGLE_GEMINI_BASE_URL from .env file: ${GOOGLE_GEMINI_BASE_URL}`);
    }

    // Execute gemini-cli with the prompt and environment variables
    const command = `cd "${repoPath}" && ${GEMINI_CLI_PATH} -p "${prompt}" -m gemini-3-flash-preview`;

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 900000, // 15 minute timeout
      env, // Pass environment variables with .env overrides
    });

    if (stderr && !stderr.includes('warning')) {
      console.warn('Gemini CLI stderr:', stderr);
    }

    if (!stdout || stdout.trim().length === 0) {
      throw new Error('Gemini CLI returned empty output');
    }

    return stdout.trim();
  } catch (error: any) {
    console.error('Error analyzing codebase with Gemini CLI:', error);
    
    if (error.code === 'ENOENT') {
      throw new Error(
        `Gemini CLI not found at path: ${GEMINI_CLI_PATH}. Please ensure gemini-cli is installed and the path is correct.`
      );
    }

    throw new Error(
      `Failed to analyze codebase: ${error.message}`
    );
  }
}

/**
 * Check if gemini-cli is available
 */
export async function checkGeminiCLI(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`which ${GEMINI_CLI_PATH}`);
    return !!stdout;
  } catch {
    return false;
  }
}

