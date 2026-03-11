(function () {
  function createSeededRng(seed) {
    let t = seed >>> 0;

    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function keyFor(row, col) {
    return `${row}-${col}`;
  }

  function createRuntimeFromDefinition(definition) {
    let attempt = 0;
    let puzzleData = null;

    while (attempt < 200) {
  puzzleData = generatePuzzle(definition, definition.seed + attempt * 9973);
  if (validatePuzzle(puzzleData)) {
    break;
  }
  attempt += 1;
  }

  // If validation never passed, still use last generated board
  if (!puzzleData) {
  puzzleData = generatePuzzle(definition, definition.seed);
  }


    return {
      puzzleId: definition.puzzleId,
      seed: definition.seed,
      width: definition.width,
      height: definition.height,
      board: puzzleData.board,
      optimalPath: puzzleData.optimalPath,
      optimalPathSet: new Set(puzzleData.optimalPath.map((pos) => keyFor(pos.row, pos.col))),
      score: 0,
      reveals: 0,
      deadlinksTriggered: 0,
      completed: false,
      finishedAtKey: null,
      revealedOrder: [],
      showSolution: false
    };
  }

  function generatePuzzle(definition, effectiveSeed) {
    const rng = createSeededRng(effectiveSeed);
    const board = [];
    const { width, height, density } = definition;

    for (let row = 0; row < height; row++) {
      const currentRow = [];
      for (let col = 0; col < width; col++) {
        currentRow.push({
          row,
          col,
          isStart: col === 0,
          isFinish: col === width - 1,
          isDeadlink: false,
          revealed: false,
          wasDeadlinkHit: false,
          neighborCount: 0
        });
      }
      board.push(currentRow);
    }

    const optimalPath = buildGuaranteedPath(board, rng);

    const pathKeys = new Set(optimalPath.map((tile) => keyFor(tile.row, tile.col)));

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const tile = board[row][col];
        if (tile.isStart || tile.isFinish) {
          tile.isDeadlink = false;
          continue;
        }

        if (pathKeys.has(keyFor(row, col))) {
          tile.isDeadlink = false;
          continue;
        }

        tile.isDeadlink = rng() < density;
      }
    }

    calculateNeighborCounts(board);

    return {
      board,
      optimalPath: optimalPath.map((tile) => ({ row: tile.row, col: tile.col }))
    };
  }

  function buildGuaranteedPath(board, rng) {
    const startRow = Math.floor(rng() * board.length);
    const startTile = board[startRow][0];
    const visited = new Set();
    const found = depthFirstPath(board, startTile, visited, rng);

    if (found) return found;

    const fallback = [];
    const middleRow = Math.floor(board.length / 2);
    for (let col = 0; col < board[0].length; col++) {
      fallback.push(board[middleRow][col]);
    }
    return fallback;
  }

  function depthFirstPath(board, currentTile, visited, rng) {
    const currentKey = keyFor(currentTile.row, currentTile.col);
    visited.add(currentKey);

    if (currentTile.col === board[0].length - 1) {
      return [currentTile];
    }

    const candidates = getNeighborCoords(board, currentTile.row, currentTile.col)
      .filter((coord) => !visited.has(keyFor(coord.row, coord.col)));

    candidates.sort((a, b) => {
      const scoreA = (a.col - currentTile.col) * 12 + rng();
      const scoreB = (b.col - currentTile.col) * 12 + rng();
      return scoreB - scoreA;
    });

    for (const coord of candidates) {
      const result = depthFirstPath(board, board[coord.row][coord.col], visited, rng);
      if (result) {
        return [currentTile, ...result];
      }
    }

    return null;
  }

  function validatePuzzle(puzzleData) {
    const { board, optimalPath } = puzzleData;

    return (
      hasPerfectPath(optimalPath, board[0].length) &&
      hasGoodEarlyInfo(board) &&
      hasValidDeadlinkDensity(board) &&
      avoidsSolidDeadlinkRows(board) &&
      hasReachableFinish(optimalPath, board[0].length)
    );
  }

  function hasPerfectPath(optimalPath, width) {
    if (!optimalPath || optimalPath.length === 0) return false;
    return (
      optimalPath[0].col === 0 &&
      optimalPath[optimalPath.length - 1].col === width - 1
    );
  }

  function hasReachableFinish(optimalPath, width) {
    return optimalPath.some((tile) => tile.col === width - 1);
  }

  function hasGoodEarlyInfo(board) {
    const width = board[0].length;

    for (let row = 0; row < board.length; row++) {
      const startTile = board[row][0];
      const nearby = collectWithinColumns(board, startTile, Math.min(2, width - 1));

      const useful = nearby.some((tile) => !tile.isDeadlink && tile.neighborCount >= 1 && tile.neighborCount <= 3);
      if (useful) return true;
    }

    return false;
  }

  function collectWithinColumns(board, startTile, maxCol) {
    const queue = [startTile];
    const visited = new Set([keyFor(startTile.row, startTile.col)]);
    const results = [];

    while (queue.length > 0) {
      const tile = queue.shift();
      results.push(tile);

      const neighbors = getNeighbors(board, tile.row, tile.col);
      for (const neighbor of neighbors) {
        const neighborKey = keyFor(neighbor.row, neighbor.col);
        if (visited.has(neighborKey)) continue;
        if (neighbor.col > maxCol) continue;

        visited.add(neighborKey);
        queue.push(neighbor);
      }
    }

    return results;
  }

  function hasValidDeadlinkDensity(board) {
    let deadlinks = 0;
    let fieldTiles = 0;

    for (let row = 0; row < board.length; row++) {
      for (let col = 1; col < board[0].length - 1; col++) {
        fieldTiles += 1;
        if (board[row][col].isDeadlink) deadlinks += 1;
      }
    }

    const density = deadlinks / fieldTiles;
    return density >= 0.18 && density <= 0.25;
  }

  function avoidsSolidDeadlinkRows(board) {
    for (let row = 0; row < board.length; row++) {
      let allDeadlinks = true;
      for (let col = 1; col < board[0].length - 1; col++) {
        if (!board[row][col].isDeadlink) {
          allDeadlinks = false;
          break;
        }
      }
      if (allDeadlinks) return false;
    }
    return true;
  }

  function calculateNeighborCounts(board) {
    for (const row of board) {
      for (const tile of row) {
        if (tile.isDeadlink) {
          tile.neighborCount = 0;
          continue;
        }

        const neighbors = getNeighbors(board, tile.row, tile.col);
        tile.neighborCount = neighbors.filter((neighbor) => neighbor.isDeadlink).length;
      }
    }
  }

  function getNeighbors(board, row, col) {
    return getNeighborCoords(board, row, col).map((coord) => board[coord.row][coord.col]);
  }

  function getNeighborCoords(board, row, col) {
    const isEvenRow = row % 2 === 0;

    const deltas = isEvenRow
      ? [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0]
        ]
      : [
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [1, 1]
        ];

    const coords = [];

    for (const [dr, dc] of deltas) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (
        newRow >= 0 &&
        newRow < board.length &&
        newCol >= 0 &&
        newCol < board[0].length
      ) {
        coords.push({ row: newRow, col: newCol });
      }
    }

    return coords;
  }

  function revealTile(runtime, row, col) {
    if (runtime.completed) return { changed: false, tile: null };

    const tile = runtime.board[row][col];
    if (tile.revealed) return { changed: false, tile };

    tile.revealed = true;
    runtime.revealedOrder.push(keyFor(row, col));
    runtime.reveals += 1;
    runtime.score += 1;

    if (tile.isDeadlink) {
      tile.wasDeadlinkHit = true;
      runtime.deadlinksTriggered += 1;
      runtime.score += 2;
    }

    if (tile.isFinish) {
      runtime.completed = true;
      runtime.finishedAtKey = keyFor(row, col);
    }

    return { changed: true, tile };
  }

  function replayRun(runtime, revealedOrder) {
    if (!Array.isArray(revealedOrder)) return runtime;

    for (const entry of revealedOrder) {
      const [rowStr, colStr] = entry.split("-");
      const row = Number(rowStr);
      const col = Number(colStr);

      revealTile(runtime, row, col);
      if (runtime.completed) break;
    }

    return runtime;
  }

  window.EngineAPI = {
    keyFor,
    createRuntimeFromDefinition,
    revealTile,
    replayRun
  };
})();
