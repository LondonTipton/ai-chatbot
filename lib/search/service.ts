import { neon } from "@neondatabase/serverless";
import { type SearchResult, ZillizClient } from "./zilliz-client";

interface SearchServiceConfig {
  modalWebhookUrl: string;
  zillizUri: string;
  zillizToken: string;
  zillizCollection: string;
}

export class SearchService {
  private readonly zillizClient: ZillizClient;
  private readonly modalWebhookUrl: string;

  constructor(config: SearchServiceConfig) {
    this.modalWebhookUrl = config.modalWebhookUrl;
    this.zillizClient = new ZillizClient(
      config.zillizUri,
      config.zillizToken,
      config.zillizCollection
    );
  }

  async search(
    query: string,
    topK = 10,
    filters?: Record<string, any>
  ): Promise<SearchResult[]> {
    // Wrapper for single query using batch implementation
    const results = await this.searchBatch([query], topK, filters);
    return results[0] || [];
  }

  async searchBatch(
    queries: string[],
    topK = 10,
    filters?: Record<string, any>
  ): Promise<SearchResult[][]> {
    try {
      // Get dense embeddings in batch
      const denseEmbeddings = await this.getDenseEmbeddings(queries);

      // Search Zilliz in batch
      const vectorResultsBatch = await this.zillizClient.search(
        denseEmbeddings,
        topK,
        filters
      );

      // Fetch full text from Neon for all results
      // We need to flatten the batch results to fetch text, then reconstruct the structure
      const allVectorResults = vectorResultsBatch.flat();
      
      if (allVectorResults.length === 0) {
          return queries.map(() => []);
      }

      const allFullTextResults = await this.fetchFullText(allVectorResults);

      // Reconstruct batch structure
      let offset = 0;
      return vectorResultsBatch.map(batch => {
          const len = batch.length;
          const fullTextBatch = allFullTextResults.slice(offset, offset + len);
          offset += len;
          return fullTextBatch;
      });
    } catch (error) {
      console.error("Search service batch failed:", error);
      throw error;
    }
  }

  private async getDenseEmbeddings(queries: string[]): Promise<number[][]> {
    try {
      const response = await fetch(this.modalWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queries }), // Send 'queries' array
      });

      if (!response.ok) {
        throw new Error(`Modal embedding failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle new batch format { embeddings: [[...], [...]] }
      if (data.embeddings && Array.isArray(data.embeddings)) {
          return data.embeddings;
      }
      
      // Fallback for legacy single query response { dense_embedding: [...] } or { embedding: [...] }
      // If we sent a batch but got a single result (shouldn't happen with correct endpoint), handle gracefully
      if (data.dense_embedding || data.embedding) {
          return [data.dense_embedding || data.embedding];
      }
      
      throw new Error("Invalid embedding response format");
    } catch (error) {
      console.error("Failed to get dense embeddings:", error);
      throw error;
    }
  }

  // Deprecated: Kept for backward compatibility if needed, but unused internally now
  private async getDenseEmbedding(query: string): Promise<number[]> {
      const embeddings = await this.getDenseEmbeddings([query]);
      return embeddings[0];
  }

  private async fetchFullText(
    vectorResults: SearchResult[]
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // DB Configuration (loaded from env)
    const DB_CONFIG = {
      CaseLaw: [
        process.env.NEON_CASELAW_1,
        process.env.NEON_CASELAW_2,
        process.env.NEON_CASELAW_3,
      ].filter(Boolean) as string[],
      LawPortal: [
        process.env.NEON_LAWPORTAL_1,
        process.env.NEON_LAWPORTAL_2,
        process.env.NEON_LAWPORTAL_3,
      ].filter(Boolean) as string[],
      Zimlii: [process.env.NEON_ZIMLII_1, process.env.NEON_ZIMLII_2].filter(
        Boolean
      ) as string[],
    };

    for (const result of vectorResults) {
      // Fix: Destructure snake_case properties from Zilliz result
      const {
        source,
        source_file: sourceFile,
        chunk_index: chunkIndex,
        metadata,
      } = result;

      // Extract docId from metadata if available
      const docId =
        metadata?.doc_id ||
        (typeof metadata === "string" ? JSON.parse(metadata).doc_id : null);

      // Get the appropriate database connection
      const dbUrls = DB_CONFIG[source as keyof typeof DB_CONFIG];
      if (!dbUrls || dbUrls.length === 0) {
        console.warn(`No DB configured for source: ${source}`);
        results.push({ ...result, text: "[DB NOT CONFIGURED]" });
        continue;
      }

      // Try each database until we find the record
      let found = false;
      for (const dbUrl of dbUrls) {
        try {
          const sql = neon(dbUrl);
          // Convert chunkIndex to integer if it's a string
          const chunkIndexInt =
            typeof chunkIndex === "string"
              ? Number.parseInt(chunkIndex, 10)
              : chunkIndex;

          // Strategy 1: Try positional match using doc_id (most reliable)
          if (docId) {
            const rows = await sql`
                  SELECT full_text, metadata, doc_id
                  FROM legal_documents
                  WHERE doc_id = ${docId}
                  ORDER BY chunk_index ASC
                  OFFSET ${chunkIndexInt}
                  LIMIT 1
              `;

            if (rows.length > 0) {
              const row = rows[0];
              results.push({
                ...result,
                docId: row.doc_id,
                text: row.full_text,
                metadata: { ...result.metadata, ...row.metadata },
              });
              found = true;
              break;
            }
          }

          // Strategy 2: If no doc_id or not found, try positional match using source_file
          if (!found && sourceFile) {
            const rows = await sql`
                  SELECT full_text, metadata, doc_id
                  FROM legal_documents
                  WHERE source = ${source}
                    AND source_file = ${sourceFile}
                  ORDER BY chunk_index ASC
                  OFFSET ${chunkIndexInt}
                  LIMIT 1
              `;

            if (rows.length > 0) {
              const row = rows[0];
              results.push({
                ...result,
                docId: row.doc_id,
                text: row.full_text,
                metadata: { ...result.metadata, ...row.metadata },
              });
              found = true;
              break;
            }
          }
        } catch (error: any) {
          console.error("Error querying Neon DB:", error.message);
        }
      }

      if (!found) {
        console.warn(
          `Could not find text for ${source}/${sourceFile}/${chunkIndex}`
        );
        results.push({
          ...result,
          text: "[TEXT NOT FOUND IN NEON]",
        });
      }
    }

    return results;
  }
}

export type { SearchResult };
