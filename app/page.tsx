'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StarredRepo {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  updatedAt: string;
}

export default function IndexPage() {
  // Get unindexed repos limit from env var, default to 5
  const UNINDEXED_REPOS_LIMIT = parseInt(process.env.NEXT_PUBLIC_UNINDEXED_REPOS_LIMIT || '5');
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [githubUsername, setGithubUsername] = useState('DanielMax937');
  const [loadingStarred, setLoadingStarred] = useState(false);
  const [starredRepos, setStarredRepos] = useState<StarredRepo[]>([]);
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [selectedStarredRepos, setSelectedStarredRepos] = useState<Set<number>>(new Set());
  const [indexingStarred, setIndexingStarred] = useState(false);
  
  // Find unindexed repos state
  const [findingUnindexed, setFindingUnindexed] = useState(false);
  const [unindexedRepos, setUnindexedRepos] = useState<StarredRepo[]>([]);
  const [showUnindexedModal, setShowUnindexedModal] = useState(false);
  const [indexingOneByOne, setIndexingOneByOne] = useState(false);
  const [currentIndexingRepo, setCurrentIndexingRepo] = useState<string | null>(null);
  const [indexedCount, setIndexedCount] = useState(0);
  const [findProgress, setFindProgress] = useState({ current: 0, total: 0, found: 0 });
  
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index repository');
      }

      setSuccess(data.message);
      setUrl('');

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

  async function handleFetchStarredRepos() {
    if (!githubUsername.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoadingStarred(true);
    setError('');

    try {
      const response = await fetch(
        `/api/starred-repos?username=${encodeURIComponent(githubUsername)}&per_page=100`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch starred repositories');
      }

      setStarredRepos(data.repos);
      setShowStarredModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStarred(false);
    }
  }

  function toggleStarredRepo(repoId: number) {
    const newSelected = new Set(selectedStarredRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedStarredRepos(newSelected);
  }

  function selectAllStarred() {
    setSelectedStarredRepos(new Set(starredRepos.map(r => r.id)));
  }

  function deselectAllStarred() {
    setSelectedStarredRepos(new Set());
  }

  async function handleIndexSelectedStarred() {
    if (selectedStarredRepos.size === 0) {
      setError('Please select at least one repository to index');
      return;
    }

    setIndexingStarred(true);
    setError('');
    const reposToIndex = starredRepos.filter(r => selectedStarredRepos.has(r.id));
    
    let successCount = 0;
    let failCount = 0;

    for (const repo of reposToIndex) {
      try {
        const response = await fetch('/api/index', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: repo.url }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIndexingStarred(false);
    setShowStarredModal(false);
    setSuccess(`Successfully indexed ${successCount} repositories${failCount > 0 ? `, ${failCount} failed` : ''}`);
    
    // Redirect to repos page after 2 seconds
    setTimeout(() => {
      router.push('/repos');
    }, 2000);
  }

  async function handleFindUnindexedRepos() {
    if (!githubUsername.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setFindingUnindexed(true);
    setError('');
    setFindProgress({ current: 0, total: 100, found: 0 });
    const foundUnindexed: StarredRepo[] = [];

    try {
      // Loop through pages 1 to 100
      for (let page = 1; page <= 100 && foundUnindexed.length < UNINDEXED_REPOS_LIMIT; page++) {
        setFindProgress(prev => ({ ...prev, current: page }));

        // Fetch starred repos for this page
        const response = await fetch(
          `/api/starred-repos?username=${encodeURIComponent(githubUsername)}&page=${page}&per_page=100`
        );

        if (!response.ok) {
          if (response.status === 404) {
            break; // No more pages
          }
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch starred repositories');
        }

        const data = await response.json();
        const repos: StarredRepo[] = data.repos;

        // If we got no repos, we've reached the end
        if (repos.length === 0) {
          break;
        }

        // Check which ones are not indexed
        const checkResponse = await fetch('/api/check-indexed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            urls: repos.map(r => r.url)
          }),
        });

        if (!checkResponse.ok) {
          throw new Error('Failed to check indexed status');
        }

        const checkData = await checkResponse.json();
        const urlStatusMap = new Map(
          checkData.urlsStatus.map((item: any) => [item.url, item.isIndexed])
        );

        // Find unindexed repos
        const unindexedInThisPage = repos.filter(
          repo => !urlStatusMap.get(repo.url)
        );

        // Add to our list
        for (const repo of unindexedInThisPage) {
          if (foundUnindexed.length < UNINDEXED_REPOS_LIMIT) {
            foundUnindexed.push(repo);
          } else {
            break;
          }
        }

        setFindProgress(prev => ({ ...prev, found: foundUnindexed.length }));

        // If we found enough, stop searching
        if (foundUnindexed.length >= UNINDEXED_REPOS_LIMIT) {
          break;
        }
      }

      if (foundUnindexed.length === 0) {
        setSuccess('All your starred repositories are already indexed!');
        setFindingUnindexed(false);
      } else {
        setUnindexedRepos(foundUnindexed);
        setShowUnindexedModal(true);
        setFindingUnindexed(false);
      }
    } catch (err: any) {
      setError(err.message);
      setFindingUnindexed(false);
    }
  }

  async function handleIndexOneByOne() {
    setIndexingOneByOne(true);
    setIndexedCount(0);
    setError('');

    for (let i = 0; i < unindexedRepos.length; i++) {
      const repo = unindexedRepos[i];
      setCurrentIndexingRepo(repo.fullName);

      try {
        const response = await fetch('/api/index', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: repo.url }),
        });

        if (response.ok) {
          setIndexedCount(i + 1);
        } else {
          const data = await response.json();
          console.error(`Failed to index ${repo.fullName}:`, data.error);
        }
      } catch (err) {
        console.error(`Error indexing ${repo.fullName}:`, err);
      }

      // Small delay between requests
      if (i < unindexedRepos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIndexingOneByOne(false);
    setCurrentIndexingRepo(null);
    setShowUnindexedModal(false);
    setSuccess(`Successfully indexed ${indexedCount} of ${unindexedRepos.length} repositories`);
    
    // Redirect to repos page after 2 seconds
    setTimeout(() => {
      router.push('/repos');
    }, 2000);
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">
            Index GitHub Repository
          </h1>
          <div className="flex gap-2 text-sm">
            <Link
              href="/index-local"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Index Local
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
          Analyze and index any public GitHub repository using AI
        </p>

        {/* Starred Repos Section */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Fetch Your Starred Repositories
          </h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="Enter your GitHub username"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                disabled={loadingStarred || findingUnindexed}
              />
              <button
                onClick={handleFetchStarredRepos}
                disabled={loadingStarred || findingUnindexed || !githubUsername.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loadingStarred ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
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
                    Loading...
                  </span>
                ) : (
                  'Fetch Starred'
                )}
              </button>
            </div>
            
            <button
              onClick={handleFindUnindexedRepos}
              disabled={findingUnindexed || loadingStarred || !githubUsername.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {findingUnindexed ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
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
                  Searching page {findProgress.current}/100 (found {findProgress.found}/{UNINDEXED_REPOS_LIMIT})...
                </span>
              ) : (
                `🔍 Find ${UNINDEXED_REPOS_LIMIT} Unindexed Starred Repos`
              )}
            </button>
          </div>
          
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>• <strong>Fetch Starred:</strong> Browse and select repos to index</p>
            <p>• <strong>Find Unindexed:</strong> Auto-find first {UNINDEXED_REPOS_LIMIT} repos not yet indexed</p>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="repo-url"
              className="block text-sm font-medium mb-2"
            >
              Repository URL
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
              Enter the full GitHub repository URL (e.g.,
              https://github.com/user/repo)
            </p>
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
                Indexing Repository...
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
              <li>• Cloning repository</li>
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

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          This tool clones and analyzes the entire codebase using Gemini AI
        </p>
      </div>

      {/* Starred Repos Modal */}
      {showStarredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Starred Repositories ({starredRepos.length})
                </h2>
                <button
                  onClick={() => setShowStarredModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Select repositories to index ({selectedStarredRepos.size} selected)
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={selectAllStarred}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAllStarred}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {starredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedStarredRepos.has(repo.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => toggleStarredRepo(repo.id)}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedStarredRepos.has(repo.id)}
                        onChange={() => toggleStarredRepo(repo.id)}
                        className="mt-1 mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{repo.fullName}</h3>
                        {repo.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center">
                              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {repo.stars}
                          </span>
                          <span>Updated: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowStarredModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIndexSelectedStarred}
                disabled={selectedStarredRepos.size === 0 || indexingStarred}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {indexingStarred ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
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
                    Indexing {selectedStarredRepos.size} repos...
                  </span>
                ) : (
                  `Index ${selectedStarredRepos.size} Selected`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unindexed Repos Modal */}
      {showUnindexedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center">
                  <span className="mr-2">🎯</span>
                  Unindexed Repositories ({unindexedRepos.length})
                </h2>
                <button
                  onClick={() => setShowUnindexedModal(false)}
                  disabled={indexingOneByOne}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                These repositories are not yet indexed. Click below to index them one by one.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {unindexedRepos.map((repo, index) => (
                  <div
                    key={repo.id}
                    className={`border rounded-lg p-4 transition-all ${
                      currentIndexingRepo === repo.fullName
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
                        : index < indexedCount
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {index < indexedCount ? (
                          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : currentIndexingRepo === repo.fullName ? (
                          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-500">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{repo.fullName}</h3>
                        {repo.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center">
                              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {repo.stars}
                          </span>
                        </div>
                        {currentIndexingRepo === repo.fullName && (
                          <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                            Indexing now...
                          </div>
                        )}
                        {index < indexedCount && (
                          <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                            ✓ Indexed successfully
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowUnindexedModal(false)}
                disabled={indexingOneByOne}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleIndexOneByOne}
                disabled={indexingOneByOne}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {indexingOneByOne ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
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
                    Indexing ({indexedCount}/{unindexedRepos.length})...
                  </span>
                ) : (
                    `🚀 Index ${unindexedRepos.length} Repo${unindexedRepos.length !== 1 ? 's' : ''} One by One`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

