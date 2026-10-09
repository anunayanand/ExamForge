FROM node:20-slim

# Install docker CLI so we can spawn containers from within this container if needed
# Wait, normally we mount docker.sock to use the host's docker daemon.
RUN apt-get update && apt-get install -y docker.io

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# In production, run as non-root (but needs docker group access, typically we run as root if we use docker.sock directly, or bind group id)
CMD ["npm", "start"]
