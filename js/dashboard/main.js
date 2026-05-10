/**
 * DegreePilot dashboard v2 — UI wiring, rendering, persistence.
 */
(function () {
  "use strict";

  var SESSION_KEY = "dp_authenticated";
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) !== "true") {
    window.location.href = "signin.html";
    return;
  }

  var D = window.DegreePilotDashboardCore;
  var state = window.DegreePilotStorage.loadState();
  var ui = {
    searchQuery: "",
    calMode: "week",
    calCursor: new Date(),
    selectedDayISO: D.isoFromDate(new Date()),
    selectedCourseId: null,
    selectedTaskId: null,
    lastCommScenario: "intro",
    commVariant: 0,
  };

  var VIEW_TITLES = {
    overview: "Overview",
    calendar: "Calendar",
    courses: "Courses",
    tasks: "Tasks",
    updates: "Updates",
    grades: "Grades",
    study: "Study Center",
    communication: "Communication",
    financial: "Financial Aid",
    settings: "Profile / Settings",
  };

  function save() {
    window.DegreePilotStorage.saveState(state);
  }

  function courseById(id) {
    return state.courses.find(function (c) {
      return c.id === id;
    });
  }

  function escapeHtml(s) {
    return D.escapeHtml(s);
  }

  function matchesSearch(text) {
    var q = (ui.searchQuery || "").trim().toLowerCase();
    if (!q) return true;
    return (text || "").toLowerCase().indexOf(q) !== -1;
  }

  function priorityRank(p) {
    if (p === "High") return 3;
    if (p === "Low") return 1;
    return 2;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || "ocean");
  }

  function switchView(name) {
    document.querySelectorAll("[data-view-panel]").forEach(function (panel) {
      panel.classList.toggle("view-active", panel.getAttribute("data-view-panel") === name);
    });
    document.querySelectorAll("#sidebar-nav .nav-item").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === name);
    });
    var title = document.getElementById("view-title");
    if (title) title.textContent = VIEW_TITLES[name] || "Dashboard";
  }

  function filteredCalendarEvents() {
    function on(k) {
      var el = document.querySelector('[data-cal-filter="' + k + '"]');
      return el && el.checked;
    }
    return state.calendarEvents.filter(function (ev) {
      if (!matchesSearch(ev.title + " " + (courseById(ev.courseId) ? courseById(ev.courseId).code : ""))) return false;
      var hit = false;
      if (on("course") && ev.courseId) hit = true;
      if (on("exam") && ev.type === "exam") hit = true;
      if (on("assignment") && ev.type === "assignment") hit = true;
      if (on("study") && ev.type === "study") hit = true;
      if (on("school") && ev.type === "school") hit = true;
      return hit;
    });
  }

  function renderCourseSelects() {
    var ids = ["evt-course", "task-course", "upd-course", "g-course", "wf-course", "comm-course", "task-filter-course"];
    ids.forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      var prev = sel.value;
      sel.innerHTML = "";
      if (id === "evt-course" || id === "upd-course") {
        var o0 = document.createElement("option");
        o0.value = "";
        o0.textContent = id === "upd-course" ? "General" : "— Optional —";
        sel.appendChild(o0);
      }
      if (id === "task-filter-course") {
        var all = document.createElement("option");
        all.value = "";
        all.textContent = "All courses";
        sel.appendChild(all);
      }
      if (!state.courses.length && (id === "task-course" || id === "g-course")) {
        var ox = document.createElement("option");
        ox.value = "";
        ox.textContent = "Add a course first";
        sel.appendChild(ox);
      }
      state.courses.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.code + " — " + c.name;
        sel.appendChild(opt);
      });
      if (prev && Array.prototype.some.call(sel.options, function (o) { return o.value === prev; })) sel.value = prev;
    });
  }

  function updateTopProfile() {
    var p = state.profile;
    document.getElementById("profile-display-name").textContent = p.displayName || "Student";
    document.getElementById("profile-major-line").textContent = [p.major, p.university].filter(Boolean).join(" · ") || "";
    var initials = (p.displayName || "S").split(/\s+/).map(function (x) { return x[0]; }).join("").slice(0, 2).toUpperCase();
    document.getElementById("profile-avatar").textContent = initials;
    var badge = document.getElementById("notification-badge");
    var n = state.notificationsUnread || 0;
    badge.hidden = n <= 0;
    badge.textContent = String(Math.min(n, 9));
    var wn = document.getElementById("ov-welcome-name");
    if (wn) wn.textContent = p.displayName || "Student";
  }

  function updateSidebarProgress() {
    var sm = state.semesterMeta || { label: "Spring 2025", totalWeeks: 16, currentWeek: 1 };
    document.getElementById("sidebar-sem-label").textContent = sm.label || "—";
    document.getElementById("sidebar-week-label").textContent =
      "Week " + (sm.currentWeek || 1) + " of " + (sm.totalWeeks || 16);
    var pct = sm.totalWeeks ? Math.round(((sm.currentWeek || 1) / sm.totalWeeks) * 100) : 0;
    document.getElementById("sidebar-progress-fill").style.width = pct + "%";
    var sp = document.getElementById("sidebar-sem-pct");
    if (sp) sp.textContent = pct + "% complete";
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    var tasksOpen = state.tasks.filter(function (t) {
      return !t.completed && matchesSearch(t.title + " " + (courseById(t.courseId) ? courseById(t.courseId).code : ""));
    });
    document.getElementById("ov-open-tasks").textContent = String(tasksOpen.length);

    var sortedFocus = tasksOpen.slice().sort(function (a, b) {
      var pr = priorityRank(b.priority) - priorityRank(a.priority);
      if (pr !== 0) return pr;
      return a.due.localeCompare(b.due);
    });
    var top3 = sortedFocus.slice(0, 3);
    document.getElementById("ov-focus-count").textContent = String(top3.length);

    var ovGrade = D.overallGpaSnapshot(state.courses, state.gradeEntries);
    document.getElementById("ov-grade-snap").textContent = ovGrade == null ? "—" : ovGrade + "%";
    var gh = document.getElementById("ov-grade-hint");
    if (gh) gh.textContent = ovGrade == null ? "No grade data available" : "Avg across courses with entries";
    var donut = document.getElementById("ov-grade-donut");
    if (donut) {
      if (ovGrade == null) donut.style.background = "conic-gradient(#cbd5e1 0 100%)";
      else {
        var gg = Math.min(100, Math.max(0, ovGrade));
        donut.style.background = "conic-gradient(#0066ff 0 " + gg + "%, #e2e8f0 " + gg + "% 100%)";
      }
    }
    var sub = document.getElementById("ov-page-sub");
    if (sub) {
      var sm = state.semesterMeta || { label: "", totalWeeks: 16, currentWeek: 1 };
      var ws = D.startOfWeekMonday(new Date());
      var we = D.addDays(ws, 6);
      sub.textContent =
        (sm.label || "Semester") +
        " · Week " +
        (sm.currentWeek || 1) +
        " of " +
        (sm.totalWeeks || 16) +
        " · " +
        ws.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " – " +
        we.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
    var mom = document.getElementById("ov-momentum-line");
    if (mom) {
      var doneWeek = state.tasks.filter(function (t) {
        return t.completed;
      }).length;
      mom.innerHTML =
        "<strong>You're building momentum.</strong> " +
        (doneWeek
          ? "Keep completing tasks — your dashboard updates everywhere."
          : "Add tasks to track progress week over week.");
    }

    var fl = document.getElementById("ov-focus-list");
    fl.innerHTML = "";
    if (!top3.length) {
      fl.innerHTML =
        '<div class="dp-empty">No focus items yet. Add a course, task, or run the Updates analyzer to generate priorities.</div>';
    } else {
      top3.forEach(function (t) {
        var c = courseById(t.courseId);
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(t.title) +
          "</h4><p class=\"stack-meta\">" +
          escapeHtml(c ? c.code : "") +
          " · Due " +
          escapeHtml(t.due) +
          " · <span class=\"priority-" +
          String(t.priority || "Medium").toLowerCase() +
          "\">" +
          escapeHtml(t.priority || "") +
          "</span></p>";
        fl.appendChild(row);
      });
    }

    var dl = document.getElementById("ov-deadlines");
    dl.innerHTML = "";
    var deadlines = [];
    tasksOpen.forEach(function (t) {
      deadlines.push({ kind: "task", title: t.title, date: t.due, sub: courseById(t.courseId) ? courseById(t.courseId).code : "" });
    });
    filteredCalendarEvents().forEach(function (e) {
      deadlines.push({
        kind: "event",
        title: e.title,
        date: e.date,
        sub: (courseById(e.courseId) || {}).code || e.type,
      });
    });
    deadlines.sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
    deadlines = deadlines.slice(0, 8);
    if (!deadlines.length) {
      dl.innerHTML = '<div class="dp-empty">No deadlines yet.</div>';
    } else {
      deadlines.forEach(function (d) {
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(d.title) +
          "</h4><p class=\"stack-meta\">" +
          escapeHtml(d.date) +
          " · " +
          escapeHtml(d.sub) +
          "</p>";
        dl.appendChild(row);
      });
    }

    var alerts = document.getElementById("ov-alerts");
    alerts.innerHTML = "";
    var alertLines = [];
    state.courses.forEach(function (c) {
      var g = D.courseGradePercent(c.id, state.gradeEntries);
      if (g != null && g < 75) alertLines.push({ level: "risk", text: c.code + " average looks low (" + g + "%)." });
    });
    tasksOpen.forEach(function (t) {
      if (t.due < D.isoFromDate(new Date())) alertLines.push({ level: "warn", text: "Overdue: " + t.title });
    });
    state.courses.forEach(function (c) {
      if ((c.alerts || []).length) {
        c.alerts.forEach(function (a) {
          alertLines.push({ level: a.level === "warn" ? "warn" : "risk", text: c.code + ": " + a.text });
        });
      }
    });
    if (!alertLines.length) {
      alerts.innerHTML = '<div class="dp-empty">No alerts — keep momentum.</div>';
    } else {
      alertLines.slice(0, 6).forEach(function (a) {
        var d = document.createElement("div");
        d.className = "stack-item";
        d.style.borderLeft = "4px solid " + (a.level === "risk" ? "#ef4444" : "#f59e0b");
        d.textContent = a.text;
        alerts.appendChild(d);
      });
    }

    var cp = document.getElementById("ov-cal-preview");
    cp.innerHTML = "";
    var evs = filteredCalendarEvents()
      .slice()
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      })
      .slice(0, 5);
    if (!evs.length) {
      cp.innerHTML = '<div class="dp-empty">No upcoming events match filters.</div>';
    } else {
      evs.forEach(function (e) {
        var c = courseById(e.courseId);
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(e.title) +
          "</h4><p class=\"stack-meta\">" +
          escapeHtml(e.date) +
          " · " +
          escapeHtml(c ? c.code : e.type) +
          "</p>";
        cp.appendChild(row);
      });
    }

    var ai = document.getElementById("ov-ai-line");
    var sug = sortedFocus[0];
    ai.textContent = sug
      ? "Focus next on «" +
        sug.title +
        "» (" +
        (courseById(sug.courseId) || {}).code +
        ") — highest urgency in your list."
      : "Add tasks or enable sample data to surface an urgency suggestion.";
    var sr = document.getElementById("ov-study-rec");
    if (sr) {
      sr.textContent = D.studyRecommendationHint(D.isoFromDate(new Date()), state.courses, state.tasks, state.gradeEntries);
    }
  }

  /* ---------- Calendar ---------- */
  function renderCalendar() {
    var host = document.getElementById("cal-host");
    var label = document.getElementById("cal-range-label");
    var evs = filteredCalendarEvents();

    if (ui.calMode === "month") {
      var y = ui.calCursor.getFullYear();
      var m = ui.calCursor.getMonth();
      if (label) label.textContent = new Date(y, m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
      var first = new Date(y, m, 1);
      var startOffset = (first.getDay() + 6) % 7;
      var prevDays = D.daysInMonth(y, m - 1);
      var curDays = D.daysInMonth(y, m);
      var html =
        '<div class="calendar-shell card-elevated"><div class="cal-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div class="cal-grid">';
      var todayISO = D.isoFromDate(new Date());
      for (var i = 0; i < 42; i++) {
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
        var iso = D.isoFromDate(cellDate);
        var cellEvs = evs.filter(function (e) {
          return e.date === iso;
        });
        var cls = "cal-cell" + (muted ? " muted" : "") + (iso === todayISO ? " is-today" : "") + (iso === ui.selectedDayISO ? " is-selected" : "");
        html +=
          '<button type="button" class="' +
          cls +
          '" data-day="' +
          iso +
          '"><div class="cal-day-num">' +
          cellDate.getDate() +
          '</div><div class="cal-dots">';
        cellEvs.slice(0, 4).forEach(function (e) {
          var col = (courseById(e.courseId) || {}).color || "#94a3b8";
          html += '<span class="cal-dot" style="background:' + escapeHtml(col) + '" title="' + escapeHtml(e.title) + '"></span>';
        });
        html += "</div></button>";
      }
      html += "</div></div>";
      host.innerHTML = html;
      host.querySelectorAll("[data-day]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          ui.selectedDayISO = btn.getAttribute("data-day");
          renderCalendar();
          renderCalSidePanels();
        });
      });
    } else if (ui.calMode === "week") {
      var start = D.startOfWeekMonday(ui.calCursor);
      var end = D.addDays(start, 6);
      if (label)
        label.textContent =
          start.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
          " – " +
          end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      var whtml = '<div class="dp-week-grid">';
      for (var d = 0; d < 7; d++) {
        var dt = D.addDays(start, d);
        var iso = D.isoFromDate(dt);
        var isToday = iso === D.isoFromDate(new Date());
        var colCls = "dp-week-col" + (isToday ? " is-today" : "");
        whtml += '<div class="' + colCls + '" data-day-col="' + iso + '">';
        whtml +=
          '<div class="dp-week-head">' +
          dt.toLocaleDateString(undefined, { weekday: "short" }) +
          '</div><div class="dp-week-num">' +
          dt.getDate() +
          "</div>";
        evs
          .filter(function (e) {
            return e.date === iso;
          })
          .forEach(function (e) {
            var col = (courseById(e.courseId) || {}).color || "#64748b";
            whtml +=
              '<div class="dp-cal-chip" style="background:rgba(0,86,179,.08);border-left:3px solid ' +
              escapeHtml(col) +
              '" data-ev="' +
              escapeHtml(e.id) +
              '">' +
              escapeHtml(e.title) +
              "</div>";
          });
        whtml += "</div>";
      }
      whtml += "</div>";
      host.innerHTML = whtml;
      host.querySelectorAll("[data-day-col]").forEach(function (col) {
        col.addEventListener("click", function () {
          ui.selectedDayISO = col.getAttribute("data-day-col");
          renderCalSidePanels();
        });
      });
    } else {
      var dayISO = D.isoFromDate(ui.calCursor);
      if (label) label.textContent = parseISO(dayISO).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      var dayEvs = evs.filter(function (e) {
        return e.date === dayISO;
      });
      host.innerHTML =
        '<div class="panel"><h3 class="panel-title">' +
        dayEvs.length +
        ' events</h3><div class="stack-list">' +
        (dayEvs.length
          ? dayEvs
              .map(function (e) {
                var c = courseById(e.courseId);
                return (
                  '<div class="stack-item"><h4>' +
                  escapeHtml(e.title) +
                  '</h4><p class="stack-meta">' +
                  escapeHtml(e.time || "") +
                  " · " +
                  escapeHtml(c ? c.code : "") +
                  "</p></div>"
                );
              })
              .join("")
          : '<div class="dp-empty">No events this day.</div>') +
        "</div></div>";
    }
    renderCalSidePanels();
  }

  function parseISO(iso) {
    return D.parseISO(iso);
  }

  function renderCalSidePanels() {
    document.getElementById("cal-selected-label").textContent = "Events on " + ui.selectedDayISO;
    var host = document.getElementById("cal-day-events");
    host.innerHTML = "";
    filteredCalendarEvents()
      .filter(function (e) {
        return e.date === ui.selectedDayISO;
      })
      .forEach(function (e) {
        var c = courseById(e.courseId);
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(e.title) +
          "</h4><p class=\"stack-meta\">" +
          escapeHtml(e.time || "") +
          " · " +
          escapeHtml(c ? c.code : e.type) +
          "</p>";
        host.appendChild(row);
      });
    if (!host.children.length) host.innerHTML = '<p class="muted">No events.</p>';

    var up = document.getElementById("cal-upcoming");
    up.innerHTML = "";
    filteredCalendarEvents()
      .filter(function (e) {
        return e.date >= D.isoFromDate(new Date());
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      })
      .slice(0, 8)
      .forEach(function (e) {
        var c = courseById(e.courseId);
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(e.title) +
          "</h4><p class=\"stack-meta\">" +
          escapeHtml(e.date) +
          " · " +
          escapeHtml(c ? c.code : "") +
          "</p>";
        up.appendChild(row);
      });
  }

  /* ---------- Courses ---------- */
  function renderCourses() {
    var list = document.getElementById("course-list-host");
    list.innerHTML = "";
    var items = state.courses.filter(function (c) {
      return matchesSearch(c.code + " " + c.name + " " + c.professor);
    });
    if (!items.length) {
      list.innerHTML =
        '<div class="dp-empty">No courses yet. Use <strong>Add course</strong> or enable sample data.</div>';
    } else {
      items.forEach(function (c) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "stack-item";
        btn.style.textAlign = "left";
        btn.style.cursor = "pointer";
        btn.style.borderLeft = "4px solid " + (c.color || "#0056b3");
        if (ui.selectedCourseId === c.id) btn.style.background = "rgba(0,86,179,.06)";
        btn.innerHTML =
          "<h4>" +
          escapeHtml(c.code) +
          "</h4><p>" +
          escapeHtml(c.name) +
          "</p><p class=\"stack-meta\">" +
          escapeHtml(c.professor || "") +
          "</p>";
        btn.addEventListener("click", function () {
          ui.selectedCourseId = c.id;
          renderCourses();
          renderCourseDetail();
        });
        list.appendChild(btn);
      });
    }
    renderCourseDetail();
  }

  function renderCourseDetail() {
    var body = document.getElementById("course-detail-body");
    var c = courseById(ui.selectedCourseId);
    if (!c) {
      body.innerHTML = '<p class="dp-empty">Select a course from the list.</p>';
      return;
    }
    var links = (c.links || [])
      .map(function (l) {
        return '<li><a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener">' + escapeHtml(l.label) + "</a></li>";
      })
      .join("");
    var mats = (c.materials || [])
      .map(function (m) {
        return "<li>" + escapeHtml(m.title) + " — " + escapeHtml(m.note || "") + "</li>";
      })
      .join("");
    var syn = "";
    if (c.syllabusExtracted) {
      syn =
        "<h4>Last simulated extraction</h4><ul>" +
        (c.syllabusExtracted.tasks || [])
          .map(function (t) {
            return "<li>Task: " + escapeHtml(t.title) + " due " + escapeHtml(t.due) + "</li>";
          })
          .join("") +
        "</ul>";
    }
    body.innerHTML =
      '<div class="course-head"><div><p class="course-code">' +
      escapeHtml(c.code) +
      '</p><p class="course-sub">' +
      escapeHtml(c.name) +
      '</p></div><button type="button" class="btn btn-secondary btn-sm" data-edit-course="' +
      escapeHtml(c.id) +
      '">Edit</button></div>' +
      '<p class="muted">' +
      escapeHtml(c.professor || "") +
      " · " +
      escapeHtml(c.classFormat || "") +
      "</p>" +
      '<p><a href="mailto:' +
      escapeHtml(c.professorEmail || "") +
      '">' +
      escapeHtml(c.professorEmail || "") +
      "</a></p>" +
      "<p><strong>Office hours:</strong> " +
      escapeHtml(c.officeHours || "—") +
      "</p>" +
      "<h4>Overview</h4><p>" +
      escapeHtml(c.notes || "") +
      '</p><div class="grid-2 mt"><div><h4>Links</h4><ul>' +
      (links || "<li class=\"muted\">No links</li>") +
      '</ul><div class="field"><input id="cd-link-l" placeholder="Label" /><input id="cd-link-u" placeholder="URL" class="mt-sm"/>' +
      '<button type="button" class="btn btn-secondary btn-sm mt-sm" id="btn-course-add-link">Add link</button></div></div>' +
      '<div><h4>Materials</h4><ul>' +
      (mats || "<li class=\"muted\">None</li>") +
      '</ul></div></div><div class="field mt"><label>Course notes</label><textarea id="cd-notes" rows="3">' +
      escapeHtml(c.notes || "") +
      '</textarea><button type="button" class="btn btn-primary btn-sm mt-sm" id="btn-save-course-notes">Save notes</button></div>' +
      '<div class="panel inset mt"><h4>Syllabus simulation</h4><p class="muted">Paste below and analyze — adds suggestions to Updates queue.</p>' +
      '<textarea id="cd-syllabus" rows="3"></textarea>' +
      '<button type="button" class="btn btn-secondary btn-sm mt-sm" id="btn-detail-syllabus">Analyze syllabus</button>' +
      syn +
      "</div>";

    body.querySelector("[data-edit-course]").addEventListener("click", function () {
      openCourseModal(c.id);
    });
    document.getElementById("btn-save-course-notes").addEventListener("click", function () {
      c.notes = document.getElementById("cd-notes").value.trim();
      save();
      renderCourses();
    });
    document.getElementById("btn-course-add-link").addEventListener("click", function () {
      var l = document.getElementById("cd-link-l").value.trim();
      var u = document.getElementById("cd-link-u").value.trim();
      if (!l || !u) return;
      c.links = c.links || [];
      c.links.push({ label: l, url: u });
      save();
      renderCourses();
    });
    document.getElementById("btn-detail-syllabus").addEventListener("click", function () {
      var extracted = D.syllabusSimulation(c.id);
      c.syllabusExtracted = extracted;
      extracted.tasks.forEach(function (t) {
        state.updates.push({
          id: D.uid(),
          kind: "task",
          title: "Syllabus: " + t.title,
          detail: "Simulated extraction",
          checked: true,
          payload: {
            title: t.title,
            courseId: c.id,
            due: t.due,
            type: t.type || "assignment",
            priority: t.priority || "Medium",
            estMinutes: 90,
            notes: "From syllabus simulation.",
          },
        });
      });
      (extracted.exams || []).forEach(function (ex) {
        state.updates.push({
          id: D.uid(),
          kind: "event",
          title: "Syllabus exam: " + ex.title,
          detail: "Simulated",
          checked: true,
          payload: { title: ex.title, courseId: c.id, date: ex.date, type: "exam", priority: "high", time: "" },
        });
      });
      (extracted.policies || []).forEach(function (pol) {
        state.updates.push({
          id: D.uid(),
          kind: "syllabus_policy",
          title: "Policy line",
          detail: String(pol).slice(0, 90),
          checked: true,
          payload: { courseId: c.id, text: pol },
        });
      });
      (extracted.gradingRules || []).forEach(function (gr) {
        state.updates.push({
          id: D.uid(),
          kind: "syllabus_policy",
          title: "Grading: " + gr.label + " (" + gr.weight + "%)",
          detail: "From syllabus weights",
          checked: true,
          payload: { courseId: c.id, text: "Category " + gr.label + " weighted " + gr.weight + "% in course grade." },
        });
      });
      save();
      renderCourses();
      renderUpdates();
      alert("Syllabus analyzed — review items in Updates → Change detection.");
    });
  }

  /* ---------- Tasks ---------- */
  function renderTaskDetail() {
    var body = document.getElementById("task-detail-body");
    if (!body) return;
    var t = state.tasks.find(function (x) {
      return x.id === ui.selectedTaskId;
    });
    if (!t) {
      body.innerHTML = '<p class="dp-empty">Select a task from the board.</p>';
      return;
    }
    var c = courseById(t.courseId);
    body.innerHTML =
      "<p class=\"task-title\" style=\"margin:0 0 0.5rem;font-weight:800;\">" +
      escapeHtml(t.title) +
      "</p>" +
      '<p class="muted" style="margin:0 0 0.75rem;font-size:0.85rem;">' +
      escapeHtml(c ? c.code + " — " + c.name : "") +
      "</p>" +
      "<ul class=\"muted\" style=\"margin:0;padding-left:1.1rem;font-size:0.88rem;\">" +
      "<li>Type: " +
      escapeHtml(t.type || "") +
      "</li>" +
      "<li>Due: " +
      escapeHtml(t.due) +
      "</li>" +
      "<li>Priority: <span class=\"priority-" +
      String(t.priority || "Medium").toLowerCase() +
      "\">" +
      escapeHtml(t.priority || "") +
      "</span></li>" +
      "<li>Est. minutes: " +
      escapeHtml(String(t.estMinutes || "")) +
      "</li>" +
      "<li>Status: " +
      (t.completed ? "Completed" : "Open") +
      "</li>" +
      "</ul>" +
      (t.notes
        ? "<p class=\"mt-sm\"><strong>Notes</strong><br/>" + escapeHtml(t.notes) + "</p>"
        : "") +
      (t.source ? "<p class=\"muted\" style=\"font-size:0.8rem;\">Source: " + escapeHtml(t.source) + "</p>" : "");
  }

  function taskBucket(t) {
    var today = D.isoFromDate(new Date());
    if (t.completed) return "Completed";
    if (t.due < today) return "Overdue";
    if (t.due === today) return "Today";
    var diff = (D.parseISO(t.due) - D.parseISO(today)) / 864e5;
    if (diff <= 7) return "This Week";
    return "Upcoming";
  }

  function renderTasks() {
    if (
      ui.selectedTaskId &&
      !state.tasks.some(function (t) {
        return t.id === ui.selectedTaskId;
      })
    ) {
      ui.selectedTaskId = null;
    }
    var ft = document.getElementById("task-filter-type").value;
    var fc = document.getElementById("task-filter-course").value;
    var board = document.getElementById("task-board");
    board.innerHTML = "";
    var buckets = ["Today", "This Week", "Upcoming", "Overdue", "Completed"];
    buckets.forEach(function (b) {
      var sec = document.createElement("div");
      sec.innerHTML = "<h3 class=\"panel-title small\">" + b + "</h3>";
      var tasks = state.tasks.filter(function (t) {
        if (taskBucket(t) !== b) return false;
        if (ft !== "all" && t.type !== ft) return false;
        if (fc && t.courseId !== fc) return false;
        return matchesSearch(t.title + " " + (courseById(t.courseId) || {}).code);
      });
      tasks.sort(function (a, x) {
        return a.due.localeCompare(x.due);
      });
      if (!tasks.length) return;
      tasks.forEach(function (t) {
        var c = courseById(t.courseId);
        var row = document.createElement("div");
        row.className =
          "task-row" +
          (t.completed ? " done" : "") +
          (ui.selectedTaskId === t.id ? " is-selected" : "");
        row.setAttribute("data-task-select", t.id);
        row.innerHTML =
          '<input type="checkbox" data-task-toggle="' +
          escapeHtml(t.id) +
          '"' +
          (t.completed ? " checked" : "") +
          "/>" +
          '<div class="task-main"><p class="task-title">' +
          escapeHtml(t.title) +
          '</p><p class="task-meta">' +
          escapeHtml(c ? c.code : "") +
          " · " +
          escapeHtml(t.type) +
          " · Due " +
          escapeHtml(t.due) +
          ' · <span class="priority-' +
          String(t.priority || "Medium").toLowerCase() +
          '">' +
          escapeHtml(t.priority || "") +
          "</span></p></div>" +
          '<button type="button" class="btn btn-ghost btn-sm" data-task-del="' +
          escapeHtml(t.id) +
          '">Delete</button>';
        row.addEventListener("click", function (ev) {
          if (ev.target.closest("[data-task-toggle]") || ev.target.closest("[data-task-del]")) return;
          ui.selectedTaskId = t.id;
          renderTasks();
        });
        sec.appendChild(row);
      });
      board.appendChild(sec);
    });
    board.querySelectorAll("[data-task-toggle]").forEach(function (chk) {
      chk.addEventListener("click", function (e) {
        e.stopPropagation();
      });
      chk.addEventListener("change", function () {
        var t = state.tasks.find(function (x) {
          return x.id === chk.getAttribute("data-task-toggle");
        });
        if (t) t.completed = chk.checked;
        save();
        renderAll();
      });
    });
    board.querySelectorAll("[data-task-del]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-task-del");
        if (ui.selectedTaskId === id) ui.selectedTaskId = null;
        state.tasks = state.tasks.filter(function (x) {
          return x.id !== id;
        });
        save();
        renderAll();
      });
    });
    if (!board.children.length) {
      board.innerHTML = '<div class="dp-empty">No tasks match filters.</div>';
    }
    renderTaskDetail();
  }

  /* ---------- Updates ---------- */
  function renderUpdates() {
    var host = document.getElementById("pending-changes-host");
    host.innerHTML = "";
    if (!state.updates.length) {
      host.innerHTML = '<div class="dp-empty">No pending detected changes. Run an analyzer above.</div>';
      return;
    }
    state.updates.forEach(function (p, idx) {
      var row = document.createElement("div");
      row.className = "stack-item";
      row.innerHTML =
        '<label class="switch-row" style="border:none;padding:0;"><input type="checkbox" data-pend-idx="' +
        idx +
        '"' +
        (p.checked ? " checked" : "") +
        "/><strong>" +
        escapeHtml(p.title) +
        "</strong></label><p class=\"muted\">" +
        escapeHtml(p.detail) +
        " · <em>" +
        escapeHtml(p.kind) +
        "</em></p>";
      host.appendChild(row);
    });
    host.querySelectorAll("[data-pend-idx]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var i = parseInt(cb.getAttribute("data-pend-idx"), 10);
        if (state.updates[i]) state.updates[i].checked = cb.checked;
        save();
      });
    });
  }

  function applyPendingPayload(p) {
    if (p.kind === "task") {
      state.tasks.push({
        id: D.uid(),
        title: p.payload.title,
        courseId: p.payload.courseId || (state.courses[0] && state.courses[0].id) || "",
        type: p.payload.type || "assignment",
        due: p.payload.due || D.isoFromDate(new Date()),
        priority: p.payload.priority || "Medium",
        estMinutes: p.payload.estMinutes || 60,
        notes: p.payload.notes || "",
        completed: false,
        source: "update",
      });
    } else if (p.kind === "event") {
      state.calendarEvents.push({
        id: D.uid(),
        title: p.payload.title,
        type: p.payload.type || "assignment",
        courseId: p.payload.courseId || "",
        date: p.payload.date,
        time: p.payload.time || "",
        priority: p.payload.priority || "medium",
        color: "",
        notes: "",
      });
    } else if (p.kind === "study") {
      state.studyItems.push({
        id: D.uid(),
        title: p.payload.title,
        courseId: p.payload.courseId || "",
        notes: p.payload.notes || "",
        createdAt: D.isoFromDate(new Date()),
      });
    } else if (p.kind === "course_alert") {
      var cA = courseById(p.payload.courseId) || state.courses[0];
      if (cA) {
        cA.alerts = cA.alerts || [];
        cA.alerts.push({ text: p.payload.text || "Update", level: p.payload.level || "warn" });
      }
    } else if (p.kind === "syllabus_policy") {
      var cP = courseById(p.payload.courseId) || state.courses[0];
      if (cP) {
        var line = p.payload.text || "";
        cP.notes = (cP.notes ? cP.notes + "\n\n" : "") + "[Syllabus] " + line;
      }
    }
  }

  /* ---------- Grades ---------- */
  function renderGrades() {
    var tb = document.getElementById("grades-table-host");
    var rows = state.gradeEntries.filter(function (g) {
      return matchesSearch(g.assignment + " " + (courseById(g.courseId) || {}).code);
    });
    tb.innerHTML =
      "<table style=\"width:100%;font-size:0.88rem;border-collapse:collapse;\"><thead><tr><th align=\"left\">Course</th><th align=\"left\">Item</th><th>Score</th><th>Weight%</th><th></th></tr></thead><tbody>" +
      rows
        .map(function (g) {
          var c = courseById(g.courseId);
          return (
            "<tr style=\"border-top:1px solid var(--dp-gray-200)\"><td>" +
            escapeHtml(c ? c.code : "") +
            "</td><td>" +
            escapeHtml(g.assignment) +
            "</td><td>" +
            escapeHtml(String(g.score)) +
            "/" +
            escapeHtml(String(g.pointsPossible)) +
            '</td><td>' +
            escapeHtml(String(g.weightPercent || "")) +
            '</td><td><button type="button" class="btn btn-ghost btn-sm" data-gr-del="' +
            escapeHtml(g.id) +
            '">×</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table>";
    tb.querySelectorAll("[data-gr-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-gr-del");
        state.gradeEntries = state.gradeEntries.filter(function (x) {
          return x.id !== id;
        });
        save();
        renderGrades();
        renderOverview();
      });
    });

    var byCourse = document.getElementById("grades-by-course");
    byCourse.innerHTML = "";
    state.courses.forEach(function (c) {
      var p = D.courseGradePercent(c.id, state.gradeEntries);
      var st = D.standingLabel(p);
      var row = document.createElement("div");
      row.className = "snapshot-row";
      row.style.marginBottom = "0.35rem";
      row.innerHTML =
        "<span class=\"snapshot-label\">" +
        escapeHtml(c.code) +
        '</span><span><strong>' +
        (p == null ? "—" : p + "%") +
        '</strong> <span class="pill-status ' +
        st.cls +
        '">' +
        escapeHtml(st.label) +
        "</span></span>";
      byCourse.appendChild(row);
    });

    var catHost = document.getElementById("grades-category-host");
    if (catHost) {
      catHost.innerHTML = "";
      var anyCat = false;
      state.courses.forEach(function (c) {
        var br = D.gradeCategoryBreakdown(c.id, state.gradeEntries);
        var labels = { exam: "Exams", homework: "Homework", project: "Projects", quiz: "Quizzes", participation: "Participation" };
        var has = br.some(function (x) {
          return x.avg != null;
        });
        if (!has) return;
        anyCat = true;
        var sec = document.createElement("div");
        sec.className = "mb";
        sec.innerHTML = "<h4 class=\"panel-title small\" style=\"margin:0 0 0.5rem;\">" + escapeHtml(c.code) + "</h4>";
        br.forEach(function (x) {
          if (x.avg == null) return;
          var row = document.createElement("div");
          row.className = "dp-cat-bar-row";
          row.innerHTML =
            "<span>" +
            escapeHtml(labels[x.category] || x.category) +
            '</span><div class="dp-cat-track"><div style="width:' +
            Math.min(100, x.avg) +
            '%"></div></div><span>' +
            x.avg +
            "%</span>";
          sec.appendChild(row);
        });
        catHost.appendChild(sec);
      });
      if (!anyCat) catHost.innerHTML = '<p class="muted">Enter grades with categories and weights to see breakdown.</p>';
    }

    var trendHost = document.getElementById("grades-trend-host");
    if (trendHost) {
      trendHost.innerHTML = "";
      var anyTrend = false;
      state.courses.forEach(function (c) {
        var p = D.courseGradePercent(c.id, state.gradeEntries);
        if (p == null) return;
        anyTrend = true;
        var row = document.createElement("div");
        row.className = "dp-trend-row";
        row.innerHTML =
          "<span>" +
          escapeHtml(c.code) +
          '</span><div class="dp-trend-track"><div style="width:' +
          Math.min(100, p) +
          '%"></div></div><span>' +
          p +
          "%</span>";
        trendHost.appendChild(row);
      });
      if (!anyTrend) trendHost.innerHTML = '<p class="muted">Add scored entries to see a simple standing chart.</p>';
    }

    var risk = document.getElementById("grade-risk-host");
    risk.innerHTML = "<h4 class=\"panel-title small\">Risk alerts</h4>";
    var risks = [];
    state.courses.forEach(function (c) {
      var p = D.courseGradePercent(c.id, state.gradeEntries);
      if (p == null) return;
      if (p < 60) risks.push({ border: "#ef4444", text: c.code + " is close to failing — contact your professor or advisor urgently." });
      else if (p < 70) risks.push({ border: "#f59e0b", text: c.code + " below 70% — consider instructor or advisor outreach." });
    });
    if (!risks.length) risk.innerHTML += '<p class="muted">No automated flags.</p>';
    else
      risks.forEach(function (r) {
        var d = document.createElement("div");
        d.className = "stack-item";
        d.style.borderLeft = "4px solid " + r.border;
        d.textContent = r.text;
        risk.appendChild(d);
      });

    document.getElementById("withdraw-note").textContent = state.withdrawalDeadlineNote || "";
    var gwi = document.getElementById("grades-withdraw-inline");
    if (gwi) gwi.textContent = state.withdrawalDeadlineNote || "Withdrawal deadline — configure in demo seed.";

    var avgAll = D.overallGpaSnapshot(state.courses, state.gradeEntries);
    var gpaEl = document.getElementById("grades-kpi-gpa");
    if (gpaEl) gpaEl.textContent = avgAll == null ? "—" : (Math.round((avgAll / 100) * 4 * 100) / 100).toFixed(2);
    var gkc = document.getElementById("grades-kpi-courses");
    if (gkc) gkc.textContent = String(state.courses.length);
    var gka = document.getElementById("grades-kpi-avg");
    if (gka) gka.textContent = avgAll == null ? "—" : avgAll + "%";
    var gke = document.getElementById("grades-kpi-entries");
    if (gke) gke.textContent = String(state.gradeEntries.length);
    var gks = document.getElementById("grades-kpi-stand");
    if (gks)
      gks.textContent =
        avgAll == null ? "—" : avgAll >= 85 ? "Strong" : avgAll >= 75 ? "Good" : avgAll >= 65 ? "Solid" : "Watch";
  }

  /* ---------- Study ---------- */
  function renderStudy() {
    var hint = document.getElementById("study-context-hint");
    if (hint) {
      var hasData = !!(state.courses.length || state.tasks.length || state.gradeEntries.length);
      hint.textContent = hasData
        ? "Sessions below align with your current tasks, deadlines, and grade snapshot."
        : "Add courses, tasks, or grades to personalize study tools.";
    }
    var sd = document.getElementById("study-deadlines-placeholder");
    if (sd) {
      var soon = state.tasks
        .filter(function (t) {
          return !t.completed;
        })
        .sort(function (a, b) {
          return a.due.localeCompare(b.due);
        })
        .slice(0, 4);
      sd.innerHTML = "";
      if (!soon.length) {
        sd.innerHTML =
          '<div class="stack-item"><p style="margin:0;font-weight:650;">No upcoming tasks</p><p class="muted" style="margin:0;font-size:0.82rem;">Add tasks or enable sample data.</p></div>';
      } else {
        soon.forEach(function (t) {
          var c = courseById(t.courseId);
          var row = document.createElement("div");
          row.className = "stack-item";
          row.innerHTML =
            "<p style=\"margin:0;font-weight:650;\">" +
            escapeHtml(t.title) +
            "</p><p class=\"muted\" style=\"margin:0;font-size:0.82rem;\">" +
            escapeHtml(c ? c.code : "") +
            " · Due " +
            escapeHtml(t.due) +
            "</p>";
          sd.appendChild(row);
        });
      }
    }
    var spSel = document.getElementById("sp-mode");
    var modeBtns = document.querySelectorAll(".dp-mode-toggle button");
    if (spSel && modeBtns.length) {
      var modes = ["deadlines", "grades", "confidence"];
      var ix = modes.indexOf(spSel.value);
      modeBtns.forEach(function (b, i) {
        b.classList.toggle("is-active", i === (ix >= 0 ? ix : 0));
      });
    }
    var fl = document.getElementById("flash-list");
    fl.innerHTML = "";
    if (!state.flashcards.length) {
      fl.innerHTML = '<p class="muted">Generate cards from Exam prep toolkit.</p>';
    } else {
      state.flashcards.forEach(function (f, i) {
        var div = document.createElement("div");
        div.className = "flashcard mt-sm";
        var inner = document.createElement("div");
        inner.className = "flashcard-inner" + (f.flipped ? " is-back" : "");
        inner.innerHTML = "<strong>" + (f.flipped ? "Answer" : "Question") + "</strong><p>" + escapeHtml(f.flipped ? f.back : f.front) + "</p>";
        inner.addEventListener("click", function () {
          f.flipped = !f.flipped;
          save();
          renderStudy();
        });
        div.appendChild(inner);
        fl.appendChild(div);
      });
    }
  }

  function renderCommTemplates() {
    var h = document.getElementById("email-templates-host");
    h.innerHTML = "";
    (state.emailDrafts || []).forEach(function (d) {
      var row = document.createElement("div");
      row.className = "stack-item";
      row.innerHTML =
        "<strong>" +
        escapeHtml(d.scenario || "draft") +
        '</strong><p class="muted">' +
        escapeHtml((d.body || "").slice(0, 80)) +
        "…</p>";
      row.addEventListener("click", function () {
        document.getElementById("comm-draft").value = d.body || "";
      });
      h.appendChild(row);
    });
    var cs = document.getElementById("comm-scenario");
    var scenIds = ["intro", "clarify", "extension", "grade", "advisor"];
    document.querySelectorAll(".dp-scenario-item").forEach(function (btn, i) {
      btn.classList.toggle("is-active", !!(cs && cs.value === scenIds[i]));
    });
  }

  function renderFinancial() {
    var sugHost = document.getElementById("sch-suggestions");
    if (sugHost) {
      sugHost.innerHTML = "";
      D.scholarshipSuggestions(state.profile && state.profile.major).forEach(function (s) {
        var row = document.createElement("div");
        row.className = "stack-item";
        row.innerHTML =
          "<h4>" +
          escapeHtml(s.name) +
          "</h4><p class=\"stack-meta\">" +
          escapeHtml(s.amount) +
          " · " +
          escapeHtml(s.note) +
          "</p>";
        sugHost.appendChild(row);
      });
    }

    var eb = document.getElementById("essay-brain");
    var eo = document.getElementById("essay-outline");
    var ed = document.getElementById("essay-draft");
    if (eb && document.activeElement !== eb) eb.value = state.essayBrainstorm || "";
    if (eo && document.activeElement !== eo) eo.value = state.essayOutline || "";
    if (ed && document.activeElement !== ed) ed.value = state.essayDraft || "";

    var sl = document.getElementById("sch-list");
    sl.innerHTML = "";
    state.scholarships.forEach(function (s) {
      var row = document.createElement("div");
      row.className = "stack-item";
      row.innerHTML =
        "<h4>" +
        escapeHtml(s.name) +
        "</h4><p class=\"stack-meta\">" +
        escapeHtml(s.amount || "") +
        " · due " +
        escapeHtml(s.deadline || "") +
        " · " +
        escapeHtml(s.status || "") +
        "</p>";
      sl.appendChild(row);
    });
    if (!state.scholarships.length) sl.innerHTML = '<div class="dp-empty">No scholarships tracked.</div>';

    var fh = document.getElementById("fafsa-host");
    fh.innerHTML = "";
    state.fafsaChecklist.forEach(function (item) {
      var lab = document.createElement("label");
      lab.className = "switch-row";
      lab.innerHTML =
        '<input type="checkbox" data-fafsa="' +
        escapeHtml(item.id) +
        '"' +
        (item.done ? " checked" : "") +
        "/>" +
        escapeHtml(item.label);
      fh.appendChild(lab);
    });
    fh.querySelectorAll("[data-fafsa]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-fafsa");
        var it = state.fafsaChecklist.find(function (x) {
          return x.id === id;
        });
        if (it) it.done = cb.checked;
        save();
      });
    });

    var rl = document.getElementById("rec-list");
    rl.innerHTML = "";
    state.recLetterRequests.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "stack-item";
      row.innerHTML =
        "<strong>" +
        escapeHtml(r.professor) +
        "</strong><p class=\"stack-meta\">" +
        escapeHtml(r.status) +
        " · " +
        escapeHtml(r.due || "") +
        "</p>";
      rl.appendChild(row);
    });

    var al = document.getElementById("aid-alerts");
    al.innerHTML = "";
    state.scholarships
      .filter(function (s) {
        return s.deadline && s.deadline <= D.isoFromDate(D.addDays(new Date(), 14));
      })
      .forEach(function (s) {
        var row = document.createElement("div");
        row.className = "stack-item";
        row.style.borderLeft = "4px solid #f59e0b";
        row.textContent = "Upcoming: " + s.name + " (" + s.deadline + ")";
        al.appendChild(row);
      });
    if (!al.children.length) al.innerHTML = '<p class="muted">No deadlines in the next two weeks.</p>';

    var nMatch = D.scholarshipSuggestions(state.profile && state.profile.major).length;
    var fk = document.getElementById("fin-kpi-matches");
    if (fk) fk.textContent = String(nMatch);
    var fp = document.getElementById("fin-kpi-progress");
    if (fp) fp.textContent = String(state.scholarships.length);
    var fd = document.getElementById("fin-kpi-deadlines");
    if (fd) {
      var n30 = state.scholarships.filter(function (s) {
        return s.deadline && s.deadline <= D.isoFromDate(D.addDays(new Date(), 30));
      }).length;
      fd.textContent = String(n30);
    }
  }

  function syncSampleCheckboxes() {
    var on = !!state.sampleDataMode;
    var a = document.getElementById("toggle-sample-data");
    var b = document.getElementById("toggle-sample-global");
    if (a) a.checked = on;
    if (b) b.checked = on;
  }

  function applySampleState(wantOn) {
    state = wantOn
      ? window.DegreePilotStorage.clone(window.DegreePilotSeed.buildSampleState())
      : window.DegreePilotStorage.clone(window.DegreePilotSeed.buildBlankState());
    save();
    ui.selectedCourseId = state.courses[0] && state.courses[0].id;
    ui.selectedTaskId = null;
    applyTheme(state.profile.theme);
    syncSampleCheckboxes();
    renderAll();
  }

  function populateProfileForm() {
    var p = state.profile;
    function v(id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val != null ? val : "";
    }
    v("pf-name", p.displayName);
    v("pf-uni", p.university);
    v("pf-major", p.major);
    v("pf-minor", p.minor);
    v("pf-sem", p.semesterLabel);
    v("pf-year", p.classYear);
    v("pf-goal", p.academicGoal);
    v("pf-adv-name", p.advisorName);
    v("pf-adv-email", p.advisorEmail);
    var th = document.getElementById("pf-theme");
    if (th) th.value = p.theme || "ocean";
    syncSampleCheckboxes();
    var st = state.settings || {};
    document.getElementById("set-compact-cal").checked = !!st.prefCompactCalendar;
    document.getElementById("set-n-assign").checked = st.notifyAssignments !== false;
    document.getElementById("set-n-grade").checked = st.notifyGrades !== false;
    document.getElementById("set-n-fin").checked = st.notifyFinancial !== false;
    document.getElementById("smart-notes-area").value = state.smartNotesText || "";
  }

  function openCourseModal(id) {
    var modal = document.getElementById("course-modal");
    document.getElementById("course-modal-title").textContent = id ? "Edit course" : "Add course";
    document.getElementById("course-edit-id").value = id || "";
    document.getElementById("btn-delete-course").hidden = !id;
    document.getElementById("syllabus-preview").innerHTML = "";
    if (id) {
      var c = courseById(id);
      document.getElementById("c-code").value = c.code;
      document.getElementById("c-name").value = c.name;
      document.getElementById("c-prof").value = c.professor || "";
      document.getElementById("c-email").value = c.professorEmail || "";
      document.getElementById("c-hours").value = c.officeHours || "";
      document.getElementById("c-format").value = c.classFormat || "";
      document.getElementById("c-color").value = c.color || "#0056b3";
      document.getElementById("c-priority").value = c.priority || "Medium";
      document.getElementById("c-notes").value = c.notes || "";
    } else {
      document.getElementById("form-course-modal").reset();
      document.getElementById("c-color").value = "#0056b3";
    }
    modal.hidden = false;
  }

  function closeCourseModal() {
    document.getElementById("course-modal").hidden = true;
  }

  function renderAll() {
    renderCourseSelects();
    updateTopProfile();
    updateSidebarProgress();
    renderOverview();
    renderCalendar();
    renderCourses();
    renderTasks();
    renderUpdates();
    renderGrades();
    renderStudy();
    renderCommTemplates();
    renderFinancial();
    populateProfileForm();
  }

  function bindNav() {
    document.querySelectorAll("#sidebar-nav .nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchView(btn.getAttribute("data-view"));
      });
    });
    document.getElementById("btn-sidebar-view-plan").addEventListener("click", function () {
      switchView("study");
    });
  }

  function bindForms() {
    document.getElementById("btn-logout").addEventListener("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "signin.html";
    });

    document.getElementById("global-search").addEventListener("input", function (e) {
      ui.searchQuery = e.target.value || "";
      renderAll();
    });

    document.body.addEventListener("click", function (e) {
      var navEl = e.target.closest("[data-nav]");
      if (navEl && navEl.getAttribute("data-nav")) {
        e.preventDefault();
        switchView(navEl.getAttribute("data-nav"));
      }
    });

    var ovStart = document.getElementById("btn-ov-start-focus");
    if (ovStart)
      ovStart.addEventListener("click", function () {
        switchView("tasks");
      });
    var syllBtn = document.getElementById("btn-add-course-syllabus");
    if (syllBtn)
      syllBtn.addEventListener("click", function () {
        document.getElementById("btn-add-course").click();
      });

    document.querySelectorAll(".dp-mode-toggle button").forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".dp-mode-toggle button").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        var sel = document.getElementById("sp-mode");
        var modes = ["deadlines", "grades", "confidence"];
        if (sel && modes[idx] !== undefined) sel.value = modes[idx];
      });
    });

    document.querySelectorAll(".dp-scenario-item").forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".dp-scenario-item").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        var sel = document.getElementById("comm-scenario");
        var scenarios = ["intro", "clarify", "extension", "grade", "advisor"];
        if (sel && scenarios[idx] !== undefined) sel.value = scenarios[idx];
      });
    });

    document.getElementById("btn-notifications").addEventListener("click", function () {
      state.notificationsUnread = 0;
      save();
      updateTopProfile();
      alert("Notifications cleared (demo).");
    });

    document.querySelectorAll("#cal-filters input").forEach(function (cb) {
      cb.addEventListener("change", function () {
        renderCalendar();
        renderOverview();
      });
    });

    document.getElementById("cal-view-month").addEventListener("click", function () {
      ui.calMode = "month";
      document.getElementById("cal-view-month").classList.add("is-active");
      document.getElementById("cal-view-week").classList.remove("is-active");
      document.getElementById("cal-view-day").classList.remove("is-active");
      renderCalendar();
    });
    document.getElementById("cal-view-week").addEventListener("click", function () {
      ui.calMode = "week";
      document.getElementById("cal-view-week").classList.add("is-active");
      document.getElementById("cal-view-month").classList.remove("is-active");
      document.getElementById("cal-view-day").classList.remove("is-active");
      renderCalendar();
    });
    document.getElementById("cal-view-day").addEventListener("click", function () {
      ui.calMode = "day";
      document.getElementById("cal-view-day").classList.add("is-active");
      document.getElementById("cal-view-month").classList.remove("is-active");
      document.getElementById("cal-view-week").classList.remove("is-active");
      renderCalendar();
    });

    document.getElementById("cal-prev").addEventListener("click", function () {
      if (ui.calMode === "month") ui.calCursor = new Date(ui.calCursor.getFullYear(), ui.calCursor.getMonth() - 1, 1);
      else if (ui.calMode === "week") ui.calCursor = D.addDays(ui.calCursor, -7);
      else ui.calCursor = D.addDays(ui.calCursor, -1);
      renderCalendar();
    });
    document.getElementById("cal-next").addEventListener("click", function () {
      if (ui.calMode === "month") ui.calCursor = new Date(ui.calCursor.getFullYear(), ui.calCursor.getMonth() + 1, 1);
      else if (ui.calMode === "week") ui.calCursor = D.addDays(ui.calCursor, 7);
      else ui.calCursor = D.addDays(ui.calCursor, 1);
      renderCalendar();
    });

    document.getElementById("form-event").addEventListener("submit", function (e) {
      e.preventDefault();
      state.calendarEvents.push({
        id: D.uid(),
        title: document.getElementById("evt-title").value.trim(),
        type: document.getElementById("evt-type").value,
        courseId: document.getElementById("evt-course").value,
        date: document.getElementById("evt-date").value,
        time: document.getElementById("evt-time").value.trim(),
        priority: document.getElementById("evt-priority").value,
        color: "",
        notes: "",
      });
      save();
      e.target.reset();
      renderAll();
    });

    document.getElementById("form-task").addEventListener("submit", function (e) {
      e.preventDefault();
      var tc = document.getElementById("task-course").value;
      if (!tc) {
        alert("Select a course (add one under Courses first).");
        return;
      }
      state.tasks.push({
        id: D.uid(),
        title: document.getElementById("task-title").value.trim(),
        courseId: tc,
        type: document.getElementById("task-type").value,
        due: document.getElementById("task-due").value,
        priority: document.getElementById("task-priority").value,
        estMinutes: parseInt(document.getElementById("task-est").value, 10) || 60,
        notes: document.getElementById("task-notes").value.trim(),
        completed: false,
        source: "manual",
      });
      save();
      e.target.reset();
      renderAll();
    });

    document.getElementById("task-filter-type").addEventListener("change", renderTasks);
    document.getElementById("task-filter-course").addEventListener("change", renderTasks);

    document.getElementById("btn-add-course").addEventListener("click", function () {
      openCourseModal(null);
    });
    document.getElementById("course-modal-close").addEventListener("click", closeCourseModal);
    document.querySelector("#course-modal .modal-backdrop").addEventListener("click", closeCourseModal);

    document.getElementById("form-course-modal").addEventListener("submit", function (e) {
      e.preventDefault();
      var editId = document.getElementById("course-edit-id").value;
      var payload = {
        code: document.getElementById("c-code").value.trim(),
        name: document.getElementById("c-name").value.trim(),
        professor: document.getElementById("c-prof").value.trim(),
        professorEmail: document.getElementById("c-email").value.trim(),
        officeHours: document.getElementById("c-hours").value.trim(),
        classFormat: document.getElementById("c-format").value.trim(),
        color: document.getElementById("c-color").value,
        priority: document.getElementById("c-priority").value,
        notes: document.getElementById("c-notes").value.trim(),
        links: editId && courseById(editId) ? courseById(editId).links || [] : [],
        materials: editId && courseById(editId) ? courseById(editId).materials || [] : [],
        syllabusExtracted: editId && courseById(editId) ? courseById(editId).syllabusExtracted : null,
        alerts: editId && courseById(editId) ? courseById(editId).alerts || [] : [],
      };
      if (!payload.code || !payload.name) return;
      if (editId) {
        Object.assign(courseById(editId), payload);
      } else {
        state.courses.push(Object.assign({ id: D.uid() }, payload));
      }
      var ll = document.getElementById("c-link-label").value.trim();
      var uu = document.getElementById("c-link-url").value.trim();
      var cLast = courseById(editId) || state.courses[state.courses.length - 1];
      if (ll && uu) {
        cLast.links = cLast.links || [];
        cLast.links.push({ label: ll, url: uu });
      }
      save();
      closeCourseModal();
      renderAll();
    });

    document.getElementById("btn-delete-course").addEventListener("click", function () {
      var editId = document.getElementById("course-edit-id").value;
      if (!editId || !confirm("Delete this course?")) return;
      state.courses = state.courses.filter(function (c) {
        return c.id !== editId;
      });
      ui.selectedCourseId = null;
      save();
      closeCourseModal();
      renderAll();
    });

    document.getElementById("btn-syllabus-analyze").addEventListener("click", function () {
      var editId = document.getElementById("course-edit-id").value;
      if (!editId) {
        alert("Save the course first, then analyze from the course detail panel.");
        return;
      }
      var c = courseById(editId);
      var extracted = D.syllabusSimulation(c.id);
      c.syllabusExtracted = extracted;
      document.getElementById("syllabus-preview").innerHTML =
        "<h4>Simulated extraction</h4><pre class=\"email-preview\" style=\"white-space:pre-wrap\">" +
        escapeHtml(JSON.stringify(extracted, null, 2)) +
        "</pre><p class=\"muted\">Use course detail → Analyze to queue items.</p>";
      save();
    });

    document.getElementById("btn-analyze-announce").addEventListener("click", function () {
      var text = document.getElementById("upd-announce-body").value;
      var cid = document.getElementById("upd-course").value;
      var full = D.analyzeAnnouncementFull(text, cid);
      full.updates.forEach(function (x) {
        state.updates.push(x);
      });
      var sumBox = document.getElementById("upd-announce-summary");
      var sumList = document.getElementById("upd-summary-list");
      if (sumBox && sumList) {
        sumList.innerHTML = "";
        (full.summaryLines || []).forEach(function (line) {
          var li = document.createElement("li");
          li.textContent = line;
          sumList.appendChild(li);
        });
        sumBox.hidden = !(full.summaryLines && full.summaryLines.length);
      }
      save();
      renderUpdates();
      renderOverview();
    });

    document.getElementById("btn-analyze-shot").addEventListener("click", function () {
      D.screenshotSimulation().forEach(function (x) {
        state.updates.push(x);
      });
      save();
      renderUpdates();
    });

    document.getElementById("btn-analyze-audio").addEventListener("click", function () {
      var res = D.audioSimulation();
      document.getElementById("upd-audio-out").innerHTML =
        "<h4>Summary</h4><p>" +
        escapeHtml(res.summary) +
        '</p><h4>Topics</h4><ul>' +
        res.topics.map(function (t) {
          return "<li>" + escapeHtml(t) + "</li>";
        }).join("") +
        '</ul><h4>Questions</h4><ul>' +
        res.questions.map(function (t) {
          return "<li>" + escapeHtml(t) + "</li>";
        }).join("") +
        "</ul>";
      res.studyItems.forEach(function (si) {
        state.updates.push({
          id: D.uid(),
          kind: "study",
          title: si.title,
          detail: "From audio simulation",
          checked: true,
          payload: { title: si.title, courseId: "", notes: si.notes },
        });
      });
      save();
      renderUpdates();
    });

    document.getElementById("btn-save-updates").addEventListener("click", function () {
      var next = [];
      state.updates.forEach(function (p) {
        if (!p.checked) {
          next.push(p);
          return;
        }
        applyPendingPayload(p);
      });
      state.updates = next;
      save();
      document.getElementById("upd-save-msg").hidden = false;
      document.getElementById("upd-save-msg").textContent =
        "Approved updates merged into tasks, calendar, study items, and course notes where applicable.";
      setTimeout(function () {
        document.getElementById("upd-save-msg").hidden = true;
      }, 4000);
      renderAll();
    });

    document.getElementById("form-grade").addEventListener("submit", function (e) {
      e.preventDefault();
      var gc = document.getElementById("g-course").value;
      if (!gc) {
        alert("Add and select a course first.");
        return;
      }
      state.gradeEntries.push({
        id: D.uid(),
        courseId: gc,
        category: document.getElementById("g-cat").value,
        assignment: document.getElementById("g-assign").value.trim(),
        score: parseFloat(document.getElementById("g-score").value),
        pointsPossible: parseFloat(document.getElementById("g-max").value) || 100,
        weightPercent: parseFloat(document.getElementById("g-weight").value) || 0,
      });
      save();
      e.target.reset();
      renderGrades();
      renderOverview();
    });

    document.getElementById("form-whatif").addEventListener("submit", function (e) {
      e.preventDefault();
      var cid = document.getElementById("wf-course").value;
      var cur = D.courseGradePercent(cid, state.gradeEntries);
      var need = D.whatIfNeededAverage(
        document.getElementById("wf-desired").value,
        cur != null ? cur : 0,
        document.getElementById("wf-earned").value,
        document.getElementById("wf-remaining").value
      );
      document.getElementById("wf-result").textContent =
        need == null ? "Enter valid numbers." : "Needed average on remaining work: ~" + need + "% (simulated).";
    });

    document.getElementById("form-study-plan").addEventListener("submit", function (e) {
      e.preventDefault();
      var blocks = D.buildStudyPlanBlocks({
        mode: document.getElementById("sp-mode").value,
        hoursPerDay: document.getElementById("sp-hours").value,
        confidence: document.getElementById("sp-conf").value,
        tasks: state.tasks,
        gradeEntries: state.gradeEntries,
        courses: state.courses,
      });
      document.getElementById("study-plan-out").innerHTML =
        "<h3>Plan</h3><ul>" +
        blocks.map(function (b) {
          return "<li>" + escapeHtml(b) + "</li>";
        }).join("") +
        "</ul>";
      blocks.slice(2, 6).forEach(function (line, i) {
        var m = line.match(/^(\d+)\.\s*(.+)$/);
        if (!m) return;
        state.studyPlans.push({
          id: D.uid(),
          title: m[2],
          date: D.isoFromDate(D.addDays(new Date(), i)),
          durationMin: 45,
          courseId: "",
          notes: "Generated session",
        });
        if (document.getElementById("sp-add-cal").checked) {
          state.calendarEvents.push({
            id: D.uid(),
            title: "Study: " + m[2],
            type: "study",
            courseId: "",
            date: D.isoFromDate(D.addDays(new Date(), i)),
            time: "6:00 PM",
            priority: "medium",
            color: "",
            notes: "",
          });
        }
      });
      save();
      renderCalendar();
      renderOverview();
      renderStudy();
    });

    document.getElementById("btn-prep-gen").addEventListener("click", function () {
      var topic = document.getElementById("prep-topic").value.trim() || "Exam";
      var kit = D.examPrepToolkit(topic);
      document.getElementById("prep-out").innerHTML =
        "<h4>Outline</h4><ol>" +
        kit.outline.map(function (x) {
          return "<li>" + escapeHtml(x) + "</li>";
        }).join("") +
        "</ol><h4>Practice</h4><ul>" +
        kit.practice.map(function (x) {
          return "<li>" + escapeHtml(x) + "</li>";
        }).join("") +
        "</ul>";
      kit.flashcards.forEach(function (fc) {
        state.flashcards.push({ id: D.uid(), front: fc.front, back: fc.back, flipped: false });
      });
      save();
      renderStudy();
    });

    document.getElementById("btn-exam-feedback").addEventListener("click", function () {
      var fb = D.examFeedbackSim(document.getElementById("exam-result-paste").value);
      document.getElementById("exam-feedback-out").innerHTML =
        "<p><strong>Strengths:</strong> " +
        escapeHtml(fb.strengths.join("; ")) +
        "</p><p><strong>Weaknesses:</strong> " +
        escapeHtml(fb.weaknesses.join("; ")) +
        "</p><p><strong>Next steps:</strong> " +
        escapeHtml(fb.recommendations.join("; ")) +
        "</p><p class=\"muted\">" +
        escapeHtml(fb.note) +
        "</p>";
    });

    document.getElementById("btn-save-notes").addEventListener("click", function () {
      state.smartNotesText = document.getElementById("smart-notes-area").value;
      save();
    });

    var snf = document.getElementById("smart-notes-file");
    if (snf) {
      snf.addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var ta = document.getElementById("smart-notes-area");
          var chunk = String(reader.result || "").slice(0, 12000);
          ta.value = (ta.value ? ta.value + "\n\n" : "") + "[Imported " + f.name + "]\n" + chunk;
          state.smartNotesText = ta.value;
          save();
        };
        reader.readAsText(f);
      });
    }

    var bsa = document.getElementById("btn-smart-audio-sim");
    if (bsa) {
      bsa.addEventListener("click", function () {
        var ta = document.getElementById("smart-notes-area");
        ta.value =
          (ta.value ? ta.value + "\n\n" : "") +
          "[Simulated voice memo]\nOffline demo transcription — replace with your real lecture notes.";
        state.smartNotesText = ta.value;
        save();
      });
    }

    document.getElementById("form-comm").addEventListener("submit", function (e) {
      e.preventDefault();
      ui.lastCommScenario = document.getElementById("comm-scenario").value;
      ui.commVariant = 0;
      var body = D.emailScenarioBody(ui.lastCommScenario, {
        professor: document.getElementById("comm-recipient").value.trim(),
        course: document.getElementById("comm-course").selectedOptions[0]
          ? document.getElementById("comm-course").selectedOptions[0].textContent
          : "",
        tone: document.getElementById("comm-tone").value,
        context: document.getElementById("comm-ctx").value.trim(),
        studentName: state.profile.displayName,
        major: state.profile.major,
      });
      document.getElementById("comm-draft").value = body;
    });

    document.getElementById("btn-comm-copy").addEventListener("click", function () {
      var t = document.getElementById("comm-draft").value;
      if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function () {});
    });

    document.getElementById("btn-comm-save-tpl").addEventListener("click", function () {
      state.emailDrafts = state.emailDrafts || [];
      state.emailDrafts.push({
        id: D.uid(),
        scenario: ui.lastCommScenario,
        body: document.getElementById("comm-draft").value,
        savedAt: D.isoFromDate(new Date()),
      });
      save();
      renderCommTemplates();
    });

    document.getElementById("btn-comm-regen").addEventListener("click", function () {
      ui.commVariant += 1;
      var scenario = document.getElementById("comm-scenario").value;
      var body = D.emailScenarioBodyVariant(
        scenario,
        {
          professor: document.getElementById("comm-recipient").value.trim(),
          course: document.getElementById("comm-course").selectedOptions[0]
            ? document.getElementById("comm-course").selectedOptions[0].textContent
            : "",
          tone: document.getElementById("comm-tone").value,
          context: document.getElementById("comm-ctx").value.trim(),
          studentName: state.profile.displayName,
          major: state.profile.major,
        },
        ui.commVariant
      );
      document.getElementById("comm-draft").value = body;
    });

    document.getElementById("form-sch").addEventListener("submit", function (e) {
      e.preventDefault();
      state.scholarships.push({
        id: D.uid(),
        name: document.getElementById("sch-name").value.trim(),
        amount: document.getElementById("sch-amt").value.trim(),
        deadline: document.getElementById("sch-deadline").value,
        status: document.getElementById("sch-status").value.trim(),
        notes: document.getElementById("sch-notes").value.trim(),
      });
      save();
      e.target.reset();
      renderFinancial();
    });

    document.getElementById("form-rec").addEventListener("submit", function (e) {
      e.preventDefault();
      state.recLetterRequests.push({
        id: D.uid(),
        professor: document.getElementById("rec-prof").value.trim(),
        status: document.getElementById("rec-status").value.trim(),
        due: document.getElementById("rec-due").value,
        notes: "",
      });
      save();
      e.target.reset();
      renderFinancial();
    });

    document.getElementById("btn-essay-refine").addEventListener("click", function () {
      state.essayBrainstorm = document.getElementById("essay-brain").value;
      state.essayOutline = document.getElementById("essay-outline").value;
      state.essayDraft = document.getElementById("essay-draft").value;
      document.getElementById("essay-draft").value =
        (state.essayDraft || "") +
        "\n\n[Simulated refinement] Tighten thesis, add one concrete example, and shorten introduction.";
      save();
    });

    document.getElementById("form-profile").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = state.profile;
      p.displayName = document.getElementById("pf-name").value.trim();
      p.university = document.getElementById("pf-uni").value.trim();
      p.major = document.getElementById("pf-major").value.trim();
      p.minor = document.getElementById("pf-minor").value.trim();
      p.semesterLabel = document.getElementById("pf-sem").value.trim();
      p.classYear = document.getElementById("pf-year").value.trim();
      p.academicGoal = document.getElementById("pf-goal").value.trim();
      p.advisorName = document.getElementById("pf-adv-name").value.trim();
      p.advisorEmail = document.getElementById("pf-adv-email").value.trim();
      p.theme = document.getElementById("pf-theme").value;
      save();
      applyTheme(p.theme);
      updateTopProfile();
      document.getElementById("profile-saved").hidden = false;
      setTimeout(function () {
        document.getElementById("profile-saved").hidden = true;
      }, 2000);
    });

    function wireSampleToggle(el) {
      if (!el) return;
      el.addEventListener("change", function (e) {
        var want = e.target.checked;
        if (
          !confirm(
            want
              ? "Load fictional sample data?"
              : "Return to blank dashboard? Unsaved local edits in this mode will be replaced."
          )
        ) {
          e.target.checked = !want;
          return;
        }
        applySampleState(want);
      });
    }
    wireSampleToggle(document.getElementById("toggle-sample-data"));
    wireSampleToggle(document.getElementById("toggle-sample-global"));

    document.getElementById("btn-reset-demo").addEventListener("click", function () {
      if (!confirm("Clear all local dashboard data and return to blank mode?")) return;
      state = window.DegreePilotStorage.resetToBlank();
      ui.selectedCourseId = null;
      ui.selectedTaskId = null;
      applyTheme(state.profile.theme);
      renderAll();
    });

    document.getElementById("set-compact-cal").addEventListener("change", function (e) {
      state.settings = state.settings || {};
      state.settings.prefCompactCalendar = e.target.checked;
      save();
    });
    document.getElementById("set-n-assign").addEventListener("change", function (e) {
      state.settings = state.settings || {};
      state.settings.notifyAssignments = e.target.checked;
      save();
    });
    document.getElementById("set-n-grade").addEventListener("change", function (e) {
      state.settings = state.settings || {};
      state.settings.notifyGrades = e.target.checked;
      save();
    });
    document.getElementById("set-n-fin").addEventListener("change", function (e) {
      state.settings = state.settings || {};
      state.settings.notifyFinancial = e.target.checked;
      save();
    });
  }

  function init() {
    applyTheme(state.profile.theme);
    bindNav();
    bindForms();
    switchView("overview");
    renderAll();
  }

  init();
})();
