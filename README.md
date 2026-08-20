# WorldLog

**WorldLog** — паспорт Minecraft-світу від команди DiJital. Інструмент для документування світу: гравців, локацій, планів та історії у вигляді часової шкали. Open-source, MIT-ліцензія.

## Функції (MVP)

- Реєстрація / логін (JWT).
- Світи: CRUD з назвою, описом, сідом, датою початку та обкладинкою.
- Гравці: нікнейм, роль, аватар.
- Локації: координати X/Y/Z, категорія та багатофайлова галерея скріншотів.
- Todo-лист: пріоритети, дедлайни, стан виконання.
- Історія світу: події автоматично сортуються за датою і рендеряться як дорожня карта (timeline) з кольоровими вузлами за категорією.
- Закладка під майбутнє: сутність Membership (world/user/role/status) передбачена в моделі даних для запрошень та ролей.

## Технології

- **Backend**: Django + Django REST Framework, SimpleJWT, Pillow, django-cors-headers
- **Frontend**: React, Vite, MUI (Material Design 3), React Router, React Query, Axios
- **БД**: PostgreSQL (прод), SQLite (локально)
- **Зображення**: Cloudinary або S3-сумісне сховище (опційно через `CLOUDINARY_URL`)

## 🚀 Швидкий старт (локально)

Передумови: Python 3.12+, Node 20+.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# API: http://localhost:8000/api/
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Landing: http://localhost:5173
# Vite проксіює /api -> localhost:8000
```

### Docker (backend + Postgres однією командою)

```bash
docker compose up --build
```

## Деплой

- Backend + PostgreSQL: [Render.com](https://render.com) — використайте `render.yaml` або Dockerfile у `backend/`. Потрібні змінні: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOW_ALL_ORIGINS` (або список у `CORS_ALLOWED_ORIGINS`).
- Frontend: [Vercel](https://vercel.com) або [Netlify] — з кореня `frontend/` (`npm run build`). Задайте `VITE_API_URL` = https://your-api.onrender.com.
- Зображення: зареєструйте Cloudinary та задайте `CLOUDINARY_URL`/`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (файлові системи безкоштовних хостингів ефемерні).

Приклади змінних середовища: `backend/.env.example` та `frontend/.env.example`.

## API

Основні ендпоінти (авторизація: `Authorization: Bearer <access>`):

| Метод | Шлях | Опис |
| --- | --- | --- |
| POST | `/api/auth/register/` | Реєстрація |
| POST | `/api/auth/token/` | Отримати JWT |
| POST | `/api/auth/token/refresh/` | Оновити JWT |
| GET/POST | `/api/worlds/` | Список / створення світів |
| GET/PATCH/DELETE | `/api/worlds/:id/` | Деталі / оновлення / видалення світу |
| GET/POST | `/api/worlds/:id/players/` | Гравці світу |
| GET/POST | `/api/worlds/:id/locations/` | Локації світу |
| POST | `/api/worlds/:id/locations/:loc/screenshots/` | Завантаження скріншотів |
| GET/POST | `/api/worlds/:id/todos/` | Todo-лист |
| GET/POST | `/api/worlds/:id/history/` | Події історії (сортуються за датою) |
| GET/POST | `/api/worlds/:id/memberships/` | Запрошення та ролі (майбутнє) |

## Структура проєкту

```
worldlog/
├── backend/          # Django + DRF
│   ├── api/          # моделі, серіалізатори, в'ю
│   └── config/       # налаштування Django
├── frontend/         # React + Vite + MUI
│   └── src/          # landing, аутентифікація, дашборд, розділи світу
├── docker-compose.yml
├── render.yaml
└── LICENSE
```

## Ліцензія

MIT — див. [LICENSE](LICENSE).

## Контакти

Команда DiJital — підтримка та запитання через GitHub Issues репозиторію.