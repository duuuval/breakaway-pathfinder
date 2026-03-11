(function () {
  const dailyModeBtn = document.getElementById("daily-mode-btn");
  const practiceModeBtn = document.getElementById("practice-mode-btn");
  const archiveModeBtn = document.getElementById("archive-mode-btn");
  const resetLocalDataBtn = document.getElementById("reset-local-data-btn");

  const puzzleTitleEl = document.getElementById("puzzle-title");
  const scoreValueEl = document.getElementById("score-value");
  const revealsValueEl = document.getElementById("reveals-value");
  const deadlinksValueEl = document.getElementById("deadlinks-value");
  const recordValueEl = document.getElementById("record-value");

  const boardHeadingEl = document.getElementById("board-heading");
  const boardSubheadingEl = document.getElementById("board-subheading");
  const boardEl = document.getElementById("board");
  const messageLineEl = document.getElementById("message-line");
  const resultLineEl = document.getElementById("result-line");

  const archivePanelEl = document.getElementById("archive-panel");
  const archiveListEl = document.getElementById("archive-list");

  const restartPuzzleBtn = document.getElementById("restart-puzzle-btn");
  const newPracticeBtn = document.getElementById("new-practice-btn");
  const shareResultBtn = document.getElementById("share-result-btn");

  let appData = StorageAPI.loadData();

  const state = {
    view: appData.currentView || "daily",
    currentMode: "daily",
    currentDefinition: null,
    runtime: null,
    solutionVisible: false
  };

  function init() {
    bindEvents();
    buildArchiveList();
    loadInitialView();
  }

  function bindEvents() {
    dailyModeBtn.addEventListener("click", () => {
      switchView("daily");
    });

    practiceModeBtn.addEventListener("click", () => {
      switchView("practice");
    });

    archiveModeBtn.addEventListener("click", () => {
      switchView("archive");
    });

    restartPuzzleBtn.addEventListener("click", () => {
      restartCurrentPuzzle();
    });

    newPracticeBtn.addEventListener("click", () => {
      loadPracticePuzzle(true);
    });

    shareResultBtn.addEventListener("click", async () => {
      if (!state.runtime || !state.runtime.completed) return;

      const text = buildShareText();
      try {
        await navigator.clipboard.writeText(text);
        resultLineEl.textContent = "Result copied to clipboard.";
      } catch (error) {
        resultLineEl.textContent = "Could not copy automatically. Long-press and copy manually:";
        console.log(text);
      }
    });

    resetLocalDataBtn.addEventListener("click", () => {
      const confirmed = confirm("Reset all local puzzle progress and records?");
      if (!confirmed) return;

      StorageAPI.resetAll();
      appData = StorageAPI.loadData();
      switchView("daily");
    });
  }

  function loadInitialView() {
    if (state.view === "practice") {
      loadPracticePuzzle(false);
      updateViewUi();
      return;
    }

    if (state.view === "archive") {
      const firstArchive = PuzzleAPI.getArchivePuzzleDefinitions()[0];
      if (firstArchive) {
        loadFixedPuzzle(firstArchive.puzzleId, "archive");
      } else {
        loadFeaturedPuzzle();
      }
      updateViewUi();
      return;
    }

    loadFeaturedPuzzle();
    updateViewUi();
  }

  function switchView(view) {
    state.view = view;
    appData.currentView = view;
    StorageAPI.saveData(appData);

    if (view === "daily") {
      loadFeaturedPuzzle();
    } else if (view === "practice") {
      loadPracticePuzzle(false);
    } else {
      const firstArchive = PuzzleAPI.getArchivePuzzleDefinitions()[0];
      loadFixedPuzzle(firstArchive.puzzleId, "archive");
    }

    updateViewUi();
  }

  function updateViewUi() {
    dailyModeBtn.classList.toggle("active", state.view === "daily");
    practiceModeBtn.classList.toggle("active", state.view === "practice");
    archiveModeBtn.classList.toggle("active", state.view === "archive");

    archivePanelEl.classList.toggle("hidden", state.view !== "archive");
    newPracticeBtn.classList.toggle("hidden", state.view !== "practice");
  }

  function buildArchiveList() {
    archiveListEl.innerHTML = "";

    const definitions = PuzzleAPI.getArchivePuzzleDefinitions();
    definitions.forEach((def) => {
      const btn = document.createElement("button");
      btn.className = "archive-item-btn";
      btn.textContent = `#${String(def.puzzleId).padStart(3, "0")}`;
      btn.addEventListener("click", () => {
        state.view = "archive";
        loadFixedPuzzle(def.puzzleId, "archive");
        updateViewUi();
      });

      archiveListEl.appendChild(btn);
    });
  }

  function loadFeaturedPuzzle() {
    const definition = PuzzleAPI.getFeaturedPuzzleDefinition();
    loadDefinition(definition, "daily", false);
  }

  function loadFixedPuzzle(puzzleId, mode) {
    const definition = PuzzleAPI.getPuzzleDefinitionById(puzzleId);
    loadDefinition(definition, mode, false);
  }

  function loadPracticePuzzle(forceNew) {
    let definition = null;

    if (!forceNew && state.currentMode === "practice" && state.currentDefinition) {
      definition = state.currentDefinition;
    } else {
      definition = PuzzleAPI.createRandomPuzzleDefinition();
    }

    loadDefinition(definition, "practice", forceNew);
  }

  function loadDefinition(definition, mode, forceFresh) {
    state.currentMode = mode;
    state.currentDefinition = definition;
    state.solutionVisible = false;

    const runKey = getRunKey(definition, mode);

    const savedRun = !forceFresh ? appData.runs[runKey] : null;
    const runtime = EngineAPI.createRuntimeFromDefinition(definition);

    if (savedRun && Array.isArray(savedRun.revealedOrder)) {
      EngineAPI.replayRun(runtime, savedRun.revealedOrder);
      if (savedRun.completed) {
        runtime.completed = true;
        state.solutionVisible = true;
      }
    }

    state.runtime = runtime;

    renderAll();
  }

  function restartCurrentPuzzle() {
    if (!state.currentDefinition) return;

    const runKey = getRunKey(state.currentDefinition, state.currentMode);
    delete appData.runs[runKey];
    StorageAPI.saveData(appData);

    loadDefinition(state.currentDefinition, state.currentMode, true);
  }

  function getRunKey(definition, mode) {
    return `${mode}:${definition.puzzleId}`;
  }

  function getRecordKey(definition) {
    return String(definition.puzzleId);
  }

  function persistCurrentRun() {
    if (!state.runtime || !state.currentDefinition) return;

    const runKey = getRunKey(state.currentDefinition, state.currentMode);

    appData.runs[runKey] = {
      revealedOrder: [...state.runtime.revealedOrder],
      score: state.runtime.score,
      reveals: state.runtime.reveals,
      deadlinksTriggered: state.runtime.deadlinksTriggered,
      completed: state.runtime.completed
    };

    StorageAPI.saveData(appData);
  }

  function recordCompletionIfNeeded() {
    const recordKey = getRecordKey(state.currentDefinition);
    const existing = appData.records[recordKey];

    const newRecord = {
      score: state.runtime.score,
      reveals: state.runtime.reveals,
      deadlinksTriggered: state.runtime.deadlinksTriggered,
      mode: state.currentMode
    };

    if (state.currentMode === "practice") {
      if (!existing || newRecord.score < existing.score) {
        appData.records[recordKey] = newRecord;
      }
    } else {
      if (!existing) {
        appData.records[recordKey] = newRecord;
      }
    }

    StorageAPI.saveData(appData);
  }

  function handleTileClick(row, col) {
    if (!state.runtime || state.runtime.completed) return;

    const result = EngineAPI.revealTile(state.runtime, row, col);
    if (!result.changed) return;

    persistCurrentRun();

    if (state.runtime.completed) {
      recordCompletionIfNeeded();
      shareResultBtn.disabled = false;
      messageLineEl.textContent = "Finish tile revealed. Puzzle complete.";
      resultLineEl.textContent = `Final score: ${state.runtime.score} (${state.runtime.reveals} reveals, ${state.runtime.deadlinksTriggered} Deadlinks)`;

      setTimeout(() => {
        state.solutionVisible = true;
        renderAll();
      }, 250);
    }

    renderAll();
  }

  function renderAll() {
    renderHeader();
    renderBoard();
    renderRecord();
    shareResultBtn.disabled = !state.runtime || !state.runtime.completed;
  }

  function renderHeader() {
    if (!state.currentDefinition || !state.runtime) return;

    puzzleTitleEl.textContent = PuzzleAPI.formatPuzzleTitle(
      state.currentDefinition,
      state.currentMode === "daily" ? "daily" : "archive"
    );

    if (state.currentMode === "practice") {
      puzzleTitleEl.textContent = "Practice Puzzle";
    }

    scoreValueEl.textContent = String(state.runtime.score);
    revealsValueEl.textContent = String(state.runtime.reveals);
    deadlinksValueEl.textContent = String(state.runtime.deadlinksTriggered);

    if (state.currentMode === "daily") {
      boardHeadingEl.textContent = "Daily Puzzle";
      boardSubheadingEl.textContent = "One featured shared-style puzzle. Lowest score is best.";
      messageLineEl.textContent = state.runtime.completed
        ? "Finish tile revealed. Puzzle complete."
        : "Reveal tiles to reach any finish tile with the lowest possible score.";
    } else if (state.currentMode === "practice") {
      boardHeadingEl.textContent = "Practice Mode";
      boardSubheadingEl.textContent = "Random puzzle using the same generator rules.";
      messageLineEl.textContent = state.runtime.completed
        ? "Practice puzzle complete."
        : "Practice freely. Deadlinks add penalty, but do not end the puzzle.";
    } else {
      boardHeadingEl.textContent = "Archive";
      boardSubheadingEl.textContent = "Replay previous fixed puzzles locally.";
      messageLineEl.textContent = state.runtime.completed
        ? "Archive puzzle complete."
        : "Reveal tiles and finish with the lowest possible score.";
    }

    if (!state.runtime.completed) {
      resultLineEl.textContent = "";
    }
  }

  function renderRecord() {
    if (!state.currentDefinition) return;

    const recordKey = getRecordKey(state.currentDefinition);
    const record = appData.records[recordKey];

    if (!record) {
      recordValueEl.textContent = "—";
      return;
    }

    recordValueEl.textContent = `${record.score} (${record.deadlinksTriggered}💥)`;
  }

  function renderBoard() {
    boardEl.innerHTML = "";

    const runtime = state.runtime;
    if (!runtime) return;

    const pathIndexByKey = {};
    runtime.optimalPath.forEach((pos, index) => {
      pathIndexByKey[EngineAPI.keyFor(pos.row, pos.col)] = index;
    });

    runtime.board.forEach((row, rowIndex) => {
      const rowEl = document.createElement("div");
      rowEl.className = `hex-row${rowIndex % 2 === 1 ? " offset" : ""}`;

      row.forEach((tile) => {
        const tileEl = document.createElement("button");
        const tileKey = EngineAPI.keyFor(tile.row, tile.col);

        tileEl.className = buildTileClass(tile, tileKey, pathIndexByKey);
        tileEl.type = "button";
        tileEl.dataset.row = String(tile.row);
        tileEl.dataset.col = String(tile.col);
        tileEl.textContent = getTileText(tile, tileKey);

        if (!runtime.completed) {
          tileEl.addEventListener("click", () => handleTileClick(tile.row, tile.col));
        } else {
          tileEl.disabled = true;
        }

        if (state.solutionVisible && runtime.optimalPathSet.has(tileKey)) {
          tileEl.style.animationDelay = `${pathIndexByKey[tileKey] * 60}ms`;
        }

        rowEl.appendChild(tileEl);
      });

      boardEl.appendChild(rowEl);
    });
  }

  function buildTileClass(tile, tileKey, pathIndexByKey) {
    const classes = ["hex"];

    if (tile.isStart) classes.push("start-edge");
    if (tile.isFinish) classes.push("finish-edge");

    if (!tile.revealed) {
      classes.push("hidden");
    } else if (tile.wasDeadlinkHit) {
      classes.push("deadlink-hit");
    } else if (tile.isFinish) {
      classes.push("revealed", "finish-revealed");
    } else {
      classes.push("revealed");
      if (tile.neighborCount === 0) {
        classes.push("safe-zero");
      } else {
        classes.push(`n${tile.neighborCount}`);
      }
    }

    if (
      state.solutionVisible &&
      pathIndexByKey.hasOwnProperty(tileKey) &&
      !tile.wasDeadlinkHit
    ) {
      classes.push("solution-path");
    }

    return classes.join(" ");
  }

  function getTileText(tile, tileKey) {
    if (!tile.revealed) {
      if (tile.isStart) return "S";
      if (tile.isFinish) return "F";

      if (state.solutionVisible && state.runtime.optimalPathSet.has(tileKey)) {
        return "·";
      }

      return "";
    }

    if (tile.wasDeadlinkHit) return "✕";
    if (tile.isFinish) return "⚑";
    if (tile.neighborCount === 0) return "";
    return String(tile.neighborCount);
  }

  function buildShareText() {
    const runtime = state.runtime;
    const def = state.currentDefinition;

    const title =
      state.currentMode === "practice"
        ? "Breakaway Practice"
        : `Breakaway #${String(def.puzzleId).padStart(3, "0")}`;

    const rows = runtime.board.map((row) =>
      row
        .map((tile) => {
          if (tile.wasDeadlinkHit) return "✕";
          if (tile.isFinish && tile.revealed) return "⚑";
          if (tile.revealed) return "·";
          return "□";
        })
        .join("")
    );

    return [
      title,
      `Score: ${runtime.score}`,
      `Deadlinks: ${runtime.deadlinksTriggered}`,
      `Reveals: ${runtime.reveals}`,
      "",
      ...rows
    ].join("\n");
  }

  init();
})();
