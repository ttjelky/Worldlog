# WorldLog — Architecture Reference

Full architecture documentation for AI assistants working on this codebase.

---

## Project Overview

**WorldLog** is a collaborative Minecraft-inspired RPG world logging web app. Teams use it to document worlds: players, locations, todos, history, notes, projects, bookmarks, ideas, wiki pages, planner tasks, progress tracking, and relationships — all within themed, role-gated workspaces.

**Stack**: Django 6.1 + DRF backend, React 19 SPA frontend, MUI v6, Vite 8.2, SQLite (dev) / PostgreSQL (prod).

---

## Repository Structure

```
worldlog/
├── backend/
│   ├── api/                 # Django app: models, views, serializers, permissions, urls
│   │   ├── models.py        # 14 models
│   │   ├── views.py         # ViewSets + APIViews
│   │   ├── serializers.py   # DRF serializers
│   │   ├── permissions.py   # Role-based permission classes
│   │   └── urls.py          # Router + path-based URLs
│   ├── config/              # Django settings
│   ├── Dockerfile           # Python 3.12-slim + gunicorn
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api.js           # Axios instance, JWT management
│       ├── auth.jsx         # AuthProvider, useAuth hook
│       ├── App.jsx          # Routes + PrivateRoute
│       ├── features/        # Page-level components (auth, dashboard, world, etc.)
│       └── shared/          # Reusable components, providers, styles
├── render.yaml              # Render.com deployment
├── docker-compose.yml       # Local Docker dev
└── README.md
```

---

## Backend

### Tech Stack
- Django 6.1, Django REST Framework, SimpleJWT, Pillow, django-cors-headers
- SQLite (dev), PostgreSQL (prod via `DATABASE_URL`)
- Optional: Cloudinary for image storage (`CLOUDINARY_URL`)

### Models (`backend/api/models.py`)

| Model | Fields | Notes |
|-------|--------|-------|
| `World` | owner (FK User), name, description, seed, start_date, cover_image, is_public, theme (TextChoices), created_at, updated_at | Ordering: `-created_at`. Theme choices: `sulfur_caves`, `amethyst`, `trial_palace` |
| `Player` | world (FK World), nickname, role_note, avatar, created_at | Ordering: `nickname` |
| `Location` | world (FK World), name, description, x, y, z, category (TextChoices), created_at | Category: farm/mine/town/base/structure/biome/build/poi/other |
| `LocationScreenshot` | location (FK Location), image, created_at | One per location (new upload replaces old) |
| `Project` | world (FK World), title, description, status (TextChoices), created_at | Status: planning/active/completed/on_hold. Has `progress` property (todos done %) |
| `TodoItem` | world (FK World), project (FK Project, nullable), title, description, is_done, priority (TextChoices), due_date, created_at | Priority: low/medium/high/urgent |
| `HistoryEvent` | world (FK World), title, description, date, category (TextChoices), created_at | Category: achievement/milestone/important/completed/expansion/other. Ordered by date |
| `Note` | world (FK World), title, content, tags, created_at | Tags is a CharField (comma-separated) |
| `Bookmark` | world (FK World), title, url, description, created_at | URLField max_length=500 |
| `Idea` | world (FK World), title, content, created_at | — |
| `WikiPage` | world (FK World), title, page_type (TextChoices), content, created_at, updated_at | unique_together (world, title). PageType: location/character/faction/kingdom/region/item/event/war/custom |
| `Relationship` | world (FK World), source_type, source_id, target_type, target_id, label, created_at | unique_together (world, source_type, source_id, target_type, target_id) |
| `Membership` | world (FK World), user (FK User), role (TextChoices), status (TextChoices), created_at | unique_together (world, user). Role: owner/editor/viewer. Status: pending/active |
| `Friendship` | user_a (FK User), user_b (FK User), status (TextChoices), created_at, updated_at | unique_together (user_a, user_b). user_a_id < user_b_id always. Status: pending/accepted/blocked |
| `UserProfile` | user (OneToOne User), display_name, bio, avatar, created_at, updated_at | Auto-created via `get_or_create` |
| `Notification` | user (FK User), notification_type (TextChoices), from_user (FK User, nullable), message, is_read, created_at | Type: friend_request/friend_accepted |

### Key: World Ownership

- `World.owner` FK stores the world creator.
- `Membership` model has `unique_together = ('world', 'user')` and roles `OWNER/EDITOR/VIEWER`.
- The OWNER is **not** stored as a Membership row — it is derived from `world.owner_id`.
- `get_user_role(user, world)` returns `'owner'` if `world.owner_id == user.id`, else looks up active Membership.
- Frontend shows the owner via `world.owner_username` as a first-class row in ParticipantsSection, not as a membership.

### Permissions (`backend/api/permissions.py`)

```python
def get_user_role(user, world):
    if world.owner_id == user.id:
        return 'owner'
    membership = world.memberships.filter(user=user, status='active').first()
    return membership.role if membership else None
```

| Permission Class | Check | Used For |
|-----------------|-------|----------|
| `IsOwnerOrMember` | Owner OR active membership (any role) | Read access to worlds and content. `list`/`retrieve` actions on content viewsets |
| `IsWorldOwner` | Owner only | Update/delete world, update/delete Membership role changes |
| `IsWorldEditorOrAbove` | Owner OR editor | Create/update/delete content (Players, Locations, Todos, Notes, etc.). Create Membership (invite) |
| `IsWorldViewerOrAbove` | Any active membership | Read-only access (currently unused, superseded by `IsOwnerOrMember`) |

### `RelatedViewSetMixin`

All content viewsets (Player, Location, Todo, Note, History, Project, Bookmark, Idea, Wiki, Relationship) use this mixin:

- **list/retrieve**: `IsAuthenticated` + `IsOwnerOrMember` (any member can read)
- **create/update/delete**: `IsAuthenticated` + `IsWorldEditorOrAbove` (viewers cannot write)
- Automatically filters queryset by `world_id` from URL kwargs
- `perform_create` injects `world_id` from URL

### `MembershipViewSet` Permissions

| Action | Permission |
|--------|-----------|
| list/retrieve | `IsOwnerOrMember` |
| create | `IsWorldEditorOrAbove` (editors+ can invite, blocks adding owner) |
| update/partial_update | `IsWorldOwner` (only owner can change roles) |
| destroy | `IsWorldOwner` (only owner can remove members, cannot remove owner) |

### API Endpoints (`backend/api/urls.py`)

**Auth:**
- `POST /api/auth/register/` — Register (username, email, password)
- `POST /api/auth/token/` — Login (email, password) → JWT pair
- `POST /api/auth/token/refresh/` — Refresh JWT
- `POST /api/auth/logout/` — Blacklist refresh token

**User:**
- `GET/PATCH /api/me/` — Current user detail / update
- `PATCH /api/me/profile/` — Update profile (display_name, bio, username; avatar via multipart)
- `GET /api/users/search/?q=` — Search users by username (returns friendship status)
- `GET /api/users/:username/` — Public profile (with friendship status)

**Worlds (ModelViewSet):**
- `GET/POST /api/worlds/` — List (owner + member) / Create
- `GET/PATCH/DELETE /api/worlds/:id/` — Detail / Update / Delete (owner or member)

**World Content (nested under `/api/worlds/:world_id/`):**
- `/players/` — CRUD (editor+ can write)
- `/locations/` — CRUD (editor+ can write)
- `/locations/:loc/screenshots/` — CRUD (one per location, replaces on upload)
- `/todos/` — CRUD
- `/history/` — CRUD
- `/notes/` — CRUD
- `/projects/` — CRUD
- `/bookmarks/` — CRUD
- `/ideas/` — CRUD
- `/wiki/` — CRUD
- `/relationships/` — CRUD
- `/memberships/` — CRUD (role-gated: owner manages roles, editor+ invites)

**Participants Search:**
- `GET /api/worlds/:world_id/participants/search/?q=` — Search users not already in world (shows friend badge)

**Friends:**
- `GET /api/friends/` — List friendships (optional `?status=pending|accepted`)
- `POST /api/friends/send/` — Send friend request (`user_id` in body)
- `POST /api/friends/:id/accept/` — Accept request
- `POST /api/friends/:id/reject/` — Reject request
- `POST /api/friends/:id/cancel/` — Cancel sent request
- `DELETE /api/friends/:id/` — Remove friend (accepted only)

**Notifications:**
- `GET /api/notifications/` — List (latest 50)
- `POST /api/notifications/:id/read/` — Mark one as read
- `POST /api/notifications/read-all/` — Mark all as read

### Serializers (`backend/api/serializers.py`)

Key serializers:
- `CustomTokenObtainSerializer` — Email-based login (overrides username with email lookup)
- `WorldSerializer` — Includes `owner_username`, `players_count`, `locations_count`, `todos_count`, `todos_done`, `history_count`, `cover_image_url`, `current_user_role`
- `MembershipSerializer` — Includes `username`, `world_name`, `avatar_url`
- `UserPublicSerializer` — Public profile: `display_name`, `bio`, `avatar_url`, `worlds_count`, `friends_count`
- `FriendshipSerializer` — Includes `other_user` (serialized public profile), `status_display`
- `AbsoluteURLImageField` — Custom ImageField that returns absolute URLs

---

## Frontend

### Tech Stack
- React 19, React Router v7, MUI 6, TanStack React Query 5, Axios
- Vite 8.2, CSS Modules, Material 3 design principles

### Routing (`frontend/src/App.jsx`)

```
/                    → Landing (public)
/login               → Login (public)
/register            → Register (public)
/app                 → Dashboard (private)
/app/worlds          → MyWorlds (private)
/app/worlds/:worldId → WorldDetail (private)
/app/friends         → FriendsPage (private)
/app/search          → SearchPage (private)
/app/profile         → ProfilePage (private, own profile)
/app/profile/:username → ProfilePage (private, any user)
*                    → Redirect to /
```

`PrivateRoute` wraps all `/app/*` routes. Uses `auth.isAuthenticated()` to check JWT in localStorage.

### Auth (`frontend/src/auth.jsx`)

- `AuthProvider` context with `login(email, password)`, `register(username, email, password)`, `logout()`, `updateUser(data)`, `user`, `hydrating`
- Tokens stored as `wl_access` / `wl_refresh` in localStorage
- `useAuth()` hook for consuming components

### API (`frontend/src/api.js`)

- Axios instance: `baseURL = import.meta.env.VITE_API_URL || '/api'`
- Request interceptor: attaches `Authorization: Bearer <access>` from localStorage
- Response interceptor: on 401, attempts token refresh via `/auth/token/refresh/`; if refresh fails, clears tokens

### Design System

**Colors (CSS variables set on WorldDetail page):**
- `--page-bg`: Page background (theme-dependent)
- `--page-ink`: Primary text
- `--page-soft`: Secondary text / soft surfaces
- `--page-active-bg`: Active state background
- `--page-active-ink`: Active state text
- `--page-outline`: Border color
- `--page-dragover`: Drag-over highlight

**Themes** (`frontend/src/features/world/themes.js`):
- `sulfur_caves`: Dark charcoal (#434343), orange accent (#e8855a)
- `amethyst`: Purple tones
- `trial_palace`: Green tones

Each theme defines: `pageBg`, `ink`, `soft`, `softHover`, `activeBg`, `activeBgHover`, `activeInk`, `rowBg`, `rowLabel`, `outline`, `outlineHover`, `dragOver`, `resize`, `resizeActive`, `accentRed`, `accentGreen`, `cover`

**Global colors:**
- Nav profile: coral `#d57c6a`
- Card surfaces: `rgba(255,255,255,0.06)`
- Border radius: 20-28px for cards
- Font: Inter
- CSS Modules for all component styles

### WorldDetail (`frontend/src/features/world/WorldDetail.jsx`)

923-line component. Core of the app.

**Card system:**
- 14 cards: info, cover, players, participants, locations, todos, history, notes, projects, planner, bookmarks, ideas, wiki, progress
- `CARD_META`: Maps card ID → row number + slot CSS class
- `DEFAULT_CARDS`: Default layout (7 rows, 2-3 cards per row)
- Cards are arranged in rows, rendered via `renderCard()` and `renderRow()`
- Each card is wrapped in `ExpandableCard` (modal expand on click)

**Edit mode (overlay):**
- Toggle via "Оверлей" button
- Drag-and-drop reordering within/between rows
- Resize bars between cards in same row (horizontal drag)
- Row config buttons (1/2/3 cards per row)
- Card visibility toggle via `CardsMenu` sidebar
- `info` and `cover` cards are locked (cannot be reordered/hidden)
- Layout persisted to `localStorage` key `world-layout-{worldId}`
- Flip animation on drag-drop (FLIP technique)

**Theme-aware:**
- `getWorldTheme(world.theme)` returns theme palette
- CSS variables applied to page root
- `ThemeDialog` for changing world theme (gated by `userRole !== 'viewer'`)
- `themeDialogStyle()` returns MUI Dialog paper style matching theme

**Permission-gated UI:**
- `userRole` from `world.current_user_role`
- "Світ" edit button, "Тема" button, cover image edit/delete — all gated by `userRole !== 'viewer'`
- Content sections receive `userRole` prop and gate add/edit/delete internally

### Content Sections

All sections follow the same pattern:
- Located in `frontend/src/features/world/components/<SectionName>/`
- Each has `SectionName.jsx` + `SectionName.module.css`
- Uses React Query for data fetching/mutations
- Accepts `worldId`, `accent`, `userRole` props
- `canEdit = userRole && userRole !== 'viewer'` gates write UI
- Uses shared styles from `frontend/src/features/world/components/shared/section.module.css`
- Uses `ExpandableCard` wrapper for modal expand
- Uses `useUndo()` for delete operations

**Sections:**

| Section | Component | API Endpoint | Key Features |
|---------|-----------|-------------|--------------|
| Players | `PlayersSection` | `/worlds/:id/players/` | Avatar upload, role notes |
| Participants | `ParticipantsSection` | `/worlds/:id/memberships/` | Owner row (no edit), membership rows, AddParticipantDialog (user search + role), EditRoleDialog, RemoveParticipantDialog |
| Locations | `LocationsSection` | `/worlds/:id/locations/` | XYZ coords, category, screenshots (one per location, replaces on upload) |
| Todos | `TodosSection` | `/worlds/:id/todos/` | Priority, due date, is_done toggle, project association |
| History | `HistorySection` | `/worlds/:id/history/` | Timeline with color-coded nodes by category, date-based sorting |
| Notes | `NotesSection` | `/worlds/:id/notes/` | Tags (comma-separated) |
| Projects | `ProjectsSection` | `/worlds/:id/projects/` | Status, progress (auto-calculated from todos), todo count |
| Planner | `PlannerSection` | `/worlds/:id/todos/` + `/projects/` | Calendar view, drag tasks between days |
| Bookmarks | `BookmarksSection` | `/worlds/:id/bookmarks/` | URL links with descriptions |
| Ideas | `IdeasSection` | `/worlds/:id/ideas/` | Title + content |
| Wiki | `WikiSection` | `/worlds/:id/wiki/` | Page types (location/character/faction/etc.), content |
| Progress | `ProgressSection` | `/worlds/:id/todos/` + `/projects/` | Aggregate stats, charts |
| CardsMenu | `CardsMenu` | — | Sidebar to toggle card visibility per world |

### Shared Components

| Component | Path | Purpose |
|-----------|------|---------|
| `UserAvatar` | `shared/components/UserAvatar/UserAvatar.jsx` | Reusable avatar: accepts `user`/`src`/`avatarUrl`/`username`/`displayName`, sizes xs/sm/md/lg/xl, initial letter fallback |
| `Navbar` | `shared/components/Navbar/Navbar.jsx` | Top navigation: search, notifications, friends, profile |
| `ThemeSelector` | `shared/components/ThemeSelector/ThemeSelector.jsx` | Theme picker widget |
| `ToastNotification` | `shared/notifications/ToastNotification.jsx` | Slide-in toast for new notifications |
| `NotificationProvider` | `shared/notifications/NotificationProvider.jsx` | Polls `/notifications/` every 5s, provides `notifications`, `unreadCount`, `markRead`, `markAllRead` |
| `UndoProvider` | `shared/undo/UndoProvider.jsx` | Context for undo-able delete operations (`deleteWorld`, `deletePlayer`, etc.) |
| `ExpandableCard` | `features/world/components/shared/ExpandableCard.jsx` | Card wrapper with modal expand, `useExpandableCard()` hook |

### Profile Page (`frontend/src/features/profile/ProfilePage.jsx`)

- Full-page inline edit mode with `isEditing` state
- Unsaved changes warning dialog on navigate-away
- Avatar upload via FormData to `/me/profile/`
- `max-width: 860px` container (`.page` in `ProfilePage.module.css`)
- `ProfileHeader`, `ProfileStats`, `ProfileAbout`, `ProfileSkeleton` sub-components
- Shows own profile (`/app/profile`) or other user (`/app/profile/:username`)

### Friends Page (`frontend/src/features/friends/FriendsPage.jsx`)

- Integrated user search bar at top (queries `/users/search/`)
- Search results show "Додати" (send friend request) buttons inline
- Pill tabs: Друзі / Запити / Запропонувати
- Friend request accept/reject/cancel actions
- Supports `?tab=requests` URL param

### Search Page (`frontend/src/features/search/SearchPage.jsx`)

- Global user search at `/app/search`
- Queries `/users/search/` with debounced input
- Shows user cards with "Додати" button if not already friends

### Notifications

- `NotificationProvider` polls every 5 seconds
- `ToastNotification` component: slide-in from top-right, auto-dismiss, click to navigate
- Types: `friend_request` (with from_user), `friend_accepted`
- Badge count in Navbar

---

## Deployment

### Backend (Render.com)
- Docker-based, uses `backend/Dockerfile`
- Runs `python manage.py migrate` then `gunicorn`
- Required env vars: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- Optional: `CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- PostgreSQL database provisioned via `render.yaml`

### Frontend (Vercel)
- Vite SPA, `frontend/vercel.json` rewrites all non-API routes to `index.html`
- Required env var: `VITE_API_URL` (points to deployed backend)

### Docker Compose (local dev)
- `docker compose up --build` runs backend + PostgreSQL
- Frontend runs separately via `npm run dev`

### Git Remote
- `https://github.com/ttjelky/Worldlog`
- Branch: `main`

---

## Key Conventions

1. **No OWNER membership row**: World owner is derived from `world.owner_id`, never stored as Membership. Frontend shows owner as first row in ParticipantsSection via `world.owner_username`.
2. **Permission gating pattern**: `canEdit = userRole && userRole !== 'viewer'` in all section components. `RelatedViewSetMixin` enforces this server-side.
3. **Theme per world**: Stored as `world.theme` field, applied via CSS variables at page root. Each page defines its own accent palette.
4. **Layout persistence**: WorldDetail card layout saved to `localStorage` per world ID. Includes card order, visibility, row config, and flex widths.
5. **Image handling**: `AbsoluteURLImageField` returns full URLs. Cloudinary recommended for production (ephemeral filesystems on free hosts).
6. **Undo system**: All delete operations go through `UndoProvider` context, which provides undo-able delete functions.
7. **CSS Modules**: All component styles use `.module.css` files. Shared styles in `components/shared/section.module.css`.
8. **React Query**: All data fetching uses `useQuery`/`useMutation` with query keys like `['world', worldId]`, `['worlds']`, `['memberships', worldId]`. Cache invalidation via `qc.invalidateQueries()`.
