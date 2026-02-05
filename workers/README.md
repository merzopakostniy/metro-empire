# Metro Empire API (Cloudflare Workers + D1)

## 1) Создать D1 базу
```
npx wrangler d1 create metro-empire
```
Скопируйте `database_id` и вставьте в `wrangler.jsonc`.

## 2) Применить схему
```
npx wrangler d1 execute metro-empire --file workers/schema.sql
```

## 3) Добавить секрет с токеном бота
```
npx wrangler secret put BOT_TOKEN
```

## 4) Деплой воркера
```
npx wrangler deploy
```

## 5) Подключить фронт
Добавьте переменную окружения для Pages:
```
VITE_API_BASE=https://<your-worker>.workers.dev
```
Затем запушьте изменения — Cloudflare Pages подхватит переменную на новом деплое.
