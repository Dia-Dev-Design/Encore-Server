FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]