import Link from 'next/link';

interface Repository {
  id: string;
  name: string;
  url: string;
  description?: string;
  created_at: string;
}

interface RepoListProps {
  repositories: Repository[];
  selectedRepoIds: string[];
  onToggleSelection: (id: string) => void;
  onDelete: (id: string) => void;
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

