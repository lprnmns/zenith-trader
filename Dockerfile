# Node.js 18 Alpine image kullan
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# Package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production

# Prisma client'ı generate et
COPY prisma ./prisma/
RUN npx prisma generate

# Uygulama kodlarını kopyala
COPY . .

# Environment variables için .env dosyasını kopyala (production'da farklı olacak)
COPY .env.example .env

# Port'u expose et
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Uygulamayı başlat
CMD ["npm", "start"]
