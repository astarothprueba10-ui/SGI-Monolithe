FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=optional --no-audit --no-fund

COPY . .

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]