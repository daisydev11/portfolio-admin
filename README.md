# Daisy portfolio with Supabase CMS

Read SETUP.md to connect Supabase and start the app.

- Public portfolio: `/`
- Admin editor: `/admin`
- Separate project pages: `/applyd.html`, `/soravacue.html`, `/prelp.html`, `/whosabiam.html`
- Contact messages: stored in Supabase and viewed in the admin inbox.

Files: `server.mjs` (backend), `supabase.sql` (database/storage schema), `seed.json` (initial page content), `public/admin` (editor), `public/js/cms-runtime.js` (public content and form integration).

No live Supabase credentials are included. The existing burgundy styling and portfolio assets are included.

For an existing installation, follow UPDATE.md. The editor includes a Home menu item, Edit all images, image fit/crop/size controls and section colour/spacing controls. Playground has been removed. YouTube has also been removed. Read EDITING.md for direct HTML/CSS editing and the content-source settings.
