// hooks/useSearch.ts
// React hook for client-side search

import { useState } from 'react';

interface SearchResult {
  score: number;
  source: string;
  sourceFile: string;
  chunkIndex: number;
  docId: string;
  text: string;
  metadata: any;
}

interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  error?: string;
  query?: string;
  numResults?: number;
}

interface UseSearchOptions {
  topK?: number;
  source?: 'CaseLaw' | 'LawPortal' | 'Zimlii';
}

export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, options: UseSearchOptions = {}) => {
    if (!query.trim()) {
      setError('Query cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          topK: options.topK || 10,
          source: options.source,
        }),
      });

      const data: SearchResponse = await response.json();

      if (data.success && data.results) {
        setResults(data.results);
      } else {
        setError(data.error || 'Search failed');
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults([]);
    setError(null);
  };

  return {
    search,
    clear,
    loading,
    results,
    error,
  };
}
