/**
 * DegreePilot — dedicated Tasks workspace (tasks.html).
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();
  var tp = state.tasksPreferences;

  var ui = {
    typeTab: "all",
    sort: "due",
    archiveFilter: "active",
    courseFilter: "",
    filterText: "",
    selectedId: null,
    /** none | view | edit | new */
    panelMode: "none",
    suggestedPending: null,
    prefillDraft: null,
    suggestViewAll: false,
    upcomingCollapsed: {},
  };

  var DOC_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>';

  var TAB_DEFS = [
    { key: "all", label: "All" },
    { key: "assignment", label: "Assignments" },
    { key: "reading", label: "Readings" },
    { key: "quiz", label: "Quizzes" },
    { key: "project", label: "Projects" },
    { key: "study", label: "Reminders" },
  ];

  function save() {
    Save.saveState(state);
  }

  function esc(s) {
    return D.escapeHtml(s == null ? "" : String(s));
  }

  function normalizeTask(t) {
    if (!t) return;
    if (t.archived == null) t.archived = false;
    if (!Array.isArray(t.tags)) t.tags = [];
    if (!Array.isArray(t.resources)) t.resources = [];
    if (!Array.isArray(t.subtasks)) t.subtasks = [];
    if (!t.type) t.type = "assignment";
    if (!t.priority) t.priority = "Medium";
    if (!t.source) t.source = "manual";
    if (t.pointsPossible == null) t.pointsPossible = "";
    if (t.instructions == null) t.instructions = "";
    if (t.dueTime == null) t.dueTime = "23:59";
    if (!t.courseId) t.courseId = "";
  }

  function courseById(id) {
    return (state.courses || []).find(function (c) {
      return c.id === id;
    });
  }

  function taskById(id) {
    return (state.tasks || []).find(function (t) {
      return t.id === id;
    });
  }

  function startOfToday() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function endOfToday() {
    var s = startOfToday();
    s.setHours(23, 59, 59, 999);
    return s;
  }

  function taskTypeForTab(ty) {
    var u = String(ty || "").toLowerCase();
    if (u === "reminder") return "study";
    return u;
  }

  function matchesTypeTab(t) {
    if (ui.typeTab === "all") return true;
    return taskTypeForTab(t.type) === ui.typeTab;
  }

  function passesArchiveRule(t) {
    if (ui.archiveFilter === "archived") return !!t.archived;
    if (ui.archiveFilter === "all") return true;
    return !t.archived;
  }

  function matchesSearch(t, q) {
    if (!q) return true;
    var lc = q.toLowerCase();
    var c = courseById(t.courseId);
    var blob =
      [t.title, t.notes, t.instructions].join(" ") +
      " " +
      (t.tags || []).join(" ") +
      " " +
      (c ? c.code + " " + c.name : "");
    return blob.toLowerCase().indexOf(lc) >= 0;
  }

  function passesCourse(t) {
    if (!ui.courseFilter) return true;
    return t.courseId === ui.courseFilter;
  }

  function listEligible(t) {
    return passesArchiveRule(t) && matchesSearch(t, ui.filterText.trim()) && passesCourse(t) && matchesTypeTab(t);
  }

  function taskDueDateOnly(t) {
    return D.parseISO(t.due || D.isoFromDate(new Date()));
  }

  function taskDueEnd(t) {
    var d = taskDueDateOnly(t);
    var parts = String(t.dueTime || "23:59").split(":");
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    d.setHours(h, m, 59, 999);
    return d;
  }

  function isOverdue(t) {
    if (t.completed) return false;
    return taskDueEnd(t).getTime() < Date.now();
  }

  function isDueToday(t) {
    if (t.completed) return false;
    var td = startOfToday().getTime();
    var d = taskDueDateOnly(t).getTime();
    return d === td;
  }

  function endOfWeekSunday(fromDay) {
    var mon = D.startOfWeekMonday(fromDay);
    return D.addDays(mon, 6);
  }

  function dateKey(d) {
    return D.isoFromDate(d);
  }

  function inThisWeek(t) {
    if (t.completed || isOverdue(t) || isDueToday(t)) return false;
    var due = taskDueDateOnly(t);
    var end = endOfWeekSunday(new Date());
    end.setHours(23, 59, 59, 999);
    return due.getTime() <= end.getTime() && due.getTime() > startOfToday().getTime();
  }

  function inUpcoming(t) {
    if (t.completed || isOverdue(t) || isDueToday(t) || inThisWeek(t)) return false;
    return true;
  }

  function priorityRank(p) {
    if (p === "High") return 0;
    if (p === "Medium") return 1;
    return 2;
  }

  function sortTasks(arr) {
    var copy = arr.slice();
    if (ui.sort === "priority") {
      copy.sort(function (a, b) {
        var pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return taskDueEnd(a) - taskDueEnd(b);
      });
    } else {
      copy.sort(function (a, b) {
        return taskDueEnd(a) - taskDueEnd(b);
      });
    }
    return copy;
  }

  function filteredTasks() {
    (state.tasks || []).forEach(normalizeTask);
    return (state.tasks || []).filter(listEligible);
  }

  function typeTabCounts() {
    var counts = { all: 0, assignment: 0, reading: 0, quiz: 0, project: 0, study: 0 };
    (state.tasks || []).forEach(function (t) {
      if (!passesArchiveRule(t) || !matchesSearch(t, ui.filterText.trim()) || !passesCourse(t)) return;
      counts.all++;
      var k = taskTypeForTab(t.type);
      if (k === "quiz") counts.quiz++;
      else if (k === "assignment") counts.assignment++;
      else if (k === "reading") counts.reading++;
      else if (k === "project") counts.project++;
      else if (k === "study") counts.study++;
    });
    return counts;
  }

  function iconForType(ty) {
    var u = String(ty || "").toLowerCase();
    if (u === "quiz") return "Qz";
    if (u === "reading") return "Rd";
    if (u === "project") return "Pr";
    if (u === "study") return "Sg";
    return "Hw";
  }

  function prioClass(p) {
    if (p === "High") return "tasks-prio tasks-prio-high";
    if (p === "Medium") return "tasks-prio tasks-prio-medium";
    return "tasks-prio tasks-prio-low";
  }

  function formatDueLine(t) {
    if (t.completed) {
      var d = taskDueDateOnly(t);
      return esc(d.toLocaleDateString(undefined, { month: "short", day: "numeric" })) + (t.dueTime ? " · " + esc(formatTimeShort(t.dueTime)) : "");
    }
    if (isOverdue(t)) return "Overdue";
    if (isDueToday(t)) return "Due today" + (t.dueTime ? ", " + esc(formatTimeShort(t.dueTime)) : "");
    var d = taskDueDateOnly(t);
    return "Due " + esc(d.toLocaleDateString(undefined, { month: "short", day: "numeric" })) + (t.dueTime ? ", " + esc(formatTimeShort(t.dueTime)) : "");
  }

  function formatTimeShort(t) {
    var p = String(t || "").split(":");
    var h = parseInt(p[0], 10);
    var m = parseInt(p[1], 10) || 0;
    var am = h >= 12;
    var h12 = h % 12 || 12;
    var z = m < 10 ? "0" + m : String(m);
    return h12 + ":" + z + " " + (am ? "PM" : "AM");
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("tasks-sidebar-sem-pct");
    var fill = document.getElementById("tasks-sidebar-progress-fill");
    var wk = document.getElementById("tasks-sidebar-week-label");
    var tw = meta.totalWeeks || 16;
    var cw = meta.currentWeek || 1;
    var p = Math.min(100, Math.round((cw / tw) * 100));
    if (pct) pct.textContent = p + "%";
    if (fill) fill.style.width = p + "%";
    if (wk) wk.textContent = "Week " + cw + " of " + tw + " · " + (state.profile && state.profile.semesterLabel ? state.profile.semesterLabel : "");
  }

  function renderTypeTabs() {
    var host = document.getElementById("tsk-type-tabs");
    if (!host) return;
    var counts = typeTabCounts();
    host.innerHTML = TAB_DEFS.map(function (def) {
      var n = counts[def.key] != null ? counts[def.key] : 0;
      var active = ui.typeTab === def.key ? " is-active" : "";
      return (
        '<button type="button" role="tab" class="tasks-type-tab' +
        active +
        '" data-type-tab="' +
        esc(def.key) +
        '">' +
        esc(def.label) +
        ' <span class="tsk-count">' +
        n +
        "</span></button>"
      );
    }).join("");
    host.querySelectorAll("[data-type-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.typeTab = btn.getAttribute("data-type-tab");
        ensureSelectionVisible();
        renderAll();
      });
    });
  }

  function bucketTasks(all) {
    var overdue = [],
      today = [],
      week = [],
      upcoming = [],
      done = [];
    all.forEach(function (t) {
      if (t.completed) done.push(t);
      else if (isOverdue(t)) overdue.push(t);
      else if (isDueToday(t)) today.push(t);
      else if (inThisWeek(t)) week.push(t);
      else upcoming.push(t);
    });
    return {
      overdue: sortTasks(overdue),
      today: sortTasks(today),
      week: sortTasks(week),
      upcoming: sortTasks(upcoming),
      completed: sortTasks(done).reverse(),
    };
  }

  function taskCardHtml(t, extraCls) {
    normalizeTask(t);
    var c = courseById(t.courseId);
    var col = (c && c.color) || "#0056b3";
    var sel =
      ui.selectedId === t.id && (ui.panelMode === "view" || ui.panelMode === "edit") ? " is-selected" : "";
    var doneCls = t.completed ? " is-done" : "";
    var arch = t.archived ? " tsk-arch-preview" : "";
    var prioHtml =
      '<span class="' + prioClass(t.priority) + '">' + esc(t.priority || "Low") + "</span>";
    var icoBg = iconForType(t.type);
    return (
      '<div class="tasks-card-row' +
      sel +
      doneCls +
      arch +
      (extraCls ? " " + extraCls : "") +
      '" data-task-id="' +
      esc(t.id) +
      '" role="button" tabindex="0">' +
      '<span class="tasks-card-check-wrap"><input type="checkbox" class="tsk-done-cb-vis"' +
      (t.completed ? " checked" : "") +
      ' aria-label="Mark complete" title="Toggle complete"/></span>' +
      '<div class="tasks-card-ico" style="background:' +
      esc(col) +
      "22;color:" +
      esc(col) +
      '">' +
      esc(icoBg) +
      "</div>" +
      '<div><p class="tasks-card-title">' +
      esc(t.title) +
      '</p><p class="tasks-card-meta">' +
      formatDueLine(t) +
      "</p></div>" +
      prioHtml +
      "</div>"
    );
  }

  function sectionHtml(title, list, bucketKey, opts) {
    opts = opts || {};
    var max = opts.max != null ? opts.max : null;
    var show = max ? list.slice(0, max) : list;
    var hidden = max && list.length > max ? list.length - max : 0;
    var count = list.length;
    var body = show.map(function (t) {
      return taskCardHtml(t, opts.rowExtra);
    }).join("");
    var more =
      hidden > 0
        ? '<button type="button" class="btn btn-link btn-sm tsk-more" data-bucket-more="' +
          esc(bucketKey) +
          '" style="margin:0.35rem 0 0 0.15rem;">+ ' +
          hidden +
          " more</button>"
        : "";
    if (!count) return "";
    return (
      '<section class="tasks-bucket-' +
      esc(bucketKey) +
      '"><h3 class="tasks-bucket-title">' +
      esc(title) +
      ' <span class="tasks-bucket-count">' +
      count +
      "</span></h3>" +
      body +
      more +
      "</section>"
    );
  }

  function renderTaskList() {
    var host = document.getElementById("tsk-list-host");
    if (!host) return;
    var pool = filteredTasks();
    var b = bucketTasks(pool);
    var upcomingMax = ui.upcomingCollapsed.upcoming === false ? null : 3;
    var html = "";
    html += sectionHtml("Today", b.today, "Today");
    html += sectionHtml("This Week", b.week, "Week");
    html += sectionHtml("Upcoming", b.upcoming, "Upcoming", { max: upcomingMax, bucketKey: "Upcoming" });
    html += sectionHtml("Overdue", b.overdue, "Overdue", { rowExtra: "" });
    html += sectionHtml("Completed", b.completed, "Completed");
    if (!html) {
      html = '<p class="muted" style="padding:0.75rem 0;">No tasks match your filters.</p>';
    }
    host.innerHTML = html;

    host.querySelectorAll("[data-task-id]").forEach(function (row) {
      function openRow() {
        var id = row.getAttribute("data-task-id");
        ui.selectedId = id;
        ui.panelMode = "view";
        ui.suggestedPending = null;
        renderAll();
      }
      row.addEventListener("click", function (e) {
        if (e.target.closest(".tsk-done-cb-vis")) return;
        openRow();
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRow();
        }
      });
    });

    host.querySelectorAll(".tsk-done-cb-vis").forEach(function (cb) {
      cb.addEventListener("click", function (e) {
        e.stopPropagation();
        var row = cb.closest("[data-task-id]");
        if (!row) return;
        var t = taskById(row.getAttribute("data-task-id"));
        if (!t) return;
        t.completed = cb.checked;
        save();
        renderAll();
      });
    });

    host.querySelectorAll("[data-bucket-more]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.upcomingCollapsed.upcoming = false;
        renderTaskList();
      });
    });
  }

  function renderCourseSelect() {
    var sel = document.getElementById("tsk-filter-course");
    if (!sel) return;
    var cur = ui.courseFilter;
    sel.innerHTML =
      '<option value="">All courses</option>' +
      (state.courses || [])
        .map(function (c) {
          return '<option value="' + esc(c.id) + '">' + esc(c.code + " — " + c.name) + "</option>";
        })
        .join("");
    sel.value = cur;
  }

  function ensureSelectionVisible() {
    var t = taskById(ui.selectedId);
    if (!t || !listEligible(t)) {
      ui.selectedId = null;
      if (ui.panelMode === "view" || ui.panelMode === "edit") ui.panelMode = "none";
    }
  }

  function fmtEstMinutes(m) {
    if (m == null || !isFinite(m)) return "—";
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return mm ? h + "h " + mm + "m" : h + "h";
  }

  function professorDisplay(t) {
    var c = courseById(t.courseId);
    if (t.professorOverride) return t.professorOverride;
    return c && c.professor ? c.professor : "—";
  }

  function typeLabel(ty) {
    var u = String(ty || "assignment").toLowerCase();
    return u.charAt(0).toUpperCase() + u.slice(1);
  }

  function collectFormFromDom() {
    var courseId = document.getElementById("tsk-field-courseId");
    var title = document.getElementById("tsk-field-title");
    var desc = document.getElementById("tsk-field-desc");
    var due = document.getElementById("tsk-field-due");
    var dueTime = document.getElementById("tsk-field-dueTime");
    var type = document.getElementById("tsk-field-type");
    var points = document.getElementById("tsk-field-points");
    var prof = document.getElementById("tsk-field-prof");
    var est = document.getElementById("tsk-field-est");
    var tags = document.getElementById("tsk-field-tags");
    var instr = document.getElementById("tsk-field-instructions");
    var subHost = document.getElementById("tsk-subtasks-host");
    var resHost = document.getElementById("tsk-resources-host");

    var subtasks = [];
    if (subHost) {
      subHost.querySelectorAll("li").forEach(function (li) {
        var id = li.getAttribute("data-sub-id") || D.uid();
        var tx = li.querySelector(".tsk-sub-inp");
        var ck = li.querySelector(".tsk-sub-done");
        subtasks.push({ id: id, text: (tx && tx.value) || "", done: ck && ck.checked });
      });
    }
    var resources = [];
    if (resHost) {
      resHost.querySelectorAll(".tsk-res-row").forEach(function (row) {
        var name = row.querySelector(".tsk-res-name");
        var size = row.querySelector(".tsk-res-size");
        var id = row.getAttribute("data-res-id") || D.uid();
        if (name && name.value.trim()) resources.push({ id: id, name: name.value.trim(), size: (size && size.value.trim()) || "—" });
      });
    }

    return {
      courseId: courseId ? courseId.value : "",
      title: title ? title.value.trim() : "",
      notes: desc ? desc.value : "",
      due: due ? due.value : D.isoFromDate(new Date()),
      dueTime: dueTime ? dueTime.value : "23:59",
      type: type ? type.value : "assignment",
      pointsPossible: points && points.value ? parseFloat(points.value) : "",
      professorOverride: prof ? prof.value.trim() : "",
      estMinutes: est && est.value ? parseInt(est.value, 10) || 60 : 60,
      tags: tags
        ? tags.value
            .split(",")
            .map(function (x) {
              return x.trim();
            })
            .filter(Boolean)
        : [],
      instructions: instr ? instr.value : "",
      priority: document.getElementById("tsk-field-priority") ? document.getElementById("tsk-field-priority").value : "Medium",
      subtasks: subtasks,
      resources: resources,
    };
  }

  function countdownLine(t) {
    normalizeTask(t);
    if (t.completed) return "Completed.";
    if (!t.due) return "";
    var ms = taskDueEnd(t).getTime() - Date.now();
    if (ms < 0) return "This task is overdue.";
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    return "This task is due in " + h + "h " + m + "m.";
  }

  function defaultNewDraft() {
    return {
      title: "",
      notes: "",
      due: D.isoFromDate(new Date()),
      dueTime: "23:59",
      type: "assignment",
      priority: "Medium",
      estMinutes: 60,
      courseId: "",
      tags: [],
      subtasks: [],
      resources: [],
      instructions: "",
      pointsPossible: "",
      professorOverride: "",
      completed: false,
    };
  }

  function ordinalListIndex() {
    var pool = filteredTasks().filter(function (t) {
      return !t.completed;
    });
    var ix = pool.findIndex(function (t) {
      return t.id === ui.selectedId;
    });
    return { ix: ix, total: pool.length };
  }

  function renderNotionShell() {
    var shell = document.getElementById("tsk-notion-shell");
    var placeholder = document.getElementById("tsk-center-placeholder");
    if (!shell) return;

    function showPlaceholder(msg) {
      shell.hidden = true;
      shell.innerHTML = "";
      if (placeholder) {
        placeholder.hidden = false;
        placeholder.innerHTML = msg || "";
      }
    }

    function showShell(html, attachFn) {
      if (placeholder) placeholder.hidden = true;
      shell.hidden = false;
      shell.innerHTML = html;
      if (attachFn) attachFn();
    }

    if (ui.panelMode === "new") {
      var nd = Object.assign(defaultNewDraft(), ui.prefillDraft || {});
      ui.prefillDraft = null;
      showShell(buildTaskEditor(null, nd), function () {
        attachEditorHandlers(null);
      });
      return;
    }

    if (ui.panelMode === "none") {
      showPlaceholder("");
      return;
    }

    if (!ui.selectedId) {
      showPlaceholder("");
      return;
    }

    var t = taskById(ui.selectedId);
    if (!t) {
      showPlaceholder('<p class="muted">Task not found.</p>');
      return;
    }
    normalizeTask(t);

    if (ui.panelMode === "view") {
      showShell(buildTaskView(t.id, t), function () {
        attachViewHandlers(t.id);
      });
      return;
    }

    if (ui.panelMode === "edit") {
      showShell(buildTaskEditor(t.id, t), function () {
        attachEditorHandlers(t.id);
      });
      return;
    }

    showPlaceholder("");
  }

  function buildTaskView(existingId, t) {
    var c = courseById(t.courseId || "");
    var listIx = ordinalListIndex();
    var courseStr = c ? esc(c.code + " — " + c.name) : "No course";
    var duePretty =
      esc(taskDueDateOnly(t).toLocaleDateString()) +
      " · " +
      esc(formatTimeShort(t.dueTime)) +
      (isDueToday(t) ? ' <span style="color:#15803d;font-weight:700;">(Today)</span>' : "");

    var urgent =
      '<div class="tasks-notion-urgency">' +
      '<strong>' +
      (t.completed ? "Completed" : isOverdue(t) ? "Overdue" : isDueToday(t) ? "Due today at " + esc(formatTimeShort(t.dueTime)) : "Due " + duePretty) +
      "</strong> · <span>" +
      esc(countdownLine(t)) +
      '</span> <span class="' +
      prioClass(t.priority) +
      '" style="margin-left:0.35rem">' +
      esc(t.priority || "Medium") +
      "</span></div>";

    var tagsHtml = (t.tags || []).length
      ? '<div class="tasks-tag-row">' +
        (t.tags || [])
          .map(function (tag) {
            return '<span class="tasks-tag-pill">' + esc(tag) + "</span>";
          })
          .join("") +
        "</div>"
      : '<span class="muted">—</span>';

    var pts =
      t.pointsPossible !== "" && t.pointsPossible != null && isFinite(Number(t.pointsPossible))
        ? esc(String(t.pointsPossible)) + " pts"
        : "—";

    var meta =
      '<dl class="tasks-meta-dl">' +
      "<div><dt>Due date</dt><dd>" +
      duePretty +
      "</dd></div>" +
      "<div><dt>Type</dt><dd>" +
      esc(typeLabel(t.type)) +
      "</dd></div>" +
      "<div><dt>Points</dt><dd>" +
      pts +
      "</dd></div>" +
      "<div><dt>Course</dt><dd>" +
      courseStr +
      "</dd></div>" +
      "<div><dt>Professor</dt><dd>" +
      esc(professorDisplay(t)) +
      "</dd></div>" +
      "<div><dt>Est. time</dt><dd>" +
      esc(fmtEstMinutes(t.estMinutes)) +
      "</dd></div>" +
      "<div><dt>Tags</dt><dd>" +
      tagsHtml +
      "</dd></div></dl>";

    var descBlock =
      t.notes && String(t.notes).trim()
        ? '<p class="tasks-view-desc">' + esc(t.notes) + "</p>"
        : "";

    var instrBlock =
      t.instructions && String(t.instructions).trim()
        ? '<div class="tasks-view-section-title">Instructions</div><div class="tasks-view-instructions">' +
          esc(t.instructions) +
          "</div>"
        : "";

    var resBlock = "";
    if ((t.resources || []).length) {
      resBlock =
        '<div class="tasks-view-section-title">Resources</div><div class="tasks-res-cards">' +
        (t.resources || [])
          .map(function (r) {
            return (
              '<div class="tasks-res-card"><span style="opacity:0.7">PDF</span> · <strong>' +
              esc(r.name) +
              "</strong> · " +
              esc(r.size || "") +
              "</div>"
            );
          })
          .join("") +
        "</div>";
    }

    var subDone = (t.subtasks || []).filter(function (s) {
      return s.done;
    }).length;
    var subTotal = (t.subtasks || []).length;
    var subBlock = "";
    if (subTotal) {
      subBlock =
        '<div class="tasks-view-section-title">Subtasks (' +
        subDone +
        "/" +
        subTotal +
        ")</div><ul class=\"tasks-view-sub-list\">" +
        (t.subtasks || [])
          .map(function (st) {
            return (
              "<li><input type=\"checkbox\" disabled " +
              (st.done ? "checked " : "") +
              '/><span>' +
              esc(st.text) +
              "</span></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    return (
      '<div class="tasks-notion-nav">' +
      '<button type="button" class="btn btn-link btn-sm" id="tsk-back-list">← Back</button>' +
      '<span class="muted" style="margin-left:auto;font-size:0.78rem;">' +
      (listIx.ix >= 0 ? listIx.ix + 1 + " of " + listIx.total + " open" : "") +
      "</span>" +
      '<button type="button" class="icon-btn tsk-nav-prev" title="Previous" aria-label="Previous">‹</button>' +
      '<button type="button" class="icon-btn tsk-nav-next" title="Next" aria-label="Next">›</button>' +
      "</div>" +
      urgent +
      '<div class="tasks-notion-body tasks-view-body">' +
      '<h2 class="tasks-view-title">' +
      esc(t.title) +
      '</h2><p class="tasks-view-course">' +
      courseStr +
      "</p>" +
      descBlock +
      meta +
      instrBlock +
      resBlock +
      subBlock +
      "</div>" +
      '<div class="tasks-notion-actions">' +
      '<button type="button" class="btn btn-primary" id="tsk-mark-complete">' +
      (t.completed ? "Mark incomplete" : "Mark as complete") +
      "</button>" +
      '<button type="button" class="btn btn-secondary" id="tsk-enter-edit">Edit task</button>' +
      '<button type="button" class="btn btn-secondary" id="tsk-archive">' +
      (t.archived ? "Unarchive" : "Archive") +
      "</button>" +
      '<button type="button" class="btn btn-secondary" id="tsk-delete">Delete</button>' +
      "</div>"
    );
  }

  function buildTaskEditor(existingId, t) {
    var c = courseById(t.courseId || "");
    var listIx = ordinalListIndex();
    var urgent =
      '<div class="tasks-notion-urgency">' +
      '<strong>' +
      (t.completed ? "Completed" : isOverdue(t) ? "Overdue" : isDueToday(t) ? "Due today at " + esc(formatTimeShort(t.dueTime)) : "Due " + esc(taskDueDateOnly(t).toLocaleDateString()) + " · " + esc(formatTimeShort(t.dueTime))) +
      "</strong> · <span>" +
      esc(countdownLine(t)) +
      '</span> <span class="' +
      prioClass(t.priority) +
      '" style="margin-left:0.5rem">' +
      esc(t.priority || "Medium") +
      "</span></div>";

    var courseOpts = (state.courses || [])
      .map(function (co) {
        return (
          '<option value="' +
          esc(co.id) +
          '"' +
          (t.courseId === co.id ? " selected" : "") +
          ">" +
          esc(co.code + " — " + co.name) +
          "</option>"
        );
      })
      .join("");

    var typeOpts = ["assignment", "reading", "quiz", "project", "study"].map(function (ty) {
      return '<option value="' + ty + '"' + ((t.type || "assignment") === ty ? " selected" : "") + ">" + esc(ty.charAt(0).toUpperCase() + ty.slice(1)) + "</option>";
    });

    var subHtml = (t.subtasks || [])
      .map(function (st) {
        return (
          '<li data-sub-id="' +
          esc(st.id) +
          '"><label><input type="checkbox" class="tsk-sub-done"' +
          (st.done ? " checked" : "") +
          "/></label><input type=\"text\" class=\"tsk-sub-inp field-input\" value=\"" +
          esc(st.text) +
          '"/></li>'
        );
      })
      .join("");

    var resHtml = (t.resources || [])
      .map(function (r) {
        return (
          '<div class="tsk-res-row" data-res-id="' +
          esc(r.id) +
          '" style="display:flex;gap:0.35rem;margin-bottom:0.35rem;align-items:center;">' +
          '<input type="text" class="tsk-res-name field-input" style="flex:1" placeholder="Filename" value="' +
          esc(r.name) +
          '"/>' +
          '<input type="text" class="tsk-res-size field-input" style="width:88px" placeholder="Size" value="' +
          esc(r.size || "") +
          '"/>' +
          '<button type="button" class="btn btn-secondary btn-sm tsk-res-remove">×</button>' +
          "</div>"
        );
      })
      .join("");

    var courseLine = c ? esc(c.code) + " · " + esc(c.name) : "No course";
    var editorIntro = existingId
      ? '<div class="tasks-editor-head"><p class="muted" style="margin:0 0 0.2rem;font-size:0.72rem;font-weight:650;">Editing task</p><p style="margin:0;font-size:0.95rem;font-weight:800;color:var(--dp-navy);">' +
        esc(t.title || "Untitled") +
        "</p></div>"
      : '<div class="tasks-editor-head"><p style="margin:0;font-size:1.05rem;font-weight:800;color:var(--dp-navy);">New task</p><p class="muted" style="margin:0.35rem 0 0;font-size:0.82rem;">Fill in the fields below. Nothing is saved until you create the task.</p></div>';

    return (
      '<div class="tasks-notion-nav">' +
      '<button type="button" class="btn btn-link btn-sm" id="tsk-back-list">' +
      (existingId ? "← Back to detail" : "← Discard") +
      "</button>" +
      '<span class="muted" style="margin-left:auto;font-size:0.78rem;">' +
      (existingId && listIx.ix >= 0 ? listIx.ix + 1 + " of " + listIx.total + " open" : "") +
      "</span>" +
      (existingId
        ? '<button type="button" class="icon-btn tsk-nav-prev" title="Previous" aria-label="Previous">‹</button>' +
          '<button type="button" class="icon-btn tsk-nav-next" title="Next" aria-label="Next">›</button>'
        : "") +
      "</div>" +
      (existingId ? urgent : '<div class="tasks-notion-urgency" style="background:var(--dp-gray-50);border-color:var(--dp-gray-200);"><strong>New task</strong> · Properties below mirror what you’ll see in task detail.</div>') +
      '<div class="tasks-notion-body">' +
      editorIntro +
      '<div class="tasks-prop"><label>Title</label><input type="text" id="tsk-field-title" class="field-input" value="' +
      esc(t.title || "") +
      '"/></div>' +
      '<div class="tasks-prop"><label>Description</label><textarea id="tsk-field-desc" rows="2" class="field-input">' +
      esc(t.notes || "") +
      "</textarea></div>" +
      '<div class="tasks-prop"><label>Due date</label><input type="date" id="tsk-field-due" class="field-input" value="' +
      esc(t.due || "") +
      '"/></div>' +
      '<div class="tasks-prop"><label>Due time</label><input type="time" id="tsk-field-dueTime" class="field-input" value="' +
      esc((t.dueTime || "23:59").length === 5 ? t.dueTime : "23:59") +
      '"/></div>' +
      '<div class="tasks-prop"><label>Type</label><select id="tsk-field-type" class="field-input">' +
      typeOpts +
      "</select></div>" +
      '<div class="tasks-prop"><label>Points</label><input type="number" id="tsk-field-points" class="field-input" placeholder="100" value="' +
      esc(t.pointsPossible === "" || t.pointsPossible == null ? "" : String(t.pointsPossible)) +
      '"/></div>' +
      '<div class="tasks-prop"><label>Course</label><select id="tsk-field-courseId" class="field-input"><option value="">—</option>' +
      courseOpts +
      "</select></div>" +
      '<div class="tasks-prop"><label>Professor</label><input type="text" id="tsk-field-prof" class="field-input" placeholder="Override or leave for course default" value="' +
      esc(t.professorOverride || "") +
      '"/></div>' +
      '<div class="tasks-prop"><label>Est. minutes</label><input type="number" id="tsk-field-est" class="field-input" value="' +
      (t.estMinutes != null ? esc(String(t.estMinutes)) : "60") +
      '"/></div>' +
      '<div class="tasks-prop"><label>Priority</label><select id="tsk-field-priority" class="field-input"><option value="High"' +
      (t.priority === "High" ? " selected" : "") +
      '>High</option><option value="Medium"' +
      (t.priority === "Medium" || !t.priority ? " selected" : "") +
      '>Medium</option><option value="Low"' +
      (t.priority === "Low" ? " selected" : "") +
      ">Low</option></select></div>" +
      '<div class="tasks-prop"><label>Tags</label><input type="text" id="tsk-field-tags" class="field-input" placeholder="Comma-separated" value="' +
      esc((t.tags || []).join(", ")) +
      '"/></div>' +
      '<div class="tasks-prop" style="grid-template-columns:1fr;"><label>Instructions</label><textarea id="tsk-field-instructions" rows="4" class="field-input">' +
      esc(t.instructions || "") +
      "</textarea></div>" +
      '<div class="tasks-prop" style="grid-template-columns:1fr;"><label>Resources</label><div id="tsk-resources-host">' +
      resHtml +
      '</div><button type="button" class="btn btn-secondary btn-sm" id="tsk-add-resource">+ Add file</button></div>' +
      '<div class="tasks-prop" style="grid-template-columns:1fr;"><label>Subtasks</label><ul class="tasks-sub-list" id="tsk-subtasks-host">' +
      subHtml +
      '</ul><button type="button" class="btn btn-secondary btn-sm" id="tsk-add-sub">+ Add subtask</button></div>' +
      "</div>" +
      '<div class="tasks-notion-actions">' +
      '<button type="button" class="btn btn-primary" id="tsk-save">' +
      (existingId ? "Save changes" : "Create task") +
      "</button>" +
      (existingId
        ? '<button type="button" class="btn btn-secondary" id="tsk-cancel-edit">Cancel</button>' +
          '<button type="button" class="btn btn-secondary" id="tsk-toggle-done">' +
          (t.completed ? "Mark incomplete" : "Mark as complete") +
          "</button>" +
          '<button type="button" class="btn btn-secondary" id="tsk-archive">' +
          (t.archived ? "Unarchive" : "Archive") +
          "</button>" +
          '<button type="button" class="btn btn-secondary" id="tsk-delete">Delete</button>'
        : '<button type="button" class="btn btn-secondary" id="tsk-discard-new">Discard</button>') +
      "</div>"
    );
  }

  function openNavTaskList() {
    return filteredTasks()
      .filter(function (t) {
        return !t.completed;
      })
      .sort(function (a, b) {
        return taskDueEnd(a) - taskDueEnd(b);
      });
  }

  function attachViewHandlers(taskId) {
    var shell = document.getElementById("tsk-notion-shell");
    if (!shell) return;

    var back = document.getElementById("tsk-back-list");
    if (back)
      back.addEventListener("click", function () {
        ui.selectedId = null;
        ui.panelMode = "none";
        ui.suggestedPending = null;
        renderAll();
      });

    function nav(delta) {
      var list = openNavTaskList();
      var ix = list.findIndex(function (x) {
        return x.id === ui.selectedId;
      });
      if (ix < 0) return;
      var n = list[ix + delta];
      if (!n) return;
      ui.selectedId = n.id;
      ui.panelMode = "view";
      renderAll();
    }

    var prev = shell.querySelector(".tsk-nav-prev");
    var next = shell.querySelector(".tsk-nav-next");
    if (prev) prev.addEventListener("click", function () {
      nav(-1);
    });
    if (next) next.addEventListener("click", function () {
      nav(1);
    });

    var mc = document.getElementById("tsk-mark-complete");
    if (mc) {
      mc.addEventListener("click", function () {
        var t = taskById(taskId);
        if (!t) return;
        t.completed = !t.completed;
        save();
        renderAll();
      });
    }

    var ed = document.getElementById("tsk-enter-edit");
    if (ed) {
      ed.addEventListener("click", function () {
        ui.panelMode = "edit";
        renderAll();
      });
    }

    var ar = document.getElementById("tsk-archive");
    if (ar) {
      ar.addEventListener("click", function () {
        var t = taskById(taskId);
        if (!t) return;
        t.archived = !t.archived;
        save();
        renderAll();
      });
    }

    var del = document.getElementById("tsk-delete");
    if (del) {
      del.addEventListener("click", function () {
        if (!confirm("Delete this task permanently?")) return;
        state.tasks = state.tasks.filter(function (x) {
          return x.id !== taskId;
        });
        ui.selectedId = null;
        ui.panelMode = "none";
        save();
        renderAll();
      });
    }
  }

  function attachEditorHandlers(existingId) {
    var shell = document.getElementById("tsk-notion-shell");
    if (!shell) return;

    var back = document.getElementById("tsk-back-list");
    if (back)
      back.addEventListener("click", function () {
        if (existingId) {
          ui.panelMode = "view";
        } else {
          ui.selectedId = null;
          ui.panelMode = "none";
          ui.suggestedPending = null;
        }
        renderAll();
      });

    function nav(delta) {
      var list = openNavTaskList();
      var ix = list.findIndex(function (x) {
        return x.id === ui.selectedId;
      });
      if (ix < 0) return;
      var n = list[ix + delta];
      if (!n) return;
      ui.selectedId = n.id;
      ui.panelMode = "edit";
      renderAll();
    }

    var prev = shell.querySelector(".tsk-nav-prev");
    var next = shell.querySelector(".tsk-nav-next");
    if (prev) prev.addEventListener("click", function () {
      nav(-1);
    });
    if (next) next.addEventListener("click", function () {
      nav(1);
    });

    var cancel = document.getElementById("tsk-cancel-edit");
    if (cancel) {
      cancel.addEventListener("click", function () {
        ui.panelMode = "view";
        renderAll();
      });
    }

    var discard = document.getElementById("tsk-discard-new");
    if (discard) {
      discard.addEventListener("click", function () {
        ui.selectedId = null;
        ui.panelMode = "none";
        ui.suggestedPending = null;
        renderAll();
      });
    }

    var saveBtn = document.getElementById("tsk-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var payload = collectFormFromDom();
        if (!payload.title) {
          alert("Title is required.");
          return;
        }
        if (existingId) {
          var t = taskById(existingId);
          if (!t) return;
          Object.assign(t, payload);
          normalizeTask(t);
          if (payload.professorOverride) t.professorOverride = payload.professorOverride;
          else delete t.professorOverride;
          ui.panelMode = "view";
        } else {
          var nt = Object.assign(
            {
              id: D.uid(),
              completed: false,
              archived: false,
              source: ui.suggestedPending ? "suggested" : "manual",
            },
            payload
          );
          if (payload.professorOverride) nt.professorOverride = payload.professorOverride;
          normalizeTask(nt);
          state.tasks.push(nt);
          if (ui.suggestedPending) {
            state.suggestedTasks = (state.suggestedTasks || []).filter(function (s) {
              return s.id !== ui.suggestedPending.id;
            });
            ui.suggestedPending = null;
          }
          ui.selectedId = nt.id;
          ui.panelMode = "view";
        }
        save();
        renderAll();
      });
    }

    var td = document.getElementById("tsk-toggle-done");
    if (td && existingId) {
      td.addEventListener("click", function () {
        var t = taskById(existingId);
        if (!t) return;
        t.completed = !t.completed;
        save();
        renderAll();
      });
    }

    var ar = document.getElementById("tsk-archive");
    if (ar && existingId) {
      ar.addEventListener("click", function () {
        var t = taskById(existingId);
        if (!t) return;
        t.archived = !t.archived;
        save();
        renderAll();
      });
    }

    var del = document.getElementById("tsk-delete");
    if (del && existingId) {
      del.addEventListener("click", function () {
        if (!confirm("Delete this task permanently?")) return;
        state.tasks = state.tasks.filter(function (x) {
          return x.id !== existingId;
        });
        ui.selectedId = null;
        ui.panelMode = "none";
        save();
        renderAll();
      });
    }

    var addSub = document.getElementById("tsk-add-sub");
    if (addSub) {
      addSub.addEventListener("click", function () {
        var ul = document.getElementById("tsk-subtasks-host");
        if (!ul) return;
        var li = document.createElement("li");
        li.setAttribute("data-sub-id", D.uid());
        li.innerHTML = '<label><input type="checkbox" class="tsk-sub-done"/></label><input type="text" class="tsk-sub-inp field-input" value=""/>';
        ul.appendChild(li);
      });
    }

    var addRes = document.getElementById("tsk-add-resource");
    if (addRes) {
      addRes.addEventListener("click", function () {
        var host = document.getElementById("tsk-resources-host");
        if (!host) return;
        var div = document.createElement("div");
        div.className = "tsk-res-row";
        div.setAttribute("data-res-id", D.uid());
        div.style.cssText = "display:flex;gap:0.35rem;margin-bottom:0.35rem;align-items:center;";
        div.innerHTML =
          '<input type="text" class="tsk-res-name field-input" style="flex:1" placeholder="Filename" value=""/>' +
          '<input type="text" class="tsk-res-size field-input" style="width:88px" placeholder="Size" value=""/>' +
          '<button type="button" class="btn btn-secondary btn-sm tsk-res-remove">×</button>';
        host.appendChild(div);
        div.querySelector(".tsk-res-remove").addEventListener("click", function () {
          div.remove();
        });
      });
    }

    shell.querySelectorAll(".tsk-res-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest(".tsk-res-row");
        if (row) row.remove();
      });
    });
  }

  function scopeWindow() {
    var scope = tp.progressScope || "week";
    var today = new Date();
    var s0 = startOfToday().getTime();
    if (scope === "today") {
      return { start: startOfToday(), end: endOfToday() };
    }
    if (scope === "semester") {
      var y = today.getFullYear(),
        m = today.getMonth();
      var start, end;
      if (m >= 7) {
        start = new Date(y, 7, 1);
        end = new Date(y, 11, 31, 23, 59, 59);
      } else {
        start = new Date(y, 0, 1);
        end = new Date(y, 4, 31, 23, 59, 59);
      }
      return { start: start, end: end };
    }
    var mon = D.startOfWeekMonday(today);
    var sun = D.addDays(mon, 6);
    sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun };
  }

  function taskDueInScope(t, win) {
    var d = taskDueDateOnly(t);
    var s = new Date(win.start.getFullYear(), win.start.getMonth(), win.start.getDate());
    return d.getTime() >= s.getTime() && d.getTime() <= win.end.getTime();
  }

  function progressStats() {
    var win = scopeWindow();
    var wCopy = { start: new Date(win.start), end: new Date(win.end) };
    var pool = (state.tasks || []).filter(function (t) {
      normalizeTask(t);
      return taskDueInScope(t, wCopy);
    });
    var completed = 0,
      inProg = 0,
      pending = 0;
    var todayStart = startOfToday().getTime();
    pool.forEach(function (t) {
      if (t.completed) completed++;
      else {
        var dueDay = taskDueDateOnly(t).getTime();
        if (dueDay <= todayStart) inProg++;
        else pending++;
      }
    });
    var total = completed + inProg + pending;
    return {
      completed: completed,
      inProg: inProg,
      pending: pending,
      total: total,
      sumActive: completed + inProg,
    };
  }

  function progressScopeSelectHtml(scope) {
    return (
      '<select id="tsk-progress-scope" class="tsk-select-nice" aria-label="Progress time range">' +
      '<option value="today"' +
      (scope === "today" ? " selected" : "") +
      ">Today</option>" +
      '<option value="week"' +
      (scope === "week" ? " selected" : "") +
      ">This week</option>" +
      '<option value="semester"' +
      (scope === "semester" ? " selected" : "") +
      ">This semester</option></select>"
    );
  }

  function donutChartHtml(st) {
    var C = 2 * Math.PI * 38;
    var tLen = st.total || 1;
    var a = (st.completed / tLen) * C;
    var b = (st.inProg / tLen) * C;
    var cseg = (st.pending / tLen) * C;
    return (
      '<div class="tasks-donut-stack">' +
      '<div class="tasks-donut-svg-wrap">' +
      '<svg class="tasks-donut" viewBox="0 0 100 100" aria-hidden="true">' +
      '<g transform="rotate(-90 50 50)">' +
      '<circle cx="50" cy="50" r="38" fill="none" stroke="#eef2f6" stroke-width="12"/>' +
      '<circle cx="50" cy="50" r="38" fill="none" stroke="#22c55e" stroke-width="12" stroke-dasharray="' +
      a +
      " " +
      (C - a) +
      '" stroke-dashoffset="0"/>' +
      '<circle cx="50" cy="50" r="38" fill="none" stroke="#0056b3" stroke-width="12" stroke-dasharray="' +
      b +
      " " +
      (C - b) +
      '" stroke-dashoffset="' +
      -a +
      '"/>' +
      '<circle cx="50" cy="50" r="38" fill="none" stroke="#d1d5db" stroke-width="12" stroke-dasharray="' +
      cseg +
      " " +
      (C - cseg) +
      '" stroke-dashoffset="' +
      -(a + b) +
      '"/>' +
      "</g>" +
      "</svg>" +
      '<div class="tasks-donut-center-label"><strong>' +
      esc(String(st.sumActive)) +
      '</strong><span>of ' +
      esc(String(st.total)) +
      "</span></div></div>" +
      '<div class="tasks-donut-legend">' +
      '<div><span><span class="tasks-leg-dot" style="background:#22c55e;border-radius:3px"></span>Completed</span><strong>' +
      st.completed +
      "</strong></div>" +
      '<div><span><span class="tasks-leg-dot" style="background:#0056b3;border-radius:3px"></span>In progress</span><strong>' +
      st.inProg +
      "</strong></div>" +
      '<div><span><span class="tasks-leg-dot" style="background:#d1d5db;border-radius:3px"></span>Pending</span><strong>' +
      st.pending +
      "</strong></div></div></div>"
    );
  }

  function renderProgressPane() {
    var pane = document.getElementById("tsk-pane-progress");
    if (!pane) return;
    var st = progressStats();
    var scope = tp.progressScope || "week";
    var head =
      '<div class="tasks-widget-head">' +
      '<strong id="tsk-widget-progress-title">Task progress</strong>' +
      progressScopeSelectHtml(scope) +
      "</div>" +
      '<p class="tasks-progress-legend-note">Completed · In progress (incomplete, due on or before today) · Pending (due after today).</p>';

    if (!st.total) {
      pane.innerHTML =
        head + '<p class="muted" style="margin:0;font-size:0.8rem;">No tasks with due dates in this window yet.</p>';
      bindProgressScope();
      return;
    }

    pane.innerHTML = head + donutChartHtml(st);
    bindProgressScope();
  }

  function bindProgressScope() {
    var sc = document.getElementById("tsk-progress-scope");
    if (sc) {
      sc.addEventListener("change", function () {
        tp.progressScope = sc.value;
        save();
        renderProgressPane();
      });
    }
  }

  function renderSuggestPane() {
    var pane = document.getElementById("tsk-pane-suggest");
    if (!pane) return;
    var cap = Math.min(25, Math.max(1, parseInt(tp.suggestionDisplayCap, 10) || 5));
    var list = (state.suggestedTasks || []).slice(0, ui.suggestViewAll ? 99 : cap);
    var rows = list
      .map(function (s) {
        return (
          '<div class="tasks-suggestion-row" data-sug-id="' +
          esc(s.id) +
          '">' +
          '<div class="tsk-sug-icon" aria-hidden="true">' +
          DOC_SVG +
          "</div>" +
          "<div><strong>" +
          esc(s.title) +
          '</strong><div class="tasks-sug-meta">From: ' +
          esc(s.sourceLine || "") +
          "</div></div>" +
          '<button type="button" class="btn btn-secondary btn-sm tsk-sug-plus" aria-label="Add suggested task">+</button></div>'
        );
      })
      .join("");

    pane.innerHTML =
      '<div class="tasks-widget-head">' +
      '<div><strong id="tsk-widget-suggest-title">Auto-created tasks</strong>' +
      '<div class="tasks-sug-meta">Tasks generated from your academic activity</div></div>' +
      '<button type="button" class="btn btn-sm tasks-sug-viewall" id="tsk-sug-viewall">' +
      (ui.suggestViewAll ? "Show less" : "View all") +
      "</button></div>" +
      '<div class="tasks-sug-cap-row">Show up to <input type="number" id="tsk-sug-cap" min="1" max="25" value="' +
      cap +
      '"/> suggestions</div>' +
      (rows ? rows : '<p class="muted" style="margin:0.35rem 0 0;font-size:0.82rem;">No suggestions right now.</p>');

    var capInp = document.getElementById("tsk-sug-cap");
    if (capInp) {
      capInp.addEventListener("change", function () {
        tp.suggestionDisplayCap = Math.min(25, Math.max(1, parseInt(capInp.value, 10) || 5));
        save();
        renderSuggestPane();
      });
    }

    var va = document.getElementById("tsk-sug-viewall");
    if (va)
      va.addEventListener("click", function () {
        ui.suggestViewAll = !ui.suggestViewAll;
        renderSuggestPane();
      });

    pane.querySelectorAll(".tsk-sug-plus").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest("[data-sug-id]");
        if (!row) return;
        var id = row.getAttribute("data-sug-id");
        var s = (state.suggestedTasks || []).find(function (x) {
          return x.id === id;
        });
        if (!s) return;
        openRationaleModal(s);
      });
    });
  }

  function openRationaleModal(s) {
    var mod = document.getElementById("tsk-modal-rationale");
    var tx = document.getElementById("tsk-rationale-text");
    var sub = document.getElementById("tsk-rationale-subtitle");
    if (!mod || !tx) return;
    ui.suggestedPending = s;
    if (sub) sub.textContent = s.title + " · " + (s.sourceLine || "");
    tx.value = s.rationaleTemplate || "Completing this item keeps your schedule aligned with the syllabus timeline.";
    mod.hidden = false;
  }

  function closeRationale() {
    var mod = document.getElementById("tsk-modal-rationale");
    if (mod) mod.hidden = true;
    ui.suggestedPending = null;
  }

  function renderAlertPane() {
    var pane = document.getElementById("tsk-pane-alert");
    if (!pane) return;
    var todayIso = dateKey(startOfToday());
    var dueToday = (state.tasks || []).filter(function (t) {
      normalizeTask(t);
      if (t.completed) return false;
      return dateKey(taskDueDateOnly(t)) === todayIso;
    });
    dueToday.sort(function (a, b) {
      return taskDueEnd(a) - taskDueEnd(b);
    });
    var next = dueToday[0];
    var cnt = dueToday.length;
    pane.innerHTML =
      '<div class="tasks-deadline-alert"><div style="display:flex;align-items:center;gap:0.35rem;"><span style="font-size:1rem;">⚠️</span><strong style="color:#b42318;">Deadline Alerts</strong></div><p style="margin:0.45rem 0;color:#b42318;">You have <strong>' +
      cnt +
      "</strong> task" +
      (cnt === 1 ? "" : "s") +
      " due today.</p>" +
      (next
        ? '<p class="muted" style="margin:0;font-size:0.72rem;">Next up:</p><div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem;"><strong>' +
          esc(next.title) +
          '</strong><span style="color:#ea580c;font-weight:750;">' +
          esc(countdownLine(next)) +
          "</span></div>"
        : '<p class="muted" style="margin:0;">Nothing due later today 🎉</p>') +
      "</div>";
  }

  function renderUpcomingPane() {
    var pane = document.getElementById("tsk-pane-upcoming");
    if (!pane) return;
    var nDays = Math.min(45, Math.max(1, parseInt(tp.upcomingDeadlineDays, 10) || 7));
    var start = startOfToday();
    var end = D.addDays(start, nDays);
    end.setHours(23, 59, 59, 999);
    var upcoming = (state.tasks || []).filter(function (t) {
      normalizeTask(t);
      if (t.completed) return false;
      var d = taskDueDateOnly(t);
      return d.getTime() > start.getTime() && d.getTime() <= end.getTime();
    });
    upcoming.sort(function (a, b) {
      return taskDueEnd(a) - taskDueEnd(b);
    });
    var rows = upcoming
      .map(function (t) {
        var d = taskDueDateOnly(t);
        return (
          '<div class="tasks-up-row">' +
          '<time>' +
          esc(d.toLocaleDateString(undefined, { month: "short", day: "numeric" })) +
          "</time><span>" +
          esc(t.title) +
          '</span><span style="text-align:right;">' +
          esc(formatTimeShort(t.dueTime)) +
          "</span></div>"
        );
      })
      .join("");

    var presets = [3, 7, 14, 21, 30, 45];
    var opts = presets.slice();
    if (opts.indexOf(nDays) < 0) opts.push(nDays);
    opts.sort(function (a, b) {
      return a - b;
    });
    var unique = [];
    opts.forEach(function (d) {
      if (unique.indexOf(d) < 0) unique.push(d);
    });

    pane.innerHTML =
      '<div class="tasks-widget-head">' +
      '<strong>Upcoming deadlines</strong>' +
      '<select id="tsk-up-days" class="tsk-select-nice" aria-label="Deadline window">' +
      unique
        .map(function (d) {
          return (
            '<option value="' +
            d +
            '"' +
            (nDays === d ? " selected" : "") +
            ">Next " +
            d +
            " days</option>"
          );
        })
        .join("") +
      "</select></div>" +
      '<p class="muted" style="font-size:0.72rem;margin:0.35rem 0 0.5rem;">Showing <strong>' +
      upcoming.length +
      "</strong> in the next <strong>" +
      nDays +
      "</strong> days.</p>" +
      (rows || '<p class="muted" style="margin:0;">No upcoming deadlines in this window.</p>') +
      '<div style="text-align:center;margin-top:0.65rem;"><a href="dashboard.html#calendar" class="btn btn-link btn-sm">View full calendar →</a></div>';

    var sel = document.getElementById("tsk-up-days");
    if (sel) {
      sel.addEventListener("change", function () {
        tp.upcomingDeadlineDays = Math.min(45, Math.max(1, parseInt(sel.value, 10) || 7));
        save();
        renderUpcomingPane();
      });
    }
  }

  function syncTopBar() {
    var p = state.profile || {};
    var dn = document.getElementById("profile-display-name");
    var mj = document.getElementById("profile-major-line");
    var av = document.getElementById("profile-avatar");
    if (dn) dn.textContent = p.displayName || "Student";
    if (mj) mj.textContent = [p.major, p.university].filter(Boolean).join(" · ") || "";
    if (av) {
      var initials = (p.displayName || "S").split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) {
          return x[0];
        }).join("") || "S";
      av.textContent = initials.toUpperCase();
    }
    var badge = document.getElementById("notification-badge");
    if (badge) {
      var n = typeof state.notificationsUnread === "number" ? state.notificationsUnread : 0;
      badge.hidden = n <= 0;
      badge.textContent = String(Math.min(Math.max(n, 0), 9));
    }
  }

  function bind() {
    var arch = document.getElementById("tsk-filter-archive");
    if (arch) {
      arch.value = ui.archiveFilter;
      arch.addEventListener("change", function () {
        ui.archiveFilter = arch.value;
        ensureSelectionVisible();
        renderAll();
      });
    }

    var sort = document.getElementById("tsk-sort");
    if (sort) {
      sort.value = ui.sort === "priority" ? "priority" : "due";
      sort.addEventListener("change", function () {
        ui.sort = sort.value === "priority" ? "priority" : "due";
        renderTaskList();
      });
    }

    var fc = document.getElementById("tsk-filter-course");
    if (fc) {
      fc.addEventListener("change", function () {
        ui.courseFilter = fc.value;
        ensureSelectionVisible();
        renderAll();
      });
    }

    var filterBtn = document.getElementById("tsk-btn-filter");
    var searchInp = document.getElementById("global-search");
    if (filterBtn && searchInp)
      filterBtn.addEventListener("click", function () {
        searchInp.focus();
      });

    if (searchInp) {
      searchInp.addEventListener("input", function () {
        ui.filterText = searchInp.value;
        ensureSelectionVisible();
        renderTypeTabs();
        renderTaskList();
        renderNotionShell();
      });
    }

    var btnAdd = document.getElementById("tsk-btn-add");
    if (btnAdd)
      btnAdd.addEventListener("click", function () {
        ui.panelMode = "new";
        ui.selectedId = null;
        ui.suggestedPending = null;
        ui.prefillDraft = null;
        renderAll();
      });

    document.querySelectorAll("[data-close-tsk-modals]").forEach(function (el) {
      el.addEventListener("click", closeRationale);
    });
    var rClose = document.getElementById("tsk-rationale-close");
    var rCancel = document.getElementById("tsk-rationale-cancel");
    var rConfirm = document.getElementById("tsk-rationale-confirm");
    if (rClose) rClose.addEventListener("click", closeRationale);
    if (rCancel) rCancel.addEventListener("click", closeRationale);
    if (rConfirm)
      rConfirm.addEventListener("click", function () {
        var s = ui.suggestedPending;
        var rationale = document.getElementById("tsk-rationale-text");
        var rationaleTxt = rationale && rationale.value ? rationale.value.trim() : "";
        if (!s) return;
        document.getElementById("tsk-modal-rationale").hidden = true;
        ui.panelMode = "new";
        ui.selectedId = null;
        ui.prefillDraft = Object.assign(defaultNewDraft(), {
          title: s.title || "",
          courseId: s.courseId || "",
          type: s.type || "reading",
          due: s.due || D.isoFromDate(new Date()),
          priority: s.priority || "Medium",
          estMinutes: s.estMinutes != null ? s.estMinutes : 60,
          notes: rationaleTxt ? "Why this matters:\n" + rationaleTxt : "",
        });
        renderAll();
      });

    var btnN = document.getElementById("btn-notifications");
    var dd = document.getElementById("notify-dropdown");
    var ddBody = document.getElementById("notify-dropdown-body");
    if (btnN && dd) {
      btnN.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = dd.hidden;
        dd.hidden = !open;
        btnN.setAttribute("aria-expanded", open ? "true" : "false");
        if (ddBody && open)
          ddBody.innerHTML =
            '<p class="muted" style="padding:0.65rem;font-size:0.85rem;">Open <a href="updates.html">Updates</a> for notification-style intake, or the <a href="dashboard.html#overview">dashboard</a> for the overview.</p>';
      });
      document.addEventListener("click", function () {
        dd.hidden = true;
        btnN.setAttribute("aria-expanded", "false");
      });
      dd.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    var samp = document.getElementById("toggle-sample-global");
    if (samp) {
      samp.checked = !!state.sampleDataMode;
      samp.addEventListener("change", function (e) {
        var want = e.target.checked;
        if (
          !confirm(
            want
              ? "Load fictional sample data?"
              : "Return to blank dashboard? Local edits will be replaced where sample mode differs."
          )
        ) {
          e.target.checked = !want;
          return;
        }
        state = want ? Seed.buildSampleState() : Save.resetToBlank();
        Save.saveState(state);
        tp = state.tasksPreferences || {};
        samp.checked = !!state.sampleDataMode;
        ui.selectedId = null;
        ui.panelMode = "none";
        renderAll();
        syncTopBar();
      });
    }
  }

  function syncTasksLayout() {
    var layout = document.getElementById("tasks-layout-root") || document.querySelector(".tasks-layout");
    var detailOpen =
      ui.panelMode === "view" || ui.panelMode === "edit" || ui.panelMode === "new";
    if (layout) layout.classList.toggle("tasks-layout--detail-open", detailOpen);
  }

  function renderAll() {
    normalizePrefs();
    renderSidebarSemester();
    renderCourseSelect();
    renderTypeTabs();
    renderTaskList();
    renderNotionShell();
    syncTasksLayout();
    renderProgressPane();
    renderSuggestPane();
    renderAlertPane();
    renderUpcomingPane();
    syncTopBar();
  }

  function normalizePrefs() {
    state.tasksPreferences = state.tasksPreferences || {};
    tp = state.tasksPreferences;
    if (!tp.progressScope) tp.progressScope = "week";
    if (["today", "week", "semester"].indexOf(tp.progressScope) < 0) tp.progressScope = "week";
    if (tp.suggestionDisplayCap == null) tp.suggestionDisplayCap = 5;
    if (tp.upcomingDeadlineDays == null) tp.upcomingDeadlineDays = 7;
  }

  bind();
  renderAll();
})();
