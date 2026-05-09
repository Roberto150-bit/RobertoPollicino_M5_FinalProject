/**
 * Persists DegreePilot AI demo state with localStorage (browser-only).
 * No cloud sync · no database · resets restore the canned semester snapshot.
 */

(function (global) {
  "use strict";

  var STORAGE_KEY = "degreepilot_demo_state_v1";

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadState() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) {
      var fresh = clone(global.DegreePilotSeed.buildDemoState());
      saveState(fresh);
      return fresh;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      var fallback = clone(global.DegreePilotSeed.buildDemoState());
      saveState(fallback);
      return fallback;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* Safari private mode / quota */
    }
  }

  function resetToDemo() {
    var reset = clone(global.DegreePilotSeed.buildDemoState());
    saveState(reset);
    return reset;
  }

  global.DegreePilotStorage = {
    loadState: loadState,
    saveState: saveState,
    resetToDemo: resetToDemo,
    clone: clone,
  };
})(window);
