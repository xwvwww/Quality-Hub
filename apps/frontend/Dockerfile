FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --filter frontend... --frozen-lockfile=false
COPY apps/frontend apps/frontend
RUN pnpm --filter frontend build
EXPOSE 3000
CMD ["pnpm","--filter","frontend","start"]
