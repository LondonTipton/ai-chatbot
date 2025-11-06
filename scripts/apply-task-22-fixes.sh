#!/bin/bash

# Script to apply Task 22 fixes
# Run with: bash scripts/apply-task-22-fixes.sh

echo "Applying Task 22 fixes..."

# Fix 1: Add useCallback import to components/chat.tsx
echo "Fix 1: Adding useCallback import..."
sed -i 's/import { useEffect, useRef, useState } from "react";/import { useCallback, useEffect, useRef, useState } from "react";/' components/chat.tsx

# Fix 2: Update attachments button in components/multimodal-input.tsx
echo "Fix 2: Updating attachments button logic..."
sed -i 's/const isReasoningModel = selectedModelId === "chat-model-reasoning";/const isResearchModel = selectedModelId.startsWith("research-");/' components/multimodal-input.tsx
sed -i 's/disabled={status !== "ready" || isReasoningModel}/disabled={status !== "ready" || isResearchModel}/' components/multimodal-input.tsx

echo "✅ Fixes applied!"
echo ""
echo "Next steps:"
echo "1. Check for any TypeScript errors: pnpm tsc --noEmit"
echo "2. Run the test script: pnpm tsx scripts/test-research-ui-integration.ts"
echo "3. Start dev server: pnpm dev"
echo "4. Test the research interface manually"
