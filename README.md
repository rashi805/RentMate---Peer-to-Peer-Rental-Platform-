# RentMate

**A neighbourhood marketplace for borrowing useful things and sharing what you own.**

RentMate helps people get occasional-use gear without buying it new. Neighbours can publish listings, search local inventory, request rentals, and manage hand-offs through a clear approval and return workflow.

## The problem and solution

Many useful items sit idle between occasional uses, while nearby people buy the same things for one-off needs. RentMate makes local sharing practical: item owners publish availability and pricing, renters find and request items, and both sides can track each rental from request through confirmed return.

## Features

- Account registration, login, logout, protected pages, bcrypt password hashing, and JWT sessions.
- Account details for name, email, phone, and location.
- Create, edit, publish, pause, and delete listings, with descriptions, categories, condition, availability, pricing, deposits, and image uploads.
- Browse and search published local items with category, location, price, condition, date availability, sorting, and pagination filters.
- Item detail pages with image gallery, owner details, date selection, live availability checks, and price estimates.
- Rental requests with server-side date, availability, ownership, and overlap checks.
- Owner approval or rejection; renter cancellation; rental status and request management.
- Return requests, owner return confirmation, history, and persisted in-app notifications.
- Responsive layouts for desktop, tablet, and mobile.

## Technology

- **Frontend:** React 18, Vite, React Router, Axios, Tailwind CSS, Lucide React
- **Backend:** Node.js 20+, Express, Mongoose, MongoDB
- **Security:** bcryptjs password hashes, JWT auth, Helmet, CORS allowlist, auth rate limiting, validated image uploads
- **Local database:** MongoDB in Docker Compose with a persistent named volume

## Architecture and application flow

```text
Browser (React + Vite :5173)
  ├─ /api/*      → Vite development proxy → Express API (:5000)
  └─ /uploads/*  → Vite development proxy → Express image storage
                                            │
                                            └─ Mongoose → MongoDB (:27017)
```

In development, the browser uses the same-origin `/api` path, so Codespaces needs only the frontend port opened in its Ports tab. The API validates requests and enforces ownership and rental workflow rules before Mongoose persists data. Uploaded development images are stored on the backend filesystem; MongoDB stores their paths and the listing/rental records.

### Main user journey

1. Register or log in, then browse or search available items.
2. Select an item and dates; the page checks availability and shows the rental estimate.
3. Send a request. The owner approves or rejects it from their dashboard.
4. The renter tracks the status, requests a return, and the owner confirms the return.
5. Both users can review rental history and notifications.

## Project structure

```text
backend/
  config/       MongoDB connection
  controllers/  Authentication, listings, rentals, users, notifications
  middleware/   Authentication and API error handling
  models/       User, Item, Rental, Notification schemas
  routes/       REST API and image upload route
  seed/         Idempotent demo data seeder
  test/         API integration tests
  uploads/      Local development image storage
frontend/
  src/
    components/ Shared layout, cards, and protected routes
    context/    Authentication state
    pages/      Marketplace, auth, listings, dashboard, profile, history
    services/   API client and image URL helpers
compose.yaml    Local MongoDB service and persistent volume
```

## Prerequisites

- Node.js 20 or newer and npm
- Docker with the Docker Compose plugin

## Installation and local setup

From the repository root:

```bash
npm install
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
```

The `cp -n` commands leave existing environment files untouched. Before seeding, set a private `JWT_SECRET` and a private `DEMO_PASSWORD` (at least 8 characters) in your ignored `backend/.env`. Do not reuse either value elsewhere or commit environment files.

Start MongoDB, seed local demo data, and start the API and frontend:

```bash
docker compose up -d mongodb
npm run seed
npm run dev
```

Open port **5173** from the Codespaces **Ports** tab. Vite proxies API and upload requests to port 5000; the backend does not need to be separately exposed to the browser.

The local database URI is `mongodb://127.0.0.1:27017/rentmate`. MongoDB binds only to loopback and stores its data in the persistent `mongodb_data` volume. `docker compose stop mongodb` stops the service without removing data; `docker compose down` removes the container but keeps the volume. `docker compose down -v` intentionally deletes the database volume.

### Environment variables

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `PORT` | API port; defaults to `5000` |
| `backend/.env` | `MONGODB_URI` | Local development database URI |
| `backend/.env` | `JWT_SECRET` | Private JWT signing secret; required |
| `backend/.env` | `DEMO_PASSWORD` | Private password used for seeded demo accounts; minimum 8 characters |
| `backend/.env` | `CLIENT_URL` | Allowed API origin; comma-separated origins are supported |
| `frontend/.env` | `VITE_API_URL` | API base URL; defaults to `/api` in development |

`backend/.env.example` contains placeholders only. MongoDB Atlas can be used as an alternative by setting `MONGODB_URI` to an Atlas connection string; Atlas network access may require an IP allowlist rule. If present, `backend/.env.atlas` is a private, ignored backup of this working copy's prior non-local URI.

### Seed accounts

`npm run seed` creates the local demo accounts `owner@rentmate.demo` and `renter@rentmate.demo`, 12 listings, and example rental lifecycle records. Both accounts use the private `DEMO_PASSWORD` from `backend/.env`; it is not printed or included in this repository. These accounts and sample data are for local development only.

## API overview

All API routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Listings | `GET /items`, `GET /items/:id`, `GET /items/:id/availability`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`, `PATCH /items/:id/publish`, `GET /items/my-listings` |
| Rentals | `POST /rentals`, `GET /rentals/my-requests`, `GET /rentals/incoming`, `GET /rentals/history`, `GET /rentals/:id`, `PATCH /rentals/:id/approve`, `PATCH /rentals/:id/reject`, `PATCH /rentals/:id/cancel`, `PATCH /rentals/:id/request-return`, `PATCH /rentals/:id/confirm-return` |
| Account and notifications | `GET/PUT /users/profile`, `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Images | `POST /uploads` (authenticated multipart field `images`) |

Listing search accepts `search`, `category`, `location`, `minPrice`, `maxPrice`, `condition`, `startDate`, `endDate`, `sort`, `page`, and `limit`.

## Tests and production build

Start Docker MongoDB and the backend/frontend with the commands above, then run:

```bash
npm test
npm run build
```

The integration test exercises registration/login, profile changes, listing create/edit/search/publish/delete, image upload, rental request/approval/rejection/cancellation, return confirmation, authorization checks, and history. It cleans up only its own generated users, listings, rentals, notifications, and uploaded image. The production frontend build is written to the ignored `frontend/dist/` directory.

There is no separate lint command configured yet.

## Screenshots

No browser automation or screenshot capture tool is available in this environment, so no screenshots are included. Add genuine captures of the running application here when available; do not use mockups or sample images as application screenshots.

## Future improvements

- Object storage for uploaded images and a production media CDN.
- Email verification and transactional rental notifications.
- Payment and deposit handling.
- Automated browser-level responsive and accessibility checks.
- Production deployment configuration and observability.

## Known limitations

- The project is a development/demo marketplace; it does not process payments or transfer security deposits.
- Uploaded images are stored on the local backend filesystem and are not shared across instances.
- Rental approval checks are repeated before approval but are not protected by a distributed lock or database transaction for concurrent multi-instance bookings.
