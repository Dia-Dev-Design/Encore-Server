# Development stage
FROM node:20.10-alpine AS development

WORKDIR /usr/app

COPY package.json ./
RUN npm install

COPY . ./
RUN npm prisma generate && npm run build

# Production stage
FROM node:20.10-alpine AS production

WORKDIR /usr/app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package.json yarn.lock ./

RUN npm install --production && npm add ts-node

COPY . ./

COPY --from=development /usr/app/dist ./dist
COPY --from=development /usr/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=development /usr/app/node_modules/@prisma ./node_modules/@prisma

RUN ls -la ./dist

CMD ["sh", "-c", "npm prisma migrate deploy && npm ts-node prisma/seed/index.ts && npm run start:prod"]