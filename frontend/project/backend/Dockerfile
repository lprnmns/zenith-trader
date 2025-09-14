FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm install --omit=dev || yarn install --frozen-lockfile || true
COPY . .
RUN npm run build || yarn build
ENV PORT=8081
EXPOSE 8081
CMD ["node", "dist/index.js"]
