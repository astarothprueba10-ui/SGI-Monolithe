FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install -g npm@10.9.2 \
    && npm ci --include=dev --include=optional --no-audit --no-fund \
    && test -f node_modules/vite/bin/vite.js \
    && ./node_modules/.bin/vite --version

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]