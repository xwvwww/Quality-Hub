# Quality Hub

<div align="center">
  <strong>Современное рабочее пространство для управления качеством продукта</strong>
  <br><br>
  <a href="https://github.com/xwvwww/Quality-Hub/actions"><img alt="Quality Hub CI" src="https://github.com/xwvwww/Quality-Hub/actions/workflows/quality.yml/badge.svg"></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-111827?logo=nextdotjs">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-API-E0234E?logo=nestjs">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
</div>

## О проекте

Quality Hub объединяет ежедневные QA-процессы в одном интерфейсе: от требований и тест-кейсов до запусков, дефектов, аналитики и отчётов. Платформа создана для команд, которым важны прозрачность, трассируемость и понятная картина качества.

## Возможности

- проекты, требования и трассируемость;
- версионируемые тест-кейсы с шагами и приоритетами;
- тест-планы и масштабируемые тестовые запуски;
- фиксация результатов, времени и вложений;
- дефекты, Kanban-представление и командные комментарии;
- метрики, аналитика и печатные отчёты;
- роли, профили, активные сессии и журнал аудита;
- светлая и тёмная темы, глобальный поиск и уведомления.

## Технологии

| Уровень | Стек |
|---|---|
| Web | Next.js, React, TypeScript, Tailwind CSS |
| API | NestJS, Prisma, REST |
| Data | PostgreSQL |
| Quality | Jest, TypeScript, GitHub Actions |

## Локальный запуск

Потребуются Node.js 22+, pnpm 9+ и PostgreSQL 16. Параметры среды создаются на основе `.env.example`.

```powershell
corepack enable
corepack pnpm install
corepack pnpm --filter backend prisma generate
corepack pnpm --filter backend prisma migrate deploy
corepack pnpm --filter backend dev
```

Во втором терминале:

```powershell
corepack pnpm --filter frontend dev
```

Frontend будет доступен по адресу `http://localhost:3000`.

Системное администрирование вынесено в отдельное приложение. В третьем терминале:

```powershell
corepack pnpm --filter admin-portal dev
```

Пользовательский портал работает на `http://localhost:3000`, административный — на `http://localhost:3001`. Системный администратор управляет организациями, учётными записями, ролями и аудитом; рабочие QA-данные остаются в пользовательском портале.

## Проверка качества

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Владелец и автор

Quality Hub создан и разработан **Almen Alnur**.

Copyright © 2026 Almen Alnur. All rights reserved.

## Лицензия

Это проприетарное программное обеспечение. Копирование, изменение, распространение или коммерческое использование без письменного разрешения владельца запрещено. Полные условия приведены в [LICENSE](LICENSE).
