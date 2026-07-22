FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NAVER_MAP_CLIENT_ID
RUN VITE_NAVER_MAP_NCP_KEY_ID=$NAVER_MAP_CLIENT_ID npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["node", "server/index.js"]
