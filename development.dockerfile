FROM node:20.10-alpine

WORKDIR /usr/app

COPY package.json ./
# COPY yarn.lock ./

RUN npm install

CMD npm migrate:deploy && npm start:dev