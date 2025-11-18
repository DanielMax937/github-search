'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function IndexManualPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPages, setMaxPages] = useState('50');
  const [useJinaAi, setUseJinaAi] = useState(false);
  const [language, setLanguage] = useState<'english' | 'chinese'>('english');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/index-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          repoUrl, 
          docsUrl,
          name: name || undefined,
          description: description || undefined,
          maxPages: parseInt(maxPages) || 50,
          useJinaAi: useJinaAi,
          language: language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index repository');
      }

      setSuccess(data.message);
      setRepoUrl('');
      setDocsUrl('');
      setName('');
      setDescription('');
      setMaxPages('50');
      setUseJinaAi(false);
      setLanguage('english');

      // Redirect to repos page after 2 seconds
      setTimeout(() => {
        router.push('/repos');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">
            Index from Documentation URL
          </h1>
          <div className="flex gap-2 text-sm">
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Index from URL
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              href="/index-local"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Index Local
            </Link>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Automatically fetch and index documentation from a URL (no AI code analysis)
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="repo-url"
              className="block text-sm font-medium mb-2"
            >
              Repository URL <span className="text-red-500">*</span>
            </label>
            <input
              id="repo-url"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              required
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Enter the GitHub repository URL for reference
            </p>
          </div>

          <div>
            <label
              htmlFor="docs-url"
              className="block text-sm font-medium mb-2"
            >
              Documentation URL <span className="text-red-500">*</span>
            </label>
            <input
              id="docs-url"
              type="url"
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
              placeholder="https://docs.example.com or https://github.com/user/repo/wiki"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              required
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              URL to documentation site with navigation links (e.g., docs, wiki, README site)
            </p>
          </div>

          <div>
            <label
              htmlFor="repo-name"
              className="block text-sm font-medium mb-2"
            >
              Repository Name <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="repo-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project (leave empty to auto-extract from URL)"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
            >
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the repository"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="max-pages"
              className="block text-sm font-medium mb-2"
            >
              Max Pages to Fetch <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="max-pages"
              type="number"
              min="1"
              max="200"
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              placeholder="50"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Maximum number of documentation pages to fetch (default: 50)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Documentation Language <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLanguage('english')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  language === 'english'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">English</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Store in analysis_en
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('chinese')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  language === 'chinese'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">中文</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Store in analysis_zh
                  </div>
                </div>
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Select the language of the documentation to store in the appropriate field
            </p>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
              id="use-jina-ai"
              type="checkbox"
              checked={useJinaAi}
              onChange={(e) => setUseJinaAi(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <div className="flex-1">
              <label
                htmlFor="use-jina-ai"
                className="block text-sm font-medium cursor-pointer"
              >
                Use Jina.ai Reader API
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enable this to fetch cleaner, markdown-formatted content via Jina.ai (recommended for better content extraction)
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !repoUrl || !docsUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Fetching & Indexing Documentation...
              </span>
            ) : (
              'Index Repository'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
            <p className="text-green-700 dark:text-green-300 text-sm mt-2">
              Redirecting to repositories...
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
              Processing...
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Loading documentation page</li>
              <li>• Extracting navigation links</li>
              <li>• Fetching content from each page</li>
              <li>• Chunking documents</li>
              <li>• Creating embeddings</li>
              <li>• Saving to database</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
              This may take 1-3 minutes depending on number of pages...
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
          💡 When to use this method?
        </h2>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <li>
            <strong>Documentation sites:</strong> Index docs, wikis, or README sites with navigation
          </li>
          <li>
            <strong>Automatic fetching:</strong> No need to copy/paste content manually
          </li>
          <li>
            <strong>Multiple pages:</strong> Automatically fetches all linked pages from navigation
          </li>
          <li>
            <strong>No AI analysis:</strong> Skips code analysis, uses documentation only
          </li>
          <li>
            <strong>Faster than AI:</strong> No Gemini CLI overhead, just document processing
          </li>
        </ul>
      </div>

      <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h2 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
          📋 Examples of Documentation URLs
        </h2>
        <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
          <li>
            <strong>GitHub Wiki:</strong> https://github.com/user/repo/wiki
          </li>
          <li>
            <strong>Documentation Site:</strong> https://docs.example.com
          </li>
          <li>
            <strong>README Site:</strong> https://readme.io or similar
          </li>
          <li>
            <strong>GitBook:</strong> https://user.gitbook.io/project
          </li>
        </ul>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-3">
          Make sure the URL contains navigation links to other documentation pages
        </p>
      </div>

      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          This method uses Playwright to automatically fetch documentation from URLs
        </p>
      </div>
    </div>
  );
}

