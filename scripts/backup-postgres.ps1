param([string]$OutputDirectory = ".\backups")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $OutputDirectory "quality-hub-$stamp.dump"
$env:PGPASSWORD = if ($env:QUALITY_HUB_DB_PASSWORD) { $env:QUALITY_HUB_DB_PASSWORD } else { 'quality_hub_dev' }
& pg_dump.exe --host localhost --port 5432 --username quality_hub --dbname quality_hub --format custom --file $target
if ($LASTEXITCODE -ne 0) { throw 'pg_dump завершился с ошибкой' }
Write-Host "Backup created: $target"
