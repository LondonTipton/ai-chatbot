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
      return vectorResultsBatch.map((batch) => {
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
    // DB Configuration
    const DB_URLS = {
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
      Zimlii: [process.env.NEON_ZIMLII_1].filter(Boolean) as string[], // Only DB 1 has data
    };

    console.log(
      `[Neon Fetch] 🚀 Processing ${vectorResults.length} results in parallel`
    );

    // Process ALL results in parallel
    const resultPromises = vectorResults.map(async (result) => {
      const {
        source,
        source_file: sourceFile,
        chunk_index: chunkIndex,
        metadata,
      } = result;

      const docId =
        metadata?.doc_id ||
        (typeof metadata === "string" ? JSON.parse(metadata).doc_id : null);

      const chunkIndexInt =
        typeof chunkIndex === "string"
          ? Number.parseInt(chunkIndex, 10)
          : chunkIndex;

      // Smart database selection based on source
      let databasesToQuery: string[] = [];

      if (source === "CaseLaw") {
        // CaseLaw: Zilliz stores LOCAL chunk indices (0-n per doc), not global
        // We cannot use chunk_index for database routing since it's local
        // Must query all CaseLaw DBs in parallel to find the document
        databasesToQuery = DB_URLS.CaseLaw;
      } else if (source === "Zimlii") {
        // Zimlii only has data in DB 1
        databasesToQuery = DB_URLS.Zimlii;
      } else if (source === "LawPortal") {
        // LawPortal: must try all DBs (data distributed by doc, not by range)
        databasesToQuery = DB_URLS.LawPortal;
      } else {
        // Unknown source: try all
        databasesToQuery = Object.values(DB_URLS).flat();
      }

      if (databasesToQuery.length === 0) {
        return { ...result, text: "[DB NOT CONFIGURED]" };
      }

      // CaseLaw uses global indices, others use local (0-n per doc)
      const usesGlobalIndex = source === "CaseLaw";

      // Query selected databases in parallel
      const dbPromises = databasesToQuery.map(async (dbUrl) => {
        try {
          const sql = neon(dbUrl);

          if (docId) {
            const rows = usesGlobalIndex
              ? await sql`
                  WITH numbered_chunks AS (
                    SELECT full_text, metadata, doc_id,
                      ROW_NUMBER() OVER (PARTITION BY doc_id ORDER BY chunk_index ASC) - 1 as local_index
                    FROM legal_documents WHERE doc_id = ${docId}
                  )
                  SELECT full_text, metadata, doc_id FROM numbered_chunks
                  WHERE local_index = ${chunkIndexInt} LIMIT 1
                `
              : await sql`
                  SELECT full_text, metadata, doc_id FROM legal_documents
                  WHERE doc_id = ${docId} AND chunk_index = ${chunkIndexInt} LIMIT 1
                `;

            if (rows.length > 0) {
              return { row: rows[0] };
            }
          }

          if (sourceFile) {
            const rows = usesGlobalIndex
              ? await sql`
                  WITH numbered_chunks AS (
                    SELECT full_text, metadata, doc_id,
                      ROW_NUMBER() OVER (PARTITION BY source_file ORDER BY chunk_index ASC) - 1 as local_index
                    FROM legal_documents WHERE source = ${source} AND source_file = ${sourceFile}
                  )
                  SELECT full_text, metadata, doc_id FROM numbered_chunks
                  WHERE local_index = ${chunkIndexInt} LIMIT 1
                `
              : await sql`
                  SELECT full_text, metadata, doc_id FROM legal_documents
                  WHERE source = ${source} AND source_file = ${sourceFile}
                    AND chunk_index = ${chunkIndexInt} LIMIT 1
                `;

            if (rows.length > 0) {
              return { row: rows[0] };
            }
          }

          return null;
        } catch (_error) {
          return null;
        }
      });

      const dbResults = await Promise.all(dbPromises);
      const found = dbResults.find((r) => r !== null);

      if (found) {
        return {
          ...result,
          docId: found.row.doc_id,
          text: found.row.full_text,
          metadata: { ...result.metadata, ...found.row.metadata },
        };
      }

      return { ...result, text: "[TEXT NOT FOUND IN NEON]" };
    });

    const results = await Promise.all(resultPromises);
    const foundCount = results.filter(
      (r) => r.text !== "[TEXT NOT FOUND IN NEON]"
    ).length;
    console.log(
      `[Neon Fetch] ✅ Completed: ${foundCount}/${results.length} found`
    );

    return results;
  }
}

export type { SearchResult };
