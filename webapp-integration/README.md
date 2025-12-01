# Next.js Integration Guide for Legal Search

Quick integration guide for adding legal document search to your Next.js app on Vercel.

## Architecture

```
Next.js App (Vercel)
    ↓
API Route (/api/search)
    ↓
1. Modal A10 Endpoint → Embeddings
2. Zilliz Cloud → Vector Search
3. Neon PostgreSQL → Full Text
    ↓
Return Results
```

## Quick Start

### 1. Install Dependencies

```bash
npm install @neondatabase/serverless pymilvus
# or
pnpm add @neondatabase/serverless pymilvus
```

### 2. Environment Variables

Create `.env.local`:

```env
# Modal A10 Embedding Endpoint
MODAL_EMBEDDING_URL=https://chrismutibvu--legal-search-8b-fast-gpu-a10-fastgpusearch-ce0540.modal.run/

# Zilliz Cloud
ZILLIZ_URI=your_zilliz_uri_here
ZILLIZ_TOKEN=your_zilliz_token_here
ZILLIZ_COLLECTION=hybrid_caselaw_collection

# Neon PostgreSQL - CaseLaw
NEON_CASELAW_1=postgresql://neondb_owner:npg_o5PRetjJFg6x@ep-lingering-rain-ag0jpddj-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NEON_CASELAW_2=postgresql://neondb_owner:npg_EaizZxQ4URd8@ep-falling-base-agag5jy8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NEON_CASELAW_3=postgresql://neondb_owner:npg_E94tdYuSOojP@ep-damp-pond-agkbw1vq-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Neon PostgreSQL - LawPortal
NEON_LAWPORTAL_1=postgresql://neondb_owner:npg_7CAdpKUk6PFy@ep-curly-term-agl3iosu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NEON_LAWPORTAL_2=postgresql://neondb_owner:npg_a0xtY5ucmRzJ@ep-spring-feather-agi5ctck-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NEON_LAWPORTAL_3=postgresql://neondb_owner:npg_HghPxtMumX87@ep-polished-dew-agt33dj5-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Neon PostgreSQL - Zimlii
NEON_ZIMLII_1=postgresql://neondb_owner:npg_sVEAg2qLz6TR@ep-blue-wave-agdcr98b-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
NEON_ZIMLII_2=postgresql://neondb_owner:npg_8SD6JzjmgGfs@ep-twilight-pine-agyx38mt-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 3. Add to Vercel

In your Vercel project settings, add all environment variables from above.

## Implementation

See the example files:

- `api-route-example.ts` - Next.js API route
- `search-hook.ts` - React hook for client-side
- `search-component.tsx` - Example React component

## API Usage

### Request

```typescript
POST /api/search
{
  "query": "contract dispute",
  "topK": 10,
  "source": "CaseLaw" // optional: "CaseLaw" | "LawPortal" | "Zimlii"
}
```

### Response

```typescript
{
  "success": true,
  "results": [
    {
      "score": 0.95,
      "source": "CaseLaw",
      "sourceFile": "12-19.json",
      "chunkIndex": 0,
      "docId": "abc123",
      "text": "Full document text...",
      "metadata": {...}
    }
  ]
}
```

## Database Routing

The system automatically routes to the correct database based on source:

| Source    | Databases   | Total Records |
| --------- | ----------- | ------------- |
| CaseLaw   | 3 databases | 198,949       |
| LawPortal | 3 databases | 217,664       |
| Zimlii    | 2 databases | 86,161        |

## Performance

- **Cold Start**: ~500ms
- **Warm Request**: ~200-300ms
- **Embedding**: ~100ms (A10 GPU)
- **Vector Search**: ~50ms (Zilliz)
- **Text Fetch**: ~50ms (Neon)

## Notes

- All databases use connection pooling
- Zilliz uses serverless (auto-scaling)
- Modal endpoint is always warm (A10 GPU)
- Neon databases are in EU Central 1

## Support

For issues or questions, check the example implementations in this folder.
