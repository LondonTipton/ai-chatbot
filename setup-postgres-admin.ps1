# Run this script as Administrator
# Right-click and select "Run with PowerShell as Administrator"

Write-Host "Setting up PostgreSQL for AI Chatbot..." -ForegroundColor Green

# Backup pg_hba.conf
$pgData = "C:\Program Files\PostgreSQL\16\data"
$pgBin = "C:\Program Files\PostgreSQL\16\bin"

Write-Host "Backing up pg_hba.conf..." -ForegroundColor Yellow
Copy-Item "$pgData\pg_hba.conf" "$pgData\pg_hba.conf.backup" -Force

# Temporarily allow trust authentication
Write-Host "Temporarily enabling passwordless local access..." -ForegroundColor Yellow
(Get-Content "$pgData\pg_hba.conf") -replace 'scram-sha-256', 'trust' | Set-Content "$pgData\pg_hba.conf"

# Restart PostgreSQL
Write-Host "Restarting PostgreSQL service..." -ForegroundColor Yellow
Restart-Service postgresql-x64-16

# Wait for service to start
Start-Sleep -Seconds 3

# Reset postgres password and create database
Write-Host "Resetting postgres password and creating database..." -ForegroundColor Yellow
& "$pgBin\psql.exe" -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE aichatbot;"

# Restore original pg_hba.conf
Write-Host "Restoring original configuration..." -ForegroundColor Yellow
Copy-Item "$pgData\pg_hba.conf.backup" "$pgData\pg_hba.conf" -Force

# Restart PostgreSQL again
Write-Host "Restarting PostgreSQL service..." -ForegroundColor Yellow
Restart-Service postgresql-x64-16

Write-Host "`nSetup complete! Password is now 'postgres' and database 'aichatbot' is created." -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
