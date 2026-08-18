param([Parameter(Mandatory=$true)][string]$BackupFile)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup not found: $BackupFile" }
$env:PGPASSWORD = if ($env:QUALITY_HUB_DB_PASSWORD) { $env:QUALITY_HUB_DB_PASSWORD } else { 'quality_hub_dev' }
& pg_restore.exe --host localhost --port 5432 --username quality_hub --dbname quality_hub --clean --if-exists --no-owner $BackupFile
if ($LASTEXITCODE -ne 0) { throw 'pg_restore завершился с ошибкой' }
Write-Host 'Database restored successfully'
