import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const GEMINI_CLI_PATH = process.env.GEMINI_CLI_PATH || 'gemini';

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
`.trim();

  try {
    console.log(`Analyzing codebase at ${repoPath} with Gemini CLI`);

    // Execute gemini-cli with the prompt
    // Assuming gemini-cli accepts: gemini -p "prompt" path/to/code
    const command = `cd "${repoPath}" && ${GEMINI_CLI_PATH} -p "${prompt}" -o "json"`;

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000, // 5 minute timeout
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

