# Seismograph memory — shared view counter

This is the tiny backend that makes the text on the site fade the more people
read it. It keeps, for every story file and every source line, a count of how
many times that line has been read across **all** visitors. The front-end reads
those counts on load and fades each line; at **256** views a line disappears.

You only need this if you want the fading to be **shared across everyone**. Until
an endpoint is set, the site runs exactly as before (no fading, nothing breaks).

## What it is

A single [Cloudflare Worker](https://workers.cloudflare.com/) (`worker.js`) plus
one KV namespace for storage. Both are free for this kind of traffic.

## Deploy (about 5 minutes)

1. Install the CLI and log in (one-time):

   ```
   npm install -g wrangler
   wrangler login
   ```

2. From this `backend/` folder, create the KV store:

   ```
   wrangler kv namespace create VIEWS
   ```

   It prints an `id`. Open `wrangler.toml` and paste that id in place of
   `REPLACE_WITH_KV_ID`.

3. Deploy:

   ```
   wrangler deploy
   ```

   Wrangler prints your Worker URL, e.g.
   `https://seismograph-views.your-name.workers.dev`.

4. Put that URL into the site config. In `js/config.js`, set:

   ```js
   fade: {
     endpoint: 'https://seismograph-views.your-name.workers.dev',
     epoch: 1,
     maxViews: 256,
     visibleAhead: 6,
   }
   ```

That's it — reload the site and views start accumulating.

## Resetting all fading

Don't wipe the database. Just **increment `epoch`** in `js/config.js`
(`1` → `2`, etc.) and redeploy the site. Counts are stored under keys prefixed by
the epoch, so a new epoch starts every page from full black again. The old data
is harmlessly ignored (and you can flip back to a previous epoch to restore it).

To reclaim the old storage later, you can delete the stale keys:

```
wrangler kv key list --binding VIEWS          # inspect keys like "1:00010.md"
wrangler kv key delete --binding VIEWS "1:00010.md"
```

## API

```
GET  /counts?epoch=<n>&file=<name>   ->  { "counts": [int, ...] }   # per source line
POST /record   { epoch, file, lines } ->  { "ok": true }            # +1 to lines 0..lines-1
```

`file` is the story filename (e.g. `00010A.md`). `lines` is how many source lines
from the top were on screen — the front-end computes this from how far the reader
scrolled.

## Accuracy note

KV is eventually consistent and `/record` does a read-modify-write, so under heavy
simultaneous traffic a few increments can be lost. For a collective, smudgy fade
that's fine. If you ever need exact counts, move the increment into a
[Durable Object](https://developers.cloudflare.com/durable-objects/) (one per
`epoch:file` key) so writes serialize — the front-end and API contract stay the
same.
