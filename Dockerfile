FROM node:20-alpine AS dependencies

WORKDIR /app
RUN npm i -g pnpm

# Install openssl for argon2
RUN apk add --no-cache openssl

# Copy dependency files
COPY ./backend/package.json ./backend/package.json
COPY ./backend/pnpm-lock.yaml ./backend/pnpm-lock.yaml
COPY ./frontend/package.json ./frontend/package.json
COPY ./frontend/pnpm-lock.yaml ./frontend/pnpm-lock.yaml

# Install dependencies for backend
WORKDIR /app/backend
RUN pnpm i --frozen-lockfile

# Install dependencies for frontend
WORKDIR /app/frontend
RUN pnpm i --frozen-lockfile

FROM node:20-alpine AS build

# Install openssl for packages that need it
RUN apk add --no-cache openssl

WORKDIR /app
RUN npm i -g pnpm
COPY . .

# Copy dependencies from dependencies to build
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=dependencies /app/backend/pnpm-lock.yaml ./backend/pnpm-lock.yaml
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules
COPY --from=dependencies /app/frontend/pnpm-lock.yaml ./frontend/pnpm-lock.yaml

# Build backend
WORKDIR /app/backend
RUN pnpm prisma generate
RUN pnpm run build

# Prune backend dependencies to only production
RUN pnpm prune --prod

# Build frontend
WORKDIR /app/frontend
RUN pnpm run build

# Setup release container
FROM node:20-alpine AS release

# Install openssl for packages that need it
RUN apk add --no-cache openssl

WORKDIR /app
RUN npm i -g pnpm

# Copy dependencies from build to release
COPY --from=build /app/backend/node_modules ./backend/node_modules

# Setup prisma
COPY --from=build /app/backend/prisma ./backend/prisma

# Copy build files
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/build ./frontend/build
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/pnpm-lock.yaml ./backend/pnpm-lock.yaml

WORKDIR /app/backend

RUN pnpm install prisma

EXPOSE 3000
CMD echo "Sleeping for 5 seconds to ensure database has started.";/bin/sleep 5;pnpm prisma db push;pnpm start