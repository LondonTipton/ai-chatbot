# Neon Database Chunk Index Fix

## Problem

The Neon database lookups were failing with `0 rows` returned for all queries. The root cause was a **chunk index mismatch** between Zilliz (vector database) and Neon (PostgreSQL).

### Root Cause

- **Zilliz** returns **local chunk indices** (0, 1, 2, 3, 4...) for each document
- **Neon** stores **global chunk indices** (150924, 150925, 150926...) across all documents in the collection

When the search service tried to query:

```sql
WHERE doc_id = '799637fd0e6c' AND chunk_index = 4
```

It failed because the actual `chunk_index` value in Neon was `150928` (the global index), not `4` (the local index).

### Example

For document `799637fd0e6c` with 7 chunks:

- Zilliz returns: chunk indices 0-6
- Neon stores: chunk indices 150924-150930

## Solution

Modified `lib/search/service.ts` to use `ROW_NUMBER()` window function to convert global indices to local indices:

### Strategy 1: doc_id lookup

```sql
WITH numbered_chunks AS (
  SELECT
    full_text,
    metadata,
    doc_id,
    ROW_NUMBER() OVER (PARTITION BY doc_id ORDER BY chunk_index ASC) - 1 as local_index
  FROM legal_documents
  WHERE doc_id = ${docId}
)
SELECT full_text, metadata, doc_id
FROM numbered_chunks
WHERE local_index = ${chunkIndexInt}
LIMIT 1
```

### Strategy 2: source_file lookup

```sql
WITH numbered_chunks AS (
  SELECT
    full_text,
    metadata,
    doc_id,
    source_file,
    ROW_NUMBER() OVER (PARTITION BY source_file ORDER BY chunk_index ASC) - 1 as local_index
  FROM legal_documents
  WHERE source = ${source}
    AND source_file = ${sourceFile}
)
SELECT full_text, metadata, doc_id
FROM numbered_chunks
WHERE local_index = ${chunkIndexInt}
LIMIT 1
```

## Testing

Created test scripts to validate the fix:

- `scripts/test-neon-connection.ts` - Tests database connectivity and identifies the issue
- `scripts/test-chunk-index-issue.ts` - Demonstrates the chunk index mismatch
- `scripts/test-fixed-query.ts` - Validates the ROW_NUMBER() solution

All tests pass successfully.

## Impact

This fix resolves the database lookup failures and enables proper retrieval of legal document chunks for the AI search functionality.
