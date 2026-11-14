# Mirandola Recipes

A personal recipe site for phone and desktop. Finish a recipe in ChatGPT, tell it to save the recipe to mirandola-recipes, and it shows up here. Open a recipe to see ingredients grouped by section, then change how many meals you want and the amounts in the ingredients and the steps scale with it.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Fill in `APP_PASSWORD`, `SESSION_SECRET`, and `OAUTH_CLIENT_SECRET` in `.env.local`. Generate the two secrets with `openssl rand -base64 48` and `openssl rand -base64 32`.

With `DATABASE_URL` unset, recipes are stored in a local file database under `.data/`. That directory is gitignored.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | On Vercel | Neon Postgres connection string, the pooled one. Leave unset locally to use the file database. |
| `APP_PASSWORD` | Yes | The one password that opens the site and approves ChatGPT. Use a long passphrase. Sign-in is not rate limited. |
| `SESSION_SECRET` | Yes | Signs the login cookie and the ChatGPT tokens. At least 32 characters. Changing it signs you out and disconnects ChatGPT. |
| `OAUTH_CLIENT_ID` | Yes | Client id you paste into ChatGPT. Any string you choose. |
| `OAUTH_CLIENT_SECRET` | Yes | Client secret you paste into ChatGPT. |
| `API_TOKEN` | No | Bearer token for `POST /api/recipes`. Leave unset and that route stays off. |
| `OAUTH_EXTRA_REDIRECT_URIS` | No | Comma-separated redirect URIs besides ChatGPT's, for a local OAuth test. |

