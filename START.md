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

## 7. Частые проблемы

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
