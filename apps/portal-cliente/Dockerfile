FROM node:22-slim
WORKDIR /app

COPY . .
RUN if [ ! -d "node_modules" ]; then npm install --no-audit --no-fund; fi

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
