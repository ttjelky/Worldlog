# WorldLog — Повний контекст проєкту для AI-асистентів

## Загальний опис

**WorldLog** — це веб-додаток для колективного ведення нотаток про Minecraft-світи (або будь-які RPG-світи). Команди гравців документують світи: гравців, локації, завдання, історію, нотатки, проєкти, закладки, ідеї, вікі-сторінки та зв'язки між елементами — все в тематичних, з.role-обмежених робочих просторах.

**Команда:** DiJital
**Ліцензія:** MIT
**UI мова:** українська
**Репозиторій:** https://github.com/ttjelky/Worldlog

---

## Стек технологій

### Backend
- **Python 3.12** + **Django 6.1** + **Django REST Framework 3.18**
- **SimpleJWT 5.5** — JWT-аутентифікація (access 12h, refresh 7d)
- **Pillow 12.3** — обробка зображень
- **django-cors-headers 4.9** — CORS
- **django-filter 26.1** — фільтрація запитів
- **django-cloudinary-storage** (опціонально) — зберігання зображень у Cloudinary
- **psycopg 3.3** + **dj-database-url** — PostgreSQL для продакшену
- **gunicorn 26.1** — WSGI-сервер

### Frontend
- **React 19.2** + **React Router v7.18**
- **MUI v6.5** (Material UI) — бібліотека компонентів
- **TanStack React Query 5.10** — кешування та управління станом сервера
- **Axios 1.19** — HTTP-клієнт
- **D3.js** (d3-force, d3-drag, d3-selection, d3-zoom) — граф зв'язків вікі
- **Vite 8.2** — збірка
- **CSS Modules** — стилізація компонентів

### База даних
- **SQLite** (розробка) / **PostgreSQL 16** (продакшен)

---

## Структура репозиторію

```
Worldlog/
├── backend/
│   ├── api/                     # Django-додаток
│   │   ├── models.py            # 18 моделей
│   │   ├── views.py             # ViewSets + APIViews (~1400 рядків)
│   │   ├── serializers.py       # ~24 сериалізатора (~600 рядків)
│   │   ├── permissions.py       # 4 класи дозволів + get_user_role
│   │   ├── urls.py              # Router + path-URL
│   │   ├── admin.py
│   │   └── apps.py
│   ├── config/
│   │   ├── settings.py          # Налаштування Django
│   │   ├── urls.py              # Кореневі URL (включає api.urls)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── manage.py
│   ├── Dockerfile               # Python 3.12-slim + gunicorn
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api.js               # Axios-інстанс, JWT-менеджмент
│       ├── auth.jsx             # AuthProvider, useAuth hook
│       ├── App.jsx              # Роутинг + PrivateRoute + AppLayout
│       ├── main.jsx             # Точка входу, провайдери
│       ├── theme.js             # Глобальна MUI-тема
│       ├── features/
│       │   ├── auth/Auth.jsx    # Login + Register
│       │   ├── dashboard/       # Головна сторінка
│       │   ├── myworlds/        # Список світів
│       │   ├── world/           # WorldDetail (923 рядки) + 14 секцій
│       │   ├── friends/         # Друзі + запити
│       │   ├── search/          # Пошук публічних світів
│       │   ├── profile/         # Профіль користувача
│       │   ├── notifications/   # Сповіщення
│       │   └── landing/         # Лендінг-сторінка
│       └── shared/
│           ├── components/      # Navbar, UserAvatar, Logo, AuthShell, ThemeSelector
│           ├── notifications/   # NotificationProvider, ToastNotification
│           ├── undo/            # UndoProvider, UndoSnackbar, constants
│           └── styles/          # Глобальні CSS
├── render.yaml                  # Render.com деплой
├── docker-compose.yml           # Локальний Docker-розробка
└── .gitignore
```

---

## Моделі (backend/api/models.py)

### World
Основна сутність. Кожен світ належить одному користувачу (owner).

| Поле | Тип | Опис |
|------|-----|------|
| `owner` | FK → User | Власник світу |
| `name` | CharField(200) | Назва |
| `description` | TextField | Опис |
| `seed` | CharField(200) | Сід світу |
| `start_date` | DateField | Дата початку |
| `cover_image` | ImageField | Обкладинка |
| `is_public` | BooleanField | Публічний чи приватний |
| `theme` | TextChoices | `sulfur_caves` / `amethyst` / `trial_palace` |
| `created_at` / `updated_at` | DateTimeField | Авто-часові мітки |

Ordering: `-created_at`

### Player
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `nickname` | CharField(100) | Нікнейм |
| `role_note` | CharField(200) | Роль/нотатка |
| `avatar` | ImageField | Аватар гравця |

### Location
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `name` | CharField(200) | Назва |
| `description` | TextField | Опис |
| `x`, `y`, `z` | IntegerField | Координати |
| `category` | TextChoices | `farm` / `mine` / `town` / `base` / `structure` / `biome` / `build` / `poi` / `other` |

### LocationScreenshot
Один скріншот на локацію (нове завантаження замінює старе).

| Поле | Тип |
|------|-----|
| `location` | FK → Location |
| `image` | ImageField |

### Project
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `title` | CharField(200) | Назва |
| `description` | TextField | Опис |
| `status` | TextChoices | `planning` / `active` / `completed` / `on_hold` |

`progress` — властивість, що обчислює % виконаних TodoItem.

### TodoItem
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `project` | FK → Project (nullable) | Проєкт |
| `title` | CharField(200) | Назва |
| `description` | TextField | Опис |
| `is_done` | BooleanField | Виконано |
| `priority` | TextChoices | `low` / `medium` / `high` / `urgent` |
| `due_date` | DateField | Дедлайн |

### Epoch
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `name` | CharField(200) | Назва епохи |
| `description` | TextField | Опис |
| `start_date` | DateField | Дата початку (auto_now_add) |
| `end_date` | DateField | Дата завершення (null = активна) |

`is_active` — `True` якщо `end_date is None`.

### HistoryEvent
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `title` | CharField(200) | Назва |
| `description` | TextField | Опис |
| `date` | DateField | Дата події |
| `epoch` | FK → Epoch (nullable) | Епоха |
| `event_type` | TextChoices | `battle` / `building` / `death` / `boss` / `discovery` / `achievement` / `other` |
| `game_day` | PositiveIntegerField | Ігровий день |
| `is_important` | BooleanField | Важлива подія |
| `coord_x`, `coord_y`, `coord_z` | IntegerField | Координати |
| `image` | ImageField | Зображення |
| `participants` | CharField(500) | Учасники (через кому) |

Ordering: `['date', 'created_at']`

### Note
| Поле | Тип |
|------|-----|
| `world` | FK → World |
| `title` | CharField(200) |
| `content` | TextField |
| `tags` | CharField(500) — кома-розділений текст |

### Bookmark
| Поле | Тип |
|------|-----|
| `world` | FK → World |
| `title` | CharField(200) |
| `url` | URLField(500) |
| `description` | TextField |

### Idea
| Поле | Тип |
|------|-----|
| `world` | FK → World |
| `title` | CharField(200) |
| `content` | TextField |

### WikiPage
Розширена вікі-система з інфобоксом, таймлайном та емодзі.

| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `title` | CharField(200) | Назва (унікальна в межах світу) |
| `page_type` | TextChoices | `location` / `character` / `faction` / `kingdom` / `region` / `item` / `event` / `war` / `custom` |
| `content` | TextField | Контент з підтримкою `[[заголовок]]` посилань |
| `emoji` | CharField(32) | Емодзі сторінки |
| `infobox` | JSONField | Пер-типові поля інфобоксу |
| `tags` | CharField(500) | Теги |
| `world_date` | CharField(120) | Дата в ігровому часі (напр. "Рік 4") |
| `world_date_order` | PositiveIntegerField | Числовий порядок для таймлайну |

`unique_together = ('world', 'title')`

### Relationship
Зв'язки між будь-якими сутностями світу.

| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `source_type` | TextChoices | `player` / `location` / `wiki_page` / `project` / `todo` / `event` / `note` / `bookmark` / `idea` |
| `source_id` | PositiveIntegerField | ID джерела |
| `target_type` | TextChoices | Те саме |
| `target_id` | PositiveIntegerField | ID цілі |
| `label` | CharField(200) | Мітка зв'язку |

`unique_together = ('world', 'source_type', 'source_id', 'target_type', 'target_id')`

### Friendship
| Поле | Тип | Опис |
|------|-----|------|
| `user_a` | FK → User | Перший користувач (завжди менший ID) |
| `user_b` | FK → User | Другий користувач (завжди більший ID) |
| `status` | TextChoices | `pending` / `accepted` / `blocked` |

`unique_together = ('user_a', 'user_b')`. `clean()` забороняє створення дружби з собою.

### UserProfile
| Поле | Тип |
|------|-----|
| `user` | OneToOne → User |
| `display_name` | CharField(100) |
| `bio` | TextField(500) |
| `avatar` | ImageField (унікальний шлях через UUID) |

### WorldAccessRequest
Запити на доступ до публічних світів.

| Поле | Тип |
|------|-----|
| `world` | FK → World |
| `requester` | FK → User |
| `status` | TextChoices: `pending` / `accepted` / `rejected` |

`unique_together = ('world', 'requester')`

### Notification
| Поле | Тип | Опис |
|------|-----|------|
| `user` | FK → User | Отримувач |
| `notification_type` | TextChoices | `friend_request` / `friend_accepted` / `world_access_request` / `world_access_accepted` / `world_access_rejected` |
| `from_user` | FK → User (nullable) | Відправник |
| `message` | CharField(300) | Текст |
| `is_read` | BooleanField | Прочитано |

### Membership
| Поле | Тип | Опис |
|------|-----|------|
| `world` | FK → World | Світ |
| `user` | FK → User | Користувач |
| `role` | TextChoices | `owner` / `editor` / `viewer` |
| `status` | TextChoices | `pending` / `active` |

`unique_together = ('world', 'user')`

**ВАЖЛИВО:** Власник світу НЕ зберігається як рядок Membership. Власник визначається через `world.owner_id`. Функція `get_user_role()` повертає `Membership.Role.OWNER` (enum) для власника, або шукає активний Membership.

---

## Дозволи (backend/api/permissions.py)

### `get_user_role(user, world)`
Повертає роль користувача у світі:
- `Membership.Role.OWNER` якщо `world.owner_id == user.id`
- Роль з активного Membership (editor/viewer), або `None`

### Класи дозволів

| Клас | Перевірка | Використання |
|------|-----------|-------------|
| `IsOwnerOrMember` | Власник АБО будь-який активний учасник | Читання світів та контенту (list/retrieve) |
| `IsWorldOwner` | Тільки власник | Оновлення/видалення світу, зміна ролей |
| `IsWorldEditorOrAbove` | Власник АБО editor | Створення/оновлення/видалення контенту |
| `IsWorldViewerOrAbove` | Будь-яка роль | (не використовується активно) |

### RelatedViewSetMixin
Усі ViewSets контенту (Player, Location, Todo, Note тощо) використовують цей міксин:
- **list/retrieve:** `IsAuthenticated` + `IsOwnerOrMember`
- **create/update/delete:** `IsAuthenticated` + `IsWorldEditorOrAbove`
- Автоматично фільтрує queryset за `world_id` з URL
- `perform_create` ін'єктує `world_id` з URL

---

## API Endpoints (backend/api/urls.py)

### Авторизація
| Метод | URL | Опис |
|-------|-----|------|
| POST | `/api/auth/register/` | Реєстрація (username, email, password) |
| POST | `/api/auth/token/` | Логін (email, password) → JWT пара |
| POST | `/api/auth/token/refresh/` | Оновлення JWT |
| POST | `/api/auth/logout/` | Чорний список refresh токена |

### Користувачі
| Метод | URL | Опис |
|-------|-----|------|
| GET/PATCH | `/api/me/` | Поточний користувач |
| PATCH | `/api/me/profile/` | Оновлення профілю (display_name, bio, username; avatar через multipart) |
| GET | `/api/users/search/?q=` | Пошук користувачів за username (повертає статус дружби) |
| GET | `/api/users/:username/` | Публічний профіль (зі статусом дружби) |

### Світи (ModelViewSet)
| Метод | URL | Опис |
|-------|-----|------|
| GET/POST | `/api/worlds/` | Список (власник + учасник) / Створення |
| GET/PATCH/DELETE | `/api/worlds/:id/` | Деталі / Оновлення / Видалення |
| GET | `/api/worlds/search/?q=` | Пошук публічних світів |

### Контент світу (вкладений під `/api/worlds/:world_id/`)
| Endpoint | CRUD | Додатково |
|----------|------|-----------|
| `/players/` | ✅ | Avatar upload (multipart) |
| `/locations/` | ✅ | — |
| `/locations/:loc/screenshots/` | ✅ | Одне фото на локацію (замінює при завантаженні) |
| `/todos/` | ✅ | — |
| `/history/` | ✅ | Auto-призначення epoch |
| `/epochs/` | ✅ | `POST /:id/close/` — завершити епоху |
| `/notes/` | ✅ | — |
| `/projects/` | ✅ | `progress` (auto), `todos_count`, `todos_done` |
| `/bookmarks/` | ✅ | — |
| `/ideas/` | ✅ | — |
| `/wiki/` | ✅ | `GET /graph/` — граф зв'язків |
| `/relationships/` | ✅ | Фільтрація за source/target |
| `/memberships/` | ✅ | Role-gated: owner керує ролями, editor+ запрошує |
| `/access-requests/` | ✅ | Запити на доступ до публічних світів |
| `/entities/?q=&type=` | GET | Плоский список сутностей для пікера зв'язків |
| `/participants/search/?q=` | GET | Пошук користувачів для додавання |

### Друзі
| Метод | URL | Опис |
|-------|-----|------|
| GET | `/api/friends/` | Список дружніх зв'язків (опціонально `?status=pending\|accepted`) |
| POST | `/api/friends/send/` | Надіслати запит у друзі (`user_id` у body) |
| POST | `/api/friends/:id/accept/` | Прийняти запит |
| POST | `/api/friends/:id/reject/` | Відхилити запит |
| POST | `/api/friends/:id/cancel/` | Скасувати надісланий запит |
| DELETE | `/api/friends/:id/` | Видалити друга (accepted only) |

### Сповіщення
| Метод | URL | Опис |
|-------|-----|------|
| GET | `/api/notifications/` | Список (останні 50) |
| POST | `/api/notifications/:id/read/` | Позначити як прочитане |
| POST | `/api/notifications/read-all/` | Позначити все як прочитане |

### Доступ до світів
| Метод | URL | Опис |
|-------|-----|------|
| POST | `/api/world-access-requests/:id/accept/` | Власник приймає запит → створює Membership |
| POST | `/api/world-access-requests/:id/reject/` | Власник відхиляє запит |

---

## Сериалізатори (backend/api/serializers.py)

### Ключові серіалізатори

| Сериалізатор | Опис |
|-------------|------|
| `CustomTokenObtainSerializer` | Логін через email (перевизначає username на email lookup) |
| `WorldSerializer` | `owner_username`, `owner_avatar_url`, `players_count`, `locations_count`, `todos_count`, `todos_done`, `history_count`, `epochs_count`, `cover_image_url`, `current_user_role` |
| `MembershipSerializer` | `username`, `world_name`, `avatar_url` |
| `UserPublicSerializer` | `display_name`, `bio`, `avatar_url`, `worlds_count`, `friends_count` |
| `FriendshipSerializer` | `other_user` (serialized public profile), `status_display` |
| `HistoryEventSerializer` | `image_url`, `coordinates`, `participants_list`, `epoch_name` |
| `ProjectSerializer` | `progress`, `todos_count`, `todos_done` |
| `RelationshipSerializer` | `source_name`, `target_name` (auto-resolved), валідація існування елементів |
| `ProfileUpdateSerializer` | Оновлення username + display_name + bio + avatar |
| `AbsoluteURLImageField` | Кастомний ImageField — повертає абсолютні URL |
| `WorldAccessRequestSerializer` | `username`, `display_name`, `avatar_url`, `world_name`, `status_display` |
| `NotificationSerializer` | `from_user_username`, `from_user_avatar_url` |

`RELATION_MODEL_MAP` — маппінг типів Relationship на моделі:
```python
RELATION_MODEL_MAP = {
    'player': Player, 'location': Location, 'wiki_page': WikiPage,
    'project': Project, 'todo': TodoItem, 'event': HistoryEvent,
    'note': Note, 'bookmark': Bookmark, 'idea': Idea,
}
```

---

## Frontend

### Точка входу (main.jsx)

Дерево рендеру:
```
StrictMode
  └─ ThemeProvider (MUI)
      └─ CssBaseline
          └─ QueryClientProvider (retry: 1, refetchOnWindowFocus: false)
              └─ AuthProvider
                  └─ BrowserRouter
                      └─ App
```

### Роутинг (App.jsx)

| Путь | Компонент | Примітки |
|------|-----------|---------|
| `/` | Landing | Публічний |
| `/login` | Login | Публічний |
| `/register` | Register | Публічний |
| `/app` | AppLayout → Dashboard | Приватний (PrivateRoute) |
| `/app/worlds` | AppLayout → MyWorlds | Приватний |
| `/app/worlds/:worldId` | AppLayout → WorldDetail | Приватний |
| `/app/friends` | AppLayout → FriendsPage | Приватний |
| `/app/search` | AppLayout → SearchPage | Приватний |
| `/app/notifications` | AppLayout → NotificationsPage | Приватний |
| `/app/profile` | AppLayout → ProfilePage | Власний профіль |
| `/app/profile/:username` | AppLayout → ProfilePage | Чужий профіль |
| `*` | Redirect → `/` | — |

`PrivateRoute` перевіряє `auth.isAuthenticated()` (валідний JWT в localStorage).
`AppLayout` обгортає Outlet в `NotificationProvider` + `UndoProvider`.

### Авторизація (auth.jsx)

AuthProvider надає:
- `user` — поточний користувач
- `login(email, password)` — POST `/auth/token/` → GET `/me/`
- `register(username, email, password)` — POST `/auth/register/` → login
- `logout()` — POST `/auth/logout/` → clear
- `updateUser(data)` — merge у user state
- `hydrating` — true під час первинної гідратації

Токени зберігаються в localStorage: `wl_access` / `wl_refresh`.

### API клієнт (api.js)

Axios-інстанс з:
- `baseURL`: `import.meta.env.VITE_API_URL || '/api'`
- Request interceptor: додає `Authorization: Bearer <token>`
- Response interceptor: на 401 намагається оновити токен (singleton refreshPromise)
- `auth` об'єкт: `getAccess()`, `getRefresh()`, `setAuth()`, `clearAuth()`, `isAuthenticated()`

`isAuthenticated()` повертає true якщо access валідний, АБО access прострочений але refresh ще дійсний.

---

## WorldDetail — ядро додатку

923-рядковий компонент. Усі 14 карток світу.

### Система карток

14 карток:
1. **info** — базова інформація про світ
2. **cover** — обкладинка світу
3. **players** — гравці
4. **participants** — учасники (мембери)
5. **locations** — локації з координатами
6. **todos** — завдання
7. **history** — таймлайн подій
8. **notes** — нотатки з тегами
9. **projects** — проєкти з прогресом
10. **planner** — календарний планер
11. **bookmarks** — закладки
12. **ideas** — ідеї
13. **wiki** — вікі-сторінки з графом
14. **progress** — статистика та графіки

### Edit Mode (оверлей)

- Перемикання кнопкою "Оверлей"
- Drag-and-drop перетягування карток між рядками
- Resize-смуги між картками в одному рядку (горизонтальний drag)
- Кнопки конфігурації рядків (1/2/3 картки на рядок)
- Меню видимості карток (CardsMenu sidebar)
- `info` та `cover` заблоковані (неможливо перетягнути/сховати)
- Лейаут зберігається в `localStorage` за ключем `world-layout-{worldId}`
- Анімація flip при drag-drop (FLIP-техніка)

### Теми

3 теми (визначені в `themes.js`):

| ID | Назва | pageBg | accentRed | accentGreen | ink |
|----|-------|--------|-----------|-------------|-----|
| `sulfur_caves` | Сіркові печери | `#F4FBC3` (світлий) | `#A63C39` | `#247A57` | `#1d1a22` |
| `amethyst` | Аметистова | `#dfcefd` | `#9166c8` | `#ab8cdd` | `#1d1a22` |
| `trial_palace` | Палац випробувань | `#434343` (темний) | `#d57c6a` | `#54ac98` | `#ffffff` |

Кожна тема визначає: `pageBg`, `ink`, `soft`, `softHover`, `activeBg`, `activeBgHover`, `activeInk`, `rowBg`, `rowLabel`, `outline`, `outlineHover`, `dragOver`, `resize`, `resizeActive`, `accentRed`, `accentGreen`, `cover`, `dialogBg`, `dialogInk`, `dialogMuted`, `dialogOutline`.

CSS-змінні застосовуються до кореня сторінки.

---

## Секції контенту

Усі секції слідують однаковому патерну:
- `frontend/src/features/world/components/<SectionName>/`
- `<SectionName>.jsx` + `<SectionName>.module.css`
- React Query для fetch/mutations
- Приймають `worldId`, `accent`, `userRole`
- `canEdit = userRole && userRole !== 'viewer'` для UI-гейтингу
- Використовують спільні стилі з `components/shared/section.module.css`
- Використовують `ExpandableCard` для модального розгортання
- Використовують `useUndo()` для видалення

### PlayersSection
- CRUD гравців
- Avatar upload (multipart)
- Role notes

### ParticipantsSection
- Owner row (без edit)
- Membership rows (role + status)
- AddParticipantDialog (пошук користувачів + роль)
- EditRoleDialog
- RemoveParticipantDialog
- Посилання на `GET /worlds/:id/participants/search/?q=`

### LocationsSection
- XYZ координати
- Category (9 типів)
- Скріншоти (один на локацію, замінює при завантаженні)

### TodosSection
- Priority (low/medium/high/urgent)
- Due date
- Is_done toggle
- Project association

### HistorySection
- Таймлайн з кольоровими нодами за event_type
- Сортування за датою
- Епохи (Epoch) — групування подій
- Геолокація, зображення, учасники

### NotesSection
- Tags (кома-розділені)

### ProjectsSection
- Status (planning/active/completed/on_hold)
- Progress (auto-calc from todos)
- Todo count

### PlannerSection
- Календарний вигляд
- Перетягування задач між днями

### BookmarksSection
- URL-посилання з описами

### IdeasSection
- Title + content

### WikiSection
- Page types (location/character/faction/kingdom/region/item/event/war/custom)
- Content з підтримкою `[[заголовок]]` посилань
- Emoji picker
- Infobox (JSONField з пер-типовими схемами)
- Tags, world_date, world_date_order
- Timeline view (сортування за world_date_order)
- **Graph view** — D3 force-directed граф (`WikiGraph.jsx`): вузли — сторінки та пов'язані елементи, ребра — `[[посилання]]` та Relationship

### ProgressSection
- Агрегатна статистика
- Графіки

### CardsMenu
- Sidebar для перемикання видимості карток

---

## Спільні компоненти

### UserAvatar (`shared/components/UserAvatar/`)
Приймає: `user` / `src` / `avatarUrl` / `username` / `displayName`
Розміри: `xs` (28px) / `sm` (40px) / `md` (52px) / `lg` (80px) / `xl` (120px)
Fallback: перша літера username.

### Navbar (`shared/components/Navbar/`)
Топ-навігація: лого, посилання (Головна/Огляд/Мої світи/Друзі/Пошук), сповіщення (Badge з unreadCount), профіль (dropdown: Профіль/Налаштування/Вийти).

NAV_ITEMS: `home` → `/app`, `worlds` → `/app/worlds`, `friends` → `/app/friends`, `search` → `/app/search`.

### AuthShell (`shared/components/AuthShell/`)
Обгортка для форм логіну/реєстрації: лого, title, subtitle, children, footer.

### ThemeSelector (`shared/components/ThemeSelector/`)
Вибір теми світу: кнопки з кольоровими swatches.

### Logo (`shared/components/Logo/`)
Зображення логотипу `/worldlog-logo.png`.

---

## Системи сповіщень

### NotificationProvider (`shared/notifications/NotificationProvider.jsx`)
- Polling кожні 5 секунд (`refetchInterval: 5000`)
- Відстежує нові сповіщення через `seenIdsRef` (Set)
- Автоматично додає toast-сповіщення для нових подій
- Контекст: `{ toasts, dismissToast, navigateToRequest, markAsRead, markAllAsRead, unreadCount, notifications }`

### ToastNotification (`shared/notifications/ToastNotification.jsx`)
Slide-in toast зверху праворуч. Типи:
- `friend_request`: "Новий запит у друзі"
- `friend_accepted`: "Друг прийняв запит"
- `world_access_request`: "Запит доступу до світу"
- `world_access_accepted`: "Доступ надано"
- `world_access_rejected`: "Доступ відхилено"

Клік → навігація на відповідну сторінку.

---

## Undo-система

### UndoProvider (`shared/undo/UndoProvider.jsx`)
- `deleteItem({ id, url, queryKeys, message, nouns })` — оптимістичне видалення з кешу, реальний DELETE після `UNDO_DELAY_MS = 4000ms`
- `deleteWorld({ id, name })` — видалення світу з навігацією
- Підтримка множинних видалень (групування за типом)
- Українська локалізація: "1 локацію", "2 локації", "5 локацій"

### UndoSnackbar (`shared/undo/UndoSnackbar.jsx`)
- Snackbar з кнопкою "Скасувати"
- Анімована progressBar зворотного відліку (CSS `scaleX`)
- `key={seq}` примушує ремаунт для перезапуску анімації

---

## Деплой

### Backend (Render.com)
- Docker-based (`backend/Dockerfile`)
- `python manage.py migrate` → gunicorn
- Env vars: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- Optional: `CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- PostgreSQL через `render.yaml`

### Frontend (Vercel)
- Vite SPA
- `frontend/vercel.json`: rewrites non-API routes to `index.html`
- Env var: `VITE_API_URL` (вказує на backend)

### Docker Compose (локальна розробка)
- `docker compose up --build` → backend + PostgreSQL
- Frontend окремо: `npm run dev`

---

## Ключові конвенції

1. **Власник світу не має Membership-рядка.** Власник визначається через `world.owner_id`. Фронтенд показує власника як `world.owner_username` як перший рядок у ParticipantsSection.

2. **Патерн гейтингу дозволів:** `canEdit = userRole && userRole !== 'viewer'` у всіх секціях. `RelatedViewSetMixin` примусово реалізує це на сервері.

3. **Тема на світ:** Зберігається як `world.theme`, застосовується через CSS-змінні в корені сторінки. Кожна тема визначає свою палітру.

4. **Зберігання лейауту:** WorldDetail зберігає розташування карток в `localStorage` за ID світу. Включає порядок карток, видимість, конфігурацію рядків та flex-ширини.

5. **Обробка зображень:** `AbsoluteURLImageField` повертає повні URL. Cloudinary рекомендовано для продакшену.

6. **Undo-система:** Усі операції видалення проходять через `UndoProvider`, який надає undo-функції видалення.

7. **CSS Modules:** Усі стилі компонентів використовують `.module.css`. Спільні стилі в `components/shared/section.module.css`.

8. **React Query:** Усі fetch-запити використовують `useQuery`/`useMutation` з query keys на кшталт `['world', worldId]`, `['worlds']`, `['memberships', worldId]`. Кеш інвалідується через `qc.invalidateQueries()`.

9. **UI мова:** Увесь UI українською мовою. Помилки, лейбли, повідомлення — все українською.

10. **Формати:** Username та email нормалізуються до lowercase. Username: мінімум 3 символи, regex `[\w.@+-]+`.

---

## Відомі особливості / зауваження

- `RichTextEditor` у `shared/components/` — посилання існують, але директорія порожня/відсутня.
- `shared/ui/` та `shared/utils/` — документовані в AGENTS.md, але не існують у файловій системі.
- WikiGraph використовує `d3-force`, `d3-drag`, `d3-selection`, `d3-zoom` (хоча в package.json вказано `d3-drag/d3-drag`).
- Emoji для зовнішніх вузлів графа: 🧑 (player), 📍 (location), 🏗️ (project), ✅ (todo), 📅 (event), 📝 (note), 🔖 (bookmark), 💡 (idea).
