# Hard Reset Script for Next.js
# This clears all caches and restarts the dev server

Write-Host "Starting Hard Reset..." -ForegroundColor Cyan
Write-Host ""

# Stop any running dev servers
Write-Host "Step 1: Stopping any running dev servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node_modules*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# Delete .next folder
Write-Host "Step 2: Deleting .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   .next folder deleted" -ForegroundColor Green
}
else {
    Write-Host "   .next folder not found (already clean)" -ForegroundColor Gray
}

# Delete node_modules/.cache
Write-Host "Step 3: Deleting node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "   node_modules/.cache deleted" -ForegroundColor Green
}
else {
    Write-Host "   node_modules/.cache not found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Hard reset complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure REDIS_URL is removed or set correctly in .env.local"
Write-Host "   2. Run: npm run dev"
Write-Host ""
