# Форм-Ресурс М

Next.js App Router, TypeScript, Tailwind и Motion; frontend собирается статически. Сервер заявок: PHP 8.2+, PDO, MySQL/MariaDB, SMTP + Cron. Node требуется для сборки, постоянно работающий Node в production не нужен.

Для фронтенда: npm ci; npm run dev; npm run lint; npm run typecheck; npm run build. Для публикации установите Composer зависимости в backend и выполните npm run package. Настройка размещения описана в DEPLOYMENT.md; фактические результаты и ограничения — в MIGRATION_REPORT.md.

Приём заявок отключён по умолчанию до утверждения документов и заполнения закрытой PHP-конфигурации. Legacy Node/Prisma сохранён отдельно. Реальные данные из PostgreSQL автоматически не переносятся.
