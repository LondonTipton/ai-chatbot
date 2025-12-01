# Quick Start Guide

## 1. Install Dependencies

```bash
npm install @neondatabase/serverless
# or
pnpm add @neondatabase/serverless
```

## 2. Copy Environment Variables

Copy `.env.example` to `.env.local` and the values are already filled in.

## 3. Add API Route

Copy `api-route-example.ts` to your Next.js app:

```
your-app/
  app/
    api/
      search/
        route.ts  ← Copy api-route-example.ts here
```

## 4. Add Hook (Optional)

Copy `search-hook.ts` to your hooks folder:

```
your-app/
  hooks/
    useSearch.ts  ← Copy search-hook.ts here
```

## 5. Use in Your Component

```tsx
import { useSearch } from '@/hooks/useSearch';

export default function MyPage() {
  const { search, loading, results } = useSearch();

  return (
    <div>
      <button onClick={() => search('contract dispute')}>
        Search
      </button>
      {results.map(r => <div key={r.docId}>{r.text}</div>)}
    </div>
  );
}
```

## 6. Deploy to Vercel

Add all environment variables from `.env.local` to your Vercel project settings.

That's it! Your search is ready.

## API Endpoint

```
POST /api/search
{
  "query": "your search query",
  "topK": 10,
  "source": "CaseLaw" // optional
}
```

## Response

```json
{
  "success": true,
  "results": [
    {
      "score": 0.95,
      "source": "CaseLaw",
      "text": "Full document text..."
    }
  ]
}
```
