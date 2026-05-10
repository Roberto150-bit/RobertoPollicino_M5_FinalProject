/**
 * DegreePilot — Overview tab only (render + interactions).
 * Wired from main.js; expects DegreePilotDashboardCore as D.
 */
(function (global) {
  "use strict";

  var weekOffset = 0;

  function priorityRank(p) {
    if (p === "High") return 3;
    if (p === "Low") return 1;
    return 2;
  }

  function daysFromToday(iso) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var t = new Date(iso + "T12:00:00");
    var diff = (t - today) / 864e5;
    return Math.round(diff);
  }

  function urgencyBar(days) {
    if (days <= 2) return { bar: "#d32f2f", label: "urgent" };
    if (days <= 5) return { bar: "#1976d2", label: "soon" };
    return { bar: "#388e3c", label: "later" };
  }

  function percentToGpa4(pct) {
    if (pct == null || !isFinite(pct)) return null;
    var g = (pct / 100) * 4;
    return Math.round(g * 100) / 100;
  }

  function suggestedStudyMinutes(task, ctx) {
    var est = task && task.estMinutes ? parseInt(task.estMinutes, 10) : 60;
    if (!isFinite(est) || est < 30) est = 90;
    return Math.min(180, Math.max(30, est));
  }

  function defaultAiQuestions() {
    return [
      { id: "ai-q1", text: "Which course should we prioritize if two assignments land on the same day?", dismissed: false },
      { id: "ai-q2", text: "Confirm your preferred deadline reminders: morning digest or night-before alerts?", dismissed: false },
      { id: "ai-q3", text: "Do you want exam dates auto-added as study blocks on lighter class days?", dismissed: false },
    ];
  }

  function ensureAiQuestions(state) {
    if (!state.pendingAiQuestions) state.pendingAiQuestions = [];
    if (!state.pendingAiQuestions.length) state.pendingAiQuestions = defaultAiQuestions();
  }

  function buildNotificationEntries(state, ctx) {
    var out = [];
    var D = ctx.D;
    var courseById = ctx.courseById;
    var isoToday = D.isoFromDate(new Date());

    var examsSoon = (state.calendarEvents || []).filter(function (e) {
      return e.type === "exam" && e.date >= isoToday;
    }).length;
    if (examsSoon > 0) {
      out.push({
        id: "nf-cal-exams",
        kind: "calendar",
        title: "Upcoming exams on your calendar",
        detail: "You have " + examsSoon + " exam-related block(s) ahead — review prep time.",
        action: "calendar",
      });
    }

    var overdue = (state.tasks || []).filter(function (t) {
      return !t.completed && t.due < isoToday;
    }).length;
    if (overdue > 0) {
      out.push({
        id: "nf-task-overdue",
        kind: "calendar",
        title: "Overdue tasks need attention",
        detail: overdue + " task(s) are past due — reschedule or complete them.",
        action: "tasks",
      });
    }

    ensureAiQuestions(state);
    state.pendingAiQuestions.forEach(function (q) {
      if (!q.dismissed)
        out.push({
          id: "nf-" + q.id,
          kind: "ai",
          title: "Clarify for smarter planning",
          detail: q.text,
          action: "updates",
          questionId: q.id,
        });
    });

    return out.slice(0, 6);
  }

  function renderNotifications(ctx) {
    var state = ctx.state;
    var save = ctx.save;
    var host = document.getElementById("notify-dropdown-body");
    if (!host) return;

    var entries = buildNotificationEntries(state, ctx);
    state.notificationsUnread = entries.length;
    save();

    var badge = document.getElementById("notification-badge");
    if (badge) {
      badge.hidden = entries.length <= 0;
      badge.textContent = String(Math.min(entries.length, 9));
    }

    host.innerHTML = "";
    if (!entries.length) {
      host.innerHTML = '<p class="ov-notify-empty">You’re all caught up.</p>';
      return;
    }

    entries.forEach(function (n) {
      var row = document.createElement("div");
      row.className = "ov-notify-item";
      row.innerHTML =
        '<p class="ov-notify-item-title">' +
        ctx.escapeHtml(n.title) +
        '</p><p class="ov-notify-item-detail">' +
        ctx.escapeHtml(n.detail) +
        '</p><div class="ov-notify-item-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm ov-notify-open" data-go="' +
        ctx.escapeHtml(n.action) +
        '">Open</button>' +
        (n.questionId
          ? '<button type="button" class="btn btn-ghost btn-sm ov-notify-dismiss" data-qid="' +
            ctx.escapeHtml(n.questionId) +
            '">Dismiss</button>'
          : "") +
        "</div>";
      host.appendChild(row);
    });

    host.querySelectorAll(".ov-notify-open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ctx.switchView(btn.getAttribute("data-go"));
        closeDropdown();
      });
    });
    host.querySelectorAll(".ov-notify-dismiss").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var qid = btn.getAttribute("data-qid");
        state.pendingAiQuestions.forEach(function (q) {
          if (q.id === qid) q.dismissed = true;
        });
        save();
        renderNotifications(ctx);
        updateTopProfileMini(ctx);
      });
    });
  }

  function updateTopProfileMini(ctx) {
    var badge = document.getElementById("notification-badge");
    if (!badge) return;
    var n = ctx.state.notificationsUnread || 0;
    badge.hidden = n <= 0;
    badge.textContent = String(Math.min(n, 9));
  }

  function closeDropdown() {
    var dd = document.getElementById("notify-dropdown");
    var btn = document.getElementById("btn-notifications");
    if (dd) dd.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function renderWeeklyPreview(ctx) {
    var host = document.getElementById("ov-week-grid");
    if (!host) return;
    var D = ctx.D;
    var state = ctx.state;
    var courseById = ctx.courseById;
    var events = typeof ctx.filteredCalendarEvents === "function" ? ctx.filteredCalendarEvents() : state.calendarEvents || [];
    var start = D.startOfWeekMonday(new Date());
    start.setDate(start.getDate() + weekOffset * 7);

    var isoToday = D.isoFromDate(new Date());
    var html = "";
    for (var i = 0; i < 7; i++) {
      var d = D.addDays(start, i);
      var iso = D.isoFromDate(d);
      var label = d.toLocaleDateString(undefined, { weekday: "short" }) + " " + d.getDate();
      var isToday = iso === isoToday;
      var dayEvs = events.filter(function (e) {
        return e.date === iso;
      });
      html += '<div class="ov-week-col' + (isToday ? " is-today" : "") + '">';
      html += '<div class="ov-week-col-head">' + ctx.escapeHtml(label) + "</div>";
      html += '<div class="ov-week-col-events">';
      if (!dayEvs.length) {
        html += '<span class="ov-week-empty">—</span>';
      } else {
        dayEvs.slice(0, 4).forEach(function (e) {
          var cls =
            e.type === "exam"
              ? "is-exam"
              : e.type === "assignment"
                ? "is-assign"
                : e.type === "study"
                  ? "is-study"
                  : "is-other";
          var title = e.title.length > 18 ? e.title.slice(0, 16) + "…" : e.title;
          html +=
            '<div class="ov-week-chip ' +
            cls +
            '" title="' +
            ctx.escapeHtml(e.title) +
            '"><span class="ov-week-chip-time">' +
            ctx.escapeHtml(e.time || "") +
            '</span><span class="ov-week-chip-title">' +
            ctx.escapeHtml(title) +
            "</span></div>";
        });
      }
      html += "</div></div>";
    }
    host.innerHTML = html;

    var lbl = document.getElementById("ov-week-range-label");
    if (lbl) {
      var end = D.addDays(start, 6);
      lbl.textContent =
        start.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " – " +
        end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
  }

  /**
   * @param {object} ctx - { state, D, courseById, matchesSearch, filteredCalendarEvents, escapeHtml, save, switchView }
   */
  function render(ctx) {
    var state = ctx.state;
    var D = ctx.D;
    var courseById = ctx.courseById;
    var matchesSearch = ctx.matchesSearch;

    ensureAiQuestions(state);

    var tasksOpen = state.tasks.filter(function (t) {
      return (
        !t.completed &&
        matchesSearch(t.title + " " + (courseById(t.courseId) ? courseById(t.courseId).code : ""))
      );
    });

    var oc = document.getElementById("ov-open-tasks");
    if (oc) oc.textContent = String(tasksOpen.length);

    var sortedFocus = tasksOpen.slice().sort(function (a, b) {
      var pr = priorityRank(b.priority) - priorityRank(a.priority);
      if (pr !== 0) return pr;
      return a.due.localeCompare(b.due);
    });
    var top3 = sortedFocus.slice(0, 3);
    var fc = document.getElementById("ov-focus-count");
    if (fc) fc.textContent = String(Math.min(top3.length, 2));

    var ovGradePct = D.overallGpaSnapshot(state.courses, state.gradeEntries);
    var gpa4 = percentToGpa4(ovGradePct);

    var ring = document.getElementById("ov-gpa-ring-fill");
    if (ring && ovGradePct != null && gpa4 != null) {
      var pctRing = Math.min(100, (gpa4 / 4) * 100);
      var c = 326.73;
      ring.style.strokeDasharray = String(c);
      ring.style.strokeDashoffset = String(c * (1 - pctRing / 100));
    }

    var gpaNum = document.getElementById("ov-gpa-number");
    if (gpaNum) gpaNum.textContent = gpa4 == null ? "—" : gpa4.toFixed(1);

    var gpaSub = document.getElementById("ov-gpa-subcopy");
    if (gpaSub) {
      if (gpa4 == null) {
        gpaSub.textContent = "Add grades to estimate GPA on a 4.0 scale.";
      } else {
        var prev =
          state.semesterMeta && state.semesterMeta.lastSemesterGpaApprox != null
            ? parseFloat(state.semesterMeta.lastSemesterGpaApprox)
            : null;
        var delta =
          prev != null && isFinite(prev) ? (Math.round((gpa4 - prev) * 10) / 10).toFixed(1) : null;
        if (gpa4 >= 3.5)
          gpaSub.innerHTML =
            "<strong>Dean’s List pace.</strong> " +
            (delta != null
              ? "You’re tracking " + delta + " points higher than last semester. Keep it up!"
              : "You’re tracking strong — keep steady habits.");
        else if (gpa4 >= 3.0) gpaSub.textContent = "Solid standing — push key assignments to climb higher.";
        else gpaSub.textContent = "Focus on the weakest course — small wins compound.";
      }
    }

    var sub = document.getElementById("ov-page-sub");
    if (sub) {
      var sm = state.semesterMeta || { label: "", totalWeeks: 16, currentWeek: 1 };
      var ws = D.startOfWeekMonday(new Date());
      var we = D.addDays(ws, 6);
      sub.textContent =
        (sm.label || "Semester") +
        " • Week " +
        (sm.currentWeek || 1) +
        " • " +
        ws.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " - " +
        we.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    var mom = document.getElementById("ov-momentum-line");
    if (mom) {
      var done = state.tasks.filter(function (t) {
        return t.completed;
      }).length;
      mom.innerHTML =
        "<strong>You’re on track.</strong> " +
        (done ? "Completed tasks update every tab automatically." : "Add tasks to unlock momentum insights.");
    }

    /* Today's focus — styled rows (max 2 visible like mock) */
    var fl = document.getElementById("ov-focus-list");
    if (fl) {
      fl.innerHTML = "";
      var show = top3.slice(0, 2);
      if (!show.length) {
        fl.innerHTML =
          '<div class="ov-empty-soft">No items scheduled — add tasks or enable sample data.</div>';
      } else {
        show.forEach(function (t, idx) {
          var c = courseById(t.courseId);
          var row = document.createElement("div");
          row.className =
            "ov-today-item " + (idx === 0 ? "ov-today-item--blue" : "ov-today-item--green");
          var timeHint = t.due === D.isoFromDate(new Date()) ? "Due today" : "Due " + t.due;
          row.innerHTML =
            '<span class="ov-today-ico" aria-hidden="true"></span><div class="ov-today-text-wrap">' +
            '<p class="ov-today-title">' +
            ctx.escapeHtml(t.title) +
            '</p><p class="ov-today-meta">' +
            ctx.escapeHtml(c ? c.code : "Course") +
            " • " +
            ctx.escapeHtml(timeHint) +
            "</p></div>";
          fl.appendChild(row);
        });
      }
    }

    /* Deadlines — colored bars + chevron */
    var dl = document.getElementById("ov-deadlines");
    if (dl) {
      dl.innerHTML = "";
      var deadlines = [];
      tasksOpen.forEach(function (t) {
        deadlines.push({
          kind: "task",
          title: t.title,
          date: t.due,
          sub: courseById(t.courseId) ? courseById(t.courseId).code : "",
        });
      });
      ctx.filteredCalendarEvents().forEach(function (e) {
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
      deadlines = deadlines.slice(0, 6);
      if (!deadlines.length) {
        dl.innerHTML = '<div class="ov-empty-soft">No upcoming deadlines.</div>';
      } else {
        deadlines.forEach(function (d) {
          var days = daysFromToday(d.date);
          var u = urgencyBar(days);
          var sub =
            (days === 0 ? "Due today" : days > 0 ? "Due in " + days + " days" : Math.abs(days) + " days overdue") +
            " • " +
            d.date;
          var row = document.createElement("button");
          row.type = "button";
          row.className = "ov-deadline-row";
          row.innerHTML =
            '<span class="ov-deadline-bar" style="background:' +
            u.bar +
            '"></span><div class="ov-deadline-main"><p class="ov-deadline-title">' +
            ctx.escapeHtml(d.title) +
            '</p><p class="ov-deadline-meta">' +
            ctx.escapeHtml(sub) +
            '</p></div><span class="ov-deadline-chev" aria-hidden="true">›</span>';
          row.addEventListener("click", function () {
            ctx.switchView("tasks");
          });
          dl.appendChild(row);
        });
      }
    }

    /* Course alerts — badge cards */
    var alerts = document.getElementById("ov-alerts");
    if (alerts) {
      alerts.innerHTML = "";
      var items = [];

      state.courses.forEach(function (c) {
        var g = D.courseGradePercent(c.id, state.gradeEntries);
        if (g != null && g < 75)
          items.push({
            kind: "critical",
            course: c.code,
            body: "Average near " + g + "% — consider office hours or tutoring.",
          });
      });
      tasksOpen.forEach(function (t) {
        if (t.due < D.isoFromDate(new Date()))
          items.push({
            kind: "critical",
            course: "Tasks",
            body: "Overdue: " + t.title,
          });
      });
      state.courses.forEach(function (c) {
        (c.alerts || []).forEach(function (a) {
          items.push({
            kind: a.level === "warn" ? "info" : "critical",
            course: c.code,
            body: a.text,
          });
        });
      });

      if (!items.length) {
        alerts.innerHTML = '<div class="ov-empty-soft">No course alerts right now.</div>';
      } else {
        items.slice(0, 4).forEach(function (it) {
          var card = document.createElement("div");
          card.className =
            "ov-alert-card " + (it.kind === "critical" ? "ov-alert-card--critical" : "ov-alert-card--info");
          card.innerHTML =
            '<div class="ov-alert-head"><strong>' +
            ctx.escapeHtml(it.course) +
            '</strong><span class="ov-alert-badge">' +
            (it.kind === "critical" ? "CRITICAL" : "INFO") +
            "</span></div><p>" +
            ctx.escapeHtml(it.body) +
            "</p>";
          alerts.appendChild(card);
        });
      }
    }

    /* AI hero */
    var sug = sortedFocus[0];
    var mins = sug ? suggestedStudyMinutes(sug, ctx) : 90;
    var head = document.getElementById("ov-ai-headline");
    var body = document.getElementById("ov-ai-body");
    var sm = document.getElementById("ov-suggested-mins");
    var meter = document.getElementById("ov-ai-metric-fill");
    if (head)
      head.textContent = sug
        ? "Focus on «" + sug.title + "»"
        : "Add your next assignment to get a tailored focus block.";
    if (body)
      body.textContent = sug
        ? "Based on priority and due date, dedicate about " +
          mins +
          " minutes today. Break into two focused blocks with a short reset."
        : "Paste a syllabus or add tasks — we’ll recommend study blocks that match your calendar.";
    if (sm) sm.textContent = String(mins);
    if (meter) meter.style.width = Math.min(100, Math.round((mins / 120) * 100)) + "%";

    var sr = document.getElementById("ov-study-rec");
    if (sr)
      sr.textContent = D.studyRecommendationHint(D.isoFromDate(new Date()), state.courses, state.tasks, state.gradeEntries);

    renderWeeklyPreview(ctx);
    renderNotifications(ctx);
  }

  function bind(ctx) {
    function on(id, ev, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener(ev, fn);
    }

    on("btn-ov-add-task", "click", function () {
      ctx.switchView("tasks");
      setTimeout(function () {
        var el = document.getElementById("task-title");
        if (el) el.focus();
      }, 100);
    });

    on("btn-ov-study-session", "click", function () {
      ctx.switchView("study");
    });

    on("btn-ov-ai-details", "click", function () {
      ctx.switchView("tasks");
    });

    on("btn-ov-start-focus", "click", function () {
      ctx.switchView("tasks");
    });

    on("ov-week-prev", "click", function () {
      weekOffset--;
      renderWeeklyPreview(ctx);
    });
    on("ov-week-next", "click", function () {
      weekOffset++;
      renderWeeklyPreview(ctx);
    });

    document.querySelectorAll('input[name="ov-week-mode"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        renderWeeklyPreview(ctx);
      });
    });

    var btnNotify = document.getElementById("btn-notifications");
    var dd = document.getElementById("notify-dropdown");
    if (btnNotify && dd) {
      btnNotify.addEventListener("click", function (e) {
        e.stopPropagation();
        dd.hidden = !dd.hidden;
        btnNotify.setAttribute("aria-expanded", dd.hidden ? "false" : "true");
        if (!dd.hidden) renderNotifications(ctx);
      });
      document.addEventListener("click", function (e) {
        if (!dd.hidden && !dd.contains(e.target) && e.target !== btnNotify && !btnNotify.contains(e.target)) {
          dd.hidden = true;
          btnNotify.setAttribute("aria-expanded", "false");
        }
      });
    }

    on("ov-btn-cal-header", "click", function () {
      ctx.switchView("calendar");
    });

    on("ov-deadlines-all", "click", function () {
      ctx.switchView("tasks");
    });
  }

  global.DegreePilotOverview = {
    render: render,
    bind: bind,
    /** refresh notification panel only */
    refreshNotifications: function (ctx) {
      renderNotifications(ctx);
    },
  };
})(window);
