FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm install

# Copy all source code
COPY . .

EXPOSE 5000

# Run TypeScript directly with ts-node (no compilation needed)
CMD ["npx", "ts-node", "src/index.ts"]
