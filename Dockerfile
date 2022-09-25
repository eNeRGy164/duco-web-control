FROM node:18-alpine as build
WORKDIR /app
COPY . .
RUN npm ci --omit=dev \
&&  npm install --global @vercel/ncc \
&&  ncc build app.js --out dist --minify --no-cache

FROM alpine:3
RUN apk add --no-cache \
    curl \
    nodejs
WORKDIR /app
COPY wwwroot wwwroot
COPY cert cert
COPY --from=build /app/dist/* ./

EXPOSE 8080
EXPOSE 8443

HEALTHCHECK --timeout=3s \
  CMD curl -f http://localhost:8080/ || exit 1

CMD [ "node", "index.js" ]
