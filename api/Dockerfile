FROM node:20.11.0-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

FROM node:20.11.0-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=build /app/package*.json ./

RUN npm ci --omit=dev

COPY --from=build --chown=nodejs:nodejs /app/src ./src

USER nodejs

EXPOSE 5000

CMD ["node", "src/server.js"]
