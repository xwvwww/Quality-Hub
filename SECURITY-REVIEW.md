# Quality Hub Security Review

Дата аудита: 2026-09-25

Аудит выполнен перед alpha/production-подготовкой репозитория. Проверялись конфигурация, authentication/authorization, tenant isolation, uploads, automation execution, Docker Compose, backup scripts, CI и документация.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | [apps/automation-agent/src/index.mjs](./apps/automation-agent/src/index.mjs) | 64-120 | Automation Agent выполнял команду suite через OS shell, передавал весь environment и позволял клонировать произвольные repositories. Компрометация tenant-пользователя или репозитория могла привести к выполнению кода и краже API key/секретов на Agent host. | 10/10 |
| 2 | 🟡 MEDIUM | [docker-compose.yml](./docker-compose.yml) | 3-25 | PostgreSQL, Redis и MinIO публиковались на всех интерфейсах, использовали fallback credentials, а production compose автоматически выполнял seed. | 10/10 |
| 3 | 🟡 MEDIUM | [.env.example](./.env.example) | 1-20 | Example-конфигурация могла быть ошибочно использована как production: development mode, HTTP, insecure cookie, Swagger и предсказуемые локальные credentials. | 9/10 |
| 4 | 🟡 MEDIUM | [scripts/backup-postgres.ps1](./scripts/backup-postgres.ps1), [scripts/restore-postgres.ps1](./scripts/restore-postgres.ps1) | 1-12 | Backup/restore использовали fallback пароль базы данных, что создавало риск незаметного запуска с известными credentials. | 9/10 |

## Remediation

- Agent больше не использует `shell: true`; команда разбирается на executable и arguments и проверяется через allowlist.
- Agent не передаёт API key и произвольные секреты Quality Hub в тестовый процесс.
- Repository checkout разрешён только для HTTPS-хостов из `QUALITY_HUB_ALLOWED_REPOSITORY_HOSTS`.
- Добавлены ограничения команды по умолчанию и timeout выполнения.
- PostgreSQL, Redis и MinIO в Compose привязаны к `127.0.0.1`, credentials обязательны, а backend использует Docker service names.
- Production Compose больше не запускает demo seed.
- Backend не стартует в production без HTTPS frontend, secure cookies, отключённого Swagger и отключённого demo seed.
- Backup/restore требуют `QUALITY_HUB_DB_PASSWORD` и больше не имеют fallback database password.
- README и START.md получили alpha/production hardening checklist.

## Validation

- Workspace typecheck: passed.
- Backend typecheck: passed.
- Backend tests: 17 suites, 61 tests passed.
- Frontend production build: passed.
- Agent `node --check`: passed.
- Docker Compose config validation: passed.
- `git diff --check`: passed.
- `pnpm audit --prod --audit-level high`: не завершён из-за TLS-ошибки локальной среды `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; это не является результатом анализа уязвимостей.

## Checks without reportable findings

- JWT verification and refresh-token rotation используют настроенные secrets; refresh tokens хранятся в hashed виде.
- В проверенных automation и attachment queries присутствует organization/project scoping.
- Upload paths используют generated keys, а не пользовательские filesystem paths.
- Явных SQL injection, SSRF, open redirect или unsafe deserialization в проверенном коде не обнаружено.
- Реальный `.env` не отслеживается Git; аудит не раскрывал и не выводил runtime secrets.

## Remaining deployment requirements

Source hardening не заменяет инфраструктурную изоляцию. Перед production необходимо отдельно подтвердить:

- TLS на reverse proxy и корректный HSTS/security headers policy;
- firewall/security groups и отсутствие внешнего доступа к database/Redis/MinIO;
- запуск Agent в disposable container/VM под non-root user с network egress restrictions;
- secret manager, rotation и backup encryption;
- monitoring, alerting, rate limits и restore drill.
