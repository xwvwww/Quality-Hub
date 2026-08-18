$ErrorActionPreference = 'Stop'

# Node.js must trust the Windows certificate store in corporate networks where
# HTTPS traffic is inspected by an organization-issued root certificate.
$env:NODE_OPTIONS = '--use-system-ca'

Write-Host 'Installing workspace dependencies...'
corepack pnpm install --reporter=append-only

Write-Host 'Starting PostgreSQL, Redis and MinIO...'
docker compose up -d postgres redis minio

Write-Host 'Generating Prisma Client...'
corepack pnpm db:generate

Write-Host 'Applying database migrations...'
corepack pnpm db:migrate

Write-Host 'Loading demo data...'
corepack pnpm db:seed

Write-Host ''
Write-Host 'Setup complete. Start the application with:'
Write-Host "`$env:NODE_OPTIONS='--use-system-ca'; corepack pnpm dev"
