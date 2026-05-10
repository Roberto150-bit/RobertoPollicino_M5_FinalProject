/**
 * Persists DegreePilot AI dashboard state (v2) in localStorage.
 * Migrates legacy v1 snapshots into the v2 schema when present.
 */

(function (global) {
  "use strict";

  var STORAGE_KEY_V2 = "degreepilot_dashboard_v2";
  var STORAGE_KEY_V1 = "degreepilot_demo_state_v1";

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function migrateV1(old) {
    var blank = global.DegreePilotSeed.buildBlankState();
    if (!old || typeof old !== "object") return blank;

    blank.profile.displayName = old.profile && old.profile.displayName ? old.profile.displayName : blank.profile.displayName;
    blank.profile.university = old.profile && old.profile.university ? old.profile.university : blank.profile.university;
    blank.profile.major = old.profile && old.profile.major ? old.profile.major : blank.profile.major;
    blank.profile.semesterLabel = old.profile && old.profile.semesterLabel ? old.profile.semesterLabel : blank.profile.semesterLabel;
    blank.profile.academicGoal = old.profile && old.profile.goal ? old.profile.goal : blank.profile.academicGoal;
    blank.profile.theme = old.profile && old.profile.theme ? old.profile.theme : "ocean";

    blank.courses = (old.courses || []).map(function (c) {
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        professor: c.professor || "",
        professorEmail: c.professorEmail || "",
        officeHours: c.officeHours || "",
        classFormat: c.classFormat || "",
        color: c.color || "#0056b3",
        priority: c.priority || "Medium",
        notes: c.notes || "",
        links: c.links || [],
        materials: c.materials || [],
        syllabusExtracted: c.syllabusExtracted || null,
        alerts: c.alerts || [],
      };
    });

    blank.tasks = (old.tasks || []).map(function (t) {
      return {
        id: t.id,
        title: t.title,
        courseId: t.courseId,
        type: t.type || "assignment",
        due: t.due,
        priority: t.priority || "Medium",
        estMinutes: t.estMinutes != null ? t.estMinutes : 60,
        notes: t.notes || "",
        completed: !!t.completed,
        source: t.source || "manual",
      };
    });

    blank.updates = [];

    blank.calendarEvents = (old.events || old.calendarEvents || []).map(function (e) {
      return {
        id: e.id,
        title: e.title,
        type: e.type || "school",
        courseId: e.courseId || "",
        date: e.date,
        time: e.time || "",
        priority: e.priority || "medium",
        color: e.color || "",
        notes: e.notes || "",
      };
    });

    blank.gradeEntries = old.gradeEntries || [];

    if (old.gradeCategories && old.gradeCategories.length) {
      var cid = blank.courses[0] ? blank.courses[0].id : "";
      old.gradeCategories.forEach(function (g) {
        blank.gradeEntries.push({
          id: "mig_" + Math.random().toString(36).slice(2, 9),
          courseId: cid,
          category: "homework",
          assignment: g.name || "Category",
          score: parseFloat(g.average) || 0,
          pointsPossible: 100,
          weightPercent: parseFloat(g.weight) || 0,
        });
      });
    }

    return blank;
  }

  function normalize(state) {
    var blank = global.DegreePilotSeed.buildBlankState();
    if (!state || state.version !== 2) {
      return migrateV1(state);
    }
    function merge(target, defaults) {
      Object.keys(defaults).forEach(function (k) {
        if (target[k] == null) target[k] = defaults[k];
        else if (
          typeof defaults[k] === "object" &&
          defaults[k] !== null &&
          !Array.isArray(defaults[k]) &&
          typeof target[k] === "object" &&
          target[k] !== null &&
          !Array.isArray(target[k])
        ) {
          merge(target[k], defaults[k]);
        }
      });
    }
    merge(state, blank);
    if (!Array.isArray(state.calendarEvents)) state.calendarEvents = [];
    if (state.pendingChanges && !state.updates) state.updates = state.pendingChanges;
    if (!Array.isArray(state.updates)) state.updates = [];
    delete state.pendingChanges;
    if (!Array.isArray(state.studyPlans)) state.studyPlans = [];
    if (!Array.isArray(state.studyItems)) state.studyItems = [];
    if (!Array.isArray(state.flashcards)) state.flashcards = [];
    if (!Array.isArray(state.emailDrafts)) state.emailDrafts = [];
    if (!Array.isArray(state.scholarships)) state.scholarships = [];
    if (!Array.isArray(state.recLetterRequests)) state.recLetterRequests = [];
    if (!Array.isArray(state.fafsaChecklist)) state.fafsaChecklist = blank.fafsaChecklist;
    return state;
  }

  function loadState() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY_V2);
    } catch (e) {
      raw = null;
    }
    if (raw) {
      try {
        return normalize(JSON.parse(raw));
      } catch (e) {
        /* fall through */
      }
    }
    try {
      var raw1 = localStorage.getItem(STORAGE_KEY_V1);
      if (raw1) {
        var parsed = JSON.parse(raw1);
        var mig = migrateV1(parsed);
        saveState(mig);
        localStorage.removeItem(STORAGE_KEY_V1);
        return mig;
      }
    } catch (e2) {
      /* ignore */
    }
    var fresh = clone(global.DegreePilotSeed.buildBlankState());
    saveState(fresh);
    return fresh;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
    } catch (e) {
      /* quota / private mode */
    }
  }

  /** Replace storage with a fresh blank dashboard */
  function resetToBlank() {
    var reset = clone(global.DegreePilotSeed.buildBlankState());
    saveState(reset);
    return reset;
  }

  global.DegreePilotStorage = {
    loadState: loadState,
    saveState: saveState,
    resetToBlank: resetToBlank,
    clone: clone,
    migrateV1: migrateV1,
    normalize: normalize,
    /** @deprecated */
    resetToDemo: resetToBlank,
  };
})(window);
