FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VWORLD_API_KEY
RUN VITE_VWORLD_API_KEY=$VWORLD_API_KEY npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY data ./data
COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["node", "server/index.js"]
