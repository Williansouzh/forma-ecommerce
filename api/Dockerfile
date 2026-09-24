# syntax=docker/dockerfile:1

# Dependências completas, para compilar. `npm ci` com o lockfile: `npm install`
# com só o package.json resolvia as faixas `^` de novo a cada build, e a
# imagem de produção podia sair com versões que nenhum teste viu.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS builder
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Só o que roda em produção. A imagem anterior levava as devDependencies
# inteiras (jest, eslint, o compilador) — peso e superfície sem função nenhuma
# num contêiner que só executa `dist/`.
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
# Sem root: uma falha explorável na API não herda o contêiner inteiro.
USER node
EXPOSE 4000
# O `/health` responde sem sessão; o `wget` vem do busybox do alpine. A porta
# é a 4000 do `docker-compose.prod.yml` — mudar `PORT` pede mudar aqui também.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null || exit 1
CMD ["node", "dist/main.js"]
