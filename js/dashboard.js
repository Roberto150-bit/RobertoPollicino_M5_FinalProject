/**
 * DegreePilot AI — dashboard controller (static prototype).
 * Coordinates navigation, CRUD panels, calendar rendering, and local persistence.
 * Simulated AI helpers live in ai.js; persistence helpers live in storage.js.
 */

(function () {
  "use strict";

  var SESSION_KEY = "dp_authenticated";

  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) !== "true") {
    window.location.href = "signin.html";
    return;
  }

  var state = DegreePilotStorage.loadState();
  var searchQuery = "";
  var calMonth = new Date();
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  var selectedDayISO = isoFromDate(new Date());
  var selectedEventId = null;

  var VIEW_TITLES = {
    overview: "Overview",
    calendar: "Calendar",
    tasks: "Tasks",
    courses: "Courses",
    announcements: "Announcements",
    grades: "Grades",
    study: "Study Plan",
    email: "Professor Email Assistant",
    settings: "Settings / Profile",
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function isoFromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseISO(iso) {
    var p = (iso || "").split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function uid() {
    return "dp_" + Math.random().toString(36).slice(2, 11);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function save() {
    DegreePilotStorage.saveState(state);
  }

  function courseById(id) {
    return state.courses.find(function (c) {
      return c.id === id;
    });
  }

  function matchesSearch(text) {
    var q = (searchQuery || "").trim().toLowerCase();
    if (!q) return true;
    return (text || "").toLowerCase().indexOf(q) !== -1;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || "ocean");
  }

  /* ---------- Navigation ---------- */

  function switchView(name) {
    document.querySelectorAll("[data-view-panel]").forEach(function (panel) {
      panel.classList.remove("view-active");
    });
    var target = document.querySelector('[data-view-panel="' + name + '"]');
    if (target) target.classList.add("view-active");

    document.querySelectorAll("#sidebar-nav .nav-item").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === name);
    });

    var title = document.getElementById("view-title");
    if (title) title.textContent = VIEW_TITLES[name] || "Dashboard";
  }

  function bindNav() {
    document.querySelectorAll("#sidebar-nav .nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchView(btn.getAttribute("data-view"));
      });
    });
  }

  /* ---------- Course selects ---------- */

  function renderCourseSelects() {
    var selects = ["evt-course", "task-course", "ann-course"].map(function (id) {
      return document.getElementById(id);
    });
    selects.forEach(function (sel) {
      if (!sel) return;
      var prev = sel.value;
      sel.innerHTML = "";
      if (sel.id === "ann-course") {
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "General";
        sel.appendChild(opt0);
      }
      state.courses.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.code + " — " + c.name;
        sel.appendChild(opt);
      });
      if (prev && Array.prototype.some.call(sel.options, function (o) { return o.value === prev; })) {
        sel.value = prev;
      }
    });
  }

  /* ---------- Stats / overview ---------- */

  function averageCourseGrade() {
    var nums = state.courses
      .map(function (c) {
        return parseFloat(c.grade);
      })
      .filter(function (n) {
        return isFinite(n);
      });
    if (!nums.length) return null;
    var sum = nums.reduce(function (a, b) {
      return a + b;
    }, 0);
    return Math.round((sum / nums.length) * 10) / 10;
  }

  function eventsInMonth() {
    var y = calMonth.getFullYear();
    var m = calMonth.getMonth();
    return state.events.filter(function (e) {
      var d = parseISO(e.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  function updateStats() {
    var openTasks = state.tasks.filter(function (t) {
      return !t.completed;
    }).length;
    var elOpen = document.getElementById("stat-open-tasks");
    if (elOpen) elOpen.textContent = String(openTasks);

    var elEv = document.getElementById("stat-events-month");
    if (elEv) elEv.textContent = String(eventsInMonth().length);

    var avg = averageCourseGrade();
    var elAvg = document.getElementById("stat-course-avg");
    if (elAvg) elAvg.textContent = avg == null ? "—" : avg + "%";
  }

  function renderOverview() {
    var tasks = state.tasks
      .filter(function (t) {
        return matchesSearch(t.title + " " + (courseById(t.courseId) ? courseById(t.courseId).code : ""));
      })
      .slice()
      .sort(function (a, b) {
        return a.due.localeCompare(b.due);
      })
      .slice(0, 6);

    var taskHost = document.getElementById("overview-tasks");
    if (taskHost) {
      taskHost.innerHTML = "";
      if (!tasks.length) {
        taskHost.innerHTML = '<p class="muted">No matching tasks.</p>';
      }
      tasks.forEach(function (t) {
        var c = courseById(t.courseId);
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(t.title) +
          "</h4>" +
          '<p class="stack-meta">' +
          escapeHtml(c ? c.code : "Course") +
          " · Due " +
          escapeHtml(t.due) +
          (t.completed ? " · Done" : "") +
          "</p>";
        taskHost.appendChild(row);
      });
    }

    var evs = state.events
      .filter(function (e) {
        return matchesSearch(e.title + " " + (courseById(e.courseId) ? courseById(e.courseId).code : ""));
      })
      .slice()
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      })
      .slice(0, 6);

    var evHost = document.getElementById("overview-events");
    if (evHost) {
      evHost.innerHTML = "";
      if (!evs.length) {
        evHost.innerHTML = '<p class="muted">No matching events.</p>';
      }
      evs.forEach(function (e) {
        var c = courseById(e.courseId);
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(e.title) +
          "</h4>" +
          '<p class="stack-meta">' +
          escapeHtml(c ? c.code : "Course") +
          " · " +
          escapeHtml(e.date) +
          (e.time ? " · " + escapeHtml(e.time) : "") +
          "</p>";
        evHost.appendChild(row);
      });
    }

    var anns = state.announcements.filter(function (a) {
      return matchesSearch(a.title + " " + a.body);
    }).slice(0, 4);

    var annHost = document.getElementById("overview-announcements");
    if (annHost) {
      annHost.innerHTML = "";
      if (!anns.length) {
        annHost.innerHTML = '<p class="muted">No matching announcements.</p>';
      }
      anns.forEach(function (a) {
        var c = a.courseId ? courseById(a.courseId) : null;
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(a.title || "Announcement") +
          "</h4>" +
          "<p>" +
          escapeHtml((a.body || "").slice(0, 140)) +
          (a.body && a.body.length > 140 ? "…" : "") +
          "</p>" +
          '<p class="stack-meta">' +
          escapeHtml(c ? c.code : "General") +
          "</p>";
        annHost.appendChild(row);
      });
    }
  }

  /* ---------- Tasks ---------- */

  function renderTasks() {
    var host = document.getElementById("task-list");
    if (!host) return;
    host.innerHTML = "";

    var items = state.tasks.filter(function (t) {
      var c = courseById(t.courseId);
      return matchesSearch(t.title + " " + (c ? c.code + " " + c.name : ""));
    });

    items
      .slice()
      .sort(function (a, b) {
        return a.due.localeCompare(b.due);
      })
      .forEach(function (t) {
        var c = courseById(t.courseId);
        var row = document.createElement("div");
        row.className = "task-row" + (t.completed ? " done" : "");
        row.innerHTML =
          '<input type="checkbox" data-task-toggle="' +
          escapeHtml(t.id) +
          '"' +
          (t.completed ? " checked" : "") +
          " />" +
          '<div class="task-main">' +
          '<p class="task-title">' +
          escapeHtml(t.title) +
          "</p>" +
          '<p class="task-meta">' +
          escapeHtml(c ? c.code : "") +
          " · Due " +
          escapeHtml(t.due) +
          "</p>" +
          "</div>" +
          '<div class="task-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-task-delete="' +
          escapeHtml(t.id) +
          '">Delete</button>' +
          "</div>";

        host.appendChild(row);
      });

    host.querySelectorAll("[data-task-toggle]").forEach(function (chk) {
      chk.addEventListener("change", function () {
        var id = chk.getAttribute("data-task-toggle");
        var task = state.tasks.find(function (x) {
          return x.id === id;
        });
        if (!task) return;
        task.completed = chk.checked;
        save();
        renderTasks();
        renderOverview();
        updateStats();
        renderCourses();
      });
    });

    host.querySelectorAll("[data-task-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-task-delete");
        state.tasks = state.tasks.filter(function (x) {
          return x.id !== id;
        });
        save();
        renderTasks();
        renderOverview();
        updateStats();
        renderCourses();
      });
    });
  }

  /* ---------- Courses ---------- */

  function upcomingTasksForCourse(cid) {
    return state.tasks
      .filter(function (t) {
        return t.courseId === cid && !t.completed;
      })
      .slice()
      .sort(function (a, b) {
        return a.due.localeCompare(b.due);
      })
      .slice(0, 3);
  }

  function upcomingEventsForCourse(cid) {
    var todayISO = isoFromDate(new Date());
    return state.events
      .filter(function (e) {
        return e.courseId === cid && e.date >= todayISO;
      })
      .slice()
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      })
      .slice(0, 3);
  }

  function renderCourses() {
    var grid = document.getElementById("course-grid");
    if (!grid) return;
    grid.innerHTML = "";

    var items = state.courses.filter(function (c) {
      return matchesSearch(c.code + " " + c.name + " " + c.professor + " " + c.notes);
    });

    items.forEach(function (c) {
      var card = document.createElement("article");
      card.className = "course-card";
      card.style.setProperty("--course-color", c.color || "#2563eb");

      var ut = upcomingTasksForCourse(c.id);
      var ue = upcomingEventsForCourse(c.id);

      var linksHtml = "";
      ut.forEach(function (t) {
        linksHtml += '<span class="link-pill">Task · ' + escapeHtml(t.due) + "</span>";
      });
      ue.forEach(function (e) {
        linksHtml += '<span class="link-pill">Event · ' + escapeHtml(e.date) + "</span>";
      });

      card.innerHTML =
        '<div class="course-head">' +
        "<div>" +
        '<p class="course-code">' +
        escapeHtml(c.code) +
        "</p>" +
        '<p class="course-sub">' +
        escapeHtml(c.name) +
        "</p>" +
        "</div>" +
        '<div class="course-grade">' +
        (isFinite(parseFloat(c.grade)) ? escapeHtml(String(c.grade)) + "%" : "—") +
        "</div>" +
        "</div>" +
        '<p class="course-sub">' +
        escapeHtml(c.professor || "") +
        " · Priority: " +
        escapeHtml(c.priority || "") +
        "</p>" +
        '<p class="course-notes">' +
        escapeHtml(c.notes || "") +
        "</p>" +
        (linksHtml ? '<div class="course-links">' + linksHtml + "</div>" : "") +
        '<div class="course-actions-row">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-course-edit="' +
        escapeHtml(c.id) +
        '">Edit</button>' +
        "</div>";

      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-course-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openCourseModal(btn.getAttribute("data-course-edit"));
      });
    });
  }

  /* ---------- Announcements ---------- */

  function renderAnnouncementFeed() {
    var host = document.getElementById("announcement-feed");
    if (!host) return;
    host.innerHTML = "";

    var items = state.announcements.filter(function (a) {
      return matchesSearch(a.title + " " + a.body);
    });

    if (!items.length) {
      host.innerHTML = '<p class="muted">No announcements yet.</p>';
      return;
    }

    items
      .slice()
      .reverse()
      .forEach(function (a) {
        var c = a.courseId ? courseById(a.courseId) : null;
        var card = document.createElement("article");
        card.className = "feed-card";
        card.innerHTML =
          "<h4>" +
          escapeHtml(a.title || "Announcement") +
          "</h4>" +
          "<p>" +
          escapeHtml(a.body) +
          "</p>" +
          '<p class="stack-meta">' +
          escapeHtml(c ? c.code : "General") +
          "</p>";
        host.appendChild(card);
      });
  }

  /* ---------- Grades ---------- */

  function renderGradeRows() {
    var host = document.getElementById("grade-rows");
    if (!host) return;
    host.innerHTML = "";

    state.gradeCategories.forEach(function (g, idx) {
      var row = document.createElement("div");
      row.className = "grade-row";
      row.innerHTML =
        '<div class="field">' +
        '<label>Category name</label>' +
        '<input type="text" data-grade-field="name" data-grade-id="' +
        escapeHtml(g.id) +
        '" placeholder="Enter category name" value="' +
        escapeHtml(g.name) +
        '" />' +
        "</div>" +
        '<div class="field">' +
        '<label>Weight (%)</label>' +
        '<input type="number" min="0" step="0.1" data-grade-field="weight" data-grade-id="' +
        escapeHtml(g.id) +
        '" placeholder="Enter weight" value="' +
        escapeHtml(String(g.weight)) +
        '" />' +
        "</div>" +
        '<div class="field">' +
        '<label>Average (%)</label>' +
        '<input type="number" min="0" max="100" step="0.1" data-grade-field="average" data-grade-id="' +
        escapeHtml(g.id) +
        '" placeholder="Enter average" value="' +
        escapeHtml(String(g.average)) +
        '" />' +
        "</div>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-grade-remove="' +
        escapeHtml(g.id) +
        '">Remove</button>';

      host.appendChild(row);
    });

    host.querySelectorAll("input[data-grade-field]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-grade-id");
        var field = inp.getAttribute("data-grade-field");
        var row = state.gradeCategories.find(function (x) {
          return x.id === id;
        });
        if (!row) return;
        if (field === "name") row.name = inp.value;
        if (field === "weight") row.weight = parseFloat(inp.value);
        if (field === "average") row.average = parseFloat(inp.value);
        save();
      });
    });

    host.querySelectorAll("[data-grade-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-grade-remove");
        state.gradeCategories = state.gradeCategories.filter(function (x) {
          return x.id !== id;
        });
        save();
        renderGradeRows();
      });
    });
  }

  function computeGradeSnapshot() {
    var res = DegreePilotAI.weightedGrade(state.gradeCategories);
    var pctEl = document.getElementById("snap-percent");
    var stEl = document.getElementById("snap-status");
    var fbEl = document.getElementById("snap-feedback");
    var noteEl = document.getElementById("grade-weight-note");

    if (noteEl) {
      noteEl.hidden = !res.note;
      noteEl.textContent = res.note || "";
    }

    if (pctEl) pctEl.textContent = res.percent == null ? "—" : res.percent + "%";

    var stand = DegreePilotAI.standingLabel(res.percent);
    if (stEl) {
      stEl.textContent = stand.label;
      stEl.className = "pill-status " + stand.className;
    }

    if (fbEl) {
      fbEl.textContent =
        DegreePilotAI.simulatedGradeFeedback(stand.key) +
        (res.percent != null ? "" : " Enter weights that sum sensibly for your syllabus.");
    }
  }

  /* ---------- Calendar ---------- */

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function renderCalendarGrid() {
    var grid = document.getElementById("cal-grid");
    var label = document.getElementById("cal-month-label");
    if (!grid || !label) return;

    var y = calMonth.getFullYear();
    var m = calMonth.getMonth();
    label.textContent = new Date(y, m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

    var first = new Date(y, m, 1);
    var startOffset = (first.getDay() + 6) % 7;
    var prevDays = daysInMonth(y, m - 1);
    var curDays = daysInMonth(y, m);
    var totalCells = 42;

    grid.innerHTML = "";
    var todayISO = isoFromDate(new Date());

    for (var i = 0; i < totalCells; i++) {
      var dayNum = i - startOffset + 1;
      var cellDate = null;
      var muted = false;

      if (dayNum < 1) {
        cellDate = new Date(y, m - 1, prevDays + dayNum);
        muted = true;
      } else if (dayNum > curDays) {
        cellDate = new Date(y, m + 1, dayNum - curDays);
        muted = true;
      } else {
        cellDate = new Date(y, m, dayNum);
      }

      var iso = isoFromDate(cellDate);
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell" + (muted ? " muted" : "") + (iso === todayISO ? " is-today" : "") + (iso === selectedDayISO ? " is-selected" : "");
      cell.setAttribute("data-day", iso);

      var head = document.createElement("div");
      head.className = "cal-day-num";
      head.textContent = String(cellDate.getDate());
      cell.appendChild(head);

      var dots = document.createElement("div");
      dots.className = "cal-dots";

      var evs = state.events.filter(function (e) {
        return e.date === iso;
      });
      evs.slice(0, 4).forEach(function (e) {
        var c = courseById(e.courseId);
        var dot = document.createElement("span");
        dot.className = "cal-dot";
        dot.style.background = c && c.color ? c.color : "#94a3b8";
        dot.title = e.title;
        dots.appendChild(dot);
      });

      cell.appendChild(dots);

      (function (isoLocal) {
        cell.addEventListener("click", function () {
          selectedDayISO = isoLocal;
          renderCalendarGrid();
          renderDayPanel();
        });
      })(iso);

      grid.appendChild(cell);
    }
  }

  function renderDayPanel() {
    var lbl = document.getElementById("cal-selected-label");
    var host = document.getElementById("cal-day-events");
    if (lbl) lbl.textContent = "Events on " + selectedDayISO;
    if (!host) return;
    host.innerHTML = "";

    var evs = state.events.filter(function (e) {
      return e.date === selectedDayISO;
    });

    if (!evs.length) {
      host.innerHTML = '<p class="muted">No events this day.</p>';
      return;
    }

    evs.forEach(function (e) {
      var c = courseById(e.courseId);
      var row = document.createElement("div");
      row.className = "stack-item";
      row.innerHTML =
        "<h4>" +
        escapeHtml(e.title) +
        "</h4>" +
        '<p class="stack-meta">' +
        escapeHtml(c ? c.code : "") +
        (e.time ? " · " + escapeHtml(e.time) : "") +
        "</p>" +
        "<p>" +
        escapeHtml(e.notes || "") +
        "</p>" +
        '<button type="button" class="btn btn-secondary btn-sm" data-open-event="' +
        escapeHtml(e.id) +
        '">Details</button>';
      host.appendChild(row);
    });

    host.querySelectorAll("[data-open-event]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openEventDetail(btn.getAttribute("data-open-event"));
      });
    });
  }

  function openEventDetail(id) {
    selectedEventId = id;
    var e = state.events.find(function (x) {
      return x.id === id;
    });
    if (!e) return;
    var c = courseById(e.courseId);
    var modal = document.getElementById("detail-modal");
    var title = document.getElementById("detail-title");
    var meta = document.getElementById("detail-meta");
    var body = document.getElementById("detail-body");
    if (title) title.textContent = e.title;
    if (meta)
      meta.textContent =
        (c ? c.code + " · " : "") + e.date + (e.time ? " · " + e.time : "");
    if (body) body.textContent = e.notes || "";
    if (modal) modal.hidden = false;
  }

  function closeDetailModal() {
    var modal = document.getElementById("detail-modal");
    if (modal) modal.hidden = true;
    selectedEventId = null;
  }

  /* ---------- Course modal ---------- */

  function openCourseModal(courseId) {
    var modal = document.getElementById("course-modal");
    var delBtn = document.getElementById("btn-delete-course");
    document.getElementById("course-modal-title").textContent = courseId ? "Edit course" : "Add course";
    document.getElementById("course-edit-id").value = courseId || "";

    if (courseId) {
      var c = courseById(courseId);
      if (!c) return;
      document.getElementById("c-code").value = c.code;
      document.getElementById("c-name").value = c.name;
      document.getElementById("c-prof").value = c.professor || "";
      document.getElementById("c-color").value = c.color || "#2563eb";
      document.getElementById("c-grade").value = c.grade != null ? c.grade : "";
      document.getElementById("c-priority").value = c.priority || "Medium";
      document.getElementById("c-notes").value = c.notes || "";
      if (delBtn) delBtn.hidden = false;
    } else {
      document.getElementById("form-course-modal").reset();
      document.getElementById("c-color").value = "#2563eb";
      if (delBtn) delBtn.hidden = true;
    }

    if (modal) modal.hidden = false;
  }

  function closeCourseModal() {
    var modal = document.getElementById("course-modal");
    if (modal) modal.hidden = true;
  }

  /* ---------- Forms / actions ---------- */

  function bindForms() {
    document.getElementById("btn-logout").addEventListener("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "signin.html";
    });

    document.getElementById("btn-reset-demo").addEventListener("click", function () {
      if (!confirm("Reset all demo data to the original semester snapshot?")) return;
      state = DegreePilotStorage.resetToDemo();
      calMonth = new Date();
      calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
      selectedDayISO = isoFromDate(new Date());
      applyTheme(state.profile.theme);
      renderCourseSelects();
      renderGradeRows();
      populateProfileFields();
      renderAll();
    });

    document.getElementById("global-search").addEventListener("input", function (e) {
      searchQuery = e.target.value || "";
      renderAll();
    });

    document.getElementById("cal-prev").addEventListener("click", function () {
      calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
      renderCalendarGrid();
    });

    document.getElementById("cal-next").addEventListener("click", function () {
      calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
      renderCalendarGrid();
    });

    document.getElementById("form-event").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = document.getElementById("evt-title").value.trim();
      var courseId = document.getElementById("evt-course").value;
      var date = document.getElementById("evt-date").value;
      if (!title || !courseId || !date) return;
      state.events.push({
        id: uid(),
        title: title,
        courseId: courseId,
        date: date,
        time: document.getElementById("evt-time").value.trim(),
        notes: document.getElementById("evt-notes").value.trim(),
      });
      save();
      document.getElementById("form-event").reset();
      renderCalendarGrid();
      renderDayPanel();
      renderOverview();
      updateStats();
      renderCourses();
    });

    document.getElementById("form-task").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = document.getElementById("task-title").value.trim();
      var courseId = document.getElementById("task-course").value;
      var due = document.getElementById("task-due").value;
      if (!title || !courseId || !due) return;
      state.tasks.push({
        id: uid(),
        title: title,
        courseId: courseId,
        due: due,
        completed: false,
      });
      save();
      document.getElementById("form-task").reset();
      renderTasks();
      renderOverview();
      updateStats();
      renderCourses();
    });

    document.getElementById("btn-add-course").addEventListener("click", function () {
      openCourseModal(null);
    });

    document.getElementById("form-course-modal").addEventListener("submit", function (e) {
      e.preventDefault();
      var editId = document.getElementById("course-edit-id").value;
      var payload = {
        code: document.getElementById("c-code").value.trim(),
        name: document.getElementById("c-name").value.trim(),
        professor: document.getElementById("c-prof").value.trim(),
        color: document.getElementById("c-color").value,
        grade: parseFloat(document.getElementById("c-grade").value),
        priority: document.getElementById("c-priority").value,
        notes: document.getElementById("c-notes").value.trim(),
      };
      if (!payload.code || !payload.name) return;
      if (!isFinite(payload.grade)) payload.grade = "";

      if (editId) {
        var c = courseById(editId);
        if (!c) return;
        Object.assign(c, payload);
      } else {
        state.courses.push(
          Object.assign(
            {
              id: uid(),
            },
            payload
          )
        );
      }
      save();
      closeCourseModal();
      renderCourseSelects();
      renderCourses();
      renderCalendarGrid();
      renderOverview();
      updateStats();
    });

    document.getElementById("btn-delete-course").addEventListener("click", function () {
      var editId = document.getElementById("course-edit-id").value;
      if (!editId) return;
      if (!confirm("Delete this course? Related tasks/events stay unless you remove them manually.")) return;
      state.courses = state.courses.filter(function (c) {
        return c.id !== editId;
      });
      save();
      closeCourseModal();
      renderCourseSelects();
      renderCourses();
      renderTasks();
      renderCalendarGrid();
      renderOverview();
      updateStats();
    });

    document.getElementById("course-modal-close").addEventListener("click", closeCourseModal);
    var courseBackdrop = document.querySelector("#course-modal .modal-backdrop");
    if (courseBackdrop) courseBackdrop.addEventListener("click", closeCourseModal);

    document.getElementById("form-announcement").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = document.getElementById("ann-title").value.trim();
      var body = document.getElementById("ann-body").value.trim();
      var courseId = document.getElementById("ann-course").value;
      if (!body) return;
      state.announcements.push({
        id: uid(),
        title: title,
        body: body,
        courseId: courseId || "",
      });
      save();
      document.getElementById("form-announcement").reset();
      renderAnnouncementFeed();
      renderOverview();
    });

    document.getElementById("btn-analyze").addEventListener("click", function () {
      var body = document.getElementById("ann-body").value;
      var out = DegreePilotAI.analyzeAnnouncement(body);
      var host = document.getElementById("ann-analysis");
      if (!host) return;
      host.innerHTML =
        "<h4>Summary</h4><ul>" +
        out.summary.map(function (s) {
          return "<li>" + escapeHtml(s) + "</li>";
        }).join("") +
        "</ul><h4>Action items</h4><ul>" +
        out.actions.map(function (s) {
          return "<li>" + escapeHtml(s) + "</li>";
        }).join("") +
        "</ul><h4>Questions to ask</h4><ul>" +
        out.questions.map(function (s) {
          return "<li>" + escapeHtml(s) + "</li>";
        }).join("") +
        "</ul>";
    });

    document.getElementById("btn-add-grade-row").addEventListener("click", function () {
      state.gradeCategories.push({
        id: uid(),
        name: "",
        weight: "",
        average: "",
      });
      save();
      renderGradeRows();
    });

    document.getElementById("btn-calc-grade").addEventListener("click", function () {
      computeGradeSnapshot();
    });

    document.getElementById("form-study").addEventListener("submit", function (e) {
      e.preventDefault();
      var plan = DegreePilotAI.buildStudyPlan({
        course: document.getElementById("study-course").value.trim(),
        deadline: document.getElementById("study-deadline").value.trim(),
        confidence: document.getElementById("study-confidence").value.trim(),
        gradeStatus: document.getElementById("study-status").value,
        timeAvailable: document.getElementById("study-time").value.trim(),
      });
      var host = document.getElementById("study-output");
      if (!host) return;
      host.innerHTML =
        '<h3>' +
        escapeHtml(plan.headline) +
        "</h3><ul>" +
        plan.blocks.map(function (b) {
          return "<li>" + escapeHtml(b) + "</li>";
        }).join("") +
        '</ul><p class="muted">' +
        escapeHtml(plan.disclaimer) +
        "</p>";
    });

    document.getElementById("form-email").addEventListener("submit", function (e) {
      e.preventDefault();
      var draft = DegreePilotAI.buildProfessorEmail({
        professor: document.getElementById("email-prof").value.trim(),
        course: document.getElementById("email-course").value.trim(),
        reason: document.getElementById("email-reason").value.trim(),
        situation: document.getElementById("email-situation").value.trim(),
        tone: document.getElementById("email-tone").value,
      });
      document.getElementById("email-output").textContent = draft;
    });

    document.getElementById("btn-copy-email").addEventListener("click", function () {
      var t = document.getElementById("email-output").textContent;
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(t).catch(function () {});
    });

    document.getElementById("form-profile").addEventListener("submit", function (e) {
      e.preventDefault();
      state.profile.displayName = document.getElementById("pf-name").value.trim();
      state.profile.university = document.getElementById("pf-uni").value.trim();
      state.profile.major = document.getElementById("pf-major").value.trim();
      state.profile.semesterLabel = document.getElementById("pf-sem").value.trim();
      state.profile.goal = document.getElementById("pf-goal").value.trim();
      state.profile.theme = document.getElementById("pf-theme").value;
      save();
      applyTheme(state.profile.theme);
      var hint = document.getElementById("profile-saved");
      if (hint) {
        hint.hidden = false;
        setTimeout(function () {
          hint.hidden = true;
        }, 2500);
      }
    });

    document.getElementById("detail-close").addEventListener("click", closeDetailModal);
    var detailBackdrop = document.querySelector("#detail-modal .modal-backdrop");
    if (detailBackdrop) detailBackdrop.addEventListener("click", closeDetailModal);

    document.getElementById("detail-delete").addEventListener("click", function () {
      if (!selectedEventId) return;
      state.events = state.events.filter(function (x) {
        return x.id !== selectedEventId;
      });
      save();
      closeDetailModal();
      renderCalendarGrid();
      renderDayPanel();
      updateStats();
      renderOverview();
    });
  }

  function populateProfileFields() {
    var p = state.profile;
    var set = function (id, v) {
      var el = document.getElementById(id);
      if (el) el.value = v || "";
    };
    set("pf-name", p.displayName);
    set("pf-uni", p.university);
    set("pf-major", p.major);
    set("pf-sem", p.semesterLabel);
    set("pf-goal", p.goal);
    var th = document.getElementById("pf-theme");
    if (th) th.value = p.theme || "ocean";
  }

  function renderAll() {
    updateStats();
    renderOverview();
    renderTasks();
    renderCourses();
    renderAnnouncementFeed();
    renderCalendarGrid();
    renderDayPanel();
  }

  function init() {
    applyTheme(state.profile.theme);
    populateProfileFields();
    renderCourseSelects();
    renderGradeRows();

    bindNav();
    bindForms();
    switchView("overview");
    renderAll();
    computeGradeSnapshot();
  }

  init();
})();
