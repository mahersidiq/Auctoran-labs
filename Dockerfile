FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production TRUST_PROXY=true
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:${PORT:-3000}/healthz || exit 1
CMD ["node", "server.mjs"]
