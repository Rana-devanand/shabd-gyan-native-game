# Supabase Edge Functions — Shabd Gyan

Edge Functions run Deno TypeScript on the server close to your users.
Use them for operations that must NOT run on the client (e.g. answer verification, payment processing, server-side scoring).

---

## Folder Structure

```
src/Supabase/edge-functions/
└── sync-game-data/
    └── index.ts        ← Server-side puzzle validation & XP award
```

---

## Prerequisites

Install the Supabase CLI:

```bash
npm install -g supabase
```

Login and link your project:

```bash
supabase login
supabase link --project-ref wmcmpylectwvwhqqukqm
```

---

## Deploy a Function

```bash
# From the project root
supabase functions deploy sync-game-data --project-ref wmcmpylectwvwhqqukqm
```

---

## Set Secrets (Environment Variables)

Secrets are injected at runtime — never hard-code keys inside the function.

```bash
supabase secrets set SUPABASE_SERVICE_KEY="<your-service-role-key>" \
                     --project-ref wmcmpylectwvwhqqukqm
```

> The `SUPABASE_URL` is automatically available inside every Edge Function.

---

## Call from React Native

```ts
import { supabase } from '@/src/Supabase/client';

const { data, error } = await supabase.functions.invoke('sync-game-data', {
  body: {
    puzzle_id: 'food_1',
    answer:    'TEA',
    points:    100,
    reason:    'puzzle_solved',
  },
});
```

---

## Planned Edge Functions (Future)

| Function              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `sync-game-data`      | ✅ Validate puzzle answer & award XP server-side     |
| `send-invite-email`   | Send household invitation emails via Resend / SMTP   |
| `daily-challenge`     | Generate or rotate the daily puzzle at midnight IST  |
| `expire-invitations`  | Cron job — mark expired invites as `expired`         |
| `ai-clue-generator`   | Use Groq API to auto-generate Hinglish puzzle clues  |
