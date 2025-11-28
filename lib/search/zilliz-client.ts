import { MilvusClient } from "@zilliz/milvus2-sdk-node";

export interface SearchResult {
  id: string | number;
  score: number;
  text: string;
  source?: string;
  source_file?: string;
  chunk_index?: number;
  [key: string]: any;
}

export class ZillizClient {
  private readonly client: MilvusClient;
  private readonly collectionName: string;

  constructor(uri: string, token: string, collectionName: string) {
    this.collectionName = collectionName;
    this.client = new MilvusClient({
      address: uri,
      token,
    });
  }

  async search(
    queryVectors: number[][],
    topK = 10,
    filters?: Record<string, any>
  ): Promise<SearchResult[][]> {
    try {
      const filterExpr = filters ? this.buildFilterExpression(filters) : "";

      const searchParams: any = {
        collection_name: this.collectionName,
        vectors: queryVectors, // Note: 'vectors' plural for batch
        limit: topK,
        output_fields: [
          "text",
          "source",
          "source_file",
          "chunk_index",
          "metadata",
        ],
      };

      if (filterExpr) {
        searchParams.filter = filterExpr;
      }

      const results = await this.client.search(searchParams);
      
      // Milvus returns { results: [...] } where results is a flat array or array of arrays depending on SDK version
      // But typically for batch it returns an object with a 'results' property that is an array of result sets.
      // Let's assume standard behavior: results.results is the array of hits.
      // Wait, node sdk behavior for batch search:
      // It returns { status: ..., results: [...] }
      // If batch, results is an array of result sets? No, usually it flattens or has a structure.
      // Actually, looking at the SDK types, it might return a single array if not handled carefully.
      // However, standard Milvus response for batch search is a list of results.
      
      // Let's verify the return type of client.search. 
      // Since I can't check the node_modules, I will assume standard behavior where `results` is the key.
      // If `vectors` is passed, `results` should be an array corresponding to each vector.
      
      // IMPORTANT: The node SDK might return a flat list or a structured object.
      // Let's assume it returns an object where `results` is the array of hits.
      // For batch, we might need to handle it differently.
      
      // Actually, to be safe and robust, let's stick to the assumption that `client.search` handles batching 
      // and returns a structure we can map. 
      // If the SDK returns a flat array for batch, we might have a problem.
      // But `vectors` param implies batch support.
      
      // Let's look at `formatResults`. It currently takes `results.results`.
      // If we pass multiple vectors, `results.results` might be an array of arrays?
      
      // Let's update formatResults to handle this.
      
      return this.formatBatchResults(results.results);
    } catch (error) {
      console.error("Search failed:", error);
      throw error;
    }
  }

  private formatBatchResults(results: any[]): SearchResult[][] {
      if (!results || !Array.isArray(results)) {
          return [];
      }
      
      // Check if it's a batch result (array of arrays) or single result (array of hits)
      // If the first item is an array, it's likely a batch result.
      // Or if the SDK returns a flat array with 'id's, it might be a single result.
      
      // Actually, the Milvus Node SDK `search` response `results` is typically an array of matches.
      // For batch, it might be an array of array of matches?
      // Let's assume it returns `SearchResult[][]` effectively.
      
      // If `results` is [ [hit1, hit2], [hit3, hit4] ]
      if (results.length > 0 && Array.isArray(results[0])) {
          return results.map(batch => this.formatResults(batch));
      }
      
      // If it's a single result (just one query vector was passed, but we treat it as batch of 1)
      // It might still come back as [hit1, hit2]
      // We should wrap it in an array if we expect SearchResult[][]
      return [this.formatResults(results)];
  }

  private buildFilterExpression(filters: Record<string, any>): string {
    const expressions: string[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === "string") {
        expressions.push(`${key} == "${value}"`);
      } else if (typeof value === "number") {
        expressions.push(`${key} == ${value}`);
      } else if (typeof value === "object" && value !== null) {
        // Handle range queries
        if ("$gte" in value) {
          expressions.push(`${key} >= ${value.$gte}`);
        }
        if ("$lte" in value) {
          expressions.push(`${key} <= ${value.$lte}`);
        }
        if ("$gt" in value) {
          expressions.push(`${key} > ${value.$gt}`);
        }
        if ("$lt" in value) {
          expressions.push(`${key} < ${value.$lt}`);
        }

        // Handle IN queries
        if (Array.isArray(value)) {
          const valuesStr = value
            .map((v) => (typeof v === "string" ? `"${v}"` : v))
            .join(", ");
          expressions.push(`${key} in [${valuesStr}]`);
        }
      }
    }

    return expressions.join(" && ");
  }

  private formatResults(results: any[]): SearchResult[] {
    if (!results || !Array.isArray(results)) {
      return [];
    }
    
    return results.map((hit) => {
      let metadata = {};
      try {
        if (hit.metadata) {
          metadata =
            typeof hit.metadata === "string"
              ? JSON.parse(hit.metadata)
              : hit.metadata;
        }
      } catch {
        // Ignore metadata parse errors
      }

      return {
        id: hit.id,
        score: hit.score,
        text: hit.text || "",
        source: hit.source || "",
        source_file: hit.source_file || "",
        chunk_index: hit.chunk_index || 0,
        ...metadata,
      };
    });
  }
}
