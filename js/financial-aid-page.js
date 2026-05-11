/**
 * DegreePilot — Financial Aid workspace (financial-aid.html)
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();

  var MATCH_META = [
    "Computer Science • Sophomore+ • Diversity in Tech",
    "STEM Majors • Financial Need",
    "Computer Science • Community Impact",
  ];

  var MATCH_ICONS = ["G", "◎", "◇"];
  var TRACK_ICOS = ["🧪", "🧬", "📚", "📄"];

  function save() {
    Save.saveState(state);
  }

  function esc(s) {
    return D.escapeHtml(s == null ? "" : String(s));
  }

  function parseLocalDate(iso) {
    if (!iso) return null;
    var p = iso.split("-");
    if (p.length !== 3) return null;
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function formatLongDate(iso) {
    var d = parseLocalDate(iso);
    if (!d || isNaN(d.getTime())) return iso || "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function daysUntil(iso) {
    var d = parseLocalDate(iso);
    if (!d) return null;
    var t = new Date();
    var today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((d - today) / 86400000);
  }

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("fa-sidebar-sem-pct");
    var fill = document.getElementById("fa-sidebar-progress-fill");
    var wk = document.getElementById("fa-sidebar-week-label");
    var tw = meta.totalWeeks || 16;
    var cw = meta.currentWeek || 1;
    var p = Math.min(100, Math.round((cw / tw) * 100));
    if (pct) pct.textContent = p + "%";
    if (fill) fill.style.width = p + "%";
    if (wk)
      wk.textContent =
        "Week " +
        cw +
        " of " +
        tw +
        " · " +
        (state.profile && state.profile.semesterLabel ? state.profile.semesterLabel : "");
  }

  function syncProfile() {
    var p = state.profile || {};
    var dn = document.getElementById("profile-display-name");
    var av = document.getElementById("profile-avatar");
    if (dn) dn.textContent = p.displayName || "Student";
    if (av)
      av.textContent = (p.displayName || "S")
        .split(/\s+/)
        .map(function (x) {
          return x[0];
        })
        .join("")
        .slice(0, 2)
        .toUpperCase();
  }

  function scholarshipProgress(status) {
    var st = (status || "").toLowerCase();
    if (/submitted/.test(st)) return 100;
    if (/applied|in progress/.test(st)) return 60;
    if (/saved|planning/.test(st)) return 25;
    if (/not started/.test(st)) return 0;
    return 35;
  }

  function statusClass(status) {
    var st = (status || "").toLowerCase();
    if (/submitted|received/.test(st)) return "fa-st--done";
    if (/in progress|applied/.test(st)) return "fa-st--progress";
    if (/not started|requested/.test(st)) return "fa-st--not";
    if (/saved/.test(st)) return "fa-st--saved";
    return "fa-st--not";
  }

  function statusLabelForTracker(status) {
    return status || "Saved";
  }

  function richTopMatches() {
    var sug = D.scholarshipSuggestions(state.profile && state.profile.major);
    var today = new Date();
    var offsets = [7, 22, 38];
    var colors = ["#2563eb", "#16a34a", "#9333ea"];
    return sug.slice(0, 3).map(function (s, i) {
      return {
        name: s.name,
        amount: s.amount,
        meta: MATCH_META[i] || s.note,
        match: i < 2 ? "high" : "medium",
        deadline: D.isoFromDate(D.addDays(today, offsets[i] || 14)),
        icon: MATCH_ICONS[i] || String(s.name).charAt(0),
        color: colors[i % colors.length],
      };
    });
  }

  function estimatedAidDisplay() {
    if (state.sampleDataMode) {
      return { value: "$32,450", trend: "↑ $2,300 from last month", showTrend: true };
    }
    var sc = (state.scholarships || []).length;
    if (!sc) return { value: "—", trend: "", showTrend: false };
    return { value: "—", trend: "Track scholarships below", showTrend: false };
  }

  function opportunitiesCount() {
    var n = D.scholarshipSuggestions(state.profile && state.profile.major).length;
    if (state.sampleDataMode) return Math.max(12, n * 3);
    return n;
  }

  function applicationsKpi() {
    return (state.scholarships || []).length;
  }

  function deadlines30() {
    var limit = D.isoFromDate(D.addDays(new Date(), 30));
    return (state.scholarships || []).filter(function (s) {
      return s.deadline && s.deadline <= limit && s.deadline >= D.isoFromDate(new Date());
    }).length;
  }

  function renderKpis() {
    var aid = estimatedAidDisplay();
    document.getElementById("fa-kpi-aid").textContent = aid.value;
    var tr = document.getElementById("fa-kpi-aid-trend");
    if (tr) {
      tr.textContent = aid.showTrend ? aid.trend : "";
      tr.style.display = aid.showTrend ? "block" : "none";
    }
    document.getElementById("fa-kpi-opp").textContent = String(opportunitiesCount());
    document.getElementById("fa-kpi-apps").textContent = String(applicationsKpi());
    document.getElementById("fa-kpi-dead").textContent = String(deadlines30());
  }

  function renderMatches() {
    var host = document.getElementById("fa-match-list");
    if (!host) return;
    host.innerHTML = "";
    richTopMatches().forEach(function (m) {
      var row = document.createElement("div");
      row.className = "fa-match-row";
      var bd =
        '<span class="fa-match-avatar" style="background:' +
        esc(m.color) +
        '">' +
        esc(m.icon) +
        "</span>" +
        '<div><p style="margin:0;font-weight:750;font-size:0.9rem">' +
        esc(m.name) +
        '</p><p class="fa-match-meta muted">' +
        esc(m.meta) +
        '</p><span class="fa-badge ' +
        (m.match === "high" ? "fa-badge--high" : "fa-badge--med") +
        '">' +
        (m.match === "high" ? "High Match" : "Medium Match") +
        "</span></div>" +
        '<div class="fa-match-right"><p class="fa-match-amt">' +
        esc(m.amount) +
        '</p><p class="fa-match-due">Due ' +
        esc(formatLongDate(m.deadline)) +
        "</p></div>";
      row.innerHTML = bd;
      host.appendChild(row);
    });
    if (!host.children.length) host.innerHTML = '<p class="fa-empty">No suggestions — set your major in Profile.</p>';
  }

  function renderTracker() {
    var host = document.getElementById("fa-tracker-list");
    var sumEl = document.getElementById("fa-tracker-summary");
    if (!host) return;
    var list = state.scholarships || [];
    var inProg = list.filter(function (s) {
      return /in progress|applied/i.test(s.status || "");
    }).length;
    if (sumEl) sumEl.textContent = list.length + " Saved · " + inProg + " In Progress";

    host.innerHTML = "";
    list.forEach(function (s, idx) {
      var pct = scholarshipProgress(s.status);
      var row = document.createElement("div");
      row.className = "fa-track-row";
      row.innerHTML =
        '<div class="fa-track-top">' +
        '<div style="display:flex;gap:0.5rem;align-items:flex-start">' +
        '<span class="fa-track-ico" style="background:rgba(37,99,235,0.1)">' +
        esc(TRACK_ICOS[idx % TRACK_ICOS.length]) +
        "</span>" +
        "<div>" +
        '<p class="fa-track-name">' +
        esc(s.name) +
        "</p>" +
        '<p class="fa-track-due muted">Due ' +
        esc(formatLongDate(s.deadline)) +
        "</p></div></div>" +
        '<span class="fa-track-status ' +
        statusClass(s.status) +
        '">' +
        esc(statusLabelForTracker(s.status)) +
        "</span></div>" +
        '<div class="fa-track-bar-wrap"><div class="fa-track-bar"><span style="width:' +
        pct +
        '%"></span></div><span class="fa-track-pct">' +
        pct +
        "%</span></div>";
      host.appendChild(row);
    });
    if (!list.length) host.innerHTML = '<p class="fa-empty">No scholarships tracked yet.</p>';
  }

  function alertPriority(days) {
    if (days == null || days < 0) return { cls: "fa-pr--med", label: "Medium Priority" };
    if (days <= 14) return { cls: "fa-pr--high", label: "High Priority" };
    return { cls: "fa-pr--med", label: "Medium Priority" };
  }

  function dateBoxStyle(monthStr) {
    var pastel = [
      "background:#fce7f3;color:#be185d",
      "background:#ede9fe;color:#6d28d9",
      "background:#ffedd5;color:#c2410c",
    ];
    var h = (monthStr || "").split("").reduce(function (a, c) {
      return a + c.charCodeAt(0);
    }, 0);
    return pastel[h % pastel.length];
  }

  function renderAlerts() {
    var host = document.getElementById("fa-alert-list");
    if (!host) return;
    var rows = [];

    (state.scholarships || []).forEach(function (s) {
      if (!s.deadline) return;
      var du = daysUntil(s.deadline);
      if (du == null || du < 0 || du > 60) return;
      rows.push({
        title: s.name,
        iso: s.deadline,
        sub: du === 0 ? "Due today" : du === 1 ? "Due tomorrow" : "Due in " + du + " days",
      });
    });

    richTopMatches().forEach(function (m) {
      var du = daysUntil(m.deadline);
      if (du == null || du < 0 || du > 60) return;
      rows.push({
        title: m.name,
        iso: m.deadline,
        sub: du === 0 ? "Due today" : "Due in " + du + " days",
      });
    });

    var seen = {};
    rows = rows.filter(function (r) {
      if (seen[r.title]) return false;
      seen[r.title] = true;
      return true;
    });
    rows.sort(function (a, b) {
      return a.iso.localeCompare(b.iso);
    });

    host.innerHTML = "";
    rows.slice(0, 3).forEach(function (r) {
      var d = parseLocalDate(r.iso);
      var mon = d
        ? d.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
        : "";
      var dayNum = d ? String(d.getDate()) : "";
      var du = daysUntil(r.iso);
      var pr = alertPriority(du);
      var row = document.createElement("div");
      row.className = "fa-alert-row";
      row.innerHTML =
        '<div class="fa-date-box" style="' +
        dateBoxStyle(mon) +
        '">' +
        esc(mon) +
        '<span class="fa-d-day">' +
        esc(dayNum) +
        "</span></div>" +
        '<div class="fa-alert-body"><p class="fa-alert-title">' +
        esc(r.title) +
        '</p><p class="fa-alert-sub muted">' +
        esc(r.sub) +
        "</p></div>" +
        '<span class="fa-badge-priority ' +
        pr.cls +
        '">' +
        esc(pr.label) +
        "</span>";
      host.appendChild(row);
    });

    if (!host.children.length)
      host.innerHTML = '<p class="fa-empty">No upcoming deadlines in the next month.</p>';
  }

  function renderFafsa() {
    var list = state.fafsaChecklist || [];
    var done = list.filter(function (x) {
      return x.done;
    }).length;
    var total = list.length || 1;
    var pct = Math.round((done / total) * 100);
    var ring = document.getElementById("fa-fafsa-ring");
    if (ring) ring.style.setProperty("--fa-pct", String(pct));
    var pEl = document.getElementById("fa-fafsa-pct");
    if (pEl) pEl.textContent = String(pct);
    var msg = document.getElementById("fa-fafsa-msg");
    if (msg)
      msg.innerHTML =
        "<strong>Great progress!</strong><br/>" + done + " of " + total + " steps completed.";
    var year = document.getElementById("fa-fafsa-year");
    if (year) year.textContent = "2025–2026 Academic Year";

    var fh = document.getElementById("fa-fafsa-checklist");
    if (!fh) return;
    fh.innerHTML = "";
    list.forEach(function (item) {
      var lab = document.createElement("label");
      lab.className = "fa-check-row";
      lab.innerHTML =
        '<input type="checkbox" data-fafsa="' +
        esc(item.id) +
        '"' +
        (item.done ? " checked" : "") +
        " /> " +
        esc(item.label);
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
        renderFafsa();
      });
    });
  }

  function initials(name) {
    return (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .map(function (x) {
        return x[0];
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function renderRecLetters() {
    var host = document.getElementById("fa-rec-list");
    var sum = document.getElementById("fa-rec-summary");
    var rows = state.recLetterRequests || [];
    var pending = rows.filter(function (r) {
      return !/received/i.test(r.status || "");
    }).length;
    if (sum) sum.textContent = pending + " of " + rows.length + " pending response";

    if (!host) return;
    host.innerHTML = "";
    rows.forEach(function (r, i) {
      var row = document.createElement("div");
      row.className = "fa-rec-row";
      var st = (r.status || "").toLowerCase();
      var avCls = /received/.test(st) ? "fa-rec-av is-green" : "fa-rec-av";
      var stCls = /received/.test(st) ? "fa-st--done" : /progress/.test(st) ? "fa-st--progress" : "fa-st--not";
      row.innerHTML =
        '<div class="' +
        avCls +
        '">' +
        (/received/.test(st) ? "✓" : esc(initials(r.professor))) +
        '</div><div class="fa-rec-mid"><p class="fa-rec-name">' +
        esc(r.professor) +
        '</p><p class="fa-rec-dept muted">' +
        esc(r.department || "Faculty") +
        '</p></div><span class="fa-track-status ' +
        stCls +
        '">' +
        esc(r.status || "") +
        '</span><span class="fa-rec-date">' +
        esc(formatLongDate(r.due)) +
        "</span>";
      host.appendChild(row);
    });
    if (!rows.length) host.innerHTML = '<p class="fa-empty">No recommendation requests yet.</p>';
  }

  function syncEssayFields() {
    var eb = document.getElementById("fa-essay-brain");
    var eo = document.getElementById("fa-essay-outline");
    var ed = document.getElementById("fa-essay-draft");
    if (eb && document.activeElement !== eb) eb.value = state.essayBrainstorm || "";
    if (eo && document.activeElement !== eo) eo.value = state.essayOutline || "";
    if (ed && document.activeElement !== ed) ed.value = state.essayDraft || "";
  }

  function renderAll() {
    renderKpis();
    renderMatches();
    renderTracker();
    renderAlerts();
    renderFafsa();
    renderRecLetters();
    syncEssayFields();
    renderSidebarSemester();
    syncProfile();
  }

  function bind() {
    document.getElementById("form-sch-fa").addEventListener("submit", function (e) {
      e.preventDefault();
      state.scholarships.push({
        id: D.uid(),
        name: document.getElementById("fa-sch-name").value.trim(),
        amount: document.getElementById("fa-sch-amt").value.trim(),
        deadline: document.getElementById("fa-sch-deadline").value,
        status: document.getElementById("fa-sch-status").value,
        notes: document.getElementById("fa-sch-notes").value.trim(),
      });
      save();
      e.target.reset();
      renderAll();
    });

    document.getElementById("form-rec-fa").addEventListener("submit", function (e) {
      e.preventDefault();
      state.recLetterRequests.push({
        id: D.uid(),
        professor: document.getElementById("fa-rec-prof").value.trim(),
        department: document.getElementById("fa-rec-dept").value.trim(),
        status: document.getElementById("fa-rec-status").value.trim() || "Requested",
        due: document.getElementById("fa-rec-due").value,
        notes: "",
      });
      save();
      e.target.reset();
      renderAll();
    });

    ["fa-essay-brain", "fa-essay-outline", "fa-essay-draft"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", function () {
        if (id === "fa-essay-brain") state.essayBrainstorm = el.value;
        if (id === "fa-essay-outline") state.essayOutline = el.value;
        if (id === "fa-essay-draft") state.essayDraft = el.value;
        save();
      });
    });

    document.getElementById("fa-btn-essay-refine").addEventListener("click", function () {
      var t = state.essayDraft || "";
      state.essayDraft =
        (t ? t + "\n\n" : "") +
        "[Simulated refinement] Tighten theme, add one concrete example, and verify word limits.";
      save();
      syncEssayFields();
    });

    document.getElementById("fa-btn-essay-start").addEventListener("click", function () {
      scrollToId("form-sch-fa");
      document.getElementById("fa-essay-brain").focus();
    });

    document.getElementById("fa-btn-fafsa").addEventListener("click", function () {
      var first = document.querySelector("#fa-fafsa-checklist input[type=checkbox]:not(:checked)");
      if (first) first.focus();
      else alert("Checklist complete — submit through the official FAFSA site when ready.");
    });

    document.getElementById("fa-banner-explore").addEventListener("click", function () {
      scrollToId("fin-top-matches");
    });

    [
      ["fa-jump-suggestions", "fin-top-matches"],
      ["fa-jump-tracker", "fin-tracker"],
      ["fa-jump-alerts", "fin-alerts"],
      ["fa-scroll-matches", "fin-top-matches"],
      ["fa-foot-matches", "fin-top-matches"],
      ["fa-scroll-track-inner", "fin-tracker"],
      ["fa-scroll-alerts-inner", "fin-alerts"],
      ["fa-foot-deadlines", "fin-alerts"],
      ["fa-scroll-add", "form-sch-fa"],
      ["fa-scroll-rec", "fin-rec"],
      ["fa-foot-rec", "fin-rec"],
    ].forEach(function (pair) {
      var btn = document.getElementById(pair[0]);
      if (btn)
        btn.addEventListener("click", function () {
          scrollToId(pair[1]);
          if (pair[1] === "form-sch-fa") document.getElementById("fa-sch-name").focus();
        });
    });

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
        renderAll();
      });
    }
  }

  bind();
  renderAll();
})();
