'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/chat-interface';
import RepoList from '@/components/repo-list';

interface Repository {
  id: string;
  name: string;
  url: string;
  description?: string;
  created_at: string;
}

export default function ReposPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);

  useEffect(() => {
    fetchRepositories();
  }, []);

  async function fetchRepositories() {
    try {
      const response = await fetch('/api/repos');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch repositories');
      }

      setRepositories(data.repositories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRepo(id: string) {
    if (!confirm('Are you sure you want to delete this repository?')) {
      return;
    }

    try {
      const response = await fetch(`/api/repos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete repository');
      }

      // Refresh list
      setRepositories((prev) => prev.filter((repo) => repo.id !== id));
      setSelectedRepoIds((prev) => prev.filter((repoId) => repoId !== id));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function toggleRepoSelection(id: string) {
    setSelectedRepoIds((prev) =>
      prev.includes(id) ? prev.filter((repoId) => repoId !== id) : [...prev, id]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading repositories...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Indexed Repositories</h1>

      {repositories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No repositories indexed yet
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Index Your First Repository
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Repository List */}
          <div>
            <RepoList
              repositories={repositories}
              selectedRepoIds={selectedRepoIds}
              onToggleSelection={toggleRepoSelection}
              onDelete={handleDeleteRepo}
            />
          </div>

          {/* Chat Interface */}
          <div className="lg:sticky lg:top-6 h-fit">
            <ChatInterface
              repositories={repositories}
              selectedRepoIds={selectedRepoIds}
            />
          </div>
        </div>
      )}
    </div>
  );
}

