# Burger House — Online Ordering System

A full-stack online burger ordering and live queue management system.

**Current status: Stage 11 — security hardening complete.**  
Vendor mutations are CSRF-protected, cookies use strict SameSite settings,
Socket.IO validates browser origins, public endpoints are rate-limited, and
sensitive tracking tokens are redacted from logs. Menu management, QR tools,
orders, payments, and live queue updates continue to work.

## Technology

- **Frontend:** React 19, React Router, Vite, Tailwind CSS
- **Backend:** Node.js, Express 5, Zod
- **Database:** SQLite with Prisma 6
- **Authentication:** bcryptjs, server-side sessions, httpOnly cookies
- **Security:** Helmet headers, CSRF double-submit tokens, express-rate-limit
- **Real-time:** Socket.IO
- **QR generation:** qrcode
- **Language:** JavaScript

## Project structure

```text
burger-ordering-system/
├─ client/                       React frontend
│  ├─ public/
│  │  ├─ menu/                   Sample burger photographs
│  │  ├─ payment/                Labelled demo DuitNow QR
│  │  └─ photo-credits.html      Image attribution page
│  ├─ src/
│  │  ├─ api/                    API request helpers
│  │  ├─ components/customer/    Customer menu, cart and checkout components
│  │  ├─ components/shared/      Shared order/payment status badges
│  │  ├─ components/vendor/      Vendor route guard and order cards
│  │  ├─ constants/              Payment and order-status labels
│  │  ├─ context/                Cart and checkout session state
│  │  ├─ hooks/                  Menu and payment-options loading hooks
│  │  ├─ layouts/                Vendor console layout
│  │  ├─ pages/customer/         Menu, cart/checkout and live tracking pages
│  │  ├─ pages/vendor/           Login, live dashboard, menu and QR pages
│  │  ├─ pages/NotFoundPage.jsx  404 screen
│  │  ├─ utils/                  RM formatting, validation, idempotency
│  │  ├─ App.jsx                 React Router routes
│  │  └─ index.css               Tailwind design tokens
│  └─ vite.config.js             Dev server + API/WebSocket proxy
├─ server/                       Express API + Socket.IO
│  ├─ prisma/
│  │  ├─ schema.prisma           Database tables
│  │  ├─ seed.js                 Sample menu, settings and vendor account
│  │  ├─ migrations/             Applied database migrations
│  │  └─ dev.db                  Generated local database
│  ├─ uploads/                   Uploaded menu photos and payment QR images
│  └─ src/
│     ├─ config/                 Environment configuration
│     ├─ constants/              Payment method and status values
│     ├─ lib/                    Prisma client
│     ├─ middleware/             Errors, CSRF, vendor sessions and rate limits
│     ├─ realtime/               Socket.IO namespaces and events
│     ├─ routes/                 API routes
│     ├─ services/               Auth, order, queue and dashboard logic
│     ├─ utils/                  Sessions, queue date, identity, validation, redaction
│     └─ validators/             Zod request schemas
└─ package.json                  Root development scripts
```

## First-time setup

Run these commands from the project root in the VS Code terminal:

```powershell
npm install
npm --prefix server install
npm --prefix client install
Copy-Item server\.env.example server\.env
npm run db:migrate
```

Before running the seed, open `server/.env` and set `VENDOR_PASSWORD` to a strong
password. Then run:

```powershell
npm run db:seed
```

The seed creates or updates the vendor account from the `VENDOR_*` environment
variables and invalidates old vendor sessions. The seeded vendor can sign in with
either the configured email or username.

The migration command may ask for a migration name on the first run. Use `init`.

> On this computer, the dependencies and database have already been set up.
> The commands above are for a fresh copy of the project.

Start both servers with one command:

```powershell
npm run dev
```

Then open:

- Customer menu: http://localhost:5173
- Cart and checkout: http://localhost:5173/cart
- Confirmation links: `http://localhost:5173/order/:trackingToken`
- **Vendor login:** http://localhost:5173/vendor/login
- **Vendor dashboard:** http://localhost:5173/vendor
- **Vendor menu management:** http://localhost:5173/vendor/menu
- **Vendor QR codes:** http://localhost:5173/vendor/qr
- Public menu API: http://localhost:4000/api/menu
- Payment options API: http://localhost:4000/api/checkout/payment-options
- API health check: http://localhost:4000/api/health
- Photo credits: http://localhost:5173/photo-credits.html

### Cart and checkout behaviour

- The cart is stored in `localStorage` under `burger-house.cart.v1`.
- Only menu item IDs, quantities (1–20) and instructions (150 characters max)
  are stored locally. Prices are always loaded fresh from the database.
- Sold-out menu items cannot be added from the menu.
- If an item becomes unavailable after it was added, the cart flags it, excludes
  it from the total, and blocks checkout until it is removed.
- Customer details and the selected payment method are kept in `sessionStorage`
  under `burger-house.checkout.v1` for the current browser tab.
- Payment methods are disabled until the customer details are saved and the cart
  is valid.
- The final **Place order** action is disabled until the cart is valid, customer
  details are saved, and an available payment method is selected.
- Customer details are validated again on the server before an order is stored.

### Order creation and queue numbers

- `POST /api/orders` accepts only menu item IDs, quantities, instructions,
  customer name/phone, payment method and an idempotency key.
- The server fetches current menu items and prices from SQLite. It never trusts
  prices, totals, order statuses or payment statuses from the browser.
- Sold-out or deleted items cause the order to be rejected with
  `ITEM_UNAVAILABLE`.
- Orders and payment history are saved in a database transaction.
- A customer-generated idempotency UUID makes retries and double-clicks safe.
  Repeating the same request returns the existing order instead of creating a
  second one.
- Queue numbers are allocated from `QueueCounter` inside the transaction. A
  unique `(queueDate, queueNumber)` constraint is the final database safeguard.
- SQLite order creation is serialized inside the single Node process to avoid
  concurrent interactive-transaction timeouts. The database constraint remains
  the cross-process safeguard. A multi-instance deployment would need a
  database-level queue lock or PostgreSQL.
- Queue numbers reset at the configured business-day cut-off. The default is
  **4:00 AM Asia/Kuala_Lumpur**.
- Each order receives a random order reference and a random tracking token. The
  tracking token is used in the customer confirmation URL.
- The public confirmation response excludes customer names, phone numbers and
  internal IDs.

### Payment behaviour

- **DuitNow QR:** the checkout reads the vendor-configured QR from `Setting`.
  The seeded QR is a labelled demo file in `client/public/payment/` and contains
  a warning when scanned. It must be replaced by the vendor's real QR before
  launch.
- **Online Banking:** no real gateway is connected. The interface clearly labels
  a demo flow, collects no banking credentials, and can only simulate
  **Pending Verification** or **Failed** — never **Paid**.
- **Cash:** the order is created with **Pending Payment** until the vendor
  confirms cash was received.
- The server derives the initial payment status from the selected method. A
  browser cannot submit `PAID` or any other payment status.
- Each new order also receives an initial `PaymentEvent` for audit history.
- The customer never receives a control that marks an order as Paid.
- The online-banking simulation is UI-only and does not change the order’s
  server-side payment status.

### Vendor authentication and dashboard

- There is no public vendor sign-up. Accounts are created by `npm run db:seed`
  using `VENDOR_NAME`, `VENDOR_EMAIL`, `VENDOR_USERNAME` and `VENDOR_PASSWORD`.
- Vendors can sign in using either their email address or username.
- Passwords are hashed with **bcrypt** at cost 12.
- A random session token is sent in an **httpOnly, SameSite=Strict** cookie.
- Only a SHA-256 hash of the session token is stored in `VendorSession`.
- Sessions expire after **7 days**; each vendor is limited to **10 active
  sessions**, and the oldest sessions are retired when that limit is reached.
- Logout validates CSRF, removes the database session, and clears both cookies.
- Failed logins return a generic message and take the same bcrypt work whether
  or not the username exists. The login endpoint is rate-limited to 10 failed
  attempts per IP every 15 minutes.
- The login cookie is marked `Secure` automatically when `NODE_ENV=production`.
- Unsafe vendor requests require an `X-CSRF-Token` header that matches the
  `bh_vendor_csrf` cookie. The CSRF cookie is readable only by the same-origin
  app, rotated at login, and checked with a timing-safe comparison.
- The vendor dashboard is protected on both the React route and the API.
- The dashboard shows:
  - Queue number
  - Customer name and phone
  - Food, quantities and special instructions
  - Total and payment method/status
  - Order/preparation status and time
- The dashboard connects to the authenticated Socket.IO `/vendor` namespace.
  New orders and vendor changes appear immediately without a manual refresh.
- A 30-second fallback refresh covers temporary socket disconnections.
- An optional notification sound plays when new orders arrive.
- The vendor can filter orders by status and sign out securely.

### Vendor order workflow

- **Accept order** records `acceptedAt` but keeps the order in **Waiting**.
- **Start preparing** requires an accepted order and changes it to **Preparing**.
- **Finish preparing** changes it to **Ready for Collection**.
- **Mark completed** is allowed only after Ready.
- **Cancel order** is allowed while Waiting, Preparing or Ready and accepts an
  optional cancellation reason.
- Only one order can be actively prepared by default. The limit is controlled by
  `Setting.maxPreparing` and enforced inside a serialized database transaction.
- Simultaneous attempts to start two orders result in only one success.
- The earliest waiting order is marked **Next in queue**.
- After an order is finished/completed/cancelled, the next eligible waiting order
  is identified automatically.
- Every action updates timestamps such as `acceptedAt`, `preparingAt`, `readyAt`,
  `completedAt` or `cancelledAt`.

### Vendor payment management

- Payment updates are protected by the vendor session.
- Audited `PaymentEvent` rows are created for every vendor payment change.
- Each order card shows its full payment history with timestamps, notes and the
  vendor who performed the action.
- **DuitNow:** vendor can manually verify as Paid or mark Failed.
- **Cash:** vendor can confirm cash received as Paid or mark Failed.
- **Paid** payments can be marked **Refunded**.
- **Demo online banking** payments cannot be marked Paid because no real bank
  payment was taken in the demo. They can be marked Failed.
- Payment state transitions are enforced on the server; the browser cannot set
  an arbitrary status.
- Customer confirmation pages receive order/payment/queue changes live.

### Live queue tracking

- Socket.IO is attached to the same HTTP server as Express.
- The vendor dashboard uses the authenticated `/vendor` namespace.
- Customers use the public `/tracking` namespace and subscribe with their random
  tracking token.
- Server events:
  - `orders:changed` → vendor dashboards refetch protected order data.
  - `order:updated` → customer order/payment status.
  - `queue:updated` → public queue numbers only.
- The customer page displays:
  - Current order status
  - Live payment status and guidance
  - Queue number
  - **Now preparing** queue number(s)
  - **Next eligible** queue number
  - A Live/Connecting/Reconnecting indicator
- Queue updates contain only queue numbers and counts, never customer names,
  phone numbers or other PII.
- After finishing or cancelling the active order, the next waiting order is
  automatically identified and published to connected customers.
- Customers can still refresh or reopen the tracking link; the HTTP response
  contains the current order and queue state.
- If the vendor socket disconnects, the dashboard automatically reconnects and
  falls back to a 30-second HTTP refresh.

### Menu management

- The protected **Menu management** page is available at `/vendor/menu`.
- Vendors can:
  - Add menu items.
  - Edit names, descriptions and prices.
  - Upload a JPEG, PNG or WebP photo (maximum 5 MB).
  - Mark items available or sold out.
  - Move items up or down in the customer order.
  - Soft-delete items.
- Prices are entered in RM and stored as integer sen. The server validates names,
  descriptions, prices and image paths.
- New items are appended to the end of the menu. Arrow controls renumber the
  whole list so the customer order is predictable.
- Deleting an item hides it from the customer menu but keeps the database row so
  past orders retain their item snapshots.
- Uploaded photos are stored under `server/uploads/menu/` with random filenames
  and served from `/uploads/menu/...`. Replaced or deleted uploads are cleaned
  up on a best-effort basis. Seed photos under `client/public/menu/` are never
  modified.
- SVG uploads are rejected. Accepted image types are checked by both MIME type
  and file-signature bytes on the server.
- Uploaded files are excluded from version control by the root `.gitignore`.
- Menu changes appear on the customer site the next time the customer menu loads.
  They do not require a database migration.

### QR codes and DuitNow setup

- The protected **QR codes** page is available at `/vendor/qr`.
- **Customer menu QR:**
  - Generates a QR code for the customer menu URL using the `qrcode` package.
  - The link defaults to the current browser origin, so a vendor opening the page
    through a LAN address gets a phone-friendly QR code.
  - Vendors can edit the link, download PNG or SVG, copy the link, and print an
    A5 poster.
  - The print layout hides the vendor console and prints only the QR poster.
  - The QR contains only the menu URL, never customer or order data.
- **DuitNow payment QR:**
  - The demo QR can be replaced by uploading the vendor's real DuitNow or banking
    app QR image.
  - Replacing it sets `duitnowQrIsDemo` to false. The customer checkout uses the
    real image on its next load and no longer shows the demo warning.
  - The **Restore demo QR** action switches back to the labelled demo image and
    removes the uploaded real QR file.
  - Payment QR uploads accept JPEG, PNG or WebP, with the same 5 MB limit.
    SVG payment images are rejected.
  - DuitNow payments still remain **Pending Verification** until the vendor
    confirms receipt; uploading a QR does not automate payment detection.
- Uploaded payment QR images are stored under `server/uploads/payment/`.

### Security hardening

- **CSRF protection:** Every vendor `POST`, `PATCH`, `PUT` and `DELETE` request
  must send `X-CSRF-Token` with the value of the non-httpOnly `bh_vendor_csrf`
  cookie. The server compares both values with a timing-safe comparison.
  - The CSRF token is rotated at login.
  - If an existing valid session is missing its CSRF cookie, the next safe
    request issues a new one.
  - The client API helper adds the header automatically for unsafe requests.
- **Cookies:** Vendor session and CSRF cookies are `SameSite=Strict`, path `/`,
  and expire after seven days. The session cookie is `HttpOnly`; both become
  `Secure` in production.
- **Session limits:** Each vendor can have at most 10 active sessions. Expired
  sessions are removed during login.
- **Login hardening:** Unknown usernames still run a bcrypt comparison against a
  dummy hash, reducing timing-based username discovery. Failed logins are
  rate-limited.
- **Socket.IO origin checks:** Browser socket handshakes must come from the
  configured public app origin or, in development, localhost/private LAN
  addresses. Foreign browser origins receive `403`.
- **Rate limits:**
  - Login: 10 failed attempts per IP every 15 minutes.
  - Order creation: 30 attempts per IP every 10 minutes.
  - Order tracking lookups: 120 per IP per minute.
  - Vendor image uploads: 30 per IP every 15 minutes.
- **API headers:** Helmet adds `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, a restrictive `Content-Security-Policy`,
  `Cross-Origin-Resource-Policy`, `Referrer-Policy`, HSTS, and related headers.
  The API also disables ETag caching, sets `Cache-Control: no-store`, escapes
  HTML-sensitive characters in JSON, and sends a restrictive
  `Permissions-Policy`.
- **Vite headers:** The development and preview servers send
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
- **Log redaction:** Customer tracking tokens in `/api/orders/...` paths and
  sensitive query strings are replaced with `[redacted]` in request logs and
  error logs.
- **Proxy awareness:** `TRUST_PROXY` is false by default. Set it to the number of
  trusted reverse-proxy hops only when the API is behind a proxy you control.
  Never enable it on a directly exposed API, because clients could spoof
  `X-Forwarded-For` and bypass per-IP rate limits.
- **Deployment follow-ups (Stage 13):** Serve the built React app over HTTPS with
  a production CSP, replace the in-memory rate-limit store if running multiple
  API instances, and keep the Prisma advisories limited to the development CLI.
  A database migration is not required for Stage 11.

### Public API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/menu` | Restaurant name/logo plus non-deleted menu items, prices in sen, images and availability |
| `GET /api/checkout/payment-options` | DuitNow QR settings, demo mode flag and payment methods |
| `POST /api/orders` | Validates and creates an order, assigns a queue number, returns public order data |
| `GET /api/orders/:trackingToken` | Returns public order/confirmation data for a random tracking token |
| `GET /api/health` | API and database connection check |

### Socket.IO namespaces

| Namespace | Access | Events |
|---|---|---|
| `/tracking` | Public, requires a valid random tracking token to join order/queue rooms | `track:order`, `order:updated`, `queue:updated` |
| `/vendor` | Authenticated vendor session cookie | `orders:changed` |

### Protected vendor endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/vendor/auth/login` | Email/username and password sign-in |
| `GET /api/vendor/auth/me` | Current authenticated vendor |
| `POST /api/vendor/auth/logout` | Revoke the current session |
| `GET /api/vendor/dashboard` | Order list, counts and customer details for the authenticated vendor |
| `PATCH /api/vendor/orders/:orderId/status` | Accept, start, finish, complete or cancel an order |
| `PATCH /api/vendor/orders/:orderId/payment` | Mark a payment Paid, Failed or Refunded with audit history |
| `GET /api/vendor/menu` | Full menu list for the authenticated vendor |
| `POST /api/vendor/menu` | Add a menu item |
| `PATCH /api/vendor/menu/:itemId` | Edit a menu item, including availability |
| `PATCH /api/vendor/menu/:itemId/position` | Move an item up or down in the menu |
| `DELETE /api/vendor/menu/:itemId` | Soft-delete a menu item |
| `POST /api/vendor/uploads/:kind` | Upload a menu or payment image (`kind` is `menu` or `payment`) |
| `GET /api/vendor/qr/menu` | Generate the customer menu QR as PNG data and SVG |
| `GET /api/vendor/settings/payment` | Read the current DuitNow QR settings |
| `PATCH /api/vendor/settings/payment` | Replace or restore the DuitNow payment QR |

All unsafe vendor endpoints (`POST`, `PATCH`, `PUT`, `DELETE`) require a valid
session and an `X-CSRF-Token` header matching the `bh_vendor_csrf` cookie. The
login endpoint is exempt because no authenticated session exists yet.

Menu and payment endpoints never include customer or order records. The order
confirmation endpoint requires the unguessable tracking token and still excludes
the customer’s name and phone number. Customer details are returned only by the
authenticated vendor dashboard.

## Daily development

```powershell
npm run dev
```

Useful database commands:

```powershell
npm run db:studio
npm run db:migrate
npm run db:seed
```

## Testing from a phone on the same Wi-Fi

1. Start the project with `npm run dev`.
2. Find your computer's IPv4 address:

   ```powershell
   ipconfig
   ```

3. On your phone, open `http://YOUR-IP:5173` (for example
   `http://192.168.1.20:5173`).
4. If Windows Firewall asks, allow Node.js on **Private networks**.

Do not use `localhost` in the phone's address bar — `localhost` on a phone means
the phone itself, not your computer.

## Environment variables

Local values live in `server/.env`, which is excluded from Git. The safe template
is `server/.env.example`. Never commit real passwords, session secrets, or payment
gateway credentials.

- `PUBLIC_APP_URL` is used as the default menu QR link and the production
  Socket.IO origin allowlist. Set it to the deployed customer-facing URL.
- `TRUST_PROXY` is `false` by default. When Express sits behind one trusted
  reverse proxy, set it to `1` so per-IP rate limits and logs use the real client
  address. Do not enable it when the API is directly exposed to the internet.

## Dependency note

Prisma 6.19 is pinned because it works directly with plain JavaScript and SQLite,
without requiring a TypeScript build step for the server. `npm audit` reports
advisories inside Prisma's **development command-line tool** (not the Express API
process); the Stage 11 review found no new advisory from the QR dependency. These
will be reviewed again at deployment. Do not run `npm audit fix --force`; it would
perform a breaking Prisma upgrade.

## Stage plan

1. Inspection and stack selection — complete
2. Project setup, database, health check — complete
3. Customer menu and food browsing — complete
4. Shopping cart and customer details — complete
5. Checkout and payment methods — complete
6. Secure order creation and queue numbers — complete
7. Vendor authentication and dashboard — complete
8. Order and payment management — complete
9. Live queue tracking — complete
10. Menu management and QR codes — complete
11. Security hardening — complete
12. Full testing — next
13. Deployment

## Menu photographs

The original burger photos are development placeholders stored in
`client/public/menu/`. Their sources and licences are listed at
`/photo-credits.html`. Vendors can now replace any menu item photo from
`/vendor/menu`; new uploads are stored in `server/uploads/menu/`.

The DuitNow QR at `client/public/payment/duitnow-demo.svg` is a **demo only**.
It encodes a warning message and must never be used to collect real money.
Vendors can replace it from `/vendor/qr` with their real payment QR image.
