FROM node:20.10-alpine

WORKDIR /usr/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

CMD yarn migrate:deploy && yarn start:dev