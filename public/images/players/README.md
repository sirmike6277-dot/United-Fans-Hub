# Player photography

Real, licensed player photos go here — never AI-generated, never scraped.

Expected initial files:
- `bruno-fernandes.webp`
- `tielemans.webp`
- `sesko.webp`

Use `.webp` for size/perf. The `PlayerImage` component (`src/components/media/PlayerImage.tsx`)
renders a neutral placeholder state until a real file exists at the given path, so hero
composition can be built and reviewed now and swapped for real photography later with no
redesign.
