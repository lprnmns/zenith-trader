# Docker Container Backup Commands

## Azure Ubuntu Sunucuda (SSH üzerinden):

```bash
# 1. Mevcut çalışan konteyneri commit ederek imaj oluştur
docker commit zenithtrader_app lprnmns/zenith-trader:backup-2025-01-09-stable

# 2. Docker Hub'a push et
docker push lprnmns/zenith-trader:backup-2025-01-09-stable

# 3. Opsiyonel: Son çalışan versiyonu da latest-stable olarak etiketle
docker tag lprnmns/zenith-trader:backup-2025-01-09-stable lprnmns/zenith-trader:latest-stable
docker push lprnmns/zenith-trader:latest-stable
```

## Backup'ı Geri Yükleme (Gerekirse):

```bash
# Eski konteyneri durdur ve kaldır
docker stop zenithtrader_app
docker rm zenithtrader_app

# Backup imajdan yeni konteyner başlat
docker run -d --name zenithtrader_app \
  -p 3001:3001 \
  --env-file /path/to/.env.docker \
  --network zenith_network \
  -v /path/to/logs:/app/logs \
  -v /path/to/uploads:/app/uploads \
  lprnmns/zenith-trader:backup-2025-01-09-stable
```

## Lokal Windows'ta Test İçin:

```powershell
# Backup imajı çek
docker pull lprnmns/zenith-trader:backup-2025-01-09-stable

# Test konteyneri başlat
docker run -d --name zenith-test -p 3002:3001 lprnmns/zenith-trader:backup-2025-01-09-stable
```