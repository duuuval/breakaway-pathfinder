(function () {
  const STORAGE_KEY = "breakaway-web-puzzle-v1";

  function getDefaultData() {
    return {
      currentView: "daily",
      runs: {},
      records: {}
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultData();

      const parsed = JSON.parse(raw);
      return {
        ...getDefaultData(),
        ...parsed,
        runs: {
          ...getDefaultData().runs,
          ...(parsed.runs || {})
        },
        records: {
          ...getDefaultData().records,
          ...(parsed.records || {})
        }
      };
    } catch (error) {
      console.error("Failed to load local storage:", error);
      return getDefaultData();
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.StorageAPI = {
    loadData,
    saveData,
    resetAll
  };
})();
