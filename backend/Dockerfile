FROM node:20-bookworm-slim

WORKDIR /app

# Install OpenSSL required by Prisma
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openssl \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY package*.json ./

# Prisma schema is needed during installation/generation
COPY prisma ./prisma

# Install exact dependencies
RUN npm ci

# Generate Prisma Client inside Debian/OpenSSL 3 environment
RUN npx prisma generate

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]