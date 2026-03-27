# AutoGrab – Vehicle Selection Form

A full-stack TypeScript monorepo built for the AutoGrab code challenge.

## Architecture

```
AutoGrab/
├── server/          # Express.js + TypeScript API (port 4000)
│   └── src/
│       ├── index.ts        # Express app, routes, multer file upload
│       └── vehicleData.ts  # Vehicle data map + helper functions
└── client/          # Next.js 15 + React 18 + Tailwind CSS (port 3000)
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── error.tsx
    │   └── not-found.tsx
    ├── components/
    │   └── VehicleForm.tsx  # Main form component
    └── lib/
        └── vehicleData.ts   # Shared vehicle data + types
```

## Features

- **Cascading dropdowns**: Make → Model → Badge, each clearing downstream when changed
- **Quick Select buttons**: 4 preset vehicles (Tesla Model 3 Performance, Ford Ranger Raptor, BMW 320e, Ford Falcon XR8)
- **Logbook upload**: Accepts `.txt` files only, validated on both client and server
- **POST to Node.js**: Form submits via `multipart/form-data` to Express `/api/submit`
- **Response display**: Shows vehicle selection + full logbook content after successful submission
- **TypeScript**: End-to-end type safety on both server and client

## API Endpoints

| Method | Endpoint                             | Description                                       |
| ------ | ------------------------------------ | ------------------------------------------------- |
| GET    | `/api/makes`                         | Returns all makes                                 |
| GET    | `/api/models?make=ford`              | Returns models for a make                         |
| GET    | `/api/badges?make=ford&model=Ranger` | Returns badges                                    |
| GET    | `/api/vehicles`                      | Returns full vehicle data map                     |
| POST   | `/api/submit`                        | Accepts `make`, `model`, `badge` + `logbook` file |

## Quick Start

### 1. Install all dependencies

```bash
npm run install:all
```

### 2. Run both server and client in dev mode

```bash
npm run dev
```

- **Client**: http://localhost:3000
- **Server**: http://localhost:4000

### 3. Or run individually

```bash
npm run dev:server   # Express API on :4000
npm run dev:client   # Next.js UI on :3000
```

## Production Build

```bash
npm run build
npm run start
```

## Testing 

```bash
npm run test
```

## Vehicle Data

```
Ford:
  Ranger  → Raptor, Raptor X, Wildtrak
  Falcon  → XR6, XR6 Turbo, XR8
  Falcon Ute → XR6, XR6 Turbo

BMW:
  130d → xDrive 26d, xDrive 30d
  240i → xDrive 30d, xDrive 50d
  320e → xDrive 75d, xDrive 80d, xDrive 85d

Tesla:
  Model 3 → Performance, Long Range, Dual Motor
```

## Tech Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend  | Node.js, Express.js, TypeScript, Multer        |
| Tooling  | ts-node-dev, concurrently                      |
