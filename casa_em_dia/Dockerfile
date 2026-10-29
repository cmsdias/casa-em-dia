FROM node:22-alpine
RUN apk add --no-cache su-exec
WORKDIR /opt/casa-em-dia
COPY server.js seed.json package.json ./
COPY public ./public
RUN mkdir -p /data && chown -R node:node /data /opt/casa-em-dia
ENV PORT=3000 HOST=0.0.0.0 DATA_DIR=/data NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "chown -R node:node /data && exec su-exec node node server.js"]
