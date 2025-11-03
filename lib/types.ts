export interface Repository {
  id: string;
  name: string;
  url: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  repository_id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  created_at: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IndexRequest {
  url: string;
}

export interface ChatRequest {
  message: string;
  repositoryIds?: string[];
}

export interface DocumentChunk {
  content: string;
  metadata?: Record<string, any>;
}

