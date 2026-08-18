# Quality Hub

> Автор и разработчик: **Almen Alnur**  
> Copyright © 2026 Almen Alnur. All rights reserved.

Quality Hub является проприетарным программным обеспечением. Копирование,
изменение, распространение или коммерческое использование без предварительного
письменного разрешения Almen Alnur запрещено. Полные условия указаны в `LICENSE`.

Рабочая multi-tenant платформа управления QA. В Этапе 1 реализованы архитектура monorepo, полная доменная Prisma-схема, Docker-инфраструктура, NestJS API, вход по JWT с безопасной ротацией refresh-токенов, backend RBAC, tenant-scoped API и Next.js интерфейс на русском языке.

## Требования

- Node.js 22+, pnpm 9+
- Docker Engine с Docker Compose v2

## Быстрый запуск через Docker

```bash
cp .env.example .env
docker compose up --build
```

Frontend: http://localhost:3000, API: http://localhost:4000/api, Swagger: http://localhost:4000/api/docs, MinIO Console: http://localhost:9001.

Демонстрационный вход: `admin@example.com` / `Admin123!`. Перед production-развёртыванием смените пароль и оба JWT secrets.

## Локальная разработка

На Windows проще выполнить подготовленный bootstrap-скрипт. Он включает доверие
к системному хранилищу сертификатов для Node.js, устанавливает зависимости,
запускает инфраструктуру, применяет миграции и seed:

```powershell
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
$env:NODE_OPTIONS='--use-system-ca'
corepack pnpm dev
```

Ручной вариант:

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d postgres redis minio
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Если npm registry возвращает `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, используйте
системные сертификаты Windows перед командой установки:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
corepack pnpm install
```

Это сохраняет проверку TLS. Не используйте `strict-ssl=false`. Если сертификат
корпоративного центра сертификации отсутствует в Windows, запросите PEM-файл у
администратора и задайте его через `NODE_EXTRA_CA_CERTS`.

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --filter backend prisma validate
pnpm --filter backend prisma migrate status
```

## Архитектура

```text
apps/frontend     Next.js App Router, TypeScript, Tailwind
apps/backend      NestJS REST API, Swagger, guards, validation
  prisma          PostgreSQL schema, migrations, seed
packages          место для общих ui/types/config следующих этапов
```

Организация является границей данных. API получает `organizationId` только из проверенного JWT, а не из произвольного frontend-параметра. Роль участника организации проверяет глобальный `RolesGuard`. Пароли хешируются Argon2id. Access token короткоживущий; refresh token ротируется, в БД хранится только SHA-256 hash, а обнаружение повторного использования отзывает всю token family.

Схема заранее нормализует будущие домены: проекты, дерево репозитория, версии и шаги тест-кейсов, планы, раны и результаты, дефекты, требования и трассировку, вложения, комментарии, аудит, автоматизацию и performance-результаты. Индексы ориентированы на tenant-scoped поиск, фильтрацию и серверную пагинацию.

## Переменные окружения

Все параметры и безопасные шаблоны перечислены в `.env.example`. Для production обязательны уникальные `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, пароль PostgreSQL и MinIO, TLS и `COOKIE_SECURE=true`.

## API Этапа 1

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/organizations/current`
- `GET /api/users` — только Administrator и QA Lead

Swagger/OpenAPI генерируется из работающего NestJS приложения по `/api/docs`.
