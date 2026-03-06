# Rune Cascade

A match-3 roguelite dungeon crawler built with TypeScript and Phaser 3. Descend 100 floors, defeat bosses, and upgrade your hero.

## Play

https://tokuhirom.github.io/rune-cascade/

## How to Play

Swap adjacent runes on the 7x7 board to match 3 or more of the same type.

### Rune Types

| Rune | Symbol | Effect |
|------|--------|--------|
| Sword (red) | ⚔ | Deal attack damage |
| Shield (blue) | ⬢ | Build shield to absorb damage |
| Heart (green) | ♥ | Restore HP |
| Star (purple) | ★ | Deal magic damage |
| Gold (yellow) | ◆ | Earn gems |

### Core Mechanics

- **4+ match** grants bonus power
- **Combos** from chain cascades multiply all effects
- **Shield** persists across turns until consumed by enemy attacks
- **Gems** scale with floor depth — deeper floors are more rewarding
- Enemy attacks after a set number of turns — watch the timer!

### Progression

- 100 floors of increasing difficulty
- Boss every 5 floors — defeat to reach the shop
- Spend gems on permanent upgrades between runs
- Dying loses gems earned during the run
- Runs auto-save every turn — reload to resume

### Tips

- Pay attention to what the shop merchant and fairy have to offer
- Some items have powerful effects but come with trade-offs
- Watch out for special blocks that enemies place on the board
- Warp points let you skip floors you've already cleared

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npx vitest run        # Unit tests
npx playwright test   # E2E tests
```

## Build

```bash
npm run build
```

## Tech Stack

TypeScript, Phaser 3, Vite, Vitest, Playwright, GitHub Pages

## License

See [LICENSE](LICENSE).
