param([Parameter(Mandatory=$true)][string]$BackupFile)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup not found: $BackupFile" }
if (-not $env:QUALITY_HUB_DB_PASSWORD) { throw 'QUALITY_HUB_DB_PASSWORD is required' }
$env:PGPASSWORD = $env:QUALITY_HUB_DB_PASSWORD
$hostName = if ($env:QUALITY_HUB_DB_HOST) { $env:QUALITY_HUB_DB_HOST } else { 'localhost' }
$port = if ($env:QUALITY_HUB_DB_PORT) { $env:QUALITY_HUB_DB_PORT } else { '5432' }
$user = if ($env:QUALITY_HUB_DB_USER) { $env:QUALITY_HUB_DB_USER } else { 'quality_hub' }
$database = if ($env:QUALITY_HUB_DB_NAME) { $env:QUALITY_HUB_DB_NAME } else { 'quality_hub' }
& pg_restore.exe --host $hostName --port $port --username $user --dbname $database --clean --if-exists --no-owner $BackupFile
if ($LASTEXITCODE -ne 0) { throw 'pg_restore завершился с ошибкой' }
Write-Host 'Database restored successfully'
