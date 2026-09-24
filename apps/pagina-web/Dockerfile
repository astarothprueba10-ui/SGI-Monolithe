FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 5175

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
