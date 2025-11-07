export interface Repository {
  id: string;
  name: string;
  url: string;
  description?: string;
  analysis_en?: string; // English analysis result (original)
  analysis_zh?: string; // Chinese translation of analysis result
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
  repository_name?: string; // From JOIN with repositories table
  repository_url?: string;  // From JOIN with repositories table
  similarity?: number;       // From similarity search
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

