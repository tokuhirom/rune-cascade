# Rune Cascade

Match-3 roguelite game built with TypeScript and Phaser 3.

## Play

https://tokuhirom.github.io/rune-cascade/

## How to Play

Swap adjacent runes on the 7x7 board to match 3 or more of the same type. Each rune type has a different effect:

| Rune | Effect |
|------|--------|
| Sword (red) | Deal attack damage to the enemy |
| Shield (blue) | Build up shield to reduce incoming damage |
| Heart (green) | Restore HP |
| Star (purple) | Deal bonus skill damage |
| Gold (yellow) | Earn gems for upgrades |

- Matching 4+ runes in a row grants bonus power
- Chain combos (cascades) multiply your damage
- The enemy attacks after a set number of turns — watch the timer
- Defeat enemies to advance stages and earn gems
- Every 5 stages, spend gems on permanent upgrades (ATK / DEF / HP)
- When defeated, your gems carry over to the next run

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/`.

## License

See [LICENSE](LICENSE).
