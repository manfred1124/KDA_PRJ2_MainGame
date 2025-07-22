# 1) Build 단계
FROM node:18-alpine AS builder
WORKDIR /app
# COPY package.json yarn.lock ./
# RUN yarn install --frozen-lockfile

COPY package.json package-lock.json ./
# npm 방식으로 의존성 설치
RUN npm ci

COPY . .
RUN yarn build

# 2) Serve 단계
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# (필요시 Nginx 설정 덮어쓰기)
