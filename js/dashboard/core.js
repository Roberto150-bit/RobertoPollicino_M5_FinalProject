/**
 * DegreePilot dashboard — shared utilities and offline “simulated AI” logic.
 */

(function (global) {
  "use strict";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function uid() {
    return "dp_" + Math.random().toString(36).slice(2, 11);
  }

  function isoFromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseISO(iso) {
    var p = (iso || "").split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function addDays(base, days) {
    var x = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    x.setDate(x.getDate() + days);
    return x;
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  /** Monday-based week start for ISO-ish display */
  function startOfWeekMonday(d) {
    var day = d.getDay();
    var diff = (day + 6) % 7;
    return addDays(d, -diff);
  }

  /**
   * Paste announcement → pending change rows (keyword rules).
   */
  function announcementToPendingChanges(text, courseId) {
    var t = (text || "").toLowerCase();
    var out = [];
    if (!text || !text.trim()) return out;

    var dueGuess = isoFromDate(addDays(new Date(), 5));
    if (/\bfriday\b/.test(t)) dueGuess = isoFromDate(addDays(new Date(), (5 - new Date().getDay() + 7) % 7 || 7));

    if (/\bquiz\b/.test(t)) {
      out.push({
        id: uid(),
        kind: "task",
        title: "Quiz prep task (simulated)",
        detail: "Detected quiz mention — add prep blocks before due date.",
        checked: true,
        payload: {
          title: "Prepare for quiz",
          courseId: courseId || "",
          due: dueGuess,
          type: "quiz",
          priority: "High",
          estMinutes: 90,
          notes: "From announcement analyzer.",
        },
      });
      out.push({
        id: uid(),
        kind: "event",
        title: "Quiz on calendar (simulated)",
        detail: "Optional calendar marker for quiz day.",
        checked: true,
        payload: {
          title: "Quiz day",
          courseId: courseId || "",
          date: dueGuess,
          time: "10:00 AM",
          type: "exam",
          priority: "high",
        },
      });
    }
    if (/\b(exam|midterm|final)\b/.test(t)) {
      out.push({
        id: uid(),
        kind: "event",
        title: "Exam window (simulated)",
        detail: "Detected exam language.",
        checked: true,
        payload: {
          title: "Exam",
          courseId: courseId || "",
          date: dueGuess,
          time: "",
          type: "exam",
          priority: "high",
        },
      });
    }
    if (/\b(assign|homework|due|submit|project)\b/.test(t)) {
      out.push({
        id: uid(),
        kind: "task",
        title: "Assignment follow-up (simulated)",
        detail: "Detected deliverable language.",
        checked: true,
        payload: {
          title: "Complete indicated assignment",
          courseId: courseId || "",
          due: dueGuess,
          type: "assignment",
          priority: "Medium",
          estMinutes: 120,
          notes: "Verify exact due time in LMS.",
        },
      });
    }
    if (/\boffice hours\b/.test(t)) {
      out.push({
        id: uid(),
        kind: "study",
        title: "Plan office hours visit",
        detail: "Detected office hours mention.",
        checked: false,
        payload: {
          title: "Office hours prep questions",
          courseId: courseId || "",
          notes: "List 2 questions before attending.",
        },
      });
    }
    if (!out.length) {
      out.push({
        id: uid(),
        kind: "task",
        title: "Review announcement manually",
        detail: "No strong keyword hits — skim for dates and links.",
        checked: false,
        payload: {
          title: "Follow up on announcement",
          courseId: courseId || "",
          due: isoFromDate(addDays(new Date(), 3)),
          type: "reminder",
          priority: "Low",
          estMinutes: 20,
          notes: "",
        },
      });
    }
    return out;
  }

  function summarizeAnnouncementLines(text) {
    var lines = [];
    var raw = (text || "").trim();
    if (!raw) return ["Paste announcement text, then click Analyze to extract tasks and dates."];
    lines.push("Simulated summary (offline keyword scan — not a hosted AI model).");
    var t = raw.toLowerCase();
    if (/\bquiz\b/.test(t)) lines.push("• Quiz mentioned — extract date/time and scope.");
    if (/\b(exam|midterm|final)\b/.test(t)) lines.push("• Exam language detected — add prep blocks to calendar.");
    if (/\b(due|deadline|submit|assignment|homework)\b/.test(t)) lines.push("• Deadlines or submissions referenced — verify timezone.");
    if (/\boffice hours\b/.test(t)) lines.push("• Office hours referenced — capture location or link.");
    if (/\b(cancel|no class|postponed)\b/.test(t)) lines.push("• Possible schedule change — update planner.");
    if (lines.length === 1) lines.push("• No strong keyword hits — skim manually for bold dates and links.");
    return lines;
  }

  function analyzeAnnouncementFull(text, courseId) {
    return {
      summaryLines: summarizeAnnouncementLines(text),
      updates: announcementToPendingChanges(text, courseId),
    };
  }

  function hashCourseId(courseId) {
    var s = String(courseId || "");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /** Coarse letter bands for UI — includes min thresholds (high → low). */
  function defaultLetterGradeBands() {
    return [
      { letter: "A", min: 90, display: "90–100%" },
      { letter: "B", min: 80, display: "80–89%" },
      { letter: "C", min: 70, display: "70–79%" },
      { letter: "D", min: 60, display: "60–69%" },
      { letter: "F", min: 0, display: "Below 60%" },
    ];
  }

  /** Stricter A cutoff (common in STEM syllabi). */
  function strictLetterGradeBands() {
    return [
      { letter: "A", min: 93, display: "93–100%" },
      { letter: "B", min: 83, display: "83–92%" },
      { letter: "C", min: 73, display: "73–82%" },
      { letter: "D", min: 63, display: "63–72%" },
      { letter: "F", min: 0, display: "Below 63%" },
    ];
  }

  /** Example curved / alternative scale for demos. */
  function curvedLetterGradeBands() {
    return [
      { letter: "A", min: 85, display: "85–100%" },
      { letter: "B", min: 75, display: "75–84%" },
      { letter: "C", min: 65, display: "65–74%" },
      { letter: "D", min: 55, display: "55–64%" },
      { letter: "F", min: 0, display: "Below 55%" },
    ];
  }

  function simulatedLetterBandsForCourseId(courseId) {
    var v = hashCourseId(courseId) % 3;
    if (v === 1) return strictLetterGradeBands();
    if (v === 2) return curvedLetterGradeBands();
    return defaultLetterGradeBands();
  }

  function letterGradeBandsForCourse(course) {
    if (!course || typeof course !== "object") return defaultLetterGradeBands();
    var ext = course.syllabusExtracted;
    if (ext && Array.isArray(ext.letterGradeBands) && ext.letterGradeBands.length) {
      return ext.letterGradeBands;
    }
    return defaultLetterGradeBands();
  }

  /** Map numeric percent to letter using coarse bands (min sorted high → low). */
  function letterFromBands(pct, bands) {
    if (pct == null || !isFinite(pct)) return "—";
    var b = (bands || defaultLetterGradeBands())
      .filter(Boolean)
      .slice()
      .sort(function (a, x) {
        return (x.min || 0) - (a.min || 0);
      });
    for (var i = 0; i < b.length; i++) {
      if (pct >= (b[i].min || 0)) return b[i].letter || "—";
    }
    return "—";
  }

  function syllabusSimulation(courseId) {
    var base = isoFromDate(addDays(new Date(), 7));
    return {
      tasks: [
        { title: "Reading — syllabus acknowledgment quiz", due: isoFromDate(addDays(new Date(), 3)), type: "quiz", priority: "Low" },
        { title: "Problem set 1", due: base, type: "assignment", priority: "Medium" },
      ],
      exams: [{ title: "Midterm examination", date: isoFromDate(addDays(new Date(), 35)), type: "exam" }],
      policies: ["Late work policy: 10% per day up to 3 days.", "Academic integrity applies to all submissions."],
      gradingRules: [{ label: "Homework", weight: 30 }, { label: "Exams", weight: 45 }, { label: "Project", weight: 25 }],
      letterGradeBands: simulatedLetterBandsForCourseId(courseId),
    };
  }

  function screenshotSimulation() {
    var due = isoFromDate(addDays(new Date(), 5));
    return [
      {
        id: uid(),
        kind: "task",
        title: "Detected: assignment deadline",
        detail: "Simulated OCR — assignment row.",
        checked: true,
        payload: {
          title: "Lab reflection (from screenshot)",
          courseId: "",
          due: due,
          type: "assignment",
          priority: "High",
          estMinutes: 90,
          notes: "Screenshot simulation.",
        },
      },
      {
        id: uid(),
        kind: "event",
        title: "Detected: exam date",
        detail: "Simulated calendar strip.",
        checked: true,
        payload: {
          title: "Midterm review session",
          courseId: "",
          date: isoFromDate(addDays(new Date(), 12)),
          time: "5:00 PM",
          type: "exam",
          priority: "high",
        },
      },
      {
        id: uid(),
        kind: "course_alert",
        title: "Detected: announcement snippet",
        detail: "Instructor note about attendance.",
        checked: false,
        payload: {
          courseId: "",
          text: "Attendance policy emphasized on syllabus screenshot.",
          level: "warn",
        },
      },
      {
        id: uid(),
        kind: "event",
        title: "Detected: school deadline",
        detail: "Financial aid / registrar style date.",
        checked: true,
        payload: {
          title: "Registrar deadline",
          courseId: "",
          date: isoFromDate(addDays(new Date(), 20)),
          time: "",
          type: "school",
          priority: "medium",
        },
      },
    ];
  }

  function audioSimulation() {
    return {
      summary: "Simulated lecture capture: instructor emphasized graph traversal examples and debugging adjacency lists.",
      topics: ["BFS vs DFS", "Cycle detection", "Complexity review"],
      questions: ["When does BFS outperform DFS?", "How would you detect a cycle in a directed graph?"],
      studyItems: [
        { title: "Redo traversal tracing worksheet", notes: "40 minutes, pen and paper." },
        { title: "Implement iterative DFS starter", notes: "Compare with recursive version." },
      ],
      queuedFromAudio: [],
    };
  }

  function weightedPercentFromEntries(entries) {
    var sumW = 0;
    var sum = 0;
    (entries || []).forEach(function (e) {
      var pct = e.pointsPossible ? (parseFloat(e.score) / parseFloat(e.pointsPossible)) * 100 : parseFloat(e.score);
      var w = parseFloat(e.weightPercent);
      if (!isFinite(pct) || !isFinite(w) || w <= 0) return;
      sum += pct * w;
      sumW += w;
    });
    if (sumW <= 0) return null;
    return Math.round((sum / sumW) * 10) / 10;
  }

  function courseGradePercent(courseId, gradeEntries) {
    var rows = (gradeEntries || []).filter(function (g) {
      return g.courseId === courseId;
    });
    return weightedPercentFromEntries(rows);
  }

  function overallGpaSnapshot(courses, gradeEntries) {
    var vals = [];
    (courses || []).forEach(function (c) {
      var p = courseGradePercent(c.id, gradeEntries);
      if (p != null) vals.push(p);
    });
    if (!vals.length) return null;
    var sum = vals.reduce(function (a, b) {
      return a + b;
    }, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  function whatIfNeededAverage(desiredFinal, currentPct, earnedWeight, remainingWeight) {
    var df = parseFloat(desiredFinal);
    var cp = parseFloat(currentPct);
    var ew = parseFloat(earnedWeight);
    var rw = parseFloat(remainingWeight);
    if (!isFinite(df) || !isFinite(cp) || !isFinite(ew) || !isFinite(rw) || rw <= 0) return null;
    var num = df * (ew + rw) - cp * ew;
    return Math.round((num / rw) * 10) / 10;
  }

  function standingLabel(pct) {
    if (pct == null || !isFinite(pct)) return { key: "unknown", label: "—", cls: "" };
    if (pct >= 90) return { key: "strong", label: "Strong", cls: "is-strong" };
    if (pct >= 80) return { key: "good", label: "Good standing", cls: "is-good" };
    if (pct >= 70) return { key: "recover", label: "Recoverable", cls: "is-recover" };
    return { key: "risk", label: "At risk", cls: "is-risk" };
  }

  function buildStudyPlanBlocks(opts) {
    var mode = opts.mode || "deadlines";
    var hours = parseFloat(opts.hoursPerDay) || 2;
    var conf = parseInt(opts.confidence, 10) || 3;
    var tasks = opts.tasks || [];
    var gradeEntries = opts.gradeEntries || [];
    var courses = opts.courses || [];
    var open = tasks.filter(function (t) {
      return !t.completed;
    });
    open.sort(function (a, b) {
      return a.due.localeCompare(b.due);
    });
    var blocks = [];
    if (mode === "grades") {
      var lows = courses.filter(function (c) {
        var p = courseGradePercent(c.id, gradeEntries);
        return p != null && p < 82;
      });
      blocks.push(
        lows.length
          ? "Grade-aware focus: spend deeper blocks on " +
              lows
                .map(function (c) {
                  return c.code;
                })
                .join(", ") +
              " before the next exams."
          : "Grades look steady — maintain spaced review and sleep-regular cadence."
      );
    } else if (mode === "confidence") {
      blocks.push(conf <= 2 ? "Rebuild fundamentals with guided examples before timed drills." : "Shift to exam-style prompts and self-quizzing.");
    } else {
      blocks.push("Work backward from the nearest due dates — allocate deep-focus blocks to highest-weight items.");
    }
    blocks.push("Budget roughly " + hours + " hours/day across " + Math.min(4, open.length || 1) + " focused sessions with breaks.");
    open.slice(0, 5).forEach(function (t, i) {
      blocks.push((i + 1) + ". " + t.title + " — target slot before " + t.due);
    });
    blocks.push("Simulated plan only — adjust to your real syllabus and energy patterns.");
    return blocks;
  }

  function gradeCategoryBreakdown(courseId, gradeEntries) {
    var cats = ["exam", "homework", "project", "quiz", "participation"];
    var map = {};
    cats.forEach(function (c) {
      map[c] = { weightedPctSum: 0, weightSum: 0 };
    });
    (gradeEntries || [])
      .filter(function (g) {
        return g.courseId === courseId;
      })
      .forEach(function (g) {
        var cat = g.category || "homework";
        if (!map[cat]) map[cat] = { weightedPctSum: 0, weightSum: 0 };
        var pct = g.pointsPossible ? (parseFloat(g.score) / parseFloat(g.pointsPossible)) * 100 : parseFloat(g.score) || 0;
        var w = parseFloat(g.weightPercent) || 0;
        map[cat].weightedPctSum += pct * w;
        map[cat].weightSum += w;
      });
    return cats.map(function (c) {
      var m = map[c];
      var avg = m.weightSum > 0 ? Math.round((m.weightedPctSum / m.weightSum) * 10) / 10 : null;
      return { category: c, avg: avg, weight: m.weightSum };
    });
  }

  function studyRecommendationHint(isoToday, courses, tasks, gradeEntries) {
    var overdue = tasks.filter(function (t) {
      return !t.completed && t.due < isoToday;
    });
    if (overdue.length) return "Study recommendation: finish overdue work starting with «" + overdue[0].title + "».";
    var weak = (courses || []).filter(function (c) {
      var p = courseGradePercent(c.id, gradeEntries);
      return p != null && p < 78;
    });
    if (weak.length) return "Study recommendation: add practice blocks for " + weak.map(function (c) { return c.code; }).join(", ") + " based on grade entries.";
    var soon = tasks
      .filter(function (t) {
        return !t.completed;
      })
      .sort(function (a, b) {
        return a.due.localeCompare(b.due);
      })[0];
    if (soon) return "Study recommendation: protect time before «" + soon.title + "» (" + soon.due + ").";
    return "Study recommendation: add courses and tasks to personalize suggestions.";
  }

  function scholarshipSuggestions(major) {
    var m = (major || "").toLowerCase();
    var base = [
      { name: "National STEM Achievement Grant", amount: "$1,500", note: "Merit + STEM majors — fictional demo." },
      { name: "First-Generation Success Award", amount: "$2,000", note: "Mixed need/merit — fictional demo." },
    ];
    if (/computer|cs|software|data/i.test(m)) {
      base.unshift({ name: "Computing Scholars Fellowship", amount: "$3,000", note: "CS / IT pathways — fictional demo." });
    }
    if (/math|stat/i.test(m)) {
      base.unshift({ name: "Quantitative Reasoning Award", amount: "$1,200", note: "Math-focused — fictional demo." });
    }
    return base.slice(0, 4);
  }

  function emailScenarioBodyVariant(scenario, fields, variant) {
    var base = emailScenarioBody(scenario, fields);
    var tag =
      variant % 2 === 1
        ? "\n\n(Please let me know if there is a preferred format for these requests.)"
        : "\n\nThank you again for your guidance this semester.";
    return base + tag;
  }

  function emailScenarioBody(scenario, fields) {
    var prof = fields.professor || "[Professor]";
    var crs = fields.course || "[Course]";
    var tone = fields.tone || "professional";
    var ctx = fields.context || "";
    var sig = fields.studentName || "[Student]";

    var opener =
      tone === "casual"
        ? "Hi " + prof.split(" ")[0] + ",\n\n"
        : tone === "friendly"
          ? "Hello " + prof + ",\n\n"
          : tone === "veryformal"
            ? "Dear " + prof + ",\n\n"
            : "Dear " + prof + ",\n\n";

    var bodies = {
      intro:
        opener +
        "I am enrolled in " +
        crs +
        " this semester and wanted to introduce myself. " +
        (ctx || "I am looking forward to the material.") +
        "\n\nThank you for your time,\n" +
        sig,
      clarify:
        opener +
        "I am writing regarding " +
        crs +
        ". Could you clarify the following? " +
        (ctx || "[Question]") +
        "\n\nBest,\n" +
        sig,
      extension:
        opener +
        "I am contacting you about an assignment in " +
        crs +
        ". " +
        (ctx || "Due to unforeseen circumstances, may I request a short extension?") +
        "\n\nThank you,\n" +
        sig,
      grade:
        opener +
        "I would appreciate guidance on my standing in " +
        crs +
        ". " +
        (ctx || "Could we discuss how I might improve before the next assessment?") +
        "\n\nSincerely,\n" +
        sig,
      advisor:
        opener +
        "I hope to discuss my academic plan as a " +
        (fields.major || "student") +
        " concentrating on " +
        crs +
        ". " +
        (ctx || "Could we schedule a brief meeting?") +
        "\n\nBest regards,\n" +
        sig,
    };
    return bodies[scenario] || bodies.intro;
  }

  function examPrepToolkit(topic) {
    var t = topic || "your upcoming exam";
    return {
      outline: ["Definitions & terminology", "Core algorithms / methods", "Worked examples", "Common pitfalls", "Timed practice"],
      flashcards: [
        { front: "Define key term from " + t, back: "Simulated answer — replace with your notes." },
        { front: "Walk through a representative problem", back: "Simulated solution sketch." },
      ],
      practice: ["Explain the concept as if teaching a peer.", "Complete two timed questions without notes.", "Review mistakes and write corrections."],
    };
  }

  function examFeedbackSim(resultsText) {
    var t = (resultsText || "").toLowerCase();
    return {
      strengths: ["Clear grasp of fundamentals", "Strong pacing on straightforward items"],
      weaknesses: ["Multi-step synthesis under time pressure"],
      recommendations: ["Drill mixed practice sets", "Review instructor feedback comments line-by-line"],
      note: /\d/.test(t) ? "Parsed numeric cues in your paste — still verify against the real rubric." : "Simulated feedback — paste detailed results for a richer debrief.",
    };
  }

  global.DegreePilotDashboardCore = {
    pad: pad,
    uid: uid,
    isoFromDate: isoFromDate,
    parseISO: parseISO,
    escapeHtml: escapeHtml,
    addDays: addDays,
    daysInMonth: daysInMonth,
    startOfWeekMonday: startOfWeekMonday,
    announcementToPendingChanges: announcementToPendingChanges,
    summarizeAnnouncementLines: summarizeAnnouncementLines,
    analyzeAnnouncementFull: analyzeAnnouncementFull,
    syllabusSimulation: syllabusSimulation,
    defaultLetterGradeBands: defaultLetterGradeBands,
    letterGradeBandsForCourse: letterGradeBandsForCourse,
    letterFromBands: letterFromBands,
    screenshotSimulation: screenshotSimulation,
    audioSimulation: audioSimulation,
    weightedPercentFromEntries: weightedPercentFromEntries,
    courseGradePercent: courseGradePercent,
    overallGpaSnapshot: overallGpaSnapshot,
    whatIfNeededAverage: whatIfNeededAverage,
    standingLabel: standingLabel,
    buildStudyPlanBlocks: buildStudyPlanBlocks,
    gradeCategoryBreakdown: gradeCategoryBreakdown,
    studyRecommendationHint: studyRecommendationHint,
    scholarshipSuggestions: scholarshipSuggestions,
    emailScenarioBody: emailScenarioBody,
    emailScenarioBodyVariant: emailScenarioBodyVariant,
    examPrepToolkit: examPrepToolkit,
    examFeedbackSim: examFeedbackSim,
  };
})(window);
