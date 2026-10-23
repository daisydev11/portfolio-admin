# Install this revision

1. Stop Node with Control+C. Keep a backup of your current project, especially if you have edited its local files.
2. Extract the updated ZIP. Preserve your existing `.env`, and replace the other project files with this updated `portfolio-admin` folder. Remove any leftover `public/playground.html`. Portfolio HTML files are in `public`; the editor is in `public/admin`.
3. From `portfolio-admin`, run:

```sh
npm run upgrade
npm start
```

No new SQL is required. The upgrade removes Playground and YouTube, adds the missing experience content, and updates unchanged template defaults. It preserves your other saved text, image addresses and custom sections. Contact messages and your account remain unchanged.

4. Open http://localhost:3000/admin and hard refresh with Command+Shift+R. Home is the first page. Choose how it gets its content: Combine, saved admin content, or HTML files only. Read EDITING.md for examples.
5. Open http://localhost:3000 and refresh. Check the hero, project cards, social icons and contact button. About now includes the three experience entries from the bundled resume, with the Stalwart Crest role labelled Product Designer as requested. The dates and descriptions are editable.

The stylesheet is now one shared, editable `public/assets/css/portfolio.css` file. The revised palette uses lighter burgundy for the hero/page introductions, pale burgundy for project/contact sections, white cards and burgundy headings. Home and the Projects introduction share the same background colour. The hero and project headings no longer preserve indentation as blank lines.

If you have manually edited the existing local HTML since downloading, merge those changes from your backup. Supabase edits are preserved by the upgrade; separate local-file changes cannot be automatically merged.

## Complete content editor update
Update files inside your existing project folder, preserving `.env` and any local images you added. Include `content-manifest.json`, `content-upgrade.mjs`, `server.mjs`, and the updated `public` folder. Stop the previous server with Control+C, then run `npm start` from that folder. Refresh admin with Command+Shift+R. Missing fields are added automatically when pages load; do not reinitialise the database. Saved words, images, colours and custom sections are preserved. Select **Use saved admin content** if you want all editor fields to override HTML code edits. In each page use **All page content** or **Edit all images**, or pick the named case-study section. Image placeholder slots now have upload controls.
