# Breakaway: Pathfinder

Daily-puzzle-first MVP for the Breakaway web puzzle.

## Current MVP
- Daily Puzzle mode
- Practice Mode
- Archive mode
- Puzzle-by-ID architecture
- Hex grid
- Deadlinks as penalties, not failure
- Finish tile ends the puzzle
- Score = reveals + deadlink penalties
- Local persistence
- Share result text
- Subtle optimal-path reveal after completion

## Modes
### Daily Puzzle
One featured fixed puzzle.

### Practice Mode
Random puzzle using the same generator rules.

### Archive
10 fixed sample puzzles.

## Current rules
- Reveal any tile to inspect it
- Safe tiles show adjacency numbers
- Deadlinks do not end the puzzle
- Revealing a Deadlink adds +2 penalty
- Revealing any finish tile ends the puzzle
- Lower score is better

## MVP limits
This version does not yet include:
- backend daily delivery
- global leaderboard
- real one-attempt enforcement
- accounts
- anti-cheat

## Next likely steps
- real daily puzzle endpoint
- leaderboard
- recorded-attempt submission
- better share UX
- improved puzzle validation/tuning
