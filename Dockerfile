# ============================================
# 前端 Dockerfile — 多阶段构建
# 阶段1: Node 构建
# 阶段2: Nginx 提供静态文件
# 构建上下文: carecubeai-web/
# ============================================

FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build:prod

FROM nginx:alpine
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
