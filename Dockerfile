FROM python:3.10.12-alpine AS base

FROM base AS builder
RUN apk add --no-cache \
    libc6-compat \
    openssh \
    git \
    make \
    nodejs \
    npm \
    build-base \
    gcc \
    bash \
    curl \
    jq

RUN git config --global url."https://github".insteadOf ssh://git@github

WORKDIR /app
RUN npm install -g yarn

RUN mkdir -p packages/client
RUN mkdir -p packages/contracts

COPY packages/client/package.json packages/client/
COPY packages/client/yarn.lock* packages/client/

COPY packages/contracts/package.json packages/client/
COPY packages/contracts/yarn.lock* packages/client/

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* lerna.json ./


RUN cd packages/contracts \
        && yarn install


RUN yarn install


COPY . .
RUN yarn
#RUN cd packages/client \
#    && yarn build
RUN yarn workspace client run build

# production environment
FROM nginx:stable as runner
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html

COPY etc/nginx/nginx-docker.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
