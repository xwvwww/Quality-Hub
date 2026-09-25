param([string]$OutputDirectory = ".\backups")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $OutputDirectory "quality-hub-$stamp.dump"
if (-not $env:QUALITY_HUB_DB_PASSWORD) { throw 'QUALITY_HUB_DB_PASSWORD is required' }
$env:PGPASSWORD = $env:QUALITY_HUB_DB_PASSWORD
$hostName = if ($env:QUALITY_HUB_DB_HOST) { $env:QUALITY_HUB_DB_HOST } else { 'localhost' }
$port = if ($env:QUALITY_HUB_DB_PORT) { $env:QUALITY_HUB_DB_PORT } else { '5432' }
$user = if ($env:QUALITY_HUB_DB_USER) { $env:QUALITY_HUB_DB_USER } else { 'quality_hub' }
$database = if ($env:QUALITY_HUB_DB_NAME) { $env:QUALITY_HUB_DB_NAME } else { 'quality_hub' }
& pg_dump.exe --host $hostName --port $port --username $user --dbname $database --format custom --file $target
if ($LASTEXITCODE -ne 0) { throw 'pg_dump завершился с ошибкой' }
Write-Host "Backup created: $target"
