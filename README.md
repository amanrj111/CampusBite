# CampusBite — Smart Canteen Management

Full-stack campus canteen system with **customer web**, **admin + kitchen boards**, **Expo mobile app**, **wallet/UPI/card/counter payments**, and **live order tracking** over Socket.IO.

## Stack

- API: Node.js, Express, Prisma, SQLite, Socket.IO, JWT
- Web: React + Vite (responsive — works on phones in the browser)
- Mobile: Expo React Native (menu, cart, pay, track, kitchen)

## Quick start

```bash
npm install
npm install --prefix server
npm install --prefix web
cd server
npx prisma generate
npx prisma db push
npm run seed
cd ..
npm run dev
```

Open **http://localhost:5173**

### Demo accounts

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Student | user@canteen.com       | user123     |
| Admin   | admin@canteen.com      | admin123    |
| Kitchen | kitchen@canteen.com    | kitchen123  |

## Mobile (Expo)

Keep the API running, then:

```bash
cd mobile
npm install
npx expo start
```

On a physical phone, set `EXPO_PUBLIC_API_URL` to your PC’s LAN address, for example `http://192.168.1.10:4000`.

## What you can do

- Browse menu, filter veg/non-veg, add to cart
- Pay with campus wallet, demo UPI, demo card, or counter
- Watch token status live: placed → confirmed → preparing → ready → completed
- Kitchen board advances tickets; customer web/mobile update instantly
- Admin: today’s revenue, live orders, menu availability, users
- New registrations start with ₹100 wallet credit

Demo UPI/card is a simulated success path so the product is fully usable without payment-gateway keys. Swap in Razorpay/Stripe in `POST /api/orders` when you have credentials.
