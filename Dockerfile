# Stage 1: Build NestJS app
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build NestJS (dist/)
RUN npm run build

# Stage 2: Run production build
FROM node:18-alpine
WORKDIR /app

# Copy build output + node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose NestJS port
EXPOSE 3000

# Run the app
CMD ["node", "dist/src/main.js"]
