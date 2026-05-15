# Genom v4 — Personality Genome Project

## URL
https://genom-v4.protocolbsi.workers.dev

## Что это
Генератор цифровых личностей (системных промптов) для чатов. 25 категорий-глав, которые заполняет пользователь. На выходе — готовый промпт личности.

## Техстек
- **Фронтенд:** Vanilla JS (ES modules), Vite (dev only), CSS custom properties
- **Бэкенд:** Cloudflare Workers (Service Worker format), D1 (SQLite)
- **Хостинг:** Cloudflare Workers (геном-v4.protocolbsi.workers.dev)
- **AI:** OpenRouter (DeepSeek Chat free / GPT-4o-mini) — пока отключён
- **GitHub:** https://github.com/protocolbsi-genom/-genom-v4

## Структура фронтенда
```
/index.html              — вся разметка (SPA, 25 глав)
/src/
  /styles/style.css      — все стили (тёмная тема, ~400 строк)
  /main.js               — entry point, экспорт функций в window
  /data/
    chapters.js          — CHAPTERS[], CHAPTER_KEYS, keyFields
    defaults.js          — DEFAULTS{} (Анна), DEFAULT_TAGS{}
  /modules/
    ui.js                — навигация, табы, теги, модалки
    genome.js             — сбор данных, генерация промпта
    storage.js           — localStorage + cloud sync
    analysis.js          — локальный аудит текста (keyword-based)
    api.js               — HTTP клиент для API
```

## API эндпоинты
- `POST /api/register` — регистрация
- `POST /api/login` — логин
- `GET /api/me` — профиль
- `GET /api/personas` — список личностей
- `POST /api/personas` — сохранить личность
- `DELETE /api/personas/:id` — удалить
- `POST /api/analyze` — AI анализ текста (требует ключ OpenRouter)
- `POST /api/chat` — диалог с личностью (требует ключ OpenRouter)

## Дизайн-система
```css
:root {
  --bg: #08090c;        /* фон */
  --s1: #0f1016;         /* карты */
  --s2: #16171f;         /* инпуты */
  --s3: #1e1f2a;         /* кнопки */
  --br: #2a2b3a;         /* границы */
  --acc: #e8ff47;        /* акцент жёлтый */
  --acc2: #ff4f8b;       /* розовый */
  --acc3: #47c8ff;       /* голубой */
  --acc4: #b47fff;       /* фиолетовый */
  --tx: #dde0f0;         /* текст */
  --tx2: #8890b0;        /* втор. текст */
  --mono: 'DM Mono', monospace;
  --dis: 'Syne', sans-serif;
}
```

## Что нужно улучшить (визуальная часть)
Приоритеты от заказчика:
1. Hero-секция / главная страница (сейчас просто карточка)
2. Навигация (поиск по главам, избранное/быстрый доступ)
3. UX форм (автосохранение при вводе, прогресс-бар заполнения)
4. Личный кабинет (профиль, настройки, темы светлая/тёмная)
5. Шаблоны личностей (готовые пресеты с красивыми карточками)
6. Экспорт промпта (визуализация структуры, подсветка слоёв)
7. Адаптация под мобильные (сейчас частично)
8. Микро-анимации, переходы, интерактивные feedback

## Роли
- **Архитектор/бэкенд:** занимается API, D1, Worker, AI интеграцией
- **Фронтенд:** все визуальные изменения, UX, анимации, компоненты

## Как вносить изменения
1. Править файлы в `/src/`
2. Изменения автоматически подтягиваются на сайт через Git push (GitHub → Worker proxy)
3. CSS уже подключен через `<link>` в index.html, JS через `<script type="module">`
4. Все глобальные функции экспортируются в `window` в main.js для HTML onclick
