import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

interface DocumentationLink {
  url: string;
  title: string;
  level?: number; // Track hierarchy level
  parentPath?: string; // Track parent path for hierarchy
}

/**
 * Extract documentation links from a page's navigation/sidebar with hierarchy
 */
export async function extractDocumentationLinks(baseUrl: string): Promise<DocumentationLink[]> {
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log(`Loading page: ${baseUrl}`);
    await page.goto(baseUrl, {waitUntil: 'domcontentloaded'});
    

    // Wait for navigation to be visible
    // await page.waitForTimeout(5000);
    
    // Extract links from navigation/sidebar with hierarchy information
    const links = await page.evaluate(() => {
      const linkElements = document.querySelectorAll(".container-wrapper > div > div.border-r-border > div > ul > li > a");
      const results: { url: string; title: string; level: number }[] = [];
      
      linkElements.forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';
        
        // Filter out empty links, anchors, and external links
        if (href && text && !href.includes('#') && href.startsWith(window.location.origin)) {
          // Calculate hierarchy level from padding or nesting
          const element = link as HTMLElement;
          const paddingLeft = parseInt(element.parentElement?.style.paddingLeft || '0', 10);
          const level = Math.floor(paddingLeft / 12); // Assuming 12px per level
          
          results.push({
            url: href,
            title: text,
            level: level,
          });
        }
      });
      
      // Remove duplicates while keeping first occurrence
      const uniqueLinks = Array.from(
        new Map(results.map(item => [item.url, item])).values()
      );
      
      return uniqueLinks;
    });
    
    console.log(`Found ${links.length} documentation links with hierarchy`);
    
    return links;
  } catch (error) {
    console.error('Error extracting documentation links:', error);
    throw new Error(`Failed to extract documentation links: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Sanitize filename to be filesystem-safe
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\u4e00-\u9fa5\-_]/gi, '-') // Keep alphanumeric, Chinese chars, hyphens, underscores
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}

/**
 * Generate file path from URL and hierarchy level
 */
function generateFilePath(baseDir: string, url: string, title: string, level: number): string {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(s => s);
  
  // Use URL path structure to create directory hierarchy
  let dirPath = baseDir;
  
  if (pathSegments.length > 1) {
    // Create subdirectories based on URL path
    const dirs = pathSegments.slice(0, -1);
    dirPath = path.join(baseDir, ...dirs.map(sanitizeFilename));
  }
  
  // Create filename from title or last path segment
  const filename = sanitizeFilename(title || pathSegments[pathSegments.length - 1] || 'index');
  
  return path.join(dirPath, `${filename}.md`);
}

/**
 * Fetch markdown/text content from a single URL and save to local file
 */
export async function fetchPageContent(
  url: string, 
  title: string, 
  level: number, 
  baseDir: string,
  useJinaAi: boolean = false
): Promise<string> {
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Use Jina.ai if flag is enabled
    const fetchUrl = useJinaAi ? `https://r.jina.ai/${url}` : url;
    console.log(`Fetching content from: ${fetchUrl}`);
    await page.goto(fetchUrl);
    
    // Wait for content to load
    await page.waitForTimeout(10000);
    
    // Extract main content (try common selectors)
    const content = await page.evaluate(() => {
      // Fallback to body
      return document.querySelectorAll("pre")[0].innerText;
    });
    
    // Save content to local file if content is substantial
    if (content && content.length > 100) {
      const filePath = generateFilePath(baseDir, url, title, level);
      
      // Create directory structure
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Create markdown content with metadata
      const markdownContent = `---
title: ${title}
url: ${url}
level: ${level}
fetched: ${new Date().toISOString()}
---

# ${title}

${content}
`;
      
      // Write to file
      await fs.writeFile(filePath, markdownContent, 'utf-8');
      console.log(`Saved to: ${filePath}`);
    }
    
    return content;
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    // Return empty string instead of throwing to continue with other pages
    return '';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Fetch all documentation content from a base URL and save to local directory
 */
export async function fetchAllDocumentation(baseUrl: string, maxPages: number = 50, useJinaAi: boolean = false): Promise<string> {
  try {
    // Step 1: Extract all documentation links with hierarchy
    let links = await extractDocumentationLinks(baseUrl);
    if (links.length === 0) {
      throw new Error('No documentation links found on the page. Make sure the URL points to a documentation site with navigation links.');
    }
    
    // Limit number of pages to fetch
    const linksToFetch = links.slice(0, maxPages);
    console.log(`Fetching content from ${linksToFetch.length} pages (max: ${maxPages})`);
    
    // Step 2: Create base directory for storing markdown files
    const projectRoot = process.cwd();
    const docsBaseDir = path.join(projectRoot, '.docs');
    
    // Create unique subdirectory based on domain and timestamp
    const urlObj = new URL(baseUrl);
    const domainName = sanitizeFilename(urlObj.hostname);
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const targetDir = path.join(docsBaseDir, `${domainName}-${timestamp}`);
    
    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true });
    console.log(`Saving documentation to: ${targetDir}`);
    
    // Step 3: Fetch content from each link and save to files
    const allContent: string[] = [];
    
    for (let i = 0; i < linksToFetch.length; i++) {
      const link = linksToFetch[i];
      console.log(`Fetching page ${i + 1}/${linksToFetch.length}: ${link.title}`);
      
      const content = await fetchPageContent(
        link.url, 
        link.title, 
        link.level || 0, 
        targetDir,
        useJinaAi
      );
      
      if (content && content.length > 100) { // Only include pages with substantial content
        allContent.push(`# ${link.title}\n\nURL: ${link.url}\nLevel: ${link.level || 0}\n\n${content}\n\n---\n`);
      }
    }
    
    if (allContent.length === 0) {
      throw new Error('No content could be extracted from the documentation pages.');
    }
    
    // Step 4: Create a combined markdown file with table of contents
    const combinedContent = allContent.join('\n\n');
    
    // Create table of contents
    const toc = linksToFetch
      .map(link => {
        const indent = '  '.repeat(link.level || 0);
        return `${indent}- [${link.title}](${link.url})`;
      })
      .join('\n');
    
    const tocContent = `# Documentation Index

Source: ${baseUrl}
Fetched: ${new Date().toISOString()}
Pages: ${allContent.length}

## Table of Contents

${toc}

---

${combinedContent}
`;
    
    // Save combined file
    const indexPath = path.join(targetDir, '_index.md');
    await fs.writeFile(indexPath, tocContent, 'utf-8');
    console.log(`Created index file: ${indexPath}`);
    
    console.log(`Successfully fetched ${allContent.length} pages, total length: ${combinedContent.length} characters`);
    console.log(`Documentation saved to: ${targetDir}`);
    
    return combinedContent;
  } catch (error) {
    console.error('Error fetching documentation:', error);
    throw error;
  }
}

