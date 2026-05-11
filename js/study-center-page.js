/**
 * DegreePilot — Study Center workspace (study-center.html)
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();
  var ui = { focusCourseId: "", genMode: "deadlines", toolkitTab: "notes" };

  var SYLLABUS = [
    { key: "exam", label: "Exams", weight: 40, color: "#2563eb" },
    { key: "homework", label: "Homework", weight: 25, color: "#16a34a" },
    { key: "project", label: "Projects", weight: 20, color: "#ea580c" },
    { key: "quiz", label: "Quizzes", weight: 10, color: "#9333ea" },
    { key: "participation", label: "Participation", weight: 5, color: "#06b6d4" },
  ];

  var VISUAL_AIDS = [
    { emoji: "🌳", title: "B+ Tree Structure", course: "Database Systems", grad: "linear-gradient(135deg,#dbeafe,#eff6ff)" },
    { emoji: "📈", title: "Time Complexity", course: "Algorithms", grad: "linear-gradient(135deg,#fce7f3,#fdf2f8)" },
    { emoji: "🔗", title: "ER Diagram Example", course: "Database Systems", grad: "linear-gradient(135deg,#e0e7ff,#eef2ff)" },
    { emoji: "📊", title: "Process Scheduling", course: "Operating Systems", grad: "linear-gradient(135deg,#1e293b,#334155)" },
  ];

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

  function remainingWeights(courseId) {
    var brMap = {};
    D.gradeCategoryBreakdown(courseId, state.gradeEntries || []).forEach(function (r) {
      brMap[r.category] = r;
    });
    var out = { lw: {}, avg: {}, rem: {} };
    SYLLABUS.forEach(function (s) {
      var row = brMap[s.key];
      var lw = row && row.weight ? row.weight : 0;
      var avg = row && row.avg != null ? row.avg : null;
      out.lw[s.key] = lw;
      out.avg[s.key] = avg;
      out.rem[s.key] = Math.max(0, s.weight - Math.min(lw, s.weight));
    });
    return out;
  }

  function sumLoggedWeights(courseId) {
    var bd = remainingWeights(courseId);
    var t = 0;
    SYLLABUS.forEach(function (s) {
      t += bd.lw[s.key];
    });
    return Math.min(100, t);
  }

  function KforCategory(bd, focusKey) {
    var sum = 0;
    SYLLABUS.forEach(function (s) {
      var k = s.key;
      var lw = bd.lw[k];
      var rem = bd.rem[k];
      var av = bd.avg[k];
      if (k === focusKey) {
        if (lw > 0 && av != null) sum += (lw / 100) * av;
        return;
      }
      if (rem <= 0) {
        if (av != null) sum += (s.weight / 100) * av;
      } else {
        if (lw > 0 && av != null) sum += (lw / 100) * av;
      }
    });
    return sum;
  }

  function populateFocusCourse() {
    var sel = document.getElementById("st-focus-course");
    var tk = document.getElementById("st-toolkit-course");
    var cur = ui.focusCourseId;
    [sel, tk].forEach(function (el) {
      if (!el) return;
      el.innerHTML = "";
      var all = document.createElement("option");
      all.value = "";
      all.textContent = "All courses";
      el.appendChild(all);
      (state.courses || []).forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = (c.code || "") + " — " + (c.name || "");
        el.appendChild(opt);
      });
      var ok =
        cur === "" ||
        (state.courses || []).some(function (c) {
          return c.id === cur;
        });
      el.value = ok ? cur : "";
    });
    ui.focusCourseId = sel ? sel.value : "";
    if (tk && sel) tk.value = sel.value;
  }

  function populatePlannerGoals() {
    var sel = document.getElementById("st-planner-goal");
    if (!sel) return;
    var prev = sel.value;
    var cid = ui.focusCourseId;
    var bands = !cid ? D.defaultLetterGradeBands() : D.letterGradeBandsForCourse(courseById(cid));
    var sorted = (bands || []).slice().sort(function (a, b) {
      return (b.min || 0) - (a.min || 0);
    });
    sel.innerHTML = "";
    sorted.forEach(function (b) {
      var opt = document.createElement("option");
      opt.value = String(b.min);
      opt.textContent = b.letter + " (" + (b.display || "") + ")";
      sel.appendChild(opt);
    });
    var has = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === prev) has = true;
    }
    sel.value = has ? prev : sel.options[0] ? sel.options[0].value : "90";
  }

  function setFeas(el, cls, text, show) {
    if (!el) return;
    el.hidden = !show;
    el.className = "st-feasibility" + (cls ? " " + cls : "");
    el.textContent = text || "";
  }

  function renderGradePlanner() {
    var feasEl = document.getElementById("st-planner-feasibility");
    var neededEl = document.getElementById("st-planner-needed");
    var metaEl = document.getElementById("st-planner-meta");
    var catUl = document.getElementById("st-planner-cats");
    var noteEl = document.getElementById("st-planner-scale-note");
    var goalSel = document.getElementById("st-planner-goal");

    var courseId = ui.focusCourseId;
    if (!courseId) {
      if (neededEl) neededEl.textContent = "—";
      if (metaEl) metaEl.textContent = "Choose a focus course above to estimate remaining weight and category ranges.";
      if (catUl) catUl.innerHTML = "";
      setFeas(feasEl, "", "", false);
      if (noteEl)
        noteEl.textContent =
          "Letter bands use the default scale until you pick a course (and optionally analyze its syllabus on Courses).";
      return;
    }

    var goal = parseFloat(goalSel && goalSel.value ? goalSel.value : "90", 10);
    var bd = remainingWeights(courseId);
    var ew = sumLoggedWeights(courseId);
    var rw = Math.max(0, 100 - ew);
    var cur = D.courseGradePercent(courseId, state.gradeEntries);
    if (cur == null || !isFinite(cur)) cur = 0;

    var c = courseById(courseId);
    if (noteEl) {
      var hx =
        c &&
        c.syllabusExtracted &&
        Array.isArray(c.syllabusExtracted.letterGradeBands) &&
        c.syllabusExtracted.letterGradeBands.length;
      noteEl.textContent = hx
        ? "Goal thresholds align with your saved syllabus analysis — confirm with the official syllabus."
        : "Default letter thresholds — refine on Courses with Analyze syllabus.";
    }

    if (rw <= 0.001) {
      if (neededEl) neededEl.textContent = "—";
      if (metaEl) metaEl.textContent = "All weight logged for this course — average is fixed from entries.";
      setFeas(
        feasEl,
        cur >= goal ? "is-ok" : "is-bad",
        cur >= goal
          ? "Already at or above this goal (" + Math.round(cur * 10) / 10 + "%)."
          : "No remaining modeled weight — cannot reach a higher goal without new grade entries.",
        true
      );
      if (catUl)
        catUl.innerHTML = '<li class="muted">No unfinished category weight.</li>';
      return;
    }

    var need = D.whatIfNeededAverage(goal, cur, ew, rw);
    if (neededEl)
      neededEl.textContent =
        need == null || !isFinite(need) ? "—" : Math.round(need * 10) / 10 + "%";
    if (metaEl)
      metaEl.textContent =
        "About " +
        Math.round(rw * 10) / 10 +
        "% of course weight still open (" +
        Math.round(ew * 10) / 10 +
        "% logged).";

    if (need != null && isFinite(need) && need > 100)
      setFeas(
        feasEl,
        "is-bad",
        "This goal may not be reachable — uniform " +
          Math.round(need * 10) / 10 +
          "% on all remaining work exceeds 100%. Lower the goal or confirm weights under Courses.",
        true
      );
    else if (need != null && isFinite(need) && need < 0)
      setFeas(feasEl, "is-warn", "You likely already have buffer toward this goal — verify with your instructor.", true);
    else if (need != null && isFinite(need))
      setFeas(
        feasEl,
        "is-ok",
        "Achievable in principle — aim for about " +
          Math.round(need * 10) / 10 +
          "% combined on remaining graded work.",
        true
      );
    else setFeas(feasEl, "", "", false);

    if (!catUl) return;
    catUl.innerHTML = SYLLABUS.map(function (s) {
      var remk = bd.rem[s.key];
      if (remk <= 0)
        return (
          "<li><span class=\"gr-dot\" style=\"background:" +
          esc(s.color) +
          '\"></span>' +
          esc(s.label) +
          ": <span class=\"muted\">no remaining weight</span></li>"
        );
      var otherRem = 0;
      SYLLABUS.forEach(function (t) {
        if (t.key !== s.key) otherRem += bd.rem[t.key];
      });
      var K = KforCategory(bd, s.key);
      var xOthersMax = (goal - K - otherRem) * 100 / remk;
      var xOthersMin = (goal - K) * 100 / remk;
      var rawLow = Math.min(xOthersMax, xOthersMin);
      var rawHigh = Math.max(xOthersMax, xOthersMin);
      var catBad = rawLow > 100;
      var low = Math.max(0, Math.min(100, rawLow));
      var high = Math.max(0, Math.min(100, rawHigh));
      var note = catBad
        ? ' <strong style="color:#b91c1c">Cannot reach goal</strong> here even if other open categories are perfect.'
        : "";
      return (
        "<li><span class=\"gr-dot\" style=\"background:" +
        esc(s.color) +
        '\"></span><strong>' +
        esc(s.label) +
        "</strong>: need about " +
        Math.round(low * 10) / 10 +
        "%–" +
        Math.round(high * 10) / 10 +
        "% on remaining work in this category." +
        note +
        "</li>"
      );
    }).join("");
  }

  function todayISO() {
    return D.isoFromDate(new Date());
  }

  function daysFromToday(iso) {
    var a = D.parseISO(iso);
    var b = D.parseISO(todayISO());
    if (!a || !b) return 999;
    var ms = a.getTime() - b.getTime();
    return Math.round(ms / (24 * 60 * 60 * 1000));
  }

  function renderDeadlines() {
    var ul = document.getElementById("st-deadlines-list");
    var empty = document.getElementById("st-deadlines-empty");
    var badge = document.getElementById("st-dl-badge");
    if (!ul) return;
    var isoT = todayISO();
    var horizon = new Date();
    horizon.setDate(horizon.getDate() + 7);
    var isoH = D.isoFromDate(horizon);
    var tasks = (state.tasks || []).filter(function (t) {
      if (t.completed) return false;
      if (!t.due) return false;
      if (t.due < isoT || t.due > isoH) return false;
      if (ui.focusCourseId && t.courseId !== ui.focusCourseId) return false;
      return true;
    });
    tasks.sort(function (a, b) {
      return a.due.localeCompare(b.due);
    });
    if (badge) badge.textContent = String(Math.min(9, tasks.length || 0));
    if (!tasks.length) {
      ul.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var icons = { assignment: "📋", exam: "✂", quiz: "❓", meeting: "👥" };
    ul.innerHTML = tasks
      .map(function (t) {
        var c = courseById(t.courseId);
        var d = daysFromToday(t.due);
        var cls = "st-dl--cool";
        if (d <= 2) cls = "st-dl--hot";
        else if (d <= 4) cls = "st-dl--warm";
        var ic = icons[t.type] || icons.assignment;
        var bg = d <= 2 ? "#fce7f3" : d <= 4 ? "#ffedd5" : "#dcfce7";
        var parts = (t.due || "").split("-");
        var pretty = parts.length === 3 ? parts[1] + "/" + parts[2] : t.due;
        var wd = "";
        try {
          wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][D.parseISO(t.due).getDay()] || "";
        } catch (e) {}
        return (
          '<li class="st-dl-item ' +
          cls +
          '"><span class="st-dl-ico" style="background:' +
          bg +
          '">' +
          ic +
          '</span><div class="st-dl-body"><span class="st-dl-title">' +
          esc(c ? c.name : "Course") +
          " — " +
          esc(t.title) +
          '</span><span class="st-dl-sub">' +
          esc(c ? c.code : "?") +
          " • " +
          esc(t.type || "task") +
          '</span></div><div class="st-dl-date"><time>' +
          esc(pretty) +
          '</time><span class="wk">' +
          esc(wd) +
          "</span></div></li>"
        );
      })
      .join("");
  }

  function hashNum(id) {
    var s = String(id || "x");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function renderStudyFocus() {
    var donut = document.getElementById("st-focus-donut");
    var pctEl = document.getElementById("st-focus-pct");
    var labEl = document.getElementById("st-focus-label");
    var metHost = document.getElementById("st-focus-metrics");
    var cid = ui.focusCourseId;
    var base = cid ? 62 + (hashNum(cid) % 28) : 68;
    var pct = Math.min(98, Math.max(45, base));
    if (donut)
      donut.style.background =
        "conic-gradient(#2563eb 0% " + pct + "%, #e5e7eb " + pct + "% 100%)";
    if (pctEl) pctEl.textContent = pct + "%";
    if (labEl) {
      labEl.textContent = pct >= 80 ? "Strong" : pct >= 65 ? "Good" : "Build";
      labEl.style.color = pct >= 80 ? "#15803d" : pct >= 65 ? "#15803d" : "#c2410c";
    }
    if (metHost) {
      var f = 35 + (hashNum(cid + "f") % 35);
      var r = 65 + (hashNum(cid + "r") % 25);
      var cons = 2 + (hashNum(cid + "c") % 5);
      metHost.innerHTML =
        '<div class="st-focus-row"><span>Focus</span><strong>' +
        f +
        " min</strong></div>" +
        '<div class="st-focus-row"><span>Retention</span><strong>' +
        r +
        "%</strong></div>" +
        '<div class="st-focus-row"><span>Consistency</span><strong>' +
        cons +
        " days</strong></div>" +
        '<div class="st-focus-row"><span>Distractions</span><strong class="is-good">Low</strong></div>';
    }
  }

  function toolkitDefs(tab) {
    var label = tab.charAt(0).toUpperCase() + tab.slice(1);
    return [
      { title: "Generate Notes", sub: "AI notes from your materials or topics (" + label + ")", btn: "Generate", ico: "📱", bg: "rgba(37,99,235,0.12)", action: "notes" },
      { title: "Flashcards", sub: "Create flashcards from key concepts", btn: "Create", ico: "🙂", bg: "rgba(22,163,74,0.12)", action: "flash" },
      { title: "Practice Questions", sub: "Generate practice questions by topic", btn: "Generate", ico: "❓", bg: "rgba(239,68,68,0.12)", action: "practice" },
      { title: "Review Guide", sub: "Summary and key takeaways", btn: "Create", ico: "📱", bg: "rgba(147,51,234,0.12)", action: "review" },
    ];
  }

  function renderToolkit() {
    var ul = document.getElementById("st-toolkit-rows");
    if (!ul) return;
    var defs = toolkitDefs(ui.toolkitTab);
    ul.innerHTML = defs
      .map(function (d) {
        return (
          '<li class="st-tool-row"><span class="st-tool-ico" style="background:' +
          d.bg +
          '">' +
          d.ico +
          '</span><div class="st-tool-body"><strong>' +
          esc(d.title) +
          '</strong><span>' +
          esc(d.sub) +
          '</span></div><div class="st-tool-actions"><button type="button" class="btn btn-secondary btn-sm st-tool-action" data-action="' +
          esc(d.action) +
          '">' +
          esc(d.btn) +
          "</button></div></li>"
        );
      })
      .join("");
  }

  function renderExamFeedback() {
    var titleEl = document.getElementById("st-feedback-title");
    var dateEl = document.getElementById("st-feedback-date");
    var donut = document.getElementById("st-feedback-donut");
    var pctEl = document.getElementById("st-feedback-pct");
    var strEl = document.getElementById("st-feedback-strengths");
    var weakEl = document.getElementById("st-feedback-weak");
    var cid = ui.focusCourseId || (state.courses[0] && state.courses[0].id);
    var c = courseById(cid);
    if (titleEl) titleEl.textContent = c ? c.code + " — Midterm Exam" : "—";
    if (dateEl) dateEl.textContent = "Taken Apr 22, 2025";
    var score = 72 + (hashNum(cid) % 18);
    if (pctEl) pctEl.textContent = score + "%";
    if (donut)
      donut.style.background =
        "conic-gradient(#2563eb 0% " + score + "%, #e5e7eb " + score + "% 100%)";
    var strengthTopics = ["Data Structures", "Big-O Notation", "Recursion"];
    var weakTopics = ["Graph Algorithms", "Dynamic Programming", "Time Complexity"];
    if (strEl)
      strEl.innerHTML = strengthTopics
        .map(function (x) {
          return "<li>" + esc(x) + "</li>";
        })
        .join("");
    if (weakEl)
      weakEl.innerHTML = weakTopics
        .map(function (x) {
          return "<li>" + esc(x) + "</li>";
        })
        .join("");
  }

  function renderVisualAids() {
    var host = document.getElementById("st-visual-grid");
    if (!host) return;
    host.innerHTML = VISUAL_AIDS.map(function (v) {
      return (
        '<div class="st-visual-tile"><div class="st-visual-thumb" style="background:' +
        v.grad +
        '">' +
        v.emoji +
        '</div><div class="st-visual-cap"><strong>' +
        esc(v.title) +
        '</strong><span>' +
        esc(v.course) +
        "</span></div></div>"
      );
    }).join("");
  }

  function renderFlashcards() {
    var ul = document.getElementById("st-flash-list");
    if (!ul) return;
    var decks = [
      { title: "Algorithms — Key Concepts", n: 20, pct: 85, bg: "rgba(37,99,235,0.12)", ico: "📇" },
      { title: "Database Normalization", n: 18, pct: 70, bg: "rgba(22,163,74,0.12)", ico: "📗" },
      { title: "Operating Systems Basics", n: 15, pct: 90, bg: "rgba(147,51,234,0.12)", ico: "📙" },
    ];
    ul.innerHTML = decks.map(function (d) {
        var pc = d.pct >= 82 ? "is-high" : d.pct >= 75 ? "is-mid" : "is-mid";
        return (
          '<li class="st-flash-row"><span class="st-flash-ico" style="background:' +
          d.bg +
          '">' +
          d.ico +
          '</span><div class="st-flash-meta"><strong>' +
          esc(d.title) +
          "</strong><span class=\"muted\">" +
          d.n +
          ' cards</span></div><span class="st-flash-pct ' +
          pc +
          '">' +
          d.pct +
          "%</span></li>"
        );
      })
      .join("");
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("study-sidebar-sem-pct");
    var fill = document.getElementById("study-sidebar-progress-fill");
    var wk = document.getElementById("study-sidebar-week-label");
    var tw = meta.totalWeeks || 16;
    var cw = meta.currentWeek || 1;
    var p = Math.min(100, Math.round((cw / tw) * 100));
    if (pct) pct.textContent = p + "%";
    if (fill) fill.style.width = p + "%";
    if (wk)
      wk.textContent =
        "Week " + cw + " of " + tw + " · " + (state.profile && state.profile.semesterLabel ? state.profile.semesterLabel : "");
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

  function renderAll() {
    populateFocusCourse();
    populatePlannerGoals();
    renderGradePlanner();
    renderDeadlines();
    renderStudyFocus();
    renderToolkit();
    renderExamFeedback();
    renderVisualAids();
    renderFlashcards();
    renderSidebarSemester();
    syncProfile();
  }

  function bind() {
    var focus = document.getElementById("st-focus-course");
    if (focus) {
      focus.addEventListener("change", function () {
        ui.focusCourseId = focus.value;
        var tk = document.getElementById("st-toolkit-course");
        if (tk) tk.value = ui.focusCourseId;
        populatePlannerGoals();
        renderGradePlanner();
        renderDeadlines();
        renderStudyFocus();
        renderExamFeedback();
        renderVisualAids();
      });
    }

    var tk = document.getElementById("st-toolkit-course");
    if (tk) {
      tk.addEventListener("change", function () {
        ui.focusCourseId = tk.value;
        if (focus) focus.value = tk.value;
        populatePlannerGoals();
        renderGradePlanner();
        renderExamFeedback();
        renderVisualAids();
      });
    }

    var goalSel = document.getElementById("st-planner-goal");
    if (goalSel) goalSel.addEventListener("change", renderGradePlanner);

    document.querySelectorAll(".st-seg-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".st-seg-btn").forEach(function (x) {
          x.classList.remove("is-active");
        });
        b.classList.add("is-active");
        ui.genMode = b.getAttribute("data-mode") || "deadlines";
      });
    });

    document.getElementById("st-gen-submit").addEventListener("click", function () {
      var hrs = parseFloat(document.getElementById("st-gen-hours").value, 10) || 2;
      var conf = ui.genMode === "confidence" ? 2 : 4;
      var blocks = D.buildStudyPlanBlocks({
        mode: ui.genMode,
        hoursPerDay: hrs,
        confidence: conf,
        tasks: state.tasks || [],
        gradeEntries: state.gradeEntries || [],
        courses: state.courses || [],
      });
      var out = document.getElementById("st-gen-output");
      if (out) {
        out.hidden = false;
        out.textContent = (blocks || []).join("\n\n• ");
      }
    });

    document.querySelectorAll(".st-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".st-tab").forEach(function (t) {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        ui.toolkitTab = tab.getAttribute("data-tab") || "notes";
        renderToolkit();
      });
    });

    var toolUl = document.getElementById("st-toolkit-rows");
    if (toolUl) {
      toolUl.addEventListener("click", function (e) {
        var btn = e.target.closest(".st-tool-action");
        if (!btn) return;
        var c = courseById(document.getElementById("st-toolkit-course").value) || state.courses[0];
        var topic = (c && c.code) || "your course";
        var pack = D.examPrepToolkit(topic + " — " + ui.toolkitTab);
        alert(
          "• " +
            (pack.outline || []).join("\n• ") +
            "\n\nPractice:\n• " +
            (pack.practice || []).slice(0, 3).join("\n• ")
        );
      });
    }

    document.getElementById("st-focus-insights").addEventListener("click", function () {
      alert("Focus insights: keep sessions under 50 minutes with short breaks. Tie next block to your nearest deadline.");
    });

    document.getElementById("st-feedback-upload").addEventListener("click", function () {
      alert("In a full app, upload a PDF or image of your scored exam. Here, feedback stays simulated from core.examFeedbackSim.");
    });

    document.getElementById("st-flash-study").addEventListener("click", function () {
      window.location.href = "dashboard.html#study";
    });

    document.querySelectorAll(".st-rec-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-rec");
        if (k === "tutor") alert("AI Tutor: ask a concept question — prototype uses local hints only.");
        else alert("Timer / spaced repetition — use Tasks and Calendar to schedule focused blocks.");
      });
    });

    document.getElementById("st-note-upload").addEventListener("click", function () {
      alert("Upload notes: link this to Smart Notes on the dashboard in a future iteration.");
    });
    document.getElementById("st-note-audio").addEventListener("click", function () {
      alert("Audio capture would use the browser microphone — not enabled in this prototype.");
    });
    document.getElementById("st-note-paste").addEventListener("click", function () {
      alert("Paste into dashboard Smart Notes or course notes to keep everything searchable.");
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
