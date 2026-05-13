# AlloHealth Inventory Reservation System

A complete end-to-end implementation of a race-condition-free inventory reservation system with live countdown timers, concurrent reservation handling, and professional UI.

## Overview

This system solves the classic e-commerce race condition: when a customer proceeds to checkout, we temporarily hold inventory units for a short window (10 minutes). If payment succeeds, the reservation is confirmed and stock is permanently decremented. If payment fails or the timer expires, the hold is released so units become available to other shoppers.

**Core guarantee**: If two requests simultaneously attempt to reserve the last unit of a SKU, exactly one succeeds with a 409 (Conflict) response for the other.

## Architecture

### Tech Stack
- **Frontend**: Next.js 16.2.6 (App Router), TypeScript, Tailwind CSS, Axios
- **Backend**: Express.js, TypeScript, Prisma ORM, PostgreSQL
- **Concurrency Control**: PostgreSQL SELECT FOR UPDATE row-level locking
- **Expiry Management**: Node-cron background job (1-minute interval)

### Project Structure
```
frontend/
├── app/
│   ├── page.tsx              # Product listing page
│   ├── reservation/[id]/      # Individual reservation checkout
│   └── checkout/Reservation/  # Reservations dashboard
├── components/
│   ├── ProductCard.tsx        # Product display with warehouses
│   ├── StockCard.tsx          # Warehouse stock selector
│   ├── CountdownCell.tsx      # Live countdown timer cell
│   └── Alert.tsx              # Notification component
├── hooks/
│   └── useCountdown.ts        # Live countdown timer (1000ms updates)
└── types/
    └── inventory.ts           # TypeScript interfaces

server/
├── controllers/
│   └── product.controller.ts  # All business logic handlers
├── routes/
│   └── product.route.ts       # API route definitions
├── jobs/
│   └── ExpireyClear.ts        # Cron job for expiry cleanup
└── prisma/
    ├── schema.prisma          # Data model
    └── client.prisma.ts       # Prisma client instance
```

## Getting Started Locally

### Prerequisites
- Node.js 18+
- PostgreSQL database (hosted: Supabase, Neon, Railway recommended; or local)
- npm or yarn

### Setup Instructions

#### 1. Clone and Install Dependencies
```bash
cd frontend && npm install
cd ../server && npm install
cd ..
```

#### 2. Configure Environment Variables

**Backend** (`server/.env`):
```
DATABASE_URL=postgresql://user:password@host:5432/allohealth
DIRECT_URL=postgresql://user:password@host:5432/allohealth
PORT=3001
client_url=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

#### 3. Database Migrations
```bash
cd server
npx prisma migrate deploy
npx prisma db seed  # Optional: seed with sample data
cd ..
```

#### 4. Run Development Servers

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

#### 5. Test the System
1. Navigate to http://localhost:3000
2. Browse products and available stock
3. Click "Reserve" to create a reservation
4. Watch live countdown timer (expires in 10 minutes)
5. Click "Confirm Purchase" to complete reservation
6. Check "My Reservations" dashboard for all reservations

## API Endpoints

### Products & Warehouses
- `GET /api/products` - List all products with stock per warehouse
- `GET /api/warehouses` - List all warehouses

### Reservations (Race-Condition-Free)
- `POST /api/reservations` - Reserve units
  - Request: `{ productId, warehouseId, quantity }`
  - Response: `{ id, status: "PENDING", expiresAt, ... }`
  - Error 409: Insufficient stock
  - Error 404: Product/warehouse not found

- `GET /api/reservations` - List all user reservations

- `GET /api/reservations/:id` - Get single reservation details

- `POST /api/reservations/:id/confirm` - Confirm reservation (charge payment)
  - Response: `{ status: "CONFIRMED" }`
  - Error 410: Reservation expired
  - Error 400: Already processed
  - Error 404: Reservation not found

- `POST /api/reservations/:id/release` - Cancel reservation (refund/user cancellation)
  - Response: `{ status: "RELEASED" }`
  - Error 400: Already processed
  - Error 404: Reservation not found

## How Concurrency is Handled

### The Problem
When two customers try to reserve the last unit simultaneously:
```
Customer A: GET inventory (available: 1)
Customer B: GET inventory (available: 1)
Customer A: Decrement to 0
Customer B: Decrement to -1  ❌ RACE CONDITION
```

### The Solution: SELECT FOR UPDATE
```sql
BEGIN TRANSACTION;
  SELECT * FROM "Inventory" WHERE id = ? FOR UPDATE;
  -- Row is locked; other transactions wait here
  
  IF availableStock >= quantity:
    availableStock -= quantity
    reservedStock += quantity
    COMMIT
    RETURN 201
  ELSE:
    ROLLBACK
    RETURN 409
```

**Why this works**:
1. `SELECT FOR UPDATE` acquires an exclusive row lock
2. Conflicting transactions are blocked until lock is released
3. First transaction commits → second transaction wakes up and rechecks
4. Second transaction sees insufficient stock → returns 409
5. Guarantee: Exactly one succeeds, one fails atomically

### Code Example
```typescript
await prisma.$transaction(async (tx) => {
  const [inventory] = await tx.$queryRaw`
    SELECT * FROM "Inventory" 
    WHERE productId = ${productId} AND warehouseId = ${warehouseId}
    FOR UPDATE
  `;
  
  if (inventory.availableStock < quantity) {
    throw { status: 409, message: "Insufficient stock" };
  }
  
  // Atomically decrement and increment
  await tx.inventory.update({
    where: { id: inventory.id },
    data: {
      availableStock: { decrement: quantity },
      reservedStock: { increment: quantity }
    }
  });
});
```

## Reservation Expiry Mechanism

### How It Works in Production

**1. Expiry Time Set at Reservation Creation**
```typescript
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
```

**2. Background Cron Job Cleanup**
- Runs every minute via `node-cron`
- Imported in `server/app.ts` so it starts with the server
- Logic in `server/jobs/ExpireyClear.ts`:
  ```typescript
  cron.schedule("* * * * *", async () => {
    // Find all PENDING reservations where expiresAt < now
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() }
      }
    });
    
    // For each expired reservation:
    // 1. Lock the reservation and inventory rows (FOR UPDATE)
    // 2. Check if still PENDING (may have been confirmed/released)
    // 3. If PENDING: update status to RELEASED, return stock
    // 4. Commit transaction
  });
  ```

**3. Frontend Live Detection**
- `useCountdown` hook updates every 1000ms (returns remaining ms)
- Shows 3-stage color coding: Blue (normal) → Yellow (<1 min) → Red (expired)
- When countdown reaches zero, buttons disable automatically
- API returns 410 (Gone) if user tries to confirm after expiry

**4. Accuracy**
- Cron job runs every 60 seconds (acceptable delay for most use cases)
- Lock-based transactions prevent race conditions during cleanup
- Idempotent: if a reservation is already released, cleanup is skipped
- Server time used (not client time) to prevent timezone/clock-skew issues

## Frontend Features

### Product Listing Page (`app/page.tsx`)
- Gradient background design
- Grid layout showing all products
- Each product card displays:
  - Product name & description
  - Stock levels per warehouse with progress bars
  - Color-coded availability (green: >5, yellow: 1-5, red: 0)
  - "Reserve" button with quantity input

### Checkout/Reservation Page (`app/reservation/[id]/page.tsx`)
- Live countdown timer with 3 urgency levels
- Reservation details (product, warehouse, quantity)
- Status badge (PENDING: blue, CONFIRMED: green, RELEASED: red)
- "Confirm Purchase" button (disabled when expired)
- "Cancel" button
- Auto-refresh on 410 (expired) error
- Success redirect after confirmation

### Reservations Dashboard (`app/checkout/Reservation/page.tsx`)
- **Stats Cards**: Shows pending, confirmed, released counts
- **PENDING Section** (Blue): 
  - Grid of cards with product, warehouse, quantity, countdown
  - "Complete Checkout" link for each
- **CONFIRMED Section** (Green):
  - Completed purchases
- **RELEASED Section** (Red):
  - Cancelled/expired reservations
- **Empty State**: Friendly message to browse products
- **Live Counters**: Countdown timers update in real-time

### Reusable Components
- `Alert.tsx`: Success/error/info/warning notifications
- `CountdownCell.tsx`: Table cell with live countdown + color coding
- `StockCard.tsx`: Warehouse selector with progress bar, quantity input, reserve button
- `ProductCard.tsx`: Product display with gradient header

### Custom Hooks
- `useCountdown.ts`: 
  - Returns: `{ remaining (ms), isExpired (boolean), timeString (mm:ss) }`
  - Updates every 1000ms
  - Handles edge cases: null expiresAt, time in past

## Error Handling

### HTTP Status Codes

| Code | Scenario | Frontend Behavior |
|------|----------|-------------------|
| 409  | Insufficient stock | Show error alert "That item sold out. Try another quantity or warehouse" |
| 410  | Reservation expired | Show error, auto-refresh to show RELEASED status |
| 400  | Already processed | Show error "This reservation has already been processed" |
| 404  | Not found | Show error "Reservation not found" |
| 500  | Server error | Show generic error, log to console |

All errors are caught, displayed to user in Alert components, and never silently swallowed.

## Trade-offs & Design Decisions

### 1. Cron-Based Expiry vs. TTL/Scheduled Jobs
- **Chosen**: Cron job (every 60 seconds)
- **Why**: Simple, no external dependencies, works with PostgreSQL
- **Trade-off**: Up to 60-second latency before stock is released
- **Alternative**: Redis with TTL or AWS Lambda would give instant cleanup but adds operational complexity

### 2. Frontend Countdown vs. Server Verification
- **Chosen**: Client-side `useCountdown` hook + server-side 410 response
- **Why**: Great UX (immediate visual feedback), but server is source of truth
- **Trade-off**: Clock skew between client/server can cause brief UI inconsistency
- **Mitigation**: Server returns 410 if actual expiry has passed; frontend respects this

### 3. SELECT FOR UPDATE vs. Optimistic Locking
- **Chosen**: SELECT FOR UPDATE (pessimistic)
- **Why**: Guaranteed correctness, simpler to reason about
- **Trade-off**: Blocking under high concurrency (slower latency)
- **Alternative**: Version numbers + retry loop would be faster but more complex

### 4. No Idempotency (Bonus Not Implemented)
- **Why**: Out of scope for core feature
- **How to add**: Redis cache with Idempotency-Key → store request hash + response
- **Cost**: ~2 hours to implement fully with cache TTL and cleanup

### 5. No User Authentication
- **Why**: Assignment focused on inventory logic, not auth
- **To add**: JWT middleware + middleware on routes
- **Impact**: Each user can see all reservations (demo-only system)

## Data Model

### Product
```typescript
{
  id: UUID
  name: string
  description: string
  createdAt: DateTime
}
```

### Warehouse
```typescript
{
  id: UUID
  name: string
  location: string
}
```

### Inventory
```typescript
{
  id: UUID
  productId: UUID
  warehouseId: UUID
  totalStock: number       // Total units
  availableStock: number   // Available for reservation
  reservedStock: number    // Currently held in reservations
  // Invariant: availableStock + reservedStock = totalStock
}
```

### Reservation
```typescript
{
  id: UUID
  inventory: Inventory
  quantity: number
  status: "PENDING" | "CONFIRMED" | "RELEASED"
  expiresAt: DateTime      // 10 minutes from creation
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Testing Concurrency Locally

### Simulate Race Condition (Verify It's Fixed)
```bash
# Terminal 1: Start backend
cd server && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Test concurrent reservations
curl -X POST http://localhost:3001/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"...", "warehouseId":"...", "quantity":1}' &

curl -X POST http://localhost:3001/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"...", "warehouseId":"...", "quantity":1}' &

wait
# Expected: One succeeds (201), one fails (409)
# Not expected: Both succeed (race condition)
```

## Deployment

### Recommended Stack
1. **Database**: Supabase, Neon, or Railway (PostgreSQL hosting)
2. **Frontend**: Vercel (Next.js native, automatic deployments)
3. **Backend**: Railway, Fly.io, or Heroku (Node.js hosting)
4. **Optional**: Upstash Redis (for idempotency bonus)

### Environment Variables for Production
```
# Backend
DATABASE_URL=postgresql://...  # Hosted Postgres connection string
DIRECT_URL=postgresql://...    # Direct connection (for migrations)
PORT=3001
client_url=https://yourdomain.com

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

### Seed Data for Demo
```bash
cd server
npx prisma db seed
# Creates 5 sample products × 3 warehouses with varying stock levels
```

## Verification Checklist

- ✅ Data model with products, warehouses, inventory, reservations
- ✅ All 5 API endpoints implemented
- ✅ Race-condition-free concurrency (SELECT FOR UPDATE)
- ✅ Returns 409 on insufficient stock
- ✅ Returns 410 on expired reservation
- ✅ Product listing page with professional UI
- ✅ Checkout page with live countdown
- ✅ Confirm/cancel functionality
- ✅ Errors visible to user (not silent)
- ✅ State updates without page refresh
- ✅ TypeScript end-to-end (no `any`)
- ✅ Reservation expiry mechanism (cron job)
- ✅ Background job imported in app.ts
- ✅ Build passes (5.1s Turbopack compile)

## What's Not Included (But Could Be)

1. **User Authentication** - Not required for assignment; add JWT middleware + /auth routes
2. **Idempotency** (Bonus) - Redis-backed request deduplication
3. **Email Notifications** - Confirm/expiry emails (add Nodemailer)
4. **Payment Integration** - Stub in place of real Stripe/Razorpay
5. **Analytics** - Reservation success rates, popular products
6. **Mobile Optimization** - Works but not tested on small screens
7. **Accessibility (a11y)** - No ARIA labels or keyboard navigation
8. **Rate Limiting** - No per-user/IP rate limits on API
9. **Audit Logging** - No history of who confirmed/released what

## Support & Troubleshooting

### "Cannot find module 'node-cron'" after deployment
- Backend must run `npm install` with `node-cron` as dependency
- Check `server/package.json` includes it

### Countdown shows wrong time
- Verify client system clock is within ±5 seconds of server
- Frontend uses server's expiresAt timestamp, not client time

### 409 errors when stock is available
- Check: Inventory row is locked by another transaction
- Solution: Transaction typically completes within seconds; retry request
- Verify: availableStock + reservedStock = totalStock in database

### ExpireyClear job not running
- Verify it's imported in `server/app.ts` (not just defined)
- Check server logs for cron schedule messages
- Job runs in-process; if server restarts, cleanup pauses

