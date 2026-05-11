/**
 * DegreePilot — dedicated Grades workspace (grades.html)
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();
  var ui = { filterText: "", breakdownCourseId: "", weightedCourseId: "", whatifCourseId: "" };

  var SYLLABUS = [
    { key: "exam", label: "Exams", weight: 40, color: "#2563eb" },
    { key: "homework", label: "Homework", weight: 25, color: "#16a34a" },
    { key: "project", label: "Projects", weight: 20, color: "#ea580c" },
    { key: "quiz", label: "Quizzes", weight: 10, color: "#9333ea" },
    { key: "participation", label: "Participation", weight: 5, color: "#06b6d4" },
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

  function letterFromPercent(p) {
    if (p == null || !isFinite(p)) return "—";
    if (p >= 93) return "A";
    if (p >= 90) return "A-";
    if (p >= 87) return "B+";
    if (p >= 83) return "B";
    if (p >= 80) return "B-";
    if (p >= 77) return "C+";
    if (p >= 73) return "C";
    if (p >= 70) return "C-";
    if (p >= 67) return "D+";
    if (p >= 63) return "D";
    return "F";
  }

  function letterClass(letter) {
    if (!letter || letter === "—") return "";
    if (letter.indexOf("A") === 0) return "gr-letter-a";
    if (letter.indexOf("B") === 0) return "gr-letter-b";
    return "gr-letter-low";
  }

  function entryPct(g) {
    var mx = parseFloat(g.pointsPossible) || 100;
    var sc = parseFloat(g.score);
    if (!isFinite(sc) || mx <= 0) return null;
    return (sc / mx) * 100;
  }

  function overallAvg() {
    return D.overallGpaSnapshot(state.courses, state.gradeEntries);
  }

  function earnedByCategory(fallbackPct) {
    var entries = state.gradeEntries || [];
    var out = {};
    SYLLABUS.forEach(function (s) {
      var list = entries.filter(function (g) {
        return g.category === s.key;
      });
      if (!list.length) {
        out[s.key] = fallbackPct != null ? fallbackPct : null;
        return;
      }
      var sum = 0,
        n = 0;
      list.forEach(function (g) {
        var p = entryPct(g);
        if (p != null) {
          sum += p;
          n++;
        }
      });
      out[s.key] = n ? Math.round((sum / n) * 10) / 10 : fallbackPct;
    });
    return out;
  }

  function courseEntriesAverage(courseId) {
    var list = (state.gradeEntries || []).filter(function (g) {
      return g.courseId === courseId;
    });
    if (!list.length) return null;
    var sum = 0,
      n = 0;
    list.forEach(function (g) {
      var p = entryPct(g);
      if (p != null) {
        sum += p;
        n++;
      }
    });
    return n ? Math.round((sum / n) * 10) / 10 : null;
  }

  function earnedByCategoryForCourse(courseId, fallbackPct) {
    var entries = state.gradeEntries || [];
    var out = {};
    SYLLABUS.forEach(function (s) {
      var list = entries.filter(function (g) {
        return g.courseId === courseId && g.category === s.key;
      });
      if (!list.length) {
        out[s.key] = fallbackPct != null ? fallbackPct : null;
        return;
      }
      var sum = 0,
        n = 0;
      list.forEach(function (g) {
        var p = entryPct(g);
        if (p != null) {
          sum += p;
          n++;
        }
      });
      out[s.key] = n ? Math.round((sum / n) * 10) / 10 : fallbackPct;
    });
    return out;
  }

  function syllabusRuleWeightedPct(courseId) {
    var fb = courseEntriesAverage(courseId);
    var oa = overallAvg();
    var earned = earnedByCategoryForCourse(courseId, fb != null ? fb : oa);
    var sum = 0;
    SYLLABUS.forEach(function (s) {
      var e = earned[s.key];
      if (e == null || !isFinite(e)) e = fb != null && isFinite(fb) ? fb : oa != null && isFinite(oa) ? oa : 0;
      sum += (s.weight / 100) * e;
    });
    return Math.round(sum * 10) / 10;
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

  /** Locked contributions from other categories + logged part of focus (goal equation). */
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

  function weightedCourseGradePct() {
    var fb = overallAvg();
    if (!(state.gradeEntries || []).length) return fb;
    var earned = earnedByCategory(fb);
    var sum = 0;
    SYLLABUS.forEach(function (s) {
      var e = earned[s.key];
      if (e == null || !isFinite(e)) e = fb != null && isFinite(fb) ? fb : 0;
      sum += (s.weight / 100) * e;
    });
    return Math.round(sum * 10) / 10;
  }

  function buildDonutGradient() {
    var acc = 0;
    var parts = [];
    SYLLABUS.forEach(function (s) {
      parts.push(s.color + " " + acc + "% " + (acc + s.weight) + "%");
      acc += s.weight;
    });
    return "conic-gradient(" + parts.join(", ") + ")";
  }

  /** Segments: [{ pct: number (sum 100), color: string }] */
  function buildDonutGradientFlexible(segments) {
    var acc = 0;
    var parts = segments.map(function (seg) {
      var start = acc;
      acc += seg.pct;
      return seg.color + " " + start + "% " + Math.min(100, acc) + "%";
    });
    return "conic-gradient(" + parts.join(", ") + ")";
  }

  function breakdownRowsForCourse(courseId) {
    return D.gradeCategoryBreakdown(courseId, state.gradeEntries || []);
  }

  function renderDonutLegend(selectedCourseId) {
    var leg = document.getElementById("gr-donut-legend");
    var donut = document.getElementById("gr-donut");
    var center = document.getElementById("gr-donut-pct");
    var scopeEl = document.getElementById("gr-breakdown-scope");

    if (selectedCourseId) {
      var c = courseById(selectedCourseId);
      if (scopeEl) scopeEl.textContent = c ? "(" + (c.code || "") + (c.name ? " · " + c.name : "") + ")" : "(Course)";
      var br = breakdownRowsForCourse(selectedCourseId);
      var totalW = 0;
      br.forEach(function (row) {
        totalW += row.weight || 0;
      });
      var coursePct = D.courseGradePercent(selectedCourseId, state.gradeEntries);
      if (totalW <= 0) {
        if (donut) donut.style.background = "conic-gradient(#e5e7eb 0% 100%)";
        if (center)
          center.textContent =
            coursePct != null && isFinite(coursePct) ? Math.round(coursePct * 10) / 10 + "%" : "—";
        if (leg) {
          leg.innerHTML =
            '<li class="muted">No weighted entries for this course yet. Log grades below (with category weights). To manage courses, open <a href="courses.html">Courses</a>.</li>';
        }
        return;
      }
      var segments = [];
      var legendLines = [];
      SYLLABUS.forEach(function (s) {
        var row = br.find(function (r) {
          return r.category === s.key;
        });
        var avg = row && row.avg != null ? row.avg : null;
        var w = row && row.weight ? row.weight : 0;
        var sharePct = Math.round(((w / totalW) * 100 + Number.EPSILON) * 10) / 10;
        var slice = (w / totalW) * 100;
        segments.push({ pct: slice, color: s.color });
        legendLines.push(
          "<li><span class=\"gr-dot\" style=\"background:" +
            esc(s.color) +
            '\"></span>' +
            esc(s.label) +
            " · " +
            esc(String(sharePct)) +
            "% weight" +
            " · " +
            (avg != null && isFinite(avg) ? esc(String(avg)) + "% score" : "—") +
            "</li>"
        );
      });
      var segSum = segments.reduce(function (a, b) {
        return a + b.pct;
      }, 0);
      if (segSum <= 0) {
        segments = SYLLABUS.map(function (s) {
          return { pct: 20, color: s.color };
        });
      } else {
        segments.forEach(function (seg) {
          seg.pct = (seg.pct / segSum) * 100;
        });
      }
      if (donut) donut.style.background = buildDonutGradientFlexible(segments);
      if (center)
        center.textContent =
          coursePct != null && isFinite(coursePct) ? Math.round(coursePct * 10) / 10 + "%" : "—";
      if (leg) leg.innerHTML = legendLines.join("");
      return;
    }

    if (scopeEl) scopeEl.textContent = "(All Courses)";
    var wPct = weightedCourseGradePct();
    var earnedMap = earnedByCategory(overallAvg());
    if (donut) donut.style.background = buildDonutGradient();
    if (center)
      center.textContent = isFinite(wPct) && wPct != null ? Math.round(wPct * 10) / 10 + "%" : "—";
    if (!leg) return;
    leg.innerHTML = SYLLABUS.map(function (s) {
      var e = earnedMap[s.key];
      return (
        "<li><span class=\"gr-dot\" style=\"background:" +
        esc(s.color) +
        '\"></span>' +
        esc(s.label) +
        " · " +
        esc(s.weight) +
        "% weight · " +
        (e != null && isFinite(e) ? esc(String(e)) + "% score" : "—") +
        "</li>"
      );
    }).join("");
  }

  function sparklineSvg(values, stroke) {
    if (!values.length) return "";
    if (values.length === 1) values = [values[0], values[0]];
    var w = 56,
      h = 22,
      pad = 2;
    var min = Math.min.apply(null, values),
      max = Math.max.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      var x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
      var y = h - pad - ((v - min) / span) * (h - pad * 2);
      return x + "," + y;
    });
    return (
      '<svg class="gr-spark" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" aria-hidden="true"><polyline fill="none" stroke="' +
      esc(stroke) +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="' +
      pts.join(" ") +
      '"/></svg>'
    );
  }

  function sparkPointsForCourse(courseId) {
    var entries = (state.gradeEntries || [])
      .filter(function (g) {
        return g.courseId === courseId;
      })
      .sort(function (a, b) {
        return (a.assignment || "").localeCompare(b.assignment || "");
      });
    return entries
      .map(function (g) {
        return entryPct(g);
      })
      .filter(function (p) {
        return p != null;
      });
  }

  function matchesFilter(text) {
    var q = ui.filterText.trim().toLowerCase();
    if (!q) return true;
    return text.toLowerCase().indexOf(q) >= 0;
  }

  function renderByCourseTable() {
    var tb = document.getElementById("gr-tbody-by-course");
    var empty = document.getElementById("gr-empty-by-course");
    if (!tb) return;
    var rows = (state.gradeEntries || []).filter(function (g) {
      var c = courseById(g.courseId);
      var blob = (c ? c.code + " " + c.name : "") + " " + (g.assignment || "") + " " + (g.category || "");
      return matchesFilter(blob);
    });
    rows.sort(function (a, b) {
      var ca = (courseById(a.courseId) || {}).code || "";
      var cb = (courseById(b.courseId) || {}).code || "";
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.assignment || "").localeCompare(b.assignment || "");
    });
    if (!rows.length) {
      tb.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    tb.innerHTML = rows
      .map(function (g) {
        var c = courseById(g.courseId);
        var pct = entryPct(g);
        var letter = letterFromPercent(pct);
        var pts = sparkPointsForCourse(g.courseId);
        var stroke = letter.indexOf("A") === 0 ? "#15803d" : letter.indexOf("B") === 0 ? "#2563eb" : "#64748b";
        return (
          "<tr><td><div class=\"gr-course-cell\"><strong>" +
          esc(c ? c.code : "?") +
          '</strong><span class="gr-course-assign">' +
          esc(g.assignment) +
          "</span></div></td><td class=\"" +
          letterClass(letter) +
          '">' +
          esc(letter) +
          "</td><td>" +
          (pts.length ? sparklineSvg(pts, stroke) : "—") +
          '</td><td>' +
          (pct == null ? "—" : Math.round(pct * 10) / 10 + "%") +
          "</td></tr>"
        );
      })
      .join("");
  }

  function renderGradeScaleBlock(courseId) {
    var ul = document.getElementById("gr-scale-list");
    var noteEl = document.getElementById("gr-weighted-scale-note");
    if (!ul) return;
    var bands = !courseId
      ? D.defaultLetterGradeBands()
      : D.letterGradeBandsForCourse(courseById(courseId));
    ul.innerHTML = (bands || []).map(function (b) {
      return "<li>" + esc(b.letter) + ": " + esc(b.display || "") + "</li>";
    }).join("");
    if (noteEl) {
      if (!courseId) {
        noteEl.textContent =
          "Default letter scale for this portfolio summary. Select a course for class-specific bands after syllabus analysis.";
      } else {
        var c = courseById(courseId);
        var hasExtract =
          c &&
          c.syllabusExtracted &&
          Array.isArray(c.syllabusExtracted.letterGradeBands) &&
          c.syllabusExtracted.letterGradeBands.length;
        noteEl.textContent = hasExtract
          ? "Bands from your saved syllabus analysis — confirm with the official syllabus."
          : "Default bands — open Courses, select this class, and run Analyze syllabus (or paste grading policy) to match your syllabus.";
      }
    }
  }

  function renderWeightedTable() {
    var scopeId = ui.weightedCourseId;
    var tbody = document.getElementById("gr-weighted-tbody");
    var scopeEl = document.getElementById("gr-weighted-scope");
    var wPct;
    var earnedMap;
    var oa = overallAvg();
    if (!scopeId) {
      wPct = weightedCourseGradePct();
      earnedMap = earnedByCategory(oa);
      if (scopeEl) scopeEl.textContent = "(All Courses)";
    } else {
      wPct = syllabusRuleWeightedPct(scopeId);
      var ca = courseEntriesAverage(scopeId);
      earnedMap = earnedByCategoryForCourse(scopeId, ca != null ? ca : oa);
      var c = courseById(scopeId);
      if (scopeEl)
        scopeEl.textContent = c ? "(" + (c.code || "") + (c.name ? " · " + c.name : "") + ")" : "(Course)";
    }
    var fallbackFill = oa;
    if (scopeId) {
      var cx = courseEntriesAverage(scopeId);
      if (cx != null && isFinite(cx)) fallbackFill = cx;
    }
    if (!tbody) return;
    tbody.innerHTML = SYLLABUS.map(function (s) {
      var e = earnedMap[s.key];
      if (e == null || !isFinite(e)) e = fallbackFill != null && isFinite(fallbackFill) ? fallbackFill : 0;
      var contrib = (s.weight / 100) * e;
      return (
        "<tr><td><span class=\"gr-cat-dot\" style=\"background:" +
        esc(s.color) +
        '\"></span>' +
        esc(s.label) +
        "</td><td>" +
        esc(s.weight) +
        "%</td><td>" +
        (isFinite(e) ? Math.round(e * 10) / 10 + "%" : "—") +
        "</td><td>" +
        Math.round(contrib * 10) / 10 +
        "%</td></tr>"
      );
    }).join("");
    var cp = document.getElementById("gr-current-pct");
    var cl = document.getElementById("gr-current-letter");
    if (cp) cp.textContent = isFinite(wPct) && wPct != null ? Math.round(wPct * 10) / 10 + "%" : "—";
    if (cl) {
      var lett = !scopeId
        ? letterFromPercent(wPct)
        : D.letterFromBands(wPct, D.letterGradeBandsForCourse(courseById(scopeId)));
      cl.textContent = lett;
      cl.className = "gr-letter-badge" + (letterClass(lett) ? " " + letterClass(lett) : "");
    }
    renderGradeScaleBlock(scopeId);
  }

  function trendSeries() {
    var entries = (state.gradeEntries || []).slice();
    if (entries.length < 2) {
      return [
        { label: "Week 1", val: 60, proj: false },
        { label: "Week 4", val: 72, proj: false },
        { label: "Week 8", val: 78, proj: false },
        { label: "Week 12", val: 85, proj: true },
        { label: "Final", val: 88, proj: true },
      ];
    }
    entries.sort(function (a, b) {
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    var running = [];
    var sum = 0;
    for (var i = 0; i < entries.length; i++) {
      var p = entryPct(entries[i]);
      if (p == null) continue;
      sum += p;
      running.push(sum / (i + 1));
    }
    var base = overallAvg() || running[running.length - 1] || 75;
    var w1 = running[0] || base * 0.85;
    var w4 = running[Math.min(1, running.length - 1)] || base * 0.92;
    var w8 = running[Math.min(3, running.length - 1)] || base;
    var w12 = Math.min(98, base + 6);
    var fin = Math.min(99, base + 8);
    return [
      { label: "Week 1", val: Math.round(w1), proj: false },
      { label: "Week 4", val: Math.round(w4), proj: false },
      { label: "Week 8", val: Math.round(w8), proj: false },
      { label: "Week 12", val: Math.round(w12), proj: true },
      { label: "Final", val: Math.round(fin), proj: true },
    ];
  }

  function renderTrendSvg() {
    var svg = document.getElementById("gr-trend-svg");
    if (!svg) return;
    var series = trendSeries();
    var W = 320,
      H = 140,
      pad = { l: 36, r: 16, t: 16, b: 28 };
    var innerW = W - pad.l - pad.r,
      innerH = H - pad.t - pad.b;
    function yScale(v) {
      return pad.t + innerH - (v / 100) * innerH;
    }
    function xScale(i) {
      return pad.l + (i / (series.length - 1)) * innerW;
    }
    var solidPts = [];
    var dashedPts = [];
    var switchIx = 0;
    for (var i = 0; i < series.length; i++) {
      if (!series[i].proj) switchIx = i;
    }
    for (i = 0; i <= switchIx; i++) solidPts.push(xScale(i) + "," + yScale(series[i].val));
    for (i = switchIx; i < series.length; i++) dashedPts.push(xScale(i) + "," + yScale(series[i].val));

    var xLabs = ["Week 1", "Week 4", "Week 8", "Week 12", "Final"];
    var xl = "";
    for (i = 0; i < series.length; i++) {
      xl +=
        '<text x="' +
        xScale(i) +
        '" y="' +
        (H - 6) +
        '" text-anchor="middle" font-size="10" fill="#64748b">' +
        esc(series[i].label) +
        "</text>";
    }
    var yTicks = [0, 25, 50, 75, 100];
    var yg = "";
    yTicks.forEach(function (yt) {
      yg +=
        '<text x="' +
        (pad.l - 8) +
        '" y="' +
        (yScale(yt) + 4) +
        '" text-anchor="end" font-size="10" fill="#94a3b8">' +
        yt +
        "%</text>";
      yg +=
        '<line x1="' +
        pad.l +
        '" y1="' +
        yScale(yt) +
        '" x2="' +
        (W - pad.r) +
        '" y2="' +
        yScale(yt) +
        '" stroke="#e5e7eb" stroke-width="1"/>';
    });

    svg.innerHTML =
      yg +
      '<polyline fill="none" stroke="#2563eb" stroke-width="2.5" points="' +
      solidPts.join(" ") +
      '" />' +
      '<polyline fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6 5" points="' +
      dashedPts.join(" ") +
      '" />' +
      series
        .map(function (p, i) {
          return (
            '<circle cx="' +
            xScale(i) +
            '" cy="' +
            yScale(p.val) +
            '" r="4" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>'
          );
        })
        .join("") +
      xl;
  }

  function renderAiInsight(wPct, earnedMap) {
    var headline = document.getElementById("gr-ai-headline");
    var summary = document.getElementById("gr-ai-summary");
    var bullets = document.getElementById("gr-ai-bullets");
    if (!headline || !summary || !bullets) return;
    var avg = overallAvg();
    if (avg == null || !(state.gradeEntries || []).length) {
      headline.textContent = "Add grade entries";
      summary.textContent =
        "Log assignment scores below or enable sample data to unlock personalized momentum tracking and suggestions.";
      bullets.innerHTML = "";
      return;
    }
    headline.textContent = avg >= 80 ? "Good momentum!" : avg >= 70 ? "Steady progress" : "Let's raise the curve";
    var hint = D.studyRecommendationHint(D.isoFromDate(new Date()), state.courses, state.tasks, state.gradeEntries);
    summary.textContent =
      "You are performing " +
      (avg >= 82 ? "well overall." : "within reach of your goals.") +
      " Focus on categories where scores trail your strongest work to lift your composite.";
    var items = [];
    var weakQuiz = earnedMap.quiz != null && earnedMap.homework != null && earnedMap.quiz < earnedMap.homework - 5;
    var weakProj = earnedMap.project != null && earnedMap.project < (wPct || avg) - 4;
    items.push({
      ico: "✓",
      text: earnedMap.exam != null && earnedMap.exam >= 78 ? "Keep up strong exam preparation habits." : "Schedule exam review sessions earlier in the unit.",
    });
    items.push({
      ico: weakQuiz ? "!" : "◇",
      text: weakQuiz ? "Consider extra practice on quizzes to stabilize variance." : "Maintain quiz cadence — consistency builds confidence.",
    });
    items.push({
      ico: "📅",
      text: weakProj ? "Attend office hours for project feedback before the next milestone." : "Review rubrics before submitting major projects.",
    });
    bullets.innerHTML = items
      .map(function (it) {
        return (
          '<li><span class="gr-ai-ico" aria-hidden="true">' +
          esc(it.ico) +
          "</span><span>" +
          esc(it.text) +
          "</span></li>"
        );
      })
      .join("");
  }

  function renderRiskAndActions(wPct) {
    var riskHost = document.getElementById("gr-risk-host");
    var actionHost = document.getElementById("gr-action-host");
    var adviseHost = document.getElementById("gr-advise-host");
    var risks = [];
    (state.courses || []).forEach(function (c) {
      var p = D.courseGradePercent(c.id, state.gradeEntries);
      if (p == null) return;
      if (p < 72)
        risks.push({
          cls: "gr-alert-row--red",
          title: "At risk: " + c.code + " overall",
          desc: "Current average is below the comfort zone — prioritize catch-up blocks.",
        });
      else if (p < 80)
        risks.push({
          cls: "gr-alert-row--orange",
          title: "Watch: " + c.code + " performance",
          desc: "Room to improve before the next exam window.",
        });
    });
    var math = (state.courses || []).find(function (c) {
      return (c.code || "").toUpperCase().indexOf("MATH") >= 0;
    });
    if (math && risks.length < 3) {
      var mq = earnedByCategory(overallAvg()).quiz;
      var mh = earnedByCategory(overallAvg()).homework;
      if (mq != null && mh != null && mq + 5 < mh)
        risks.push({
          cls: "gr-alert-row--orange",
          title: "Low quiz average: " + math.code,
          desc: "Consider additional practice to lift quiz category scores.",
        });
    }
    if (!risks.length && (state.courses || []).length) {
      var c0 = state.courses[0];
      risks.push({
        cls: "gr-alert-row--blue",
        title: "Stay engaged: " + c0.code,
        desc: "Keep logging scores so alerts stay accurate.",
      });
    }
    if (riskHost)
      riskHost.innerHTML = risks
        .slice(0, 3)
        .map(function (r) {
          return (
            '<div class="gr-alert-row ' +
            r.cls +
            '"><div><strong>' +
            esc(r.title) +
            "</strong><p>" +
            esc(r.desc) +
            '</p></div><a class="gr-btn-ghost-sm" href="courses.html">View Course</a></div>'
          );
        })
        .join("") || '<p class="muted">No automated flags. Nice work.</p>';

    var actions = [];
    (state.courses || []).forEach(function (c) {
      var p = D.courseGradePercent(c.id, state.gradeEntries);
      if (p != null && p < 85)
        actions.push({
          ico: "📄",
          bg: "rgba(37,99,235,0.12)",
          title: "Review " + esc(c.code) + " rubric and feedback",
          sub: "Tighten next submission.",
          btn: "Start",
          href: "courses.html",
        });
    });
    if (actions.length < 3) {
      actions.push({
        ico: "✏",
        bg: "rgba(22,163,74,0.12)",
        title: "Take quiz practice",
        sub: "Mixed drills based on your entries.",
        btn: "Practice",
        href: "tasks.html",
      });
      actions.push({
        ico: "🕐",
        bg: "rgba(234,88,12,0.12)",
        title: "Attend office hours",
        sub: "Bring two targeted questions.",
        btn: "Schedule",
        href: "communication.html",
      });
    }
    if (actionHost)
      actionHost.innerHTML = actions
        .slice(0, 3)
        .map(function (a) {
          return (
            '<div class="gr-action-row"><div class="gr-action-ico" style="background:' +
            a.bg +
            '">' +
            a.ico +
            '</div><div><strong>' +
            esc(a.title) +
            "</strong><p>" +
            esc(a.sub) +
            '</p></div><a class="gr-btn-ghost-sm" href="' +
            esc(a.href) +
            '">' +
            esc(a.btn) +
            "</a></div>"
          );
        })
        .join("");

    var advise = [
      {
        ico: "👤",
        bg: "rgba(37,99,235,0.1)",
        t: "Consider meeting your advisor",
        s: "Discuss course load and academic goals.",
        b: "Schedule",
        href: "communication.html",
      },
      {
        ico: "📚",
        bg: "rgba(22,163,74,0.1)",
        t: "Explore tutoring resources",
        s: "Get personalized academic support.",
        b: "Explore",
        href: "features.html",
      },
      {
        ico: "🛡",
        bg: "rgba(37,99,235,0.1)",
        t: "Check degree progress",
        s: "Ensure you are on track for graduation.",
        b: "Review",
        href: "settings.html",
      },
    ];
    if (adviseHost)
      adviseHost.innerHTML = advise
        .map(function (a) {
          return (
            '<div class="gr-action-row"><div class="gr-action-ico" style="background:' +
            a.bg +
            '">' +
            a.ico +
            '</div><div><strong>' +
            esc(a.t) +
            "</strong><p>" +
            esc(a.s) +
            '</p></div><a class="gr-btn-ghost-sm" href="' +
            esc(a.href) +
            '">' +
            esc(a.b) +
            "</a></div>"
          );
        })
        .join("");
  }

  function populateGoalSelect() {
    var sel = document.getElementById("gr-whatif-goal");
    var courseSel = document.getElementById("gr-whatif-course");
    if (!sel) return;
    var prev = sel.value;
    var cid = courseSel ? courseSel.value : "";
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
    var ok = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === prev) {
        ok = true;
        break;
      }
    }
    sel.value = ok ? prev : sel.options[0] ? sel.options[0].value : "90";
  }

  function populateWhatifCourseSelect() {
    var sel = document.getElementById("gr-whatif-course");
    if (!sel) return;
    var cur = ui.whatifCourseId;
    sel.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Choose a course…";
    sel.appendChild(opt0);
    (state.courses || []).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = (c.code || "") + " — " + (c.name || "");
      sel.appendChild(opt);
    });
    var valid =
      cur === "" ||
      (state.courses || []).some(function (c) {
        return c.id === cur;
      });
    sel.value = valid ? cur : "";
    ui.whatifCourseId = sel.value;
  }

  function updateWhatIfUI() {
    var courseSel = document.getElementById("gr-whatif-course");
    var goalSel = document.getElementById("gr-whatif-goal");
    var feasEl = document.getElementById("gr-whatif-feasibility");
    var neededEl = document.getElementById("gr-whatif-needed");
    var remEl = document.getElementById("gr-whatif-remaining");
    var asm = document.getElementById("gr-whatif-assumptions");
    var catUl = document.getElementById("gr-whatif-by-cat");
    var catWrap = document.getElementById("gr-whatif-by-cat-wrap");

    function setFeas(cls, text, show) {
      if (!feasEl) return;
      feasEl.hidden = !show;
      feasEl.className = "gr-whatif-feasibility" + (cls ? " " + cls : "");
      feasEl.textContent = text || "";
    }

    var courseId = courseSel ? courseSel.value : "";

    if (!courseId) {
      if (neededEl) neededEl.textContent = "—";
      if (remEl) remEl.textContent = "Select a course to estimate remaining weight.";
      if (asm) asm.innerHTML = "";
      if (catUl) catUl.innerHTML = "";
      if (catWrap) catWrap.hidden = true;
      setFeas("", "", false);
      return;
    }
    if (catWrap) catWrap.hidden = false;

    var goal = parseFloat(goalSel && goalSel.value ? goalSel.value : "90", 10);
    var bd = remainingWeights(courseId);
    var ew = sumLoggedWeights(courseId);
    var rw = Math.max(0, 100 - ew);
    var cur = D.courseGradePercent(courseId, state.gradeEntries);
    if (cur == null || !isFinite(cur)) cur = 0;

    if (rw <= 0.001) {
      if (neededEl) neededEl.textContent = "—";
      if (remEl) remEl.textContent = "All course weight is logged — average is fixed from entries.";
      var lockMsg =
        cur >= goal
          ? "Already at or above this goal — current weighted average is " + Math.round(cur * 10) / 10 + "%."
          : "No remaining logged weight — current " +
            Math.round(cur * 10) / 10 +
            "% is below goal; new scores cannot be modeled until you add upcoming items under Courses / grade log.";
      setFeas(cur >= goal ? "is-ok" : "is-bad", lockMsg, true);
      if (asm)
        asm.innerHTML = SYLLABUS.map(function (s) {
          return "<li>" + esc(s.label) + " — syllabus slot " + esc(String(s.weight)) + "% (weight fully logged)</li>";
        }).join("");
      if (catUl)
        catUl.innerHTML = '<li class="muted">No unfinished category weight — ranges do not apply.</li>';
      return;
    }

    var need = D.whatIfNeededAverage(goal, cur, ew, rw);
    if (neededEl)
      neededEl.textContent =
        need == null || !isFinite(need) ? "—" : Math.round(need * 10) / 10 + "%";
    if (remEl)
      remEl.textContent =
        "About " +
        Math.round(rw * 10) / 10 +
        "% of course weight still open (you’ve logged " +
        Math.round(ew * 10) / 10 +
        "%).";

    var aggImpossible = need != null && isFinite(need) && need > 100;
    var aggEasy = need != null && isFinite(need) && need < 0;

    if (aggImpossible) {
      setFeas(
        "is-bad",
        "Not achievable under this simple model — uniform " +
          Math.round(need * 10) / 10 +
          "% on all remaining work exceeds 100%. Try a lower goal or confirm weights on Courses.",
        true
      );
    } else if (aggEasy) {
      setFeas(
        "is-warn",
        "Likely already sufficient — modeled remaining average can be below zero (verify; model assumes one blended score on all remaining work).",
        true
      );
    } else if (need != null && isFinite(need)) {
      setFeas(
        "is-ok",
        "Achievable in principle — about " +
          Math.round(need * 10) / 10 +
          "% average across all remaining weighted work (combined).",
        true
      );
    } else {
      setFeas("", "", false);
    }

    if (asm) {
      asm.innerHTML = SYLLABUS.map(function (s) {
        var r = bd.rem[s.key];
        if (r <= 0)
          return "<li>" + esc(s.label) + " — no remaining syllabus weight in this category</li>";
        return (
          "<li>" +
          esc(s.label) +
          " — " +
          Math.round(r * 10) / 10 +
          "% of course grade still open here</li>"
        );
      }).join("");
    }

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
      var catUnreachable = rawLow > 100;
      var low = Math.max(0, Math.min(100, rawLow));
      var high = Math.max(0, Math.min(100, rawHigh));
      var loDisp = Math.round(low * 10) / 10;
      var hiDisp = Math.round(high * 10) / 10;
      var note = "";
      if (catUnreachable)
        note =
          ' <span class="gr-whatif-bad">Cannot reach goal</span> in this category even if every other unfinished category is perfect.';
      else if (rawHigh < 0) note = ' <span class="muted">Goal already covered by locked scores.</span>';
      return (
        "<li><span class=\"gr-dot\" style=\"background:" +
        esc(s.color) +
        '\"></span><strong>' +
        esc(s.label) +
        "</strong> (" +
        Math.round(remk * 10) / 10 +
        "% left): need about <strong>" +
        loDisp +
        "%–" +
        hiDisp +
        "%</strong> on what’s left here (low end if other open categories go well; high end if they don’t)." +
        note +
        "</li>"
      );
    }).join("");
  }

  function renderWhatIf() {
    populateWhatifCourseSelect();
    populateGoalSelect();
    updateWhatIfUI();
    var goalSel = document.getElementById("gr-whatif-goal");
    var courseSel = document.getElementById("gr-whatif-course");
    if (goalSel && !goalSel._whatifBound) {
      goalSel._whatifBound = true;
      goalSel.addEventListener("change", updateWhatIfUI);
    }
    if (courseSel && !courseSel._whatifBound) {
      courseSel._whatifBound = true;
      courseSel.addEventListener("change", function () {
        ui.whatifCourseId = courseSel.value;
        populateGoalSelect();
        updateWhatIfUI();
      });
    }
  }

  function renderEntriesTable() {
    var host = document.getElementById("gr-entries-table-host");
    if (!host) return;
    if (!(state.gradeEntries || []).length) {
      host.innerHTML = '<p class="muted">No grade entries yet.</p>';
      return;
    }
    var rows = (state.gradeEntries || []).filter(function (g) {
      var c = courseById(g.courseId);
      return matchesFilter((c ? c.code : "") + " " + g.assignment);
    });
    if (!rows.length) {
      host.innerHTML = '<p class="muted">No entries match your search.</p>';
      return;
    }
    host.innerHTML =
      '<table class="gr-table"><thead><tr><th>Course</th><th>Item</th><th>Score</th><th>Weight%</th><th></th></tr></thead><tbody>' +
      rows
        .map(function (g) {
          var c = courseById(g.courseId);
          return (
            "<tr><td>" +
            esc(c ? c.code : "") +
            "</td><td>" +
            esc(g.assignment) +
            "</td><td>" +
            esc(String(g.score)) +
            "/" +
            esc(String(g.pointsPossible)) +
            '</td><td>' +
            esc(String(g.weightPercent || "")) +
            '</td><td><button type="button" class="btn btn-ghost btn-sm" data-gr-del="' +
            esc(g.id) +
            '">Remove</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table>";
    host.querySelectorAll("[data-gr-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-gr-del");
        state.gradeEntries = (state.gradeEntries || []).filter(function (x) {
          return x.id !== id;
        });
        save();
        renderAll();
      });
    });
  }

  function populateCourseSelect() {
    var sel = document.getElementById("gr-g-course");
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = "";
    (state.courses || []).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = (c.code || "") + " — " + (c.name || "");
      sel.appendChild(opt);
    });
    var ok = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === cur) {
        ok = true;
        break;
      }
    }
    sel.value = ok ? cur : sel.options[0] ? sel.options[0].value : "";
  }

  function populateBreakdownSelect() {
    var sel = document.getElementById("gr-breakdown-course");
    if (!sel) return;
    var cur = ui.breakdownCourseId;
    sel.innerHTML = "";
    var optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All courses";
    sel.appendChild(optAll);
    (state.courses || []).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = (c.code || "") + " — " + (c.name || "");
      sel.appendChild(opt);
    });
    var valid =
      cur === "" ||
      (state.courses || []).some(function (c) {
        return c.id === cur;
      });
    sel.value = valid ? cur : "";
    ui.breakdownCourseId = sel.value;
  }

  function populateWeightedCourseSelect() {
    var sel = document.getElementById("gr-weighted-course");
    if (!sel) return;
    var cur = ui.weightedCourseId;
    sel.innerHTML = "";
    var optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All courses";
    sel.appendChild(optAll);
    (state.courses || []).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = (c.code || "") + " — " + (c.name || "");
      sel.appendChild(opt);
    });
    var valid =
      cur === "" ||
      (state.courses || []).some(function (c) {
        return c.id === cur;
      });
    sel.value = valid ? cur : "";
    ui.weightedCourseId = sel.value;
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

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("grades-sidebar-sem-pct");
    var fill = document.getElementById("grades-sidebar-progress-fill");
    var wk = document.getElementById("grades-sidebar-week-label");
    var tw = meta.totalWeeks || 16;
    var cw = meta.currentWeek || 1;
    var p = Math.min(100, Math.round((cw / tw) * 100));
    if (pct) pct.textContent = p + "%";
    if (fill) fill.style.width = p + "%";
    if (wk)
      wk.textContent =
        "Week " + cw + " of " + tw + " · " + (state.profile && state.profile.semesterLabel ? state.profile.semesterLabel : "");
  }

  function renderAll() {
    var wPct = weightedCourseGradePct();
    var earnedMap = earnedByCategory(overallAvg());

    var gwi = document.getElementById("grades-withdraw-inline");
    if (gwi) gwi.textContent = state.withdrawalDeadlineNote || "Withdrawal deadline — configure in demo seed.";

    renderByCourseTable();
    populateBreakdownSelect();
    renderDonutLegend(ui.breakdownCourseId);
    populateWeightedCourseSelect();
    renderWeightedTable();
    renderAiInsight(wPct, earnedMap);
    renderTrendSvg();
    renderWhatIf();
    renderRiskAndActions(wPct);
    populateCourseSelect();
    renderEntriesTable();
    renderSidebarSemester();
    syncTopBar();
  }

  function bind() {
    document.getElementById("form-grade-page").addEventListener("submit", function (e) {
      e.preventDefault();
      var gc = document.getElementById("gr-g-course").value;
      if (!gc) {
        alert("Select a course.");
        return;
      }
      state.gradeEntries.push({
        id: D.uid(),
        courseId: gc,
        category: document.getElementById("gr-g-cat").value,
        assignment: document.getElementById("gr-g-assign").value.trim(),
        score: parseFloat(document.getElementById("gr-g-score").value),
        pointsPossible: parseFloat(document.getElementById("gr-g-max").value) || 100,
        weightPercent: parseFloat(document.getElementById("gr-g-weight").value) || 0,
      });
      save();
      e.target.reset();
      document.getElementById("gr-g-max").value = "100";
      renderAll();
    });

    var searchInp = document.getElementById("global-search");
    if (searchInp) {
      searchInp.addEventListener("input", function () {
        ui.filterText = searchInp.value;
        renderByCourseTable();
        renderEntriesTable();
      });
    }

    var bdCourse = document.getElementById("gr-breakdown-course");
    if (bdCourse) {
      bdCourse.addEventListener("change", function () {
        ui.breakdownCourseId = bdCourse.value;
        renderDonutLegend(ui.breakdownCourseId);
      });
    }

    var wCourse = document.getElementById("gr-weighted-course");
    if (wCourse) {
      wCourse.addEventListener("change", function () {
        ui.weightedCourseId = wCourse.value;
        renderWeightedTable();
      });
    }

    document.getElementById("gr-ai-expand").addEventListener("click", function () {
      var avg = overallAvg();
      alert(
        avg == null
          ? "Add grades to unlock expanded insights."
          : "Expanded insights: " +
              D.studyRecommendationHint(D.isoFromDate(new Date()), state.courses, state.tasks, state.gradeEntries)
      );
    });

    document.getElementById("gr-whatif-adjust").addEventListener("click", function () {
      document.querySelector(".gr-log-section").scrollIntoView({ behavior: "smooth", block: "start" });
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
        if (ddBody && open) {
          ddBody.innerHTML =
            '<p class="muted" style="padding:0.65rem;font-size:0.85rem;margin:0;">Open <a href="grades.html">Grades</a> for this workspace or the <a href="dashboard.html#overview">dashboard</a> overview.</p>';
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
        renderAll();
      });
    }
  }

  bind();
  renderAll();
})();
