import simpleGit from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Clone a GitHub repository to a temporary directory
 */
export async function cloneRepository(repoUrl: string): Promise<string> {
  // Use project's .temp directory instead of system temp
  const projectRoot = process.cwd();
  const tempBaseDir = path.join(projectRoot, '.temp');
  const tempDir = path.join(tempBaseDir, `repo-${Date.now()}`);

  try {
    // Ensure .temp directory exists
    await fs.mkdir(tempBaseDir, { recursive: true });
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

/**
 * Clean up old temporary directories (older than 1 hour)
 * Useful for cleanup of failed operations
 */
export async function cleanupOldTempDirs(): Promise<void> {
  try {
    const projectRoot = process.cwd();
    const tempBaseDir = path.join(projectRoot, '.temp');

    // Check if .temp directory exists
    try {
      await fs.access(tempBaseDir);
    } catch {
      // Directory doesn't exist, nothing to clean up
      return;
    }

    const entries = await fs.readdir(tempBaseDir, { withFileTypes: true });
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('repo-')) {
        const dirPath = path.join(tempBaseDir, entry.name);
        const stats = await fs.stat(dirPath);
        
        // Remove directories older than 1 hour
        if (stats.mtimeMs < oneHourAgo) {
          console.log(`Cleaning up old temp directory: ${dirPath}`);
          await fs.rm(dirPath, { recursive: true, force: true });
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old temp directories:', error);
    // Don't throw - this is a best-effort cleanup
  }
}

/**
 * Validate if a local path is a valid git repository
 */
export async function isValidGitRepository(localPath: string): Promise<boolean> {
  try {
    // Check if path exists
    await fs.access(localPath);
    
    // Check if .git directory exists
    const gitDir = path.join(localPath, '.git');
    await fs.access(gitDir);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the remote URL from a local git repository
 */
export async function getRemoteUrl(localPath: string): Promise<string> {
  try {
    const git = simpleGit(localPath);
    const remotes = await git.getRemotes(true);
    
    // Try to find 'origin' remote first
    const origin = remotes.find(remote => remote.name === 'origin');
    if (origin && origin.refs.fetch) {
      return origin.refs.fetch;
    }
    
    // If no origin, return the first remote
    if (remotes.length > 0 && remotes[0].refs.fetch) {
      return remotes[0].refs.fetch;
    }
    
    throw new Error('No remote URL found in repository');
  } catch (error) {
    console.error('Error getting remote URL:', error);
    throw error;
  }
}

/**
 * Extract repository name from local path
 */
export function extractRepoNameFromPath(localPath: string): string {
  // Get the folder name
  const folderName = path.basename(localPath);
  return folderName || 'unknown-repo';
}
