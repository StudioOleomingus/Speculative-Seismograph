# Speculative-Seismograph

Speculations by Sem06 2026 Interaction Design Students.

An interactive web piece that displays speculative-fiction stories on a rotating 3D
cylinder — styled like a typewriter platen / seismograph drum. A bank of five binary
toggle switches selects which story is shown; the switch pattern maps to a Markdown
file, which is rendered as text wrapped around the cylinder. Scroll with the mouse
wheel to roll the text into view.

## How it works

The five switches form a 5-bit binary string that becomes a filename. For example,
switches set to `0 0 0 0 1` load `./texts/00001.md`. This gives 32 possible
combinations (`00000`–`11111`), and a story file exists for each. Flipping any switch
resets the scroll and loads the matching story. If a combination has no file, an
on-screen "No document found" message is shown.

## Running locally

The page uses `fetch()` to load the story files, so it must be served over HTTP
(opening `index.html` directly with `file://` will not work). From the project root:

```bash
# Python 3
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser. Any static file server works
(`npx serve`, etc.).

## Tech

Plain HTML + CSS + an inline ES-module script. 3D rendering uses
[Three.js](https://threejs.org) (r0.160.0, loaded from a CDN). Story text is
rasterized to a texture with the HTML Canvas 2D API. No build step or package manager.

## License

CC0 1.0 Universal (public domain dedication) — see `LICENSE`.
