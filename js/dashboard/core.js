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
    };
  }

  function screenshotSimulation() {
    return [
      {
        id: uid(),
        kind: "task",
        title: "Screenshot: assignment due next week",
        detail: "Simulated OCR-style extraction.",
        checked: true,
        payload: {
          title: "Submit lab reflection",
          courseId: "",
          due: isoFromDate(addDays(new Date(), 7)),
          type: "assignment",
          priority: "Medium",
          estMinutes: 90,
          notes: "From screenshot simulation.",
        },
      },
      {
        id: uid(),
        kind: "event",
        title: "Screenshot: exam reminder",
        detail: "Simulated calendar cue.",
        checked: false,
        payload: {
          title: "Review session",
          courseId: "",
          date: isoFromDate(addDays(new Date(), 6)),
          time: "4:00 PM",
          type: "study",
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
      pendingChanges: [],
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
    var open = tasks.filter(function (t) {
      return !t.completed;
    });
    open.sort(function (a, b) {
      return a.due.localeCompare(b.due);
    });
    var blocks = [];
    if (mode === "grades") {
      blocks.push("Prioritize courses where measured average trails your goal; pair reading with practice problems.");
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
    syllabusSimulation: syllabusSimulation,
    screenshotSimulation: screenshotSimulation,
    audioSimulation: audioSimulation,
    weightedPercentFromEntries: weightedPercentFromEntries,
    courseGradePercent: courseGradePercent,
    overallGpaSnapshot: overallGpaSnapshot,
    whatIfNeededAverage: whatIfNeededAverage,
    standingLabel: standingLabel,
    buildStudyPlanBlocks: buildStudyPlanBlocks,
    emailScenarioBody: emailScenarioBody,
    examPrepToolkit: examPrepToolkit,
    examFeedbackSim: examFeedbackSim,
  };
})(window);
