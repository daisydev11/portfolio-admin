# Daisy portfolio — Supabase setup

This package contains your portfolio, a Node backend and an admin editor. It uses Supabase Postgres, Auth and Storage. No database account or credentials are bundled. Node.js 24 or newer is required. There are no npm dependencies to install.

## Connect your Supabase project

1. Create or open your project at https://supabase.com/dashboard.
2. Open SQL Editor and run the entire `supabase.sql` file. This creates the content, revision history, message tables and image bucket.
3. Under Authentication → Users, add your admin user with a strong password and a confirmed email. The email must match `ADMIN_EMAIL` below. Disable public sign-ups if this project is only for your portfolio.
4. Copy `.env.example` to `.env` in the project folder. Enter your project URL, publishable key and server-only secret key from the project’s API settings. Set `ADMIN_EMAIL` to your admin email. Never put the secret key in public HTML, commit `.env`, or send these values in chat.
5. In a terminal opened in this folder, run:

```sh
npm run init-db
npm start
```

The import preserves already-saved pages when run again. Open http://localhost:3000 for the portfolio and http://localhost:3000/admin to sign in.

**Open the site through this server, rather than double-clicking index.html.** The database, admin and contact form need the backend running.

## Editing

Choose a page and section. Edit text, links, image descriptions or upload a PNG, JPEG or WebP (maximum 4 MB). Click Save changes to publish edits. You can hide and reorder content sections or add a new section with a heading, paragraph and image. Header, footer and general fields remain fixed. Each project has its own editable case-study page. Preview opens that page.

Contact form submissions appear in the private Messages inbox. Mark messages read or unread. This implementation stores messages; it does not send email notifications. Previous page versions are retained in `portfolio_versions`; restoration is currently through the database, not an admin button.

## Hosting

Use a host that runs Node.js continuously, with HTTPS. The `public` folder alone is insufficient. Set these private host environment variables:

- The three Supabase values and `ADMIN_EMAIL` from `.env`.
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `APP_ORIGIN=https://your-exact-portfolio-domain` (no trailing slash)
- `PORT` as required by the host.

Start command: `npm start`. Run the SQL and seed import once before launch. If using Docker, the included Dockerfile exposes port 3000. Supply secrets at runtime, never while building the image. Keep Supabase backups enabled according to your plan. Uploaded portfolio images are public; do not upload private documents to this bucket.

## Verification and security

Run `npm test`. Tests use a simulated Supabase service to check API behavior, owner-only writes, CSRF checks, revision conflicts, image-type rejection, messages and all eight page seeds. Actual credentials and a live Supabase project are required for a live connection check.

Only the configured owner can edit. Session cookies are HttpOnly; production cookies require HTTPS. Database tables have RLS enabled and public database roles have no table access. Server-only credentials perform database operations after backend authorization. Public visitors receive portfolio content and can submit the contact form, but cannot read the inbox. Image uploads accept PNG/JPEG/WebP only. Page saves detect competing revisions and retain the previous content.

For an existing installation, follow UPDATE.md. The editor includes a Home menu item, Edit all images, image fit/crop/size controls and section colour/spacing controls. Playground has been removed.
