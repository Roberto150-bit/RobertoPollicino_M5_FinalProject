/**
 * DegreePilot — Overview tab only (render + interactions).
 * Wired from main.js; expects DegreePilotDashboardCore as D.
 */
(function (global) {
  "use strict";

  var weekOffset = 0;
  var monthPreviewCursor = null;

  function getPreviewMode() {
    var r = document.querySelector('input[name="ov-week-mode"]:checked');
    return r && r.value === "month" ? "month" : "week";
  }

  function ensureMonthCursor() {
    if (!monthPreviewCursor) {
      var n = new Date();
      monthPreviewCursor = new Date(n.getFullYear(), n.getMonth(), 1);
    }
  }

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

  function normalizeAiQuestions(state) {
    if (!state.pendingAiQuestions) state.pendingAiQuestions = [];
  }

  function isFeedDismissed(state, id) {
    var d = state.notificationDismissals || [];
    return d.indexOf(id) !== -1;
  }

  function pushFeedDismissal(state, id) {
    state.notificationDismissals = state.notificationDismissals || [];
    if (state.notificationDismissals.indexOf(id) === -1) state.notificationDismissals.push(id);
  }

  function buildNotificationEntries(state, ctx) {
    var feeds = [];
    var ai = [];
    var D = ctx.D;
    var isoToday = D.isoFromDate(new Date());

    normalizeAiQuestions(state);
    state.pendingAiQuestions.forEach(function (q) {
      if (!q.dismissed)
        ai.push({
          id: "nf-" + q.id,
          kind: "ai",
          title: "Clarify for smarter planning",
          detail: q.text,
          action: "updates",
          questionId: q.id,
        });
    });

    state.courses.forEach(function (c) {
      (c.alerts || []).forEach(function (a, idx) {
        if (a.level !== "warn") return;
        var nid = "nf-warn-" + c.id + "-" + idx;
        if (isFeedDismissed(state, nid)) return;
        var syllabusHit = /syllabus/i.test(a.text || "");
        feeds.push({
          id: nid,
          kind: "feed",
          title: syllabusHit ? c.code + " — syllabus update" : c.code + " — reminder",
          detail: a.text,
          action: "courses",
          courseId: c.id,
        });
      });
    });

    var examsSoon = (state.calendarEvents || []).filter(function (e) {
      return e.type === "exam" && e.date >= isoToday;
    }).length;
    if (examsSoon > 0 && !isFeedDismissed(state, "nf-cal-exams"))
      feeds.push({
        id: "nf-cal-exams",
        kind: "feed",
        title: "Upcoming exams on your calendar",
        detail: "You have " + examsSoon + " exam-related block(s) ahead — review prep time.",
        action: "calendar",
      });

    if ((state.flashcards || []).length > 0 && !isFeedDismissed(state, "nf-flashcards"))
      feeds.push({
        id: "nf-flashcards",
        kind: "feed",
        title: "Flashcards ready",
        detail: "Quick review decks are available — a short session boosts retention.",
        action: "study",
      });

    var pendingUpd = (state.updates || []).filter(function (u) {
      return !u.checked;
    }).length;
    if (pendingUpd > 0 && !isFeedDismissed(state, "nf-updates-pending"))
      feeds.push({
        id: "nf-updates-pending",
        kind: "feed",
        title: "Announcement-driven updates",
        detail:
          pendingUpd +
          " pending item(s) from pasted announcements — confirm tasks or calendar suggestions.",
        action: "updates",
      });

    var fafsaLeft = (state.fafsaChecklist || []).filter(function (x) {
      return !x.done;
    }).length;
    if (
      fafsaLeft > 0 &&
      (!state.settings || state.settings.notifyFinancial !== false) &&
      !isFeedDismissed(state, "nf-fafsa-open")
    )
      feeds.push({
        id: "nf-fafsa-open",
        kind: "feed",
        title: "Financial aid checklist",
        detail: "FAFSA steps remain — open Financial Aid to finish before priority deadlines.",
        action: "financial",
      });

    var scholarships = state.scholarships || [];
    var soonSch = null;
    scholarships.forEach(function (s) {
      if (!s.deadline || s.deadline < isoToday) return;
      var t0 = new Date(isoToday + "T12:00:00");
      var t1 = new Date(s.deadline + "T12:00:00");
      var days = Math.round((t1 - t0) / 864e5);
      if (days <= 45 && days >= 0 && (!soonSch || s.deadline < soonSch.deadline)) soonSch = s;
    });
    if (soonSch && !isFeedDismissed(state, "nf-sch-" + soonSch.id))
      feeds.push({
        id: "nf-sch-" + soonSch.id,
        kind: "feed",
        title: "Scholarship deadline approaching",
        detail: soonSch.name + " — due " + soonSch.deadline + ". Review requirements in Financial Aid.",
        action: "financial",
      });

    return feeds.concat(ai).slice(0, 8);
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
      var dismissHtml = "";
      if (n.questionId)
        dismissHtml =
          '<button type="button" class="btn btn-ghost btn-sm ov-notify-dismiss" data-qid="' +
          ctx.escapeHtml(n.questionId) +
          '">Dismiss</button>';
      else if (n.kind === "feed")
        dismissHtml =
          '<button type="button" class="btn btn-ghost btn-sm ov-notify-feed-dismiss" data-feed-id="' +
          ctx.escapeHtml(n.id) +
          '">Dismiss</button>';
      row.innerHTML =
        '<p class="ov-notify-item-title">' +
        ctx.escapeHtml(n.title) +
        '</p><p class="ov-notify-item-detail">' +
        ctx.escapeHtml(n.detail) +
        '</p><div class="ov-notify-item-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm ov-notify-open" data-go="' +
        ctx.escapeHtml(n.action) +
        '"' +
        (n.courseId ? ' data-course-id="' + ctx.escapeHtml(n.courseId) + '"' : "") +
        ">Open</button>" +
        dismissHtml +
        "</div>";
      host.appendChild(row);
    });

    host.querySelectorAll(".ov-notify-open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cid = btn.getAttribute("data-course-id");
        if (cid && ctx.selectCourse) ctx.selectCourse(cid);
        else ctx.switchView(btn.getAttribute("data-go"));
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
      });
    });
    host.querySelectorAll(".ov-notify-feed-dismiss").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var fid = btn.getAttribute("data-feed-id");
        if (fid) pushFeedDismissal(state, fid);
        save();
        renderNotifications(ctx);
      });
    });
  }

  function closeDropdown() {
    var dd = document.getElementById("notify-dropdown");
    var btn = document.getElementById("btn-notifications");
    if (dd) dd.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function eventChipHtml(e, ctx) {
    var cls =
      e.type === "exam"
        ? "is-exam"
        : e.type === "assignment"
          ? "is-assign"
          : e.type === "study"
            ? "is-study"
            : "is-other";
    var title = e.title.length > 18 ? e.title.slice(0, 16) + "…" : e.title;
    return (
      '<button type="button" class="ov-week-chip ' +
      cls +
      '" data-cal-ev-id="' +
      ctx.escapeHtml(e.id) +
      '" title="' +
      ctx.escapeHtml(e.title) +
      '"><span class="ov-week-chip-time">' +
      ctx.escapeHtml(e.time || "") +
      '</span><span class="ov-week-chip-title">' +
      ctx.escapeHtml(title) +
      "</span></button>"
    );
  }

  function renderWeekPreview(ctx) {
    var host = document.getElementById("ov-week-grid");
    if (!host) return;
    host.className = "ov-week-grid";
    var D = ctx.D;
    var events = typeof ctx.filteredCalendarEvents === "function" ? ctx.filteredCalendarEvents() : ctx.state.calendarEvents || [];
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
      html += '<div class="ov-week-col' + (isToday ? " is-today" : "") + '" data-ov-day="' + ctx.escapeHtml(iso) + '">';
      html += '<div class="ov-week-col-head">' + ctx.escapeHtml(label) + "</div>";
      html += '<div class="ov-week-col-events">';
      if (!dayEvs.length) {
        html += '<span class="ov-week-empty">—</span>';
      } else {
        dayEvs.slice(0, 4).forEach(function (e) {
          html += eventChipHtml(e, ctx);
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

  function renderMonthPreview(ctx) {
    var host = document.getElementById("ov-week-grid");
    if (!host) return;
    ensureMonthCursor();
    host.className = "ov-month-grid";
    var D = ctx.D;
    var events = typeof ctx.filteredCalendarEvents === "function" ? ctx.filteredCalendarEvents() : ctx.state.calendarEvents || [];
    var y = monthPreviewCursor.getFullYear();
    var m = monthPreviewCursor.getMonth();
    var isoToday = D.isoFromDate(new Date());

    var first = new Date(y, m, 1);
    var startOffset = (first.getDay() + 6) % 7;
    var prevDays = D.daysInMonth(y, m - 1);
    var curDays = D.daysInMonth(y, m);

    var html = '<div class="ov-month-weekdays">';
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (dow) {
      html += "<span>" + dow + "</span>";
    });
    html += '</div><div class="ov-month-cells">';

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
      var isToday = iso === isoToday;
      var dayEvs = events.filter(function (e) {
        return e.date === iso;
      });
      html +=
        '<div class="ov-month-cell' +
        (muted ? " is-muted" : "") +
        (isToday ? " is-today" : "") +
        '" data-ov-day="' +
        ctx.escapeHtml(iso) +
        '"><div class="ov-month-daynum">' +
        cellDate.getDate() +
        "</div>";
      if (!dayEvs.length) {
        html += '<span class="ov-week-empty">—</span>';
      } else {
        dayEvs.slice(0, 3).forEach(function (e) {
          html += eventChipHtml(e, ctx);
        });
      }
      html += "</div>";
    }
    html += "</div>";
    host.innerHTML = html;

    var lbl = document.getElementById("ov-week-range-label");
    if (lbl) {
      lbl.textContent = first.toLocaleString(undefined, { month: "long", year: "numeric" });
    }
  }

  function updatePreviewTitle() {
    var el = document.getElementById("ov-preview-title");
    if (!el) return;
    el.textContent = getPreviewMode() === "month" ? "Monthly Preview" : "Weekly Preview";
  }

  function renderCalendarPreview(ctx) {
    if (getPreviewMode() === "month") renderMonthPreview(ctx);
    else renderWeekPreview(ctx);
    updatePreviewTitle();
  }

  /**
   * @param {object} ctx - { state, D, courseById, matchesSearch, filteredCalendarEvents, escapeHtml, save, switchView }
   */
  function render(ctx) {
    var state = ctx.state;
    var D = ctx.D;
    var courseById = ctx.courseById;
    var matchesSearch = ctx.matchesSearch;

    normalizeAiQuestions(state);

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

    var gradeRows = state.gradeEntries || [];
    var ovGradePct = gradeRows.length ? D.overallGpaSnapshot(state.courses, gradeRows) : null;
    var gpa4 = ovGradePct != null ? percentToGpa4(ovGradePct) : null;

    var ring = document.getElementById("ov-gpa-ring-fill");
    var cLen = 326.73;
    if (ring) {
      ring.style.strokeDasharray = String(cLen);
      if (gpa4 == null || ovGradePct == null) {
        ring.style.strokeDashoffset = String(cLen);
      } else {
        var pctRing = Math.min(100, (gpa4 / 4) * 100);
        ring.style.strokeDashoffset = String(cLen * (1 - pctRing / 100));
      }
    }

    var gpaNum = document.getElementById("ov-gpa-number");
    if (gpaNum) gpaNum.textContent = gpa4 == null ? "—" : gpa4.toFixed(1);

    var gpaFoot = document.querySelector(".ov-gpa-foot-title");
    if (gpaFoot) gpaFoot.style.display = gpa4 == null ? "none" : "";

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
          var row = document.createElement("button");
          row.type = "button";
          row.className =
            "ov-today-item " + (idx === 0 ? "ov-today-item--blue" : "ov-today-item--green");
          row.setAttribute("data-task-id", t.id);
          row.setAttribute("aria-label", "Open task: " + t.title);
          var timeHint = t.due === D.isoFromDate(new Date()) ? "Due today" : "Due " + t.due;
          var notes = (t.notes || "").trim();
          if (notes.length > 140) notes = notes.slice(0, 137) + "…";
          row.innerHTML =
            '<span class="ov-today-ico" aria-hidden="true"></span><div class="ov-today-text-wrap">' +
            '<p class="ov-today-title">' +
            ctx.escapeHtml(t.title) +
            '</p><p class="ov-today-meta">' +
            ctx.escapeHtml(c ? c.code : "Course") +
            " • " +
            ctx.escapeHtml(timeHint) +
            "</p>" +
            (notes
              ? '<p class="ov-today-desc">' + ctx.escapeHtml(notes) + "</p>"
              : '<p class="ov-today-desc"><span class="muted">Open for full details and notes.</span></p>') +
            "</div>";
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
          taskId: t.id,
          title: t.title,
          date: t.due,
          sub: courseById(t.courseId) ? courseById(t.courseId).code : "",
        });
      });
      ctx.filteredCalendarEvents().forEach(function (e) {
        deadlines.push({
          kind: "event",
          eventId: e.id,
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
          if (d.kind === "task" && d.taskId) row.setAttribute("data-task-id", d.taskId);
          if (d.kind === "event" && d.eventId) row.setAttribute("data-event-id", d.eventId);
          row.innerHTML =
            '<span class="ov-deadline-bar" style="background:' +
            u.bar +
            '"></span><div class="ov-deadline-main"><p class="ov-deadline-title">' +
            ctx.escapeHtml(d.title) +
            '</p><p class="ov-deadline-meta">' +
            ctx.escapeHtml(sub) +
            '</p></div><span class="ov-deadline-chev" aria-hidden="true">›</span>';
          row.addEventListener("click", function () {
            if (d.kind === "task" && d.taskId && ctx.selectTask) ctx.selectTask(d.taskId);
            else ctx.switchView("calendar");
          });
          dl.appendChild(row);
        });
      }
    }

    /* Course alerts — actionable / critical only (info-style reminders live under the bell) */
    var alerts = document.getElementById("ov-alerts");
    if (alerts) {
      alerts.innerHTML = "";
      var items = [];

      state.courses.forEach(function (c) {
        var g = D.courseGradePercent(c.id, state.gradeEntries);
        if (g != null && g < 75)
          items.push({
            kind: "critical",
            courseLabel: c.code,
            body: "Average near " + g + "% — schedule support.",
            courseId: c.id,
            taskId: null,
          });
      });
      tasksOpen.forEach(function (t) {
        if (t.due < D.isoFromDate(new Date()))
          items.push({
            kind: "critical",
            courseLabel: "Tasks",
            body: "Overdue: " + t.title,
            courseId: null,
            taskId: t.id,
          });
      });
      state.courses.forEach(function (c) {
        (c.alerts || []).forEach(function (a) {
          if (a.level === "warn") return;
          items.push({
            kind: "critical",
            courseLabel: c.code,
            body: a.text,
            courseId: c.id,
            taskId: null,
          });
        });
      });

      if (!items.length) {
        alerts.innerHTML = '<div class="ov-empty-soft">No critical course alerts right now.</div>';
      } else {
        items.slice(0, 6).forEach(function (it) {
          var card = document.createElement("button");
          card.type = "button";
          card.className = "ov-alert-card ov-alert-card--critical ov-alert-card--link";
          card.innerHTML =
            '<div class="ov-alert-head"><strong>' +
            ctx.escapeHtml(it.courseLabel) +
            '</strong><span class="ov-alert-badge">CRITICAL</span></div><p>' +
            ctx.escapeHtml(it.body) +
            "</p>";
          card.addEventListener("click", function () {
            if (it.taskId && ctx.selectTask) ctx.selectTask(it.taskId);
            else if (it.courseId && ctx.selectCourse) ctx.selectCourse(it.courseId);
          });
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

    renderCalendarPreview(ctx);
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
      if (getPreviewMode() === "month") {
        ensureMonthCursor();
        monthPreviewCursor.setMonth(monthPreviewCursor.getMonth() - 1);
      } else weekOffset--;
      renderCalendarPreview(ctx);
    });
    on("ov-week-next", "click", function () {
      if (getPreviewMode() === "month") {
        ensureMonthCursor();
        monthPreviewCursor.setMonth(monthPreviewCursor.getMonth() + 1);
      } else weekOffset++;
      renderCalendarPreview(ctx);
    });

    document.querySelectorAll('input[name="ov-week-mode"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (getPreviewMode() === "month") {
          monthPreviewCursor = null;
          ensureMonthCursor();
        }
        renderCalendarPreview(ctx);
      });
    });

    var focusList = document.getElementById("ov-focus-list");
    if (focusList) {
      focusList.addEventListener("click", function (e) {
        var hit = e.target.closest("[data-task-id]");
        if (!hit || !ctx.selectTask) return;
        ctx.selectTask(hit.getAttribute("data-task-id"));
      });
    }

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

    var ovGrid = document.getElementById("ov-week-grid");
    if (ovGrid) {
      ovGrid.addEventListener("click", function (e) {
        var chip = e.target.closest(".ov-week-chip[data-cal-ev-id]");
        if (chip) {
          e.preventDefault();
          var evid = chip.getAttribute("data-cal-ev-id");
          var ev =
            ctx.state.calendarEvents &&
            ctx.state.calendarEvents.find(function (x) {
              return x.id === evid;
            });
          if (!ev && ctx.filteredCalendarEvents) {
            ev = ctx.filteredCalendarEvents().find(function (x) {
              return x.id === evid;
            });
          }
          if (!ev) return;
          var tid =
            ctx.resolveTaskIdForCalendarEvent && ctx.resolveTaskIdForCalendarEvent(ev);
          if (tid && ctx.selectTask) ctx.selectTask(tid);
          else if (ctx.openCalendarDay) ctx.openCalendarDay(ev.date);
          return;
        }
        var weekCol = e.target.closest(".ov-week-col[data-ov-day]");
        if (weekCol && ctx.openCalendarDay) {
          if (e.target.closest(".ov-week-chip")) return;
          ctx.openCalendarDay(weekCol.getAttribute("data-ov-day"));
          return;
        }
        var monthCell = e.target.closest(".ov-month-cell[data-ov-day]");
        if (monthCell && ctx.openCalendarDay) {
          if (e.target.closest(".ov-week-chip")) return;
          ctx.openCalendarDay(monthCell.getAttribute("data-ov-day"));
        }
      });
    }
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
