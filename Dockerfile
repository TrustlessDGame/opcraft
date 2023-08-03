FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat openssh git make python3
RUN git config --global url."https://github".insteadOf ssh://git@github

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN yarn install --network-concurrency 1

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn workspace client run build

FROM base AS runner
WORKDIR /app

COPY --from=builder /app/client/public ./public

EXPOSE 3000

CMD ["yarn", "workspace", "client", "run", "prod"]
