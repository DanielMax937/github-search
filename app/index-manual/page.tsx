'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function IndexManualPage() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
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
          url, 
          name: name || undefined,
          description: description || undefined,
          document 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index repository');
      }

      setSuccess(data.message);
      setUrl('');
      setName('');
      setDescription('');
      setDocument('');

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
            Index with Custom Documents
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
          Manually provide repository URL and documents to index (no AI analysis needed)
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
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
              htmlFor="document"
              className="block text-sm font-medium mb-2"
            >
              Document Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="document"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="Paste your document content here...

This could be:
- README content
- API documentation
- Project overview
- Technical specifications
- User guides
- Any text content you want to index"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 font-mono text-sm"
              rows={15}
              required
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Paste the document content you want to index. This will be chunked and embedded for search.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !url || !document}
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
                Indexing Document...
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
              <li>• Chunking document</li>
              <li>• Creating embeddings</li>
              <li>• Saving to database</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
              This should only take a few seconds...
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
            <strong>Quick indexing:</strong> When you already have the documentation ready
          </li>
          <li>
            <strong>Selective content:</strong> Index only specific parts of a project
          </li>
          <li>
            <strong>Custom documents:</strong> Add supplementary materials not in the repo
          </li>
          <li>
            <strong>No AI analysis needed:</strong> Skip the automatic code analysis step
          </li>
          <li>
            <strong>Faster processing:</strong> No cloning or AI analysis overhead
          </li>
        </ul>
      </div>

      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          This method skips AI code analysis and uses your provided documents directly
        </p>
      </div>
    </div>
  );
}

