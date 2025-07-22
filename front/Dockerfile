# 1) Build 단계
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build           # /app/dist 에 빌드 결과 생성

# 2) Serve 단계
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# (필요시 Nginx 설정 덮어쓰기)
