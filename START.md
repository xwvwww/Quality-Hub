# Quality Hub — команды запуска

Все команды выполняются в Windows PowerShell из корня проекта:

```powershell
cd "C:\Users\Almen.Alnur\Desktop\QA Project"
```

## 1. Первый запуск

Установить зависимости:

```powershell
corepack enable
corepack pnpm install
```

Создать локальный `.env`, если его ещё нет:

```powershell
Copy-Item .env.example .env
```

Перед продолжением проверьте в `.env` значение `DATABASE_URL` и убедитесь, что PostgreSQL 16 запущен.

Подготовить Prisma и базу данных:

```powershell
corepack pnpm run db:generate
corepack pnpm run db:migrate
corepack pnpm run db:seed
```

## 2. Обычный ежедневный запуск

Откройте три отдельных окна PowerShell.

### Окно 1 — Backend, порт 4000

```powershell
cd "C:\Users\Almen.Alnur\Desktop\QA Project"
corepack pnpm --filter backend dev
```

API будет доступен по адресу `http://localhost:4000/api`.

### Окно 2 — пользовательский портал, порт 3000

```powershell
cd "C:\Users\Almen.Alnur\Desktop\QA Project"
corepack pnpm --filter frontend dev
```

Откройте `http://localhost:3000`.

### Окно 3 — административный портал, порт 3001

```powershell
cd "C:\Users\Almen.Alnur\Desktop\QA Project"
corepack pnpm run dev:admin
```

Откройте `http://localhost:3001`.

## 3. Остановка

В каждом окне с запущенным приложением нажмите:

```text
Ctrl+C
```

## 4. Проверки перед коммитом

TypeScript во всех приложениях:

```powershell
corepack pnpm typecheck
```

Все тесты:

```powershell
corepack pnpm test
```

Production-сборка:

```powershell
corepack pnpm build
```

Проверка production-зависимостей:

```powershell
corepack pnpm audit --prod --audit-level high
```

Полная локальная проверка перед отправкой в GitHub:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## 5. Prisma и PostgreSQL

Пересобрать Prisma Client:

```powershell
corepack pnpm run db:generate
```

Применить существующие миграции:

```powershell
corepack pnpm --filter backend run prisma:deploy
```

Создать новую миграцию после изменения `schema.prisma`:

```powershell
corepack pnpm run db:migrate
```

Повторно добавить демонстрационные данные:

```powershell
corepack pnpm run db:seed
```

> Перед `db:generate` остановите backend через `Ctrl+C`. На Windows запущенный backend может блокировать файл Prisma `query_engine-windows.dll.node`.

## 6. Полезные адреса

- Пользовательский портал: `http://localhost:3000`
- Административный портал: `http://localhost:3001`
- Backend API: `http://localhost:4000/api`

## 7. Quality Hub Automation Agent

Agent выполняет queued-запуски Playwright или Selenium вне backend. Для запуска нужен API-ключ проекта из страницы `Интеграции`.

В отдельном PowerShell:

```powershell
$env:QUALITY_HUB_API_KEY = "qh_..."
corepack pnpm agent
```

По умолчанию Agent проверяет очередь каждые 5 секунд. Для одной проверки:

```powershell
$env:QUALITY_HUB_API_KEY = "qh_..."
corepack pnpm agent -- --once
```

Если у проекта указан Repository URL, Agent временно клонирует выбранную ветку, выполняет команду suite и удаляет checkout после завершения. Если repository не указан, команда выполняется из текущей рабочей директории Agent.

Дополнительные переменные:

```powershell
$env:QUALITY_HUB_API_URL = "http://localhost:4000/api"
$env:QUALITY_HUB_POLL_MS = "5000"
$env:QUALITY_HUB_WORKSPACE = "C:\qh-agent-workspaces"
$env:QUALITY_HUB_WORKDIR = "C:\path\to\local\test-project"
```

`QUALITY_HUB_WORKDIR` используется, если у suite не указан Repository URL. Команда suite получает переменные `QUALITY_HUB_RUN_ID`, `QUALITY_HUB_PROJECT_ID`, `QUALITY_HUB_FRAMEWORK` и `QUALITY_HUB_ENVIRONMENT`.

## 8. Частые проблемы

## 9. Подготовка к alpha и production

`.env.example` предназначен только для локальной разработки. Перед alpha/production:

- используйте секреты из secret manager, а не значения из репозитория;
- задайте `NODE_ENV=production`, `COOKIE_SECURE=true`, HTTPS для `FRONTEND_URL` и `SWAGGER_ENABLED=false`;
- замените `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, пароли PostgreSQL и MinIO на уникальные случайные значения;
- не публикуйте PostgreSQL, Redis и MinIO наружу; в compose они привязаны только к `127.0.0.1`;
- ограничьте `TRUST_PROXY_HOPS` фактическим числом reverse proxy;
- задавайте `QUALITY_HUB_DB_PASSWORD` при резервном копировании и восстановлении; backup-скрипты больше не используют пароль по умолчанию;
- запускайте Agent под отдельным непривилегированным пользователем или в одноразовом контейнере с ограничением сети и файловой системы.

Automation Agent дополнительно требует явный allowlist хостов репозиториев:

```powershell
$env:QUALITY_HUB_ALLOWED_REPOSITORY_HOSTS = "github.com"
$env:QUALITY_HUB_ALLOWED_COMMANDS = "pnpm,npm,npx,pytest,mvn,gradle,node"
```

Agent не передаёт API key и остальные секреты Quality Hub в процесс теста, не использует shell-команды и завершает тест по таймауту. Это не заменяет контейнерную/VM-изоляцию: тестовый код всё равно является недоверенным кодом.

### `ECONNREFUSED 127.0.0.1:4000`

Backend не запущен. Выполните:

```powershell
corepack pnpm --filter backend dev
```

### `Port 3000/3001 is already in use`

В другом PowerShell уже работает Next.js. Найдите процесс:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | Select-Object LocalPort,State,OwningProcess
```

Сначала вернитесь в окно запущенного приложения и остановите его через `Ctrl+C`.

### Prisma сообщает об отсутствующем столбце

Остановите backend и выполните:

```powershell
corepack pnpm --filter backend run prisma:deploy
corepack pnpm run db:generate
corepack pnpm --filter backend dev
```

### После обновления frontend отображает старую версию

Остановите frontend через `Ctrl+C`, затем запустите снова:

```powershell
corepack pnpm --filter frontend dev
```

После запуска обновите страницу браузера сочетанием `Ctrl+F5`.
