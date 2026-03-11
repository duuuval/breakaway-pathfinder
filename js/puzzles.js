(function () {
  const BASE_WIDTH = 8;
  const BASE_HEIGHT = 6;
  const FEATURED_PUZZLE_ID = 10;
  const ARCHIVE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const FIXED_PUZZLES = [
    { puzzleId: 1, seed: 1101, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.19 },
    { puzzleId: 2, seed: 1102, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.20 },
    { puzzleId: 3, seed: 1103, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.20 },
    { puzzleId: 4, seed: 2101, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.21 },
    { puzzleId: 5, seed: 2102, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.21 },
    { puzzleId: 6, seed: 2103, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.22 },
    { puzzleId: 7, seed: 3101, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.22 },
    { puzzleId: 8, seed: 3102, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.23 },
    { puzzleId: 9, seed: 3103, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.23 },
    { puzzleId: 10, seed: 3104, width: BASE_WIDTH, height: BASE_HEIGHT, density: 0.24 }
  ];

  function getPuzzleDefinitionById(puzzleId) {
    const puzzle = FIXED_PUZZLES.find((item) => item.puzzleId === puzzleId);
    return puzzle ? { ...puzzle } : null;
  }

  function getArchivePuzzleDefinitions() {
    return FIXED_PUZZLES.map((item) => ({ ...item }));
  }

  function createRandomPuzzleDefinition() {
    const seed = Math.floor(Date.now() % 1000000000);
    const puzzleId = `practice-${seed}`;

    return {
      puzzleId,
      seed,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      density: 0.22,
      isPractice: true
    };
  }

  function getFeaturedPuzzleDefinition() {
    return getPuzzleDefinitionById(FEATURED_PUZZLE_ID);
  }

  function formatPuzzleTitle(definition, mode) {
    if (!definition) return "Breakaway";
    const prefix = mode === "daily" ? "Breakaway Daily" : "Breakaway";
    return `${prefix} #${String(definition.puzzleId).padStart(3, "0")}`;
  }

  window.PuzzleAPI = {
    FEATURED_PUZZLE_ID,
    ARCHIVE_IDS,
    getPuzzleDefinitionById,
    getArchivePuzzleDefinitions,
    getFeaturedPuzzleDefinition,
    createRandomPuzzleDefinition,
    formatPuzzleTitle
  };
})();
