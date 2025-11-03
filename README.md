# BDC Mini API

Mini API for Blockchain Data Center:
- MongoDB logging of requests
- API key protection via `x-api-key`
- Rate limit on `/api/*`
- Simple HTML dashboard to view logs
- Health & Weather endpoints

## Requirements
- Node.js >= 18
- MongoDB Atlas (or local)
- Create `.env` from `.env.example`

## Quick Start
```bash
npm install
cp .env.example .env
# edit .env (MONGO_URI + API_KEY)
npm run dev
# open http://localhost:3000