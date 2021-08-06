FROM node:12

WORKDIR /app
COPY . /app
RUN yarn

ENTRYPOINT [ "node", "/app/main.js"]