# Rune Cascade

A match-3 roguelite dungeon crawler built with TypeScript and Phaser 3. Descend 100 floors, defeat bosses, and upgrade your hero.

## Play

https://tokuhirom.github.io/rune-cascade/

## How to Play

Swap adjacent runes on the 7x7 board to match 3 or more of the same type.

### Rune Types

| Rune | Symbol | Effect |
|------|--------|--------|
| Sword (red) | ⚔ | Deal attack damage to the enemy |
| Shield (blue) | ⬢ | Build shield to absorb incoming damage |
| Heart (green) | ♥ | Restore HP |
| Star (purple) | ★ | Deal magic damage (ignores some armor) |
| Gold (yellow) | ◆ | Earn gems (scales with floor depth) |

### Match Mechanics

- **4+ match**: Bonus damage multiplier
- **Combos**: Chain cascades multiply all effects (+25% per combo)
- **Row-Clear rune**: Rare rune (5% spawn) that clears the entire row when matched

### Special Blocks

| Block | Appearance | Behavior |
|-------|-----------|----------|
| Obstacle | Gray X block | Cannot be matched or swapped. Destroyed when an adjacent rune is matched. |
| Frozen | Ice overlay (❄) | Cannot be matched or swapped. Thaws to a normal rune when an adjacent rune is matched. |

### Dungeon Structure

- **100 floors** (B1F–B100F) of increasing difficulty
- **Boss every 5 floors** — defeat to reach the merchant shop
- **Mid-bosses at B20F, B40F, B60F, B80F** with combined abilities
- **Final boss at B100F** — Chaos Emperor
- **Warp points** unlock at B20F/B40F/B60F/B80F for future runs

### Town (Fairy)

Between runs, visit the fairy in town to:
- **Permanent upgrades**: ATK, DEF, HP (cost scales with level)
- View tips and plan your next run
- Resume a saved run or warp to unlocked floors (costs gems)

### Boss Shop (Merchant)

After every boss, the merchant offers items with **rarity tiers**:
- **Common** (gray): Small stat buffs, shuffle runes, regen
- **Rare** (blue): Strong buffs like ATK +50%, large HP boosts
- **Epic** (purple): Powerful items — Dragon Blade, Adamant Armor, Elixir of Life
- **Cursed** (red): Powerful but risky trade-offs:
  - *Berserker Pact*: ATK x2, but healing disabled
  - *Cursed Fortress*: DEF +20, but obstacles spawn every turn
  - *Blood Diamond*: +50 gems, but lose 30% max HP

You can also **return to town** (costs gems) to bank your earnings safely.

### Death & Progression

- **Dying loses all gems earned during the run** — you revert to pre-run gem count
- **Permanent upgrades persist** across all runs
- Runs are **auto-saved every turn** — reload to resume where you left off

### Stage Modifiers

Random modifiers spice up non-boss floors:

| Modifier | Effect |
|----------|--------|
| Golden Hour | Gem drops x2 |
| Berserk | All damage x1.5 (both sides) |
| Fortified | Shield power x2 |
| Desperate | ATK +50% but no healing |
| Rune Storm | Board shuffles every 3 turns |
| Vampiric | Sword matches heal you |

### Enemy Abilities

Enemies gain abilities as you descend deeper:

| Ability | Effect |
|---------|--------|
| Enrage | ATK doubles below 30% HP |
| Revive | Resurrects once at 50% HP |
| Poison | Deals damage each turn |
| Armor | Takes 50% reduced damage |
| Freeze | Freezes runes on the board |
| Obstacle | Places obstacle blocks |
| Multi-Hit | Attacks 3 times per turn |
| Drain | Steals HP on attack |

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
# Unit tests
npx vitest run

# E2E tests (requires Playwright browsers)
npx playwright test
```

## Build

```bash
npm run build
```

Output is in `dist/`.

## Tech Stack

- **TypeScript** + **Phaser 3** (game framework)
- **Vite** (bundler)
- **Vitest** (unit tests)
- **Playwright** (E2E tests)
- **GitHub Pages** (deployment)

## License

See [LICENSE](LICENSE).
