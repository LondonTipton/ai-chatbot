
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { SearchService } from "@/lib/search/service";

/**
 * Legal Search Tool
 *
 * Provides access to the specialized legal vector search engine.
 * Uses Modal for embeddings, Zilliz for vector search, and Neon for full-text retrieval.
 */
export const legalSearchTool = createTool({
  id: "legal-search",
  description:
    "Search for legal documents, case law, and statutes using semantic vector search. " +
    "Returns full text content from the legal database. " +
    "Use this for finding specific cases, legal principles, or statutory provisions.",

  inputSchema: z.object({
    query: z.string().optional().describe("Single legal search query (deprecated, use queries)"),
    queries: z.array(z.string()).optional().describe("Array of legal search queries for batch processing"),
    topK: z.number().optional().default(5).describe("Number of results to return per query"),
    filters: z.record(z.any()).optional().describe("Optional metadata filters"),
  }),

  outputSchema: z.object({
    results: z.array(
      z.object({
        score: z.number(),
        source: z.string(),
        sourceFile: z.string(),
        text: z.string(),
        docId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    ).describe("Flattened array of all results (for backward compatibility)"),
    batchResults: z.array(
        z.array(
            z.object({
                score: z.number(),
                source: z.string(),
                sourceFile: z.string(),
                text: z.string(),
                docId: z.string().optional(),
                metadata: z.record(z.any()).optional(),
            })
        )
    ).optional().describe("Results grouped by query index"),
  }),

  execute: async ({ context }) => {
    const { query, queries, topK = 5, filters } = context;

    // Normalize input to array
    let searchQueries: string[] = [];
    if (queries && queries.length > 0) {
        searchQueries = queries;
    } else if (query) {
        searchQueries = [query];
    } else {
        throw new Error("Either 'query' or 'queries' must be provided");
    }

    console.log(`[Legal Search Tool] Executing batch search for ${searchQueries.length} queries`);

    const searchService = new SearchService({
      modalWebhookUrl: process.env.MODAL_EMBEDDING_URL!,
      zillizUri: process.env.ZILLIZ_URI!,
      zillizToken: process.env.ZILLIZ_TOKEN!,
      zillizCollection: process.env.ZILLIZ_COLLECTION!,
    });

    try {
      const batchResults = await searchService.searchBatch(searchQueries, topK, filters);
      
      const totalResults = batchResults.reduce((acc, val) => acc + val.length, 0);
      console.log(`[Legal Search Tool] Found ${totalResults} total results across ${searchQueries.length} queries`);
      
      // Map results to schema
      const mappedBatchResults = batchResults.map(batch => 
          batch.map(r => ({
            score: r.score,
            source: r.source || "Unknown Source",
            sourceFile: r.source_file || r.sourceFile, // Handle snake_case from Zilliz/Service
            text: r.text || "",
            docId: r.docId,
            metadata: r.metadata
        }))
      );

      // Flatten for backward compatibility with existing workflows that expect 'results'
      const flattenedResults = mappedBatchResults.flat();

      return {
        results: flattenedResults,
        batchResults: mappedBatchResults
      };
    } catch (error: any) {
      console.error("[Legal Search Tool] Search failed:", error);
      throw new Error(`Legal search failed: ${error.message}`);
    }
  },
});
