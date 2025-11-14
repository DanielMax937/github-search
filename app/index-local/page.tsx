'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function IndexLocalPage() {
  const [localPath, setLocalPath] = useState('');
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
      const response = await fetch('/api/index-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ localPath }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index local repository');
      }

      setSuccess(data.message);
      setLocalPath('');

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
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">
            Index Local Repository
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
              href="/index-manual"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Index Manual
            </Link>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          Analyze and index a local GitHub repository using AI
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="local-path"
              className="block text-sm font-medium mb-2"
            >
              Local Repository Path
            </label>
            <input
              id="local-path"
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="/Users/username/projects/my-repo"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 font-mono text-sm"
              required
              disabled={loading}
            />
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the absolute path to a local git repository
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Example: <span className="font-mono">/Users/username/projects/my-repo</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ⚠️ The directory must contain a .git folder and have a remote URL configured
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
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
                Indexing Local Repository...
              </span>
            ) : (
              'Index Local Repository'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
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
              <li>• Validating local repository</li>
              <li>• Extracting repository information</li>
              <li>• Analyzing with Gemini AI</li>
              <li>• Creating embeddings</li>
              <li>• Saving to database</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
              This may take a few minutes depending on repository size...
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
          📋 Requirements
        </h2>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>The directory must be a valid git repository (contains .git folder)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>The repository must have a remote URL configured (e.g., origin)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>Use absolute paths (e.g., /Users/username/projects/repo)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>The application needs read access to the directory</span>
          </li>
        </ul>
      </div>

      <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">
          ⚡ Benefits of Local Indexing
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Faster:</strong> No need to clone the repository</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Private Repos:</strong> Index repositories that aren't publicly accessible</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Current State:</strong> Analyzes your working directory as-is</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>No Duplicates:</strong> Uses existing repository data</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          This tool analyzes your local repository using Gemini AI without cloning
        </p>
      </div>
    </div>
  );
}

