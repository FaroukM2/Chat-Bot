# Build Stage for Client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production Stage for Server
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server/ ./server/
COPY --from=client-build /app/client/build ./client/build

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server/index.js"]
