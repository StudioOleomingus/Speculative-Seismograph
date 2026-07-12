// --- Speculative Seismograph: shared view counter ----------------------------
// A Cloudflare Worker backing the "seismograph memory" fade. It stores, per
// story file and per SOURCE line, how many times that line has been read across
// every visitor, in Workers KV.
//
// Endpoints (all CORS-open so the static site can call them from anywhere):
//   GET  /counts?epoch=<n>&file=<name>
//        -> { "counts": [int, int, ...] }        // per source line, 0-based
//   POST /record   { epoch, file, from, lines }
//        -> increments source lines [from .. lines-1] by 1, returns { ok: true }
//           (`from` is optional and defaults to 0)
//
// KV key layout: `${epoch}:${file}`. The client bumps `epoch` in config.js to
// reset all fading — a new epoch reads/writes fresh keys, so every page starts
// black again with no manual data wipe.
//
// NOTE ON ACCURACY: KV is eventually consistent and record does a
// read-modify-write, so under heavy simultaneous traffic some increments can be
// lost. That's fine for this piece (a fuzzy, collective smudging). If you ever
// need exact counts, port /record to a Durable Object (see backend/README.md).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Keep keys sane and safe: only story-filename characters, capped length.
function safeFile(file) {
  return String(file || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64);
}

function safeEpoch(epoch) {
  const n = parseInt(epoch, 10);
  return Number.isFinite(n) ? String(n) : '1';
}

// Hard ceiling so a malicious/huge `lines` can't blow up storage. No real story
// has anywhere near this many source lines.
const MAX_LINES = 5000;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');

    // --- read counts ---------------------------------------------------------
    if (path.endsWith('/counts') && request.method === 'GET') {
      const file = safeFile(url.searchParams.get('file'));
      const epoch = safeEpoch(url.searchParams.get('epoch'));
      if (!file) return json({ counts: [] });

      const raw = await env.VIEWS.get(`${epoch}:${file}`);
      const counts = raw ? JSON.parse(raw) : [];
      return json({ counts });
    }

    // --- record a read -------------------------------------------------------
    if (path.endsWith('/record') && request.method === 'POST') {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: 'bad json' }, 400);
      }

      const file = safeFile(payload.file);
      const epoch = safeEpoch(payload.epoch);
      let lines = parseInt(payload.lines, 10);
      let from = parseInt(payload.from, 10);
      if (!Number.isFinite(from) || from < 0) from = 0; // optional, defaults to 0
      if (!file || !Number.isFinite(lines) || lines <= from) {
        return json({ ok: false, error: 'bad request' }, 400);
      }
      lines = Math.min(lines, MAX_LINES);

      const key = `${epoch}:${file}`;
      const raw = await env.VIEWS.get(key);
      const counts = raw ? JSON.parse(raw) : [];
      for (let i = from; i < lines; i++) counts[i] = (counts[i] || 0) + 1;
      await env.VIEWS.put(key, JSON.stringify(counts));

      return json({ ok: true });
    }

    return json({ ok: false, error: 'not found' }, 404);
  },
};
