Fonts used by the piece.

Bitstream Charter (serif) is bundled here:

    charter_regular.woff2       (regular)
    charter_bold.woff2          (bold)
    charter_italic.woff2        (italic)
    charter_bold_italic.woff2   (bold italic)

These are referenced by the @font-face rules in css/style.css and preloaded in
js/main.js before the first render. If they are missing, the text falls back to
a serif system font.

License: Bitstream contributed the Charter fonts to the X consortium with
permission to use, copy, modify, sublicense, sell, and redistribute them,
provided the notice is kept intact. See Charter-LICENSE.txt (bundled via the
charter-webfont npm package).
