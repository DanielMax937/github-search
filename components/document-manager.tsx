'use client';

import { useEffect, useState } from 'react';

interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface DocumentManagerProps {
  repositoryId: string;
}

export default function DocumentManager({ repositoryId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [repositoryId]);

  async function fetchDocuments() {
    try {
      const response = await fetch(`/api/repos/${repositoryId}/documents`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/repos/${repositoryId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add document');
      }

      setSuccess(`Added ${data.chunksCreated} document chunk(s)`);
      setNewContent('');
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Are you sure you want to delete this document chunk?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setSuccess('Document deleted successfully');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Document Management</h2>

      {/* Add New Document */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Add New Document</h3>
        <form onSubmit={handleAddDocument} className="space-y-3">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Enter additional content to add to this repository..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
            disabled={adding}
          />

          <button
            type="submit"
            disabled={adding || !newContent.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Document'}
          </button>
        </form>

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">
              {success}
            </p>
          </div>
        )}
      </div>

      {/* Document List */}
      <div>
        <h3 className="text-lg font-medium mb-3">
          Indexed Documents ({documents.length})
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Loading documents...
            </p>
          </div>
        ) : documents.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No documents found
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(doc.created_at).toLocaleString()}
                    {doc.metadata?.chunkIndex !== undefined && (
                      <span className="ml-2">
                        Chunk {doc.metadata.chunkIndex + 1}
                        {doc.metadata.totalChunks &&
                          ` of ${doc.metadata.totalChunks}`}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {doc.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

