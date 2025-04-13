FROM node:20.10-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20.10-alpine AS production

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY package*.json ./
COPY prisma ./prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Command to run the application
CMD ["node", "dist/main"]