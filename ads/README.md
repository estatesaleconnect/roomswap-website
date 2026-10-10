# Consignor recruitment ads (Meta: Facebook & Instagram)

- `all-ads.png`: contact sheet of every ad, for picking quickly
- `concept-1/` Declutter for cash · `concept-2/` Sold fast · `concept-3/` Estate & downsizing
  - `room-swap-concept-N-1080x1080.png`: feed square
  - `room-swap-concept-N-1080x1350.png`: feed portrait
  - `room-swap-concept-N-1080x1920.png`: Stories/Reels (top and bottom 250px kept free of text)
  - `copy.md`: primary text (short and long), headline, description
- `brand-notes.md`: logo, colors, fonts, confirmed facts, and open questions
- `src/`: the HTML/CSS source for the ads, plus resized website photos

To re-render after editing `src/concept-N.html`, run from the repo root:

    node ads/src/render.js        # all ads + contact sheet
    node ads/src/render.js 2      # just concept 2
