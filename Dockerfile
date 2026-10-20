FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production TRUST_PROXY=true DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:${PORT:-3000}/healthz || exit 1
CMD ["node", "server.mjs"]
