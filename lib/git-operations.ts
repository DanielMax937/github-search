import simpleGit from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Clone a GitHub repository to a temporary directory
 */
export async function cloneRepository(repoUrl: string): Promise<string> {
  const tempDir = path.join(tmpdir(), `repo-${Date.now()}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    const git = simpleGit();

    console.log(`Cloning repository from ${repoUrl} to ${tempDir}`);
    await git.clone(repoUrl, tempDir);

    return tempDir;
  } catch (error) {
    console.error('Error cloning repository:', error);
    // Cleanup on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temp directory:', cleanupError);
    }
    throw error;
  }
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`Cleaned up temporary directory: ${dirPath}`);
  } catch (error) {
    console.error('Error cleaning up temporary directory:', error);
    throw error;
  }
}

/**
 * Extract repository name from URL
 */
export function extractRepoName(repoUrl: string): string {
  // Handle different GitHub URL formats
  // https://github.com/user/repo.git
  // https://github.com/user/repo
  // git@github.com:user/repo.git
  
  const match = repoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback: return last part of URL
  return repoUrl.split('/').pop() || 'unknown-repo';
}

/**
 * Validate GitHub URL
 */
export function isValidGitHubUrl(url: string): boolean {
  const githubRegex = /^(https:\/\/github\.com\/|git@github\.com:)[\w-]+\/[\w.-]+/;
  return githubRegex.test(url);
}

