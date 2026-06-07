FROM node:22-alpine

RUN apk add --no-cache git openssh-client

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
COPY shared/package*.json shared/

# Install all deps including devDependencies (needed for build)
# Use npm install instead of npm ci to be resilient to lockfile drift
RUN npm install

# Copy source and config
COPY tsconfig.base.json ./
COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build in order: shared → client → server
RUN npm run build --workspace=shared \
 && npm run build --workspace=client \
 && npm run build --workspace=server

ENV NOTES_ROOT=/data/notes
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
