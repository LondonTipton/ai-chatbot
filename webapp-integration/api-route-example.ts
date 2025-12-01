// app/api/search/route.ts
// Next.js 14+ App Router API Route

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Database configuration
const DB_CONFIG = {
  CaseLaw: [
    process.env.NEON_CASELAW_1!,
    process.env.NEON_CASELAW_2!,
    process.env.NEON_CASELAW_3!,
  ],
  LawPortal: [
    process.env.NEON_LAWPORTAL_1!,
    process.env.NEON_LAWPORTAL_2!,
    process.env.NEON_LAWPORTAL_3!,
  ],
  Zimlii: [
    process.env.NEON_ZIMLII_1!,
    process.env.NEON_ZIMLII_2!,
  ],
};

interface SearchRequest {
  query: string;
  topK?: number;
  source?: 'CaseLaw' | 'LawPortal' | 'Zimlii';
}

interface SearchResult {
  score: number;
  source: string;
  sourceFile: string;
  chunkIndex: number;
  docId: string;
  text: string;
  metadata: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { query, topK = 10, source } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Step 1: Get embeddings from Modal
    const embeddings = await getEmbeddings(query);

    // Step 2: Search Zilliz
    const vectorResults = await searchZilliz(
      embeddings.dense,
      embeddings.sparse,
      topK,
      source
    );

    // Step 3: Fetch full text from Neon
    const results = await fetchFullText(vectorResults);

    return NextResponse.json({
      success: true,
      results,
      query,
      numResults: results.length,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function getEmbeddings(query: string) {
  const response = await fetch(process.env.MODAL_EMBEDDING_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to get embeddings');
  }

  const data = await response.json();
  return {
    dense: data.dense_embedding,
    sparse: data.sparse_embedding,
  };
}

async function searchZilliz(
  denseVector: number[],
  sparseVector: Record<number, number>,
  topK: number,
  sourceFilter?: string
) {
  // Note: You'll need to use the Milvus SDK or REST API
  // This is a simplified example - implement based on your needs
  
  const response = await fetch(`${process.env.ZILLIZ_URI}/v1/vector/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ZILLIZ_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      collectionName: process.env.ZILLIZ_COLLECTION,
      vector: denseVector,
      topK,
      filter: sourceFilter ? `source == "${sourceFilter}"` : undefined,
      outputFields: ['source', 'source_file', 'chunk_index', 'metadata'],
    }),
  });

  if (!response.ok) {
    throw new Error('Zilliz search failed');
  }

  return await response.json();
}

async function fetchFullText(vectorResults: any[]): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const result of vectorResults) {
    const { source, source_file, chunk_index } = result;
    
    // Get the appropriate database connection
    const dbUrls = DB_CONFIG[source as keyof typeof DB_CONFIG];
    if (!dbUrls || dbUrls.length === 0) continue;

    // Try each database until we find the record
    for (const dbUrl of dbUrls) {
      try {
        const sql = neon(dbUrl);
        const rows = await sql`
          SELECT full_text, metadata, doc_id
          FROM legal_documents
          WHERE source = ${source}
            AND source_file = ${source_file}
            AND chunk_index = ${chunk_index}
          LIMIT 1
        `;

        if (rows.length > 0) {
          const row = rows[0];
          results.push({
            score: result.distance || result.score,
            source,
            sourceFile: source_file,
            chunkIndex: chunk_index,
            docId: row.doc_id,
            text: row.full_text,
            metadata: row.metadata,
          });
          break; // Found it, move to next result
        }
      } catch (error) {
        console.error(`Error querying database for ${source}:`, error);
        continue; // Try next database
      }
    }
  }

  return results;
}
