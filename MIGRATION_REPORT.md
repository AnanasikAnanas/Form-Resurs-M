# Отчёт V2.4

Исходная архитектура: Next.js API, Prisma/PostgreSQL, Node SMTP, серверный рендеринг контактов и юридических страниц. В локальном репозитории до этой работы существовали только bootstrap, Common и Security для PHP; прежние модули Node были архивированы, но временно возвращены в src для локального запуска.

Сейчас добавлены PHP-модули Files, Applications и Notifications, SQL Application/ApplicationFile/NotificationJob/RateLimit, PHP API с прежними адресами /api/inquiries/ и /api/inquiries/token/, публичные settings, CLI для миграции, cron, просмотра и удаления, статическая сборка Next.js, пакет для хостинга. Исходные страницы, услуги, фото и анимации сохранены. Пользовательские документы лежат в LONGBLOB, а обычная выборка исключает content. Атомарное сохранение включает задачу почты.

Основные файлы: next.config.ts, package.json и lock, AGENTS.md, src/app/{contacts,privacy}, src/components/{remote-inquiry-form,remote-legal}, backend/**, scripts/package-hosting.mjs, README.md, DEPLOYMENT.md. Архив Node/Prisma остаётся в legacy/node; рабочие восстановленные копии src/server и src/app/api убраны из проекта; архив остался в legacy/node.

Node runtime зависимости Prisma, pg, nodemailer, pdf-lib, sharp, file-type удалены из package.json. PHP библиотеки PHPMailer/FPDI/FPDF находятся в Composer config; сборку vendor через Composer и тестирование PHP необходимо завершить до публикации. Новый API /api/inquiries/settings/ предоставляет только публичную конфигурацию и тексты утверждённых документов. Изменение: настройки формы в статическом фронтенде загружаются после открытия страницы.

Ограничения: в текущей macOS среде нет PHP, Composer и MySQL; отправка заявки, SQL и SMTP в этом ходе интеграционно не проверены. Развёртывание и production миграции не выполнялись. Хостеру необходимо подтвердить расширения PHP, доступ к cron, SMTP и ClamAV. Владелец должен предоставить утверждённые документы и сроки хранения, получателя PROJECT_MANAGER_EMAIL, параметры БД и SMTP. При отсутствии сканера API отказывает в обработке вложений.

Проверено в текущем окружении: Next.js production build завершился успешно и сформировал 15 статических маршрутов, ESLint пройден, 4 теста Motion прошли, собственные PHP-файлы прошли синтаксический разбор через PHP 8.3 WASM. Это не заменяет функциональные тесты PHP API с MySQL, SMTP и реальным ClamAV. Пакет deploy/shared-hosting сформирован. Визуальная проверка мобильных ширин и реальный хостинг не проверены.
