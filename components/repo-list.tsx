'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Repository {
  id: string;
  name: string;
  url: string;
  description?: string;
  analysis_en?: string;
  analysis_zh?: string;
  created_at: string;
}

interface RepoListProps {
  repositories: Repository[];
  selectedRepoIds: string[];
  onToggleSelection: (id: string) => void;
  onDelete: (id: string) => void;
}

function RepoAnalysisCollapse({ repo }: { repo: Repository }) {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh'); // Default Chinese

  if (!repo.analysis_zh && !repo.analysis_en) {
    return null; // Don't show if no analysis available
  }

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <span className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 mr-2 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {isOpen ? '隐藏分析结果' : '查看分析结果'}
        </span>
        <span className="text-xs text-gray-500">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          {/* Language Toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {repo.analysis_zh && (
                <button
                  onClick={() => setLanguage('zh')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    language === 'zh'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  中文
                </button>
              )}
              {repo.analysis_en && (
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    language === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  English
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              AI 分析结果
            </span>
          </div>

          {/* Analysis Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {language === 'zh' && repo.analysis_zh && (
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {repo.analysis_zh}
              </div>
            )}
            {language === 'en' && repo.analysis_en && (
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {repo.analysis_en}
              </div>
            )}
            {language === 'en' && !repo.analysis_en && (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                English version not available for this repository.
              </div>
            )}
            {language === 'zh' && !repo.analysis_zh && (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                中文版本不可用。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RepoList({
  repositories,
  selectedRepoIds,
  onToggleSelection,
  onDelete,
}: RepoListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">
        Select repositories to search ({selectedRepoIds.length} selected)
      </h2>

      <div className="space-y-3">
        {repositories.map((repo) => {
          const isSelected = selectedRepoIds.includes(repo.id);

          return (
            <div
              key={repo.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-2 transition-colors ${
                isSelected
                  ? 'border-blue-500'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelection(repo.id)}
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{repo.name}</h3>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {repo.url}
                    </a>
                    {repo.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {repo.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Indexed: {new Date(repo.created_at).toLocaleDateString()}
                    </p>

                    {/* Collapsible Analysis Section */}
                    <RepoAnalysisCollapse repo={repo} />
                  </div>
                </div>

                <div className="flex space-x-2 ml-2">
                  <Link
                    href={`/repos/${repo.id}/edit`}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Link>

                  <button
                    onClick={() => onDelete(repo.id)}
                    className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

