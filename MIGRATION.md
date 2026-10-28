# Beat Party: local PartyServer candidate

This checkout is an isolated copy. Production has not been migrated. The original PartyKit configuration is retained as reference. Do not run deploy commands without the user's approval.

The server imports the locally packaged `websim-socket@0.1.2-partyserver.0` from `vendor/`, so this game checkout can be installed independently without publishing npm packages. The browser keeps the public `websim-socket@0.1.1` wire-compatible client. `Main` preserves `/parties/main/:room` routing. New Worker name: `beat-party-3d-multiplayer-migration`. Never apply its new SQLite namespace migration over an unaudited existing Worker.

Use Node >=22:

```sh
npm ci
npm test
PARTYKIT_HOST=localhost:1999 npm run build:pages
npm run check:worker
npm run dev
```

Open `http://localhost:1999/` locally after starting the server. To verify the historical game's room identity, open `http://localhost:1999/beat_party_3d___multiplayer/?host=localhost:1999`; run `python3 -m http.server 8080 --directory ..` in this game directory, then open `http://localhost:8080/beat_party_3d___multiplayer/?host=localhost:1999` to serve the original pathname while connecting to the local Worker. Default browser room names come from the pathname. Test on the actual GitHub Pages path before changing production host. The Worker serves `dist/` at root and routes `/parties/*` first. Dependencies such as Three.js, audio services and browser rendering still need a real browser smoke test; the automated suite verifies build and socket behavior only.

`PARTYKIT_HOST` is retained as the configuration name, and accepts the new `*.workers.dev` host without a scheme or path. Invalid host settings fail before replacing the old build. Never deploy a test build pointing to localhost or the fixture hostname `socket.example.workers.dev`. `dist/` is ignored; rebuild it with the approved real host before any deployment.

The Pages workflow now uses Node 22 and `npm ci`; pushing main still triggers the original Pages deployment, so do not push until approved. No Worker deployment workflow was added. `npm run deploy:socket` now invokes Wrangler; it was NOT executed. `npm run dev:legacy` remains available for local legacy comparisons.

Regenerate the vendored tarball after changing the library: run `npm run build` and `npm pack --ignore-scripts --pack-destination ../beat_party_3d___multiplayer/vendor` in the sibling websim-socket candidate, then reinstall the tarball in this game and update the lockfile. Do not publish a tag or npm release during preparation.

Known existing production host: `beat-party-3d-multiplayer.farl.partykit.dev`. Keep it recorded for review. PartyKit still listed this project on 2026-10-20, but its root HTTP response was 404; room/data state remains unknown. No remote data has been exported. The checked-out game only uses presence; the library's roomState is in memory. See the sibling library's `docs/partyserver-migration.md` for data limits and approval gates.
