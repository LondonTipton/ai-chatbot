# PowerShell script to apply Task 22 fixes
# Run with: powershell -ExecutionPolicy Bypass -File scripts/apply-task-22-fixes.ps1

Write-Host "Applying Task 22 fixes..." -ForegroundColor Cyan

# Fix 1: Add useCallback import to components/chat.tsx
Write-Host "Fix 1: Adding useCallback import..." -ForegroundColor Yellow
$chatFile = "components/chat.tsx"
$chatContent = Get-Content $chatFile -Raw
$chatContent = $chatContent -replace 'import \{ useEffect, useRef, useState \} from "react";', 'import { useCallback, useEffect, useRef, useState } from "react";'
Set-Content $chatFile $chatContent -NoNewline

# Fix 2: Update attachments button in components/multimodal-input.tsx
Write-Host "Fix 2: Updating attachments button logic..." -ForegroundColor Yellow
$inputFile = "components/multimodal-input.tsx"
$inputContent = Get-Content $inputFile -Raw
$inputContent = $inputContent -replace 'const isReasoningModel = selectedModelId === "chat-model-reasoning";', 'const isResearchModel = selectedModelId.startsWith("research-");'
$inputContent = $inputContent -replace 'disabled=\{status !== "ready" \|\| isReasoningModel\}', 'disabled={status !== "ready" || isResearchModel}'
Set-Content $inputFile $inputContent -NoNewline

Write-Host "`n✅ Fixes applied!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check for any TypeScript errors: pnpm tsc --noEmit"
Write-Host "2. Run the test script: pnpm tsx scripts/test-research-ui-integration.ts"
Write-Host "3. Start dev server: pnpm dev"
Write-Host "4. Test the research interface manually"
