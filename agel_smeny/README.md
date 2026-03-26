# AGEL Shift Planner — Kardiochirurgie JIP

## Rychlý start

```bash
# 1. Nainstaluj závislosti
npm install

# 2. Nastav API klíč (zkopíruj a uprav)
cp .env.local.example .env.local

# 3. Spusť lokálně
npm run dev
# → otevři http://localhost:3000

# 4. Nasaď na Vercel
npx vercel --prod
```

## Nasazení na Vercel
- Potřebuješ účet na vercel.com (zdarma)
- Příkaz `npx vercel --prod` tě provede přihlášením automaticky
- Výsledek: živá URL jako `agel-shift-planner.vercel.app`

## Google Calendar sync
Sync funguje přes Anthropic API + Google Calendar MCP.
Potřebuješ Anthropic API klíč z https://console.anthropic.com/api-keys
