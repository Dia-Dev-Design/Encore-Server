# Development stage
FROM node:20.10-alpine AS development

WORKDIR /usr/app

COPY package.json ./
RUN npm install

COPY . ./
RUN npx prisma generate && npm run build

# Production stage
FROM node:20.10-alpine AS production

WORKDIR /usr/app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package.json package-lock.json ./
# COPY package.json yarn.lock ./

RUN npm install --production && npm add ts-node

COPY . ./

COPY --from=development /usr/app/dist ./dist
COPY --from=development /usr/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=development /usr/app/node_modules/@prisma ./node_modules/@prisma

RUN ls -la ./dist

CMD ["sh", "-c", "npx prisma generate && npm ts-node && npm run start:prod"]