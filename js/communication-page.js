/**
 * DegreePilot — Communication Assistant (communication.html)
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();
  var ui = {
    scenario: "intro",
    tone: "professional",
    commVariant: 0,
    subjectDirty: false,
  };

  var CHIP_SNIPPETS = {
    topic:
      "\n\nI would especially like to discuss a specific topic from our recent unit — please let me know if there are readings or exercises you recommend.",
    question: "\n\nOne question I have is: [your question here]",
    goals:
      "\n\nMy learning goals for this course include strengthening my understanding of the core concepts and applying them thoughtfully on upcoming assignments.",
  };

  function save() {
    Save.saveState(state);
  }

  function courseById(id) {
    return (state.courses || []).find(function (c) {
      return c.id === id;
    });
  }

  function currentCourses() {
    return (state.courses || []).filter(function (c) {
      return c.term === "current";
    });
  }

  function inferEmail(c) {
    if (!c) return "";
    if (c.professorEmail) return c.professorEmail;
    var parts = (c.professor || "prof")
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .split(/\s+/);
    var last = parts[parts.length - 1] || "prof";
    return last + "@demo-university.edu";
  }

  function esc(s) {
    return D.escapeHtml(s == null ? "" : String(s));
  }

  function wordCount(text) {
    var m = (text || "").trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function looksSensitive(text) {
    var t = text || "";
    if (/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/.test(t)) return true;
    if (/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(t.replace(/\s/g, ""))) return true;
    return false;
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("comm-sidebar-sem-pct");
    var fill = document.getElementById("comm-sidebar-progress-fill");
    var wk = document.getElementById("comm-sidebar-week-label");
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

  function populateRecipientSelect() {
    var sel = document.getElementById("comm-to");
    if (!sel) return;
    var prev = sel.value;
    sel.innerHTML = "";

    currentCourses().forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.professor + " (" + inferEmail(c) + ")";
      sel.appendChild(opt);
    });

    var advOpt = document.createElement("option");
    advOpt.value = "advisor";
    var pr = state.profile || {};
    advOpt.textContent =
      (pr.advisorName || "Academic Advisor") + " (" + (pr.advisorEmail || "advisor@demo-university.edu") + ")";
    sel.appendChild(advOpt);

    var courses = currentCourses();
    if (courses.some(function (c) { return c.id === prev; })) sel.value = prev;
    else if (prev === "advisor") sel.value = "advisor";
    else if (courses[0]) sel.value = courses[0].id;
    else sel.value = "advisor";
  }

  function collectFields() {
    var sel = document.getElementById("comm-to");
    var val = sel ? sel.value : "";
    var p = state.profile || {};
    var courseStr = "";
    var profStr = "";
    var courseCodeShort = "Course";

    if (val === "advisor") {
      profStr = p.advisorName || "Academic Advisor";
      var ctx = currentCourses()[0];
      if (ctx) {
        courseStr = ctx.code + ": " + ctx.name;
        courseCodeShort = ctx.code;
      } else {
        courseStr = "[Course]";
      }
    } else {
      var c = courseById(val);
      if (c) {
        profStr = c.professor;
        courseStr = c.code + ": " + c.name;
        courseCodeShort = c.code;
      } else {
        profStr = "[Professor]";
        courseStr = "[Course]";
      }
    }

    return {
      professor: profStr,
      course: courseStr,
      tone: ui.tone,
      context: "",
      studentName: p.displayName,
      major: p.major,
      courseCodeShort: courseCodeShort,
    };
  }

  function buildSubject(scenario, fields) {
    var code = fields.courseCodeShort || "Course";
    switch (scenario) {
      case "intro":
        return "Introduction and Interest in " + code;
      case "clarify":
        return "Clarification question — " + code;
      case "extension":
        return "Extension request — " + code;
      case "grade":
        return "Question about feedback — " + code;
      case "advisor":
        return "Academic planning — advising appointment";
      default:
        return "Email — " + code;
    }
  }

  function applyDraftFromCore(useVariant) {
    var fields = collectFields();
    var body;
    if (useVariant && ui.commVariant > 0) {
      body = D.emailScenarioBodyVariant(ui.scenario, fields, ui.commVariant);
    } else {
      body = D.emailScenarioBody(ui.scenario, fields);
    }
    var ta = document.getElementById("comm-body");
    if (ta) ta.value = body;

    var subj = document.getElementById("comm-subject");
    if (subj && !ui.subjectDirty) {
      subj.value = buildSubject(ui.scenario, fields);
    }
    updateStats();
    syncContactCard();
  }

  function updateStats() {
    var ta = document.getElementById("comm-body");
    var subj = document.getElementById("comm-subject");
    var wc = document.getElementById("comm-word-count");
    var sc = document.getElementById("comm-subject-count");
    var priv = document.getElementById("comm-privacy");
    if (!ta || !priv) return;

    if (wc) wc.textContent = wordCount(ta.value) + " words";
    if (sc && subj) sc.textContent = subj.value.length + "/120";

    var bad = looksSensitive(ta.value);
    if (bad) {
      priv.className = "comm-privacy comm-privacy--warn";
      priv.innerHTML =
        '<span class="comm-check" aria-hidden="true">!</span> Review: possible sensitive pattern detected';
    } else {
      priv.className = "comm-privacy comm-privacy--ok";
      priv.innerHTML = '<span class="comm-check" aria-hidden="true">✓</span> No sensitive data detected';
    }
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

  function syncContactCard() {
    var sel = document.getElementById("comm-to");
    var val = sel ? sel.value : "";
    var nameEl = document.getElementById("comm-contact-name");
    var courseEl = document.getElementById("comm-contact-course");
    var emailEl = document.getElementById("comm-contact-email");
    var av = document.getElementById("comm-contact-avatar");
    var p = state.profile || {};

    if (val === "advisor") {
      if (nameEl) nameEl.textContent = p.advisorName || "Advisor";
      if (courseEl) courseEl.textContent = "Academic advising";
      if (emailEl) emailEl.textContent = p.advisorEmail || "";
      if (av) av.textContent = initials(p.advisorName);
    } else {
      var c = courseById(val);
      if (c) {
        if (nameEl) nameEl.textContent = c.professor;
        if (courseEl) courseEl.textContent = c.code + ": " + c.name;
        if (emailEl) emailEl.textContent = inferEmail(c);
        if (av) av.textContent = initials(c.professor);
      }
    }
  }

  function setScenarioActive(key) {
    document.querySelectorAll(".comm-scenario-item").forEach(function (btn) {
      var k = btn.getAttribute("data-scenario");
      var on = k === key;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function setToneActive(tone) {
    document.querySelectorAll(".comm-tone-opt").forEach(function (btn) {
      var t = btn.getAttribute("data-tone");
      var on = t === tone;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
      var chk = btn.querySelector(".comm-tone-check");
      if (chk) chk.textContent = on ? "✓" : "";
    });
  }

  function insertAtCursor(ta, text) {
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var v = ta.value;
    ta.value = v.slice(0, start) + text + v.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.focus();
    updateStats();
  }

  function renderSentList() {
    var host = document.getElementById("comm-sent-list");
    if (!host) return;
    host.innerHTML = "";
    (state.emailDrafts || []).forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "comm-sent-item";
      b.innerHTML =
        "<strong>" +
        esc(d.scenario || "draft") +
        "</strong><span class=\"muted\">" +
        esc((d.body || "").slice(0, 120)) +
        "…</span>";
      b.addEventListener("click", function () {
        var ta = document.getElementById("comm-body");
        if (ta) ta.value = d.body || "";
        ui.subjectDirty = true;
        updateStats();
        document.getElementById("comm-dialog-sent").close();
      });
      host.appendChild(b);
    });
    if (!(state.emailDrafts || []).length) {
      host.innerHTML = "<p class=\"muted small\">No saved templates yet. Use “Save as Template” after editing a draft.</p>";
    }
  }

  function renderContactsPicker() {
    var host = document.getElementById("comm-contacts-all");
    if (!host) return;
    host.innerHTML = "";
    var p = state.profile || {};

    var adv = document.createElement("button");
    adv.type = "button";
    adv.className = "comm-contact-pick";
    adv.innerHTML =
      "<div class=\"comm-avatar\">" +
      esc(initials(p.advisorName)) +
      "</div><div><strong>" +
      esc(p.advisorName) +
      "</strong><br/><span class=\"muted small\">Advising · " +
      esc(p.advisorEmail) +
      "</span></div>";
    adv.addEventListener("click", function () {
      document.getElementById("comm-to").value = "advisor";
      applyDraftFromCore(false);
      document.getElementById("comm-dialog-contacts").close();
    });
    host.appendChild(adv);

    currentCourses().forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "comm-contact-pick";
      b.innerHTML =
        "<div class=\"comm-avatar\">" +
        esc(initials(c.professor)) +
        "</div><div><strong>" +
        esc(c.professor) +
        "</strong><br/><span class=\"muted small\">" +
        esc(c.code + ": " + c.name) +
        " · " +
        esc(inferEmail(c)) +
        "</span></div>";
      b.addEventListener("click", function () {
        document.getElementById("comm-to").value = c.id;
        ui.commVariant = 0;
        ui.subjectDirty = false;
        applyDraftFromCore(false);
        document.getElementById("comm-dialog-contacts").close();
      });
      host.appendChild(b);
    });
  }

  function bind() {
    document.querySelectorAll(".comm-scenario-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.scenario = btn.getAttribute("data-scenario") || "intro";
        ui.commVariant = 0;
        ui.subjectDirty = false;
        setScenarioActive(ui.scenario);
        applyDraftFromCore(false);
      });
    });

    document.querySelectorAll(".comm-tone-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.tone = btn.getAttribute("data-tone") || "professional";
        setToneActive(ui.tone);
        ui.commVariant = 0;
        applyDraftFromCore(false);
      });
    });

    var selTo = document.getElementById("comm-to");
    if (selTo) {
      selTo.addEventListener("change", function () {
        ui.commVariant = 0;
        ui.subjectDirty = false;
        applyDraftFromCore(false);
      });
    }

    var subj = document.getElementById("comm-subject");
    if (subj) {
      subj.addEventListener("input", function () {
        ui.subjectDirty = true;
        updateStats();
      });
    }

    var ta = document.getElementById("comm-body");
    if (ta) {
      ta.addEventListener("input", updateStats);
    }

    var ins = document.getElementById("comm-insert");
    if (ins) {
      ins.addEventListener("change", function () {
        var v = ins.value;
        if (!v) return;
        insertAtCursor(document.getElementById("comm-body"), v);
        ins.value = "";
      });
    }

    document.querySelectorAll(".comm-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var k = chip.getAttribute("data-chip");
        var snip = CHIP_SNIPPETS[k];
        if (snip) insertAtCursor(document.getElementById("comm-body"), snip);
      });
    });

    var btnReset = document.getElementById("comm-btn-reset");
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        ui.commVariant = 0;
        ui.subjectDirty = false;
        applyDraftFromCore(false);
      });
    }

    var btnRegen = document.getElementById("comm-btn-regen");
    if (btnRegen) {
      btnRegen.addEventListener("click", function () {
        ui.commVariant += 1;
        applyDraftFromCore(true);
      });
    }

    var btnCopy = document.getElementById("comm-btn-copy");
    if (btnCopy) {
      btnCopy.addEventListener("click", function () {
        var t = document.getElementById("comm-body").value;
        var sub = document.getElementById("comm-subject").value;
        var block = "Subject: " + sub + "\n\n" + t;
        if (navigator.clipboard) navigator.clipboard.writeText(block).catch(function () {});
      });
    }

    var btnSave = document.getElementById("comm-btn-save-tpl");
    if (btnSave) {
      btnSave.addEventListener("click", function () {
        state.emailDrafts = state.emailDrafts || [];
        state.emailDrafts.push({
          id: D.uid(),
          scenario: ui.scenario,
          body: document.getElementById("comm-body").value,
          savedAt: D.isoFromDate(new Date()),
        });
        save();
        renderSentList();
      });
    }

    var dh = document.getElementById("comm-btn-how");
    var dlgH = document.getElementById("comm-dialog-help");
    var dlgHC = document.getElementById("comm-dialog-help-close");
    if (dh && dlgH) {
      dh.addEventListener("click", function () {
        dlgH.showModal();
      });
    }
    if (dlgHC && dlgH) {
      dlgHC.addEventListener("click", function () {
        dlgH.close();
      });
    }

    var ds = document.getElementById("comm-btn-sent");
    var dlgS = document.getElementById("comm-dialog-sent");
    var dlgSC = document.getElementById("comm-dialog-sent-close");
    if (ds && dlgS) {
      ds.addEventListener("click", function () {
        renderSentList();
        dlgS.showModal();
      });
    }
    if (dlgSC && dlgS) {
      dlgSC.addEventListener("click", function () {
        dlgS.close();
      });
    }

    var fg = document.getElementById("comm-btn-full-guide");
    var dlgG = document.getElementById("comm-dialog-guide");
    var dlgGC = document.getElementById("comm-dialog-guide-close");
    if (fg && dlgG) {
      fg.addEventListener("click", function () {
        dlgG.showModal();
      });
    }
    if (dlgGC && dlgG) {
      dlgGC.addEventListener("click", function () {
        dlgG.close();
      });
    }

    var mc = document.getElementById("comm-btn-more-contacts");
    var dlgC = document.getElementById("comm-dialog-contacts");
    var dlgCC = document.getElementById("comm-dialog-contacts-close");
    if (mc && dlgC) {
      mc.addEventListener("click", function () {
        renderContactsPicker();
        dlgC.showModal();
      });
    }
    if (dlgCC && dlgC) {
      dlgCC.addEventListener("click", function () {
        dlgC.close();
      });
    }

    var sc = document.getElementById("comm-scroll-contact");
    if (sc) {
      sc.addEventListener("click", function () {
        document.getElementById("comm-contact-card").scrollIntoView({ behavior: "smooth", block: "center" });
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
        populateRecipientSelect();
        ui.subjectDirty = false;
        applyDraftFromCore(false);
        renderSidebarSemester();
        syncProfile();
      });
    }
  }

  function renderAll() {
    populateRecipientSelect();
    setScenarioActive(ui.scenario);
    setToneActive(ui.tone);
    applyDraftFromCore(false);
    renderSidebarSemester();
    syncProfile();
  }

  bind();
  renderAll();
})();
