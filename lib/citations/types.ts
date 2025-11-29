/**
 * Citation System Types
 *
 * Type definitions for the source attribution system
 */

export type CitationType =
  | "case"
  | "statute"
  | "regulation"
  | "article"
  | "government"
  | "other";

export type Citation = {
  id: string; // Unique identifier (e.g., "1", "2")
  marker: string; // Display marker (e.g., "[1]", "[2]")
  title: string;
  url: string;
  snippet: string; // The relevant text from the source
  domain: string;
  type: CitationType;
  confidence: number; // 0-1 score of how well the claim matches
  publishedDate?: string;
  accessedDate: string;
  relevanceScore?: number; // From Tavily
  // Legal case metadata (for legal-db sources)
  legalMetadata?: {
    caseIdentifier?: string; // e.g., "SC 540/19"
    court?: string; // e.g., "SUPREME COURT OF ZIMBABWE"
    judge?: string; // e.g., "GWAUNZA DCJ"
    decisionDate?: string; // e.g., "2020-07-28"
    caseYear?: string;
    documentType?: string;
    topics?: string[]; // Top legal topics
    labels?: string[]; // Content labels
  };
};

export type CitedResponse = {
  text: string; // Response text with inline citation markers
  citations: Citation[];
  metadata: {
    totalCitations: number;
    verifiedCount: number;
    averageConfidence: number;
    sourceTypes: Record<CitationType, number>;
  };
};

export type CitationVerificationResult = {
  citation: Citation;
  isVerified: boolean;
  matchedContent?: string;
  confidence: number;
  issues?: string[];
};

export type TavilySource = {
  title: string;
  url: string;
  content: string;
  score?: number;
  relevanceScore?: number;
  publishedDate?: string;
  published_date?: string;
};

/**
 * Legal case metadata from Zilliz vector search
 */
export type LegalCaseMetadata = {
  doc_id?: string;
  case_identifier?: string; // e.g., "SC 540/19", "LC/H/REV/108/16"
  court?: string; // e.g., "SUPREME COURT OF ZIMBABWE"
  primary_judge?: string; // e.g., "GWAUNZA DCJ"
  decision_date?: string; // e.g., "2020-07-28"
  case_year?: string; // e.g., "2019"
  document_type?: string; // e.g., "Judgment"
  top_legal_topics?: string[]; // e.g., ["Unfair Dismissal", "Termination on Notice"]
  labels?: string[]; // e.g., ["statutory_interpretation", "court_findings"]
  entities?: Array<{ text: string; type: string }>; // Named entities
  relations?: Array<{
    type: string;
    source: string;
    target: string;
    citation?: string;
  }>;
  estimated_tokens?: number;
  was_split?: boolean;
};

/**
 * Legal database source from vector search
 */
export type LegalDbSource = {
  source: string;
  sourceFile: string;
  text: string;
  score: number;
  docId?: string;
  metadata?: LegalCaseMetadata & Record<string, any>;
};

/**
 * Combined source type for citation building
 */
export type CombinedSource = TavilySource | LegalDbSource;

/**
 * Check if source is from legal database
 */
export function isLegalDbSource(source: any): source is LegalDbSource {
  return (
    source &&
    typeof source.source === "string" &&
    typeof source.sourceFile === "string" &&
    typeof source.text === "string"
  );
}
