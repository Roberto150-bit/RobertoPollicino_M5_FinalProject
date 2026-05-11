/**
 * DegreePilot — dedicated Updates workspace (updates.html)
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();
  var ui = {
    filterText: "",
    showDismissed: false,
    shotFile: null,
    audioFile: null,
  };

  var CAT_COLORS = {
    announcement: { hex: "#9333ea", bg: "rgba(124, 58, 237, 0.12)", stroke: "#7c3aed" },
    assignment: { hex: "#2563eb", bg: "rgba(37, 99, 235, 0.1)", stroke: "#2563eb" },
    exam: { hex: "#ea580c", bg: "rgba(234, 88, 12, 0.12)", stroke: "#ea580c" },
    lecture: { hex: "#16a34a", bg: "rgba(22, 163, 74, 0.12)", stroke: "#15803d" },
  };

  function save() {
    Save.saveState(state);
  }

  function esc(s) {
    return D.escapeHtml(s == null ? "" : String(s));
  }

  function courseById(id) {
    return (state.courses || []).find(function (c) {
      return c.id === id;
    });
  }

  function normalizePendingList() {
    if (!Array.isArray(state.updates)) state.updates = [];
    state.updates.forEach(function (p) {
      if (!p.id) p.id = D.uid();
      if (p.dismissed == null) p.dismissed = false;
      if (p.checked == null) p.checked = true;
    });
  }

  function classifyPending(p) {
    var k = p.kind;
    if (k === "study") return { key: "lecture", label: "Lecture Note", cat: "lecture" };
    if (k === "task") return { key: "assignment", label: "Assignment", cat: "assignment" };
    if (k === "event") {
      var ty = (p.payload && p.payload.type) || "";
      if (String(ty).toLowerCase() === "exam") return { key: "exam", label: "Exam", cat: "exam" };
      return { key: "announcement", label: "Announcement", cat: "announcement" };
    }
    if (k === "course_alert" || k === "syllabus_policy") return { key: "announcement", label: "Announcement", cat: "announcement" };
    return { key: "announcement", label: "Update", cat: "announcement" };
  }

  function destChip(p) {
    var k = p.kind;
    if (k === "task") return { cls: "tasks", label: "Tasks" };
    if (k === "event") return { cls: "cal", label: "Calendar" };
    if (k === "study") return { cls: "study", label: "Study Center" };
    return { cls: "course", label: "Courses" };
  }

  function metaLine(p) {
    if (p.metaLine) return esc(p.metaLine);
    var cid = p.payload && p.payload.courseId;
    var c = cid ? courseById(cid) : null;
    if (!c) return esc("General · pick course context when analyzing");
    var prof = c.professor || "Instructor";
    return esc(prof) + " · " + esc(c.name) + " (" + esc(c.code) + ")";
  }

  function catIconSvg(cat) {
    if (cat === "assignment")
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>';
    if (cat === "exam")
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';
    if (cat === "lecture")
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';
  }

  function matchesFilter(p) {
    var q = ui.filterText.trim().toLowerCase();
    if (!q) return true;
    var blob = [p.title, p.detail, p.kind, classifyPending(p).label].join(" ").toLowerCase();
    return blob.indexOf(q) >= 0;
  }

  function visibleActive() {
    return state.updates.filter(function (p) {
      return !p.dismissed && matchesFilter(p);
    });
  }

  function visibleDismissed() {
    return state.updates.filter(function (p) {
      return p.dismissed && matchesFilter(p);
    });
  }

  function countsByCategory(items) {
    var o = { announcement: 0, assignment: 0, exam: 0, lecture: 0 };
    items.forEach(function (p) {
      var c = classifyPending(p).cat;
      if (o[c] != null) o[c]++;
    });
    return o;
  }

  function buildDonutGradient(counts) {
    var order = [
      { k: "announcement", color: CAT_COLORS.announcement.hex },
      { k: "assignment", color: CAT_COLORS.assignment.hex },
      { k: "exam", color: CAT_COLORS.exam.hex },
      { k: "lecture", color: CAT_COLORS.lecture.hex },
    ];
    var total = order.reduce(function (s, x) {
      return s + (counts[x.k] || 0);
    }, 0);
    if (!total) return "#e5e7eb";
    var acc = 0;
    var parts = [];
    order.forEach(function (x) {
      var n = counts[x.k] || 0;
      if (!n) return;
      var pct = (n / total) * 100;
      parts.push(x.color + " " + acc + "% " + (acc + pct) + "%");
      acc += pct;
    });
    return "conic-gradient(" + parts.join(", ") + ")";
  }

  function impactFromSelection() {
    var cal = 0,
      tk = 0,
      st = 0;
    visibleActive().forEach(function (p) {
      if (!p.checked) return;
      if (p.kind === "event") cal++;
      else if (p.kind === "task") tk++;
      else if (p.kind === "study") st++;
    });
    return { cal: cal, task: tk, study: st };
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("updates-sidebar-sem-pct");
    var fill = document.getElementById("updates-sidebar-progress-fill");
    var wk = document.getElementById("updates-sidebar-week-label");
    var tw = meta.totalWeeks || 16;
    var cw = meta.currentWeek || 1;
    var p = Math.min(100, Math.round((cw / tw) * 100));
    if (pct) pct.textContent = p + "%";
    if (fill) fill.style.width = p + "%";
    if (wk)
      wk.textContent =
        "Week " + cw + " of " + tw + " · " + (state.profile && state.profile.semesterLabel ? state.profile.semesterLabel : "");
  }

  function populateCourseSelect() {
    var sel = document.getElementById("upd-course");
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">General</option>';
    (state.courses || []).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = (c.code || "") + " — " + (c.name || "");
      sel.appendChild(opt);
    });
    var hasCur = false;
    for (var oi = 0; oi < sel.options.length; oi++) {
      if (sel.options[oi].value === cur) {
        hasCur = true;
        break;
      }
    }
    sel.value = hasCur ? cur : "";
  }

  function renderChangeList() {
    var host = document.getElementById("pending-changes-host");
    var dismissedHost = document.getElementById("upd-dismissed-host");
    if (!host) return;

    var active = visibleActive();
    var dismissed = visibleDismissed();

    document.getElementById("upd-new-count").textContent = active.length + " New Changes";

    if (!active.length) {
      host.innerHTML =
        '<div class="dp-empty upd-empty muted">No pending detected changes. Paste an announcement, upload a file, or <button type="button" class="btn btn-ghost btn-sm" id="upd-load-demo">load sample preview rows</button>.</div>';
      var demoBtn = document.getElementById("upd-load-demo");
      if (demoBtn)
        demoBtn.addEventListener("click", function () {
          seedDemoRows();
          renderAll();
        });
    } else {
      host.innerHTML = active.map(renderRowHtml).join("");
      bindRowHandlers(host);
    }

    var dismissLabel = document.getElementById("upd-dismissed-label");
    if (dismissLabel) dismissLabel.textContent = "View Dismissed (" + dismissed.length + ")";

    if (dismissedHost) {
      if (!ui.showDismissed || !dismissed.length) {
        dismissedHost.innerHTML = "";
        dismissedHost.hidden = true;
      } else {
        dismissedHost.hidden = false;
        dismissedHost.innerHTML = dismissed.map(renderRowHtml).join("");
        bindRowHandlers(dismissedHost);
      }
    }

    syncSelectAll();
    renderDonutLegend(active);
    renderImpact();
  }

  function renderRowHtml(p) {
    var cl = classifyPending(p);
    var colors = CAT_COLORS[cl.cat] || CAT_COLORS.announcement;
    var chip = destChip(p);
    return (
      '<div class="upd-change-row" data-pend-id="' +
      esc(p.id) +
      '">' +
      '<label class="upd-row-actions" style="justify-self:start;"><input type="checkbox" class="upd-row-check" data-pend-check="' +
      esc(p.id) +
      '"' +
      (p.checked ? " checked" : "") +
      (!p.dismissed ? "" : " disabled") +
      "/></label>" +
      '<div class="upd-cat-cell">' +
      '<span class="upd-cat-icon" style="background:' +
      colors.bg +
      ";color:" +
      colors.stroke +
      '">' +
      catIconSvg(cl.cat) +
      "</span>" +
      '<span class="upd-cat-pill" style="background:' +
      colors.bg +
      ";color:" +
      colors.stroke +
      '">' +
      esc(cl.label) +
      "</span>" +
      "</div>" +
      '<div class="upd-row-main">' +
      "<strong>" +
      esc(p.title) +
      "</strong>" +
      '<p class="upd-row-meta muted">' +
      metaLine(p) +
      "</p>" +
      '<p class="upd-row-detail">' +
      esc(p.detail) +
      "</p>" +
      "</div>" +
      '<div class="upd-row-actions" style="justify-content:flex-end;flex-wrap:wrap;">' +
      '<span class="upd-dest-btn ' +
      chip.cls +
      '">' +
      esc(chip.label) +
      " ▾</span>" +
      (!p.dismissed
        ? '<button type="button" class="upd-row-dismiss" data-pend-dismiss="' + esc(p.id) + '">Dismiss</button>'
        : "") +
      "</div>" +
      "</div>"
    );
  }

  function bindRowHandlers(host) {
    host.querySelectorAll("[data-pend-check]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-pend-check");
        var p = state.updates.find(function (x) {
          return x.id === id;
        });
        if (p && !p.dismissed) {
          p.checked = cb.checked;
          save();
          renderDonutLegend(visibleActive());
          renderImpact();
          syncSelectAll();
        }
      });
    });
    host.querySelectorAll("[data-pend-dismiss]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-pend-dismiss");
        var p = state.updates.find(function (x) {
          return x.id === id;
        });
        if (p) {
          p.dismissed = true;
          p.checked = false;
          save();
          renderAll();
        }
      });
    });
  }

  function syncSelectAll() {
    var master = document.getElementById("upd-select-all");
    if (!master) return;
    var vis = visibleActive();
    if (!vis.length) {
      master.checked = false;
      master.indeterminate = false;
      return;
    }
    var allOn = vis.every(function (p) {
      return p.checked;
    });
    var someOn = vis.some(function (p) {
      return p.checked;
    });
    master.checked = allOn;
    master.indeterminate = !allOn && someOn;
  }

  function renderDonutLegend(activeItems) {
    var counts = countsByCategory(activeItems);
    var total = activeItems.length;
    var donut = document.getElementById("upd-donut");
    var totalEl = document.getElementById("upd-donut-total");
    var leg = document.getElementById("upd-donut-legend");
    if (donut) donut.style.background = buildDonutGradient(counts);
    if (totalEl) totalEl.textContent = String(total);

    if (leg) {
      var rows = [
        { k: "announcement", label: "Announcement", n: counts.announcement },
        { k: "assignment", label: "Assignment", n: counts.assignment },
        { k: "exam", label: "Exam", n: counts.exam },
        { k: "lecture", label: "Lecture Note", n: counts.lecture },
      ].filter(function (r) {
        return r.n > 0;
      });
      leg.innerHTML = rows
        .map(function (r) {
          return (
            "<li><span class=\"upd-dot\" style=\"background:" +
            CAT_COLORS[r.k].hex +
            '\"></span>' +
            esc(r.n) +
            " " +
            esc(r.label) +
            "</li>"
          );
        })
        .join("");
      if (!rows.length) leg.innerHTML = '<li class="muted">No items yet</li>';
    }
  }

  function renderImpact() {
    var im = impactFromSelection();
    var elc = document.getElementById("upd-impact-cal");
    var elt = document.getElementById("upd-impact-task");
    var els = document.getElementById("upd-impact-study");
    if (elc) elc.textContent = String(im.cal);
    if (elt) elt.textContent = String(im.task);
    if (els) els.textContent = String(im.study);
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

  function readDestinations() {
    var out = { tasks: false, calendar: false, courses: false, study: false };
    document.querySelectorAll(".upd-dest-check").forEach(function (cb) {
      var k = cb.getAttribute("data-dest");
      if (k && Object.prototype.hasOwnProperty.call(out, k)) out[k] = cb.checked;
    });
    return out;
  }

  function shouldApplyWithDest(p, dest) {
    if (p.kind === "task") return dest.tasks;
    if (p.kind === "event") return dest.calendar;
    if (p.kind === "study") return dest.study;
    if (p.kind === "course_alert" || p.kind === "syllabus_policy") return dest.courses;
    return false;
  }

  function seedDemoRows() {
    normalizePendingList();
    [
      {
        kind: "event",
        title: "Midterm Exam Date Moved",
        detail: "Changed from May 6 to May 7 at 9:00 AM",
        metaLine: "Prof. Johnson • Data Structures (CS 210)",
        checked: true,
        dismissed: false,
        payload: {
          title: "Midterm Exam",
          courseId: "",
          date: D.isoFromDate(D.addDays(new Date(), 14)),
          time: "9:00 AM",
          type: "exam",
          priority: "high",
        },
      },
      {
        kind: "task",
        title: "New Assignment: Binary Trees Problem Set",
        detail: "Due May 2 at 11:59 PM • 100 pts",
        metaLine: "Prof. Lee • Algorithms (CS 330)",
        checked: true,
        dismissed: false,
        payload: {
          title: "Binary Trees Problem Set",
          courseId: "",
          due: D.isoFromDate(D.addDays(new Date(), 10)),
          type: "assignment",
          priority: "Medium",
          estMinutes: 120,
          notes: "From sample intake.",
        },
      },
      {
        kind: "event",
        title: "Database Systems Final Exam Scheduled",
        detail: "May 14 at 2:00 PM – 4:00 PM",
        metaLine: "Prof. Martinez • Database Systems (CS 340)",
        checked: true,
        dismissed: false,
        payload: {
          title: "Final Exam — Database Systems",
          courseId: "",
          date: D.isoFromDate(D.addDays(new Date(), 40)),
          time: "2:00 PM",
          type: "exam",
          priority: "high",
        },
      },
      {
        kind: "study",
        title: "Lecture 18 Added: Graph Algorithms",
        detail: "Key concepts and examples extracted",
        metaLine: "Prof. Johnson • Algorithms (CS 330)",
        checked: true,
        dismissed: false,
        payload: {
          title: "Lecture 18 — Graph Algorithms",
          courseId: "",
          notes: "Key concepts and examples extracted (sample).",
        },
      },
    ].forEach(function (row) {
      row.id = D.uid();
      state.updates.push(row);
    });
    save();
  }

  function wireDropZones() {
    var shotBtn = document.getElementById("btn-analyze-shot");
    var audioBtn = document.getElementById("btn-analyze-audio");
    var zoneShot = document.getElementById("upd-drop-shot");
    var zoneAudio = document.getElementById("upd-drop-audio");
    var inpShot = document.getElementById("upd-shot-file");
    var inpAudio = document.getElementById("upd-audio-file");

    if (zoneShot && inpShot) {
      ["dragenter", "dragover"].forEach(function (ev) {
        zoneShot.addEventListener(ev, function (e) {
          e.preventDefault();
          zoneShot.classList.add("drag-over");
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        zoneShot.addEventListener(ev, function (e) {
          e.preventDefault();
          zoneShot.classList.remove("drag-over");
        });
      });
      zoneShot.addEventListener("drop", function (e) {
        var f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) {
          alert("Please choose a file under 10MB.");
          return;
        }
        ui.shotFile = f;
        var nn = document.getElementById("upd-shot-name");
        if (nn) nn.textContent = f.name;
        if (shotBtn) shotBtn.disabled = false;
      });
      inpShot.addEventListener("change", function () {
        var f = inpShot.files && inpShot.files[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) {
          alert("Please choose a file under 10MB.");
          inpShot.value = "";
          return;
        }
        ui.shotFile = f;
        var nn = document.getElementById("upd-shot-name");
        if (nn) nn.textContent = f.name;
        if (shotBtn) shotBtn.disabled = false;
      });
    }

    if (zoneAudio && inpAudio) {
      ["dragenter", "dragover"].forEach(function (ev) {
        zoneAudio.addEventListener(ev, function (e) {
          e.preventDefault();
          zoneAudio.classList.add("drag-over");
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        zoneAudio.addEventListener(ev, function (e) {
          e.preventDefault();
          zoneAudio.classList.remove("drag-over");
        });
      });
      zoneAudio.addEventListener("drop", function (e) {
        var f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f) return;
        if (f.size > 100 * 1024 * 1024) {
          alert("Please choose a file under 100MB.");
          return;
        }
        ui.audioFile = f;
        var nn = document.getElementById("upd-audio-name");
        if (nn) nn.textContent = f.name;
        if (audioBtn) audioBtn.disabled = false;
      });
      inpAudio.addEventListener("change", function () {
        var f = inpAudio.files && inpAudio.files[0];
        if (!f) return;
        if (f.size > 100 * 1024 * 1024) {
          alert("Please choose a file under 100MB.");
          inpAudio.value = "";
          return;
        }
        ui.audioFile = f;
        var nn = document.getElementById("upd-audio-name");
        if (nn) nn.textContent = f.name;
        if (audioBtn) audioBtn.disabled = false;
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
      av.textContent = (p.displayName || "S")
        .split(/\s+/)
        .map(function (x) {
          return x[0];
        })
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    var badge = document.getElementById("notification-badge");
    if (badge) {
      var n = typeof state.notificationsUnread === "number" ? state.notificationsUnread : 0;
      badge.hidden = n <= 0;
      badge.textContent = String(Math.min(Math.max(n, 0), 9));
    }
  }

  function renderAll() {
    normalizePendingList();
    populateCourseSelect();
    renderSidebarSemester();
    renderChangeList();
    syncTopBar();
  }

  function bind() {
    var ta = document.getElementById("upd-announce-body");
    var cc = document.getElementById("upd-char-count");
    if (ta && cc) {
      function syncCount() {
        cc.textContent = ta.value.length + "/5000";
      }
      ta.addEventListener("input", syncCount);
      syncCount();
    }

    document.getElementById("upd-btn-refresh").addEventListener("click", function () {
      renderAll();
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
      if (sumList) {
        sumList.innerHTML = "";
        (full.summaryLines || []).forEach(function (line) {
          var li = document.createElement("li");
          li.textContent = line;
          sumList.appendChild(li);
        });
      }
      if (sumBox) sumBox.hidden = !(full.summaryLines && full.summaryLines.length);
      save();
      renderAll();
    });

    document.getElementById("btn-analyze-shot").addEventListener("click", function () {
      var inp = document.getElementById("upd-shot-file");
      var f = (inp && inp.files && inp.files[0]) || ui.shotFile;
      if (!f) {
        alert("Choose an image or PDF first (or drop a file on the zone).");
        return;
      }
      D.screenshotSimulation().forEach(function (x) {
        state.updates.push(x);
      });
      save();
      renderAll();
    });

    document.getElementById("btn-analyze-audio").addEventListener("click", function () {
      var inpA = document.getElementById("upd-audio-file");
      var fa = (inpA && inpA.files && inpA.files[0]) || ui.audioFile;
      if (!fa) {
        alert("Choose an audio file first (or drop it on the zone).");
        return;
      }
      var res = D.audioSimulation();
      var out = document.getElementById("upd-audio-out");
      if (out) {
        out.hidden = false;
        out.innerHTML =
          "<h4>Summary</h4><p>" +
          esc(res.summary) +
          '</p><h4>Topics</h4><ul>' +
          res.topics.map(function (t) {
            return "<li>" + esc(t) + "</li>";
          }).join("") +
          '</ul><h4>Questions</h4><ul>' +
          res.questions.map(function (t) {
            return "<li>" + esc(t) + "</li>";
          }).join("") +
          "</ul>";
      }
      res.studyItems.forEach(function (si) {
        state.updates.push({
          id: D.uid(),
          kind: "study",
          title: si.title,
          detail: "From audio simulation",
          checked: true,
          dismissed: false,
          payload: { title: si.title, courseId: "", notes: si.notes },
        });
      });
      save();
      renderAll();
    });

    document.getElementById("btn-save-updates").addEventListener("click", function () {
      var dest = readDestinations();
      var next = [];
      state.updates.forEach(function (p) {
        if (p.dismissed) {
          next.push(p);
          return;
        }
        if (!p.checked) {
          next.push(p);
          return;
        }
        if (!shouldApplyWithDest(p, dest)) {
          next.push(p);
          return;
        }
        applyPendingPayload(p);
      });
      state.updates = next;
      save();
      var msg = document.getElementById("upd-save-msg");
      if (msg) {
        msg.hidden = false;
        msg.textContent =
          "Approved updates merged into Tasks, Calendar, Study Center, and Courses where applicable.";
        setTimeout(function () {
          msg.hidden = true;
        }, 4500);
      }
      renderAll();
    });

    document.getElementById("btn-review-before").addEventListener("click", function () {
      document.getElementById("upd-change-detection").scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("upd-change-detection").style.boxShadow = "0 0 0 3px rgba(37,99,235,0.25)";
      setTimeout(function () {
        document.getElementById("upd-change-detection").style.boxShadow = "";
      }, 1400);
    });

    document.getElementById("upd-select-all").addEventListener("change", function (e) {
      var on = e.target.checked;
      visibleActive().forEach(function (p) {
        p.checked = on;
      });
      save();
      renderAll();
    });

    document.getElementById("upd-toggle-dismissed").addEventListener("click", function () {
      ui.showDismissed = !ui.showDismissed;
      document.getElementById("upd-toggle-dismissed").setAttribute("aria-expanded", ui.showDismissed ? "true" : "false");
      renderChangeList();
    });

    document.querySelectorAll(".upd-dest-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        document.querySelectorAll(".upd-dest-card").forEach(function (card) {
          var inp = card.querySelector(".upd-dest-check");
          card.classList.toggle("is-selected", inp && inp.checked);
        });
      });
    });

    var searchInp = document.getElementById("global-search");
    if (searchInp) {
      searchInp.addEventListener("input", function () {
        ui.filterText = searchInp.value;
        renderChangeList();
      });
    }

    var btnN = document.getElementById("btn-notifications");
    var dd = document.getElementById("notify-dropdown");
    var ddBody = document.getElementById("notify-dropdown-body");
    if (btnN && dd) {
      btnN.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = dd.hidden;
        dd.hidden = !open;
        btnN.setAttribute("aria-expanded", open ? "true" : "false");
        if (ddBody && open) {
          ddBody.innerHTML =
            '<p class="muted" style="padding:0.65rem;font-size:0.85rem;margin:0;">You are on the Updates page. Adjust notification counts from the <a href="dashboard.html#overview">dashboard</a> notifications panel.</p>';
        }
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
              : "Return to blank dashboard? Local edits in sample mode will be replaced."
          )
        ) {
          e.target.checked = !want;
          return;
        }
        state = want ? Seed.buildSampleState() : Save.resetToBlank();
        Save.saveState(state);
        samp.checked = !!state.sampleDataMode;
        normalizePendingList();
        renderAll();
      });
    }

    wireDropZones();
  }

  normalizePendingList();
  bind();
  renderAll();

  document.querySelectorAll(".upd-dest-card").forEach(function (card) {
    var inp = card.querySelector(".upd-dest-check");
    card.classList.toggle("is-selected", inp && inp.checked);
  });
})();
