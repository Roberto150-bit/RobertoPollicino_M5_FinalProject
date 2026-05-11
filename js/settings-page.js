/**
 * DegreePilot — Profile / Settings (settings.html)
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();

  var SWATCHES = [
    { key: "blue", color: "#2563eb" },
    { key: "green", color: "#16a34a" },
    { key: "purple", color: "#9333ea" },
    { key: "orange", color: "#ea580c" },
    { key: "pink", color: "#db2777" },
    { key: "cyan", color: "#0891b2" },
  ];

  var LEARNING_OPTS = [
    { key: "visual", label: "Visual" },
    { key: "auditory", label: "Auditory" },
    { key: "reading", label: "Reading/Writing" },
    { key: "kinesthetic", label: "Kinesthetic" },
  ];

  var AI_LEVELS = [
    { key: "minimal", label: "Minimal" },
    { key: "balanced", label: "Balanced" },
    { key: "proactive", label: "Proactive" },
  ];

  function save() {
    Save.saveState(state);
  }

  function esc(s) {
    return D.escapeHtml(s == null ? "" : String(s));
  }

  function ensureNested() {
    state.profile = state.profile || {};
    state.settings = state.settings || {};
    state.settingsAi = state.settingsAi || { learningStyles: [], interactionLevel: "balanced" };
    if (!Array.isArray(state.settingsAi.learningStyles)) state.settingsAi.learningStyles = [];
    state.settings.courseLinks = state.settings.courseLinks || {};
    state.settings.courseDisplay = state.settings.courseDisplay || {};
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("pst-sidebar-sem-pct");
    var fill = document.getElementById("pst-sidebar-progress-fill");
    var wk = document.getElementById("pst-sidebar-week-label");
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

  function syncProfileBar() {
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

  function formatMajor(m) {
    if (!m || !String(m).trim()) return "—";
    var s = String(m).trim();
    if (/\(/i.test(s)) return s;
    return s + " (B.S.)";
  }

  function formatClassYear(p) {
    var cy = (p.classYear || "").trim();
    var eg = (p.expectedGraduation || "").trim();
    var y = eg.match(/\b(20\d{2})\b/);
    if (cy && y) return cy + " (" + y[1] + ")";
    return cy || "—";
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

  function renderProfileCard() {
    ensureNested();
    var p = state.profile;
    var av = document.getElementById("pst-profile-avatar");
    if (av) av.textContent = initials(p.displayName);

    var host = document.getElementById("pst-profile-fields");
    if (!host) return;

    var rows = [{ ico: "👤", label: "Full Name", val: p.displayName || "—" }];
    if (p.email) rows.push({ ico: "✉", label: "Email", val: p.email });
    if (p.phone) rows.push({ ico: "📞", label: "Phone", val: p.phone });
    rows.push(
      { ico: "🎓", label: "School", val: p.university || "—" },
      { ico: "🎓", label: "Major", val: formatMajor(p.major) },
      { ico: "🎓", label: "Minor", val: p.minor ? p.minor : "—" },
      { ico: "📅", label: "Semester", val: p.semesterLabel || "—" },
      { ico: "🎓", label: "Class Year", val: formatClassYear(p) }
    );
    if (p.expectedGraduation)
      rows.push({ ico: "🏁", label: "Expected Graduation", val: p.expectedGraduation });

    host.innerHTML = rows
      .map(function (r) {
        return (
          "<li><span class=\"pst-pf-ico\" aria-hidden=\"true\">" +
          r.ico +
          '</span><div><span class="pst-pf-label">' +
          esc(r.label) +
          '</span><p class="pst-pf-val">' +
          esc(r.val) +
          "</p></div></li>"
        );
      })
      .join("");
  }

  function renderGoalCard() {
    ensureNested();
    var p = state.profile;
    var h = document.getElementById("pst-goal-headline");
    var d = document.getElementById("pst-goal-desc");
    var fl = document.getElementById("pst-focus-list");
    if (h)
      h.textContent =
        p.goalHeadline ||
        (p.academicGoal ? p.academicGoal.split(".")[0] : "Set your academic goal");
    if (d) d.textContent = p.academicGoal || "Describe what you want to achieve this term.";
    if (fl) {
      var areas = Array.isArray(p.goalFocusAreas) ? p.goalFocusAreas : [];
      if (!areas.length)
        areas = ["Add focus areas via Edit — e.g. time management, exams, concepts."];
      fl.innerHTML = areas.map(function (x) {
        return "<li>" + esc(x) + "</li>";
      }).join("");
    }
  }

  function renderAdvisorCard() {
    ensureNested();
    var p = state.profile;
    var av = document.getElementById("pst-advisor-avatar");
    if (av) av.textContent = initials(p.advisorName);
    document.getElementById("pst-advisor-name").textContent = p.advisorName || "—";
    document.getElementById("pst-advisor-title").textContent = p.advisorTitle || "Academic Advisor";
    document.getElementById("pst-advisor-hours").textContent = p.advisorHours || "—";

    var ch = document.getElementById("pst-adv-contact");
    if (!ch) return;
    ch.innerHTML = "";
    function addRow(ico, html) {
      var li = document.createElement("li");
      li.innerHTML = '<span aria-hidden="true">' + ico + "</span><span>" + html + "</span>";
      ch.appendChild(li);
    }
    if (p.advisorEmail)
      addRow(
        "✉",
        '<a href="mailto:' +
          esc(p.advisorEmail) +
          '">' +
          esc(p.advisorEmail) +
          "</a>"
      );
    if (p.advisorPhone) addRow("📞", esc(p.advisorPhone));
    if (p.advisorOffice) addRow("📍", "<strong>Office:</strong> " + esc(p.advisorOffice));
  }

  function renderSwatches() {
    ensureNested();
    var host = document.getElementById("pst-swatches");
    if (!host) return;
    var sel = state.settings.courseColorAccent || "blue";
    host.innerHTML = "";
    SWATCHES.forEach(function (sw) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pst-swatch" + (sel === sw.key ? " is-selected" : "");
      b.style.background = sw.color;
      b.setAttribute("aria-pressed", sel === sw.key ? "true" : "false");
      b.setAttribute("aria-label", "Color " + sw.key);
      if (sel === sw.key) b.textContent = "✓";
      b.addEventListener("click", function () {
        state.settings.courseColorAccent = sw.key;
        save();
        renderSwatches();
      });
      host.appendChild(b);
    });
  }

  function bindCourseToggles() {
    ensureNested();
    document.querySelectorAll(".pst-toggle").forEach(function (cb) {
      var k = cb.getAttribute("data-link");
      cb.checked = !!state.settings.courseLinks[k];
      cb.onchange = function () {
        state.settings.courseLinks[k] = cb.checked;
        save();
      };
    });
    document.querySelectorAll(".pst-toggle-disp").forEach(function (cb) {
      var k = cb.getAttribute("data-disp");
      cb.checked = !!state.settings.courseDisplay[k];
      cb.onchange = function () {
        state.settings.courseDisplay[k] = cb.checked;
        save();
      };
    });
  }

  function bindNotifyToggles() {
    ensureNested();
    var m = [
      ["pst-n-task", "notifyAssignments"],
      ["pst-n-schedule", "notifyScheduleUpdates"],
      ["pst-n-grade", "notifyGrades"],
      ["pst-n-study", "notifyStudyReminders"],
      ["pst-n-weekly", "notifyWeeklySummary"],
    ];
    m.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (!el) return;
      el.checked = !!state.settings[pair[1]];
      el.onchange = function () {
        state.settings[pair[1]] = el.checked;
        save();
      };
    });
  }

  function bindSecurityFields() {
    ensureNested();
    var a = document.getElementById("pst-2fa");
    var e = document.getElementById("pst-email-notify");
    var pu = document.getElementById("pst-push-notify");
    if (a) {
      a.checked = !!state.settings.twoFactorEnabled;
      a.onchange = function () {
        state.settings.twoFactorEnabled = a.checked;
        save();
      };
    }
    if (e) {
      e.checked = state.settings.notifyEmail !== false;
      e.onchange = function () {
        state.settings.notifyEmail = e.checked;
        save();
      };
    }
    if (pu) {
      pu.checked = state.settings.notifyPush !== false;
      pu.onchange = function () {
        state.settings.notifyPush = pu.checked;
        save();
      };
    }
  }

  function renderLearningChips() {
    var host = document.getElementById("dlg-learning-chips");
    if (!host) return;
    var sel = state.settingsAi.learningStyles || [];
    host.innerHTML = "";
    LEARNING_OPTS.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pst-chip" + (sel.indexOf(o.key) >= 0 ? " is-on" : "");
      b.textContent = o.label;
      b.addEventListener("click", function () {
        var i = sel.indexOf(o.key);
        if (i >= 0) sel.splice(i, 1);
        else sel.push(o.key);
        state.settingsAi.learningStyles = sel;
        save();
        renderLearningChips();
      });
      host.appendChild(b);
    });
  }

  function renderAiLevelSeg() {
    var host = document.getElementById("dlg-ai-level");
    if (!host) return;
    var cur = state.settingsAi.interactionLevel || "balanced";
    host.innerHTML = "";
    AI_LEVELS.forEach(function (lvl) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pst-seg-btn" + (cur === lvl.key ? " is-selected" : "");
      b.textContent = lvl.label;
      b.addEventListener("click", function () {
        state.settingsAi.interactionLevel = lvl.key;
        save();
        renderAiLevelSeg();
      });
      host.appendChild(b);
    });
  }

  function openDlg(id) {
    var d = document.getElementById(id);
    if (d && d.showModal) d.showModal();
  }

  function closeDlg(id) {
    var d = document.getElementById(id);
    if (d && d.close) d.close();
  }

  function fillProfileDlg() {
    var p = state.profile;
    document.getElementById("dlg-pf-name").value = p.displayName || "";
    document.getElementById("dlg-pf-email").value = p.email || "";
    document.getElementById("dlg-pf-phone").value = p.phone || "";
    document.getElementById("dlg-pf-uni").value = p.university || "";
    document.getElementById("dlg-pf-major").value = p.major || "";
    document.getElementById("dlg-pf-minor").value = p.minor || "";
    document.getElementById("dlg-pf-sem").value = p.semesterLabel || "";
    document.getElementById("dlg-pf-year").value = p.classYear || "";
    document.getElementById("dlg-pf-grad").value = p.expectedGraduation || "";
    document.getElementById("dlg-pf-weather").value = p.weatherCity || "";
    document.getElementById("dlg-pf-theme").value = p.theme || "ocean";
  }

  function fillGoalDlg() {
    var p = state.profile;
    document.getElementById("dlg-goal-headline").value = p.goalHeadline || "";
    document.getElementById("dlg-goal-desc").value = p.academicGoal || "";
    var areas = Array.isArray(p.goalFocusAreas) ? p.goalFocusAreas : [];
    document.getElementById("dlg-goal-focus").value = areas.join("\n");
    renderLearningChips();
    renderAiLevelSeg();
  }

  function fillAdvisorDlg() {
    var p = state.profile;
    document.getElementById("dlg-adv-name").value = p.advisorName || "";
    document.getElementById("dlg-adv-title").value = p.advisorTitle || "";
    document.getElementById("dlg-adv-email").value = p.advisorEmail || "";
    document.getElementById("dlg-adv-phone").value = p.advisorPhone || "";
    document.getElementById("dlg-adv-office").value = p.advisorOffice || "";
    document.getElementById("dlg-adv-hours").value = p.advisorHours || "";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || "ocean");
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "degreepilot-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderAll() {
    ensureNested();
    renderProfileCard();
    renderGoalCard();
    renderAdvisorCard();
    renderSwatches();
    bindCourseToggles();
    bindNotifyToggles();
    bindSecurityFields();
    renderSidebarSemester();
    syncProfileBar();
    applyTheme(state.profile.theme);
  }

  function bind() {
    document.getElementById("pst-open-edit-profile").addEventListener("click", function () {
      fillProfileDlg();
      openDlg("pst-dlg-profile");
    });
    document.getElementById("pst-open-edit-goal").addEventListener("click", function () {
      fillGoalDlg();
      openDlg("pst-dlg-goal");
    });
    document.getElementById("pst-open-edit-advisor").addEventListener("click", function () {
      fillAdvisorDlg();
      openDlg("pst-dlg-advisor");
    });

    document.querySelectorAll("[data-close-dlg]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeDlg(btn.getAttribute("data-close-dlg"));
      });
    });

    document.getElementById("pst-form-profile").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = state.profile;
      p.displayName = document.getElementById("dlg-pf-name").value.trim();
      p.email = document.getElementById("dlg-pf-email").value.trim();
      p.phone = document.getElementById("dlg-pf-phone").value.trim();
      p.university = document.getElementById("dlg-pf-uni").value.trim();
      p.major = document.getElementById("dlg-pf-major").value.trim();
      p.minor = document.getElementById("dlg-pf-minor").value.trim();
      p.semesterLabel = document.getElementById("dlg-pf-sem").value.trim();
      p.classYear = document.getElementById("dlg-pf-year").value.trim();
      p.expectedGraduation = document.getElementById("dlg-pf-grad").value.trim();
      p.weatherCity = document.getElementById("dlg-pf-weather").value.trim();
      p.theme = document.getElementById("dlg-pf-theme").value;
      save();
      applyTheme(p.theme);
      closeDlg("pst-dlg-profile");
      renderAll();
    });

    document.getElementById("pst-form-goal").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = state.profile;
      p.goalHeadline = document.getElementById("dlg-goal-headline").value.trim();
      p.academicGoal = document.getElementById("dlg-goal-desc").value.trim();
      var raw = document.getElementById("dlg-goal-focus").value;
      p.goalFocusAreas = raw
        .split("\n")
        .map(function (x) {
          return x.trim();
        })
        .filter(Boolean);
      save();
      closeDlg("pst-dlg-goal");
      renderAll();
    });

    document.getElementById("pst-form-advisor").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = state.profile;
      p.advisorName = document.getElementById("dlg-adv-name").value.trim();
      p.advisorTitle = document.getElementById("dlg-adv-title").value.trim();
      p.advisorEmail = document.getElementById("dlg-adv-email").value.trim();
      p.advisorPhone = document.getElementById("dlg-adv-phone").value.trim();
      p.advisorOffice = document.getElementById("dlg-adv-office").value.trim();
      p.advisorHours = document.getElementById("dlg-adv-hours").value.trim();
      save();
      closeDlg("pst-dlg-advisor");
      renderAll();
    });

    document.getElementById("pst-schedule-meeting").addEventListener("click", function () {
      var em = (state.profile && state.profile.advisorEmail) || "";
      if (em) window.location.href = "mailto:" + encodeURIComponent(em) + "?subject=Advising%20meeting%20request";
      else alert("Add an advisor email in Edit first.");
    });

    document.getElementById("pst-preview-courses").addEventListener("click", function () {
      window.location.href = "courses.html";
    });

    document.getElementById("pst-manage-channels").addEventListener("click", function () {
      alert("Notification channels would connect to email/mobile in a full product — prototype uses local toggles only.");
    });

    document.getElementById("pst-change-password").addEventListener("click", function () {
      alert("Password change would open your campus SSO — not wired in this static prototype.");
    });

    document.getElementById("pst-save-security").addEventListener("click", function () {
      save();
      alert("Security preferences saved locally.");
    });

    document.getElementById("pst-export-data").addEventListener("click", exportData);

    document.getElementById("pst-delete-account").addEventListener("click", function () {
      if (!confirm("Clear all local DegreePilot data? This cannot be undone.")) return;
      state = Save.resetToBlank();
      Save.saveState(state);
      window.location.reload();
    });

    document.getElementById("pst-reset-demo").addEventListener("click", function () {
      if (!confirm("Reset all demo data and return to a blank dashboard?")) return;
      state = Save.resetToBlank();
      Save.saveState(state);
      window.location.reload();
    });

    document.getElementById("pst-logout").addEventListener("click", function () {
      window.location.href = "index.html";
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
