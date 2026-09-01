# ====================================================
# Telegram Personal Safety Userbot - Dockerfile
# ====================================================

FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install build dependencies in case native modules need compilation
RUN apk add --no-cache python3 make g++

# Copy package definition files
COPY package.json package-lock.json ./

# Install dependencies (including tsx for running typescript directly)
RUN npm ci

# Copy configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Define default environment variables
ENV NODE_ENV=production

# Start userbot
CMD ["npm", "start"]
