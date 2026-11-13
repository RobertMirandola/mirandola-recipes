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

## Deploy

1. Create a Postgres database on [Neon](https://neon.tech) and copy its pooled connection string.
2. Import this project on [Vercel](https://vercel.com). The Hobby plan is enough for one person.
3. Set the variables above in the Vercel project's environment variables. `DATABASE_URL` is required there.
4. Deploy. The `vercel-build` script applies the database migrations, then builds the site.

Vercel gives you an `https` URL. A custom domain is optional. ChatGPT needs that public `https` URL.

## Connect ChatGPT

In ChatGPT, add a custom MCP server (Plugins or Apps, then add a custom connector) and use:

- Server URL: `https://<your-domain>/mcp`
- Authentication: OAuth
- Client id: the value of `OAUTH_CLIENT_ID`
- Client secret: the value of `OAUTH_CLIENT_SECRET`

ChatGPT opens this site to ask permission. Enter the app password and choose Allow. After that, “save this to mirandola-recipes” calls `save_recipe`, and a later chat can call `list_recipes` to see what is already saved. ChatGPT asks you to confirm before a write runs.

The tools expect a structured recipe: a title, how many meals the quantities make, ingredients grouped into Produce, Protein, Dairy, Pantry, Spices, or Other, and steps whose amounts are `{ingredient-id}` slots rather than typed numbers. The server instructions tell the model to do that, and not to save a second copy of a title it already lists.

If a personal ChatGPT plan refuses the write tool, post the same JSON to the HTTP route below.

## HTTP API

`POST /api/recipes` with `Authorization: Bearer <API_TOKEN>` and a JSON body in the same shape as `save_recipe`:

```json
{
  "title": "Weeknight fried rice",
  "baseServings": 2,
  "category": "vegetarian",
  "ingredients": [
    { "id": "rice", "name": "cooked jasmine rice", "quantity": 3, "unit": "cup", "group": "Pantry" }
  ],
  "steps": ["Stir-fry the {rice} rice for 3 minutes."]
}
```

A save returns `201` with `{ "id", "title", "url" }`. A bad recipe returns `400` with `problems`. A missing or wrong token returns `401`.

## Install on a phone or computer

The site ships a web app manifest. In a phone browser, use Add to Home Screen. On desktop, install it from the browser so it opens in its own window. Version 1 needs a network connection.

## Left for later

Editing a saved recipe, search, photos, a grocery export, offline use, and accounts for anyone else. You can delete a recipe from its page.
