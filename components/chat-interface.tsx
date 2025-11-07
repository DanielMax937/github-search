'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Repository {
  id: string;
  name: string;
}

interface ChatInterfaceProps {
  repositories: Repository[];
  selectedRepoIds: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    originalLanguage?: string;
    wasTranslated?: boolean;
  };
}

export default function ChatInterface({
  repositories,
  selectedRepoIds,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          repositoryIds: selectedRepoIds.length > 0 ? selectedRepoIds : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get response');
      }

      // Handle SSE (Server-Sent Events) streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage = '';
      let metadata: any = {};

      // Add empty assistant message that we'll update
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', metadata: {} },
      ]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (lines ending with \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

              if (data.type === 'metadata') {
                metadata = data.data;
              } else if (data.type === 'content') {
                assistantMessage += data.data;

                // Update the last message
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                    metadata,
                  };
                  return newMessages;
                });
              } else if (data.type === 'error') {
                throw new Error(data.data);
              } else if (data.type === 'done') {
                // Stream completed
                console.log('Stream completed');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Error:** ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const selectedRepoNames = repositories
    .filter((repo) => selectedRepoIds.includes(repo.id))
    .map((repo) => repo.name)
    .join(', ');

  const searchContext = selectedRepoIds.length > 0 
    ? `Searching: ${selectedRepoNames}`
    : `Searching: All repositories (${repositories.length} total)`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold">Chat with Repositories</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {searchContext}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p className="text-lg font-semibold mb-2">🔍 Find the Perfect Repository</p>
            <p className="mb-3">Tell me what you're trying to build or accomplish!</p>
            <p className="text-sm mt-2">
              💡 Tip: Select specific repositories or search all at once
            </p>
            <div className="text-sm mt-4 space-y-1">
              <p className="font-medium">Example queries:</p>
              <p>• "I need a tool for building REST APIs"</p>
              <p>• "Which repository handles authentication?"</p>
              <p>• "What's best for database migrations?"</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // Customize code blocks
                        code({ node, inline, className, children, ...props }) {
                          return inline ? (
                            <code
                              className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                        // Customize links
                        a({ node, children, ...props }) {
                          return (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                {message.metadata?.wasTranslated && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                    Translated from {message.metadata.originalLanguage}
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedRepoIds.length > 0
                ? "Ask a question about the selected repositories..."
                : "Ask a question about all repositories..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
            disabled={loading || repositories.length === 0}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || repositories.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {repositories.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Please index at least one repository first
          </p>
        )}
      </form>
    </div>
  );
}

