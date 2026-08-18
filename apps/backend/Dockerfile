FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --filter backend... --frozen-lockfile=false
COPY apps/backend apps/backend
RUN pnpm --filter backend prisma:generate && pnpm --filter backend build
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app ./
EXPOSE 4000
CMD ["pnpm","--filter","backend","start:prod"]
