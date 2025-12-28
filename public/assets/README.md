Minez – Art Assets
==================

Drop your sprite images here. The build serves everything under `public/` as static files.

Folders
-------
- `public/assets/sprites/` — individual PNGs (32–64px square recommended; we currently render at `CELL=36px`).
- `public/assets/atlas/` — optional sprite atlas (e.g., TexturePacker). Place `tiles.png` and `tiles.json` here.

Expected sprite filenames (if you provide individual PNGs)
---------------------------------------------------------
Use these exact filenames so the game can auto‑load them. PNG with transparent background is recommended.

Core tiles:
- `sprites/tile_unrevealed.png`
- `sprites/tile_revealed.png`
- `sprites/flag.png`
- `sprites/mine.png`
- `sprites/x.png`

Numbers (optional; otherwise numeric text is rendered):
- `sprites/num_0.png` … `sprites/num_8.png`

Ore & rewards:
- `sprites/ore.png`
- `sprites/zirconium.png`      (⚪)
- `sprites/diamond.png`        (💎)

Shop tiles:
- `sprites/1up.png`            (❤️ 1 Up)
- `sprites/2up.png`            (💞 2 Up)
- `sprites/luckycat.png`       (🐈‍⬛ Lucky Cat)
- `sprites/pickaxe.png`        (🪓 Pickaxe)
- `sprites/compass_up.png`
- `sprites/compass_right.png`
- `sprites/compass_down.png`
- `sprites/compass_left.png`
- `sprites/scratchcard.png`
- `sprites/gooddeal.png`
- `sprites/remote.png`
- `sprites/advance.png`
- `sprites/zirconium.png`      (reuse from above)
- `sprites/receipt.png`

Challenge tiles:
- `sprites/autograt.png`       (💸)
- `sprites/stopwatch.png`      (⏱️)
- `sprites/mathtest.png`       (☠️)
- `sprites/badeal.png`         (💱)
- `sprites/clover2.png`        (🍀)
- `sprites/snakeoil.png`       (🧴)
- `sprites/snakevenom.png`     (🐍)
- `sprites/bloodpact.png`      (🩸)
- `sprites/carloan.png`        (🚗)
- `sprites/megamime.png`       (🧨) — “Detonator-like” icon for MegaMine, or supply your own

UI (optional):
- `sprites/panel_9slice.png`   (9‑slice panel for sidebar)
- `sprites/button_9slice.png`

Optional: atlas support
-----------------------
If you prefer a sprite atlas, place files under `public/assets/atlas/`:
```
public/
  assets/
    atlas/
      tiles.png
      tiles.json   # TexturePacker JSON (Hash) or Phaser JSON
```
Use frame names matching the IDs in code (e.g., `diamond`, `1up`, `2up`, `remote`, `stopwatch`, `compass_up`, etc.). If your names differ, add a mapping file:
```
public/assets/sprites/map.json
{
  "Diamond": "my_diamond_frame",
  "RemoteControl": "ui/remote_icon"
}
```

After copying assets, run the dev server:
```
pnpm dev
# or npm run dev / yarn dev
```


