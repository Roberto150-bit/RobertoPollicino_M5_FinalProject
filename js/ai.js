/**
 * Simulated “AI” helpers for DegreePilot AI (offline prototype).
 * These functions use keywords, thresholds, and templates — not a hosted LLM.
 * Label outputs in the UI as simulated so reviewers understand the scope.
 */

(function (global) {
  "use strict";

  function analyzeAnnouncement(text) {
    var t = (text || "").toLowerCase();
    var summary = [];
    var actions = [];
    var questions = [];

    summary.push("Simulated AI-style summary (keyword rules, offline).");

    if (!text || !text.trim()) {
      return {
        summary: ["Paste an announcement to generate a practice summary."],
        actions: ["Copy text from email or your LMS announcement page."],
        questions: ["What deadline or policy is most important here?"],
      };
    }

    if (/\b(exam|quiz|test|midterm|final)\b/.test(t)) {
      summary.push("Assessment timing or coverage appears in this message.");
      actions.push("Add the assessment date to your calendar with a prep reminder.");
      questions.push("Are practice materials or review sessions offered?");
    }
    if (/\b(due|deadline|submit|assignment|homework)\b/.test(t)) {
      summary.push("Deliverables or submission timing are referenced.");
      actions.push("Confirm timezone for due times and set a reminder one day early.");
      questions.push("Is late work accepted and under what rule?");
    }
    if (/\b(office hours|zoom|teams|link)\b/.test(t)) {
      summary.push("There may be instructions for help sessions or virtual meetings.");
      actions.push("Save links in your course notes field so they are easy to reopen.");
      questions.push("Should questions be emailed or posted on the discussion board?");
    }
    if (/\b(cancel|no class|postponed)\b/.test(t)) {
      summary.push("A schedule change might be announced.");
      actions.push("Update your planner and check for asynchronous materials.");
      questions.push("Will recordings replace the missed meeting?");
    }
    if (summary.length === 1) {
      summary.push("No strong keyword hits — skim for dates, links, and bold text manually.");
      actions.push("Highlight actionable lines and transfer dates into Calendar.");
      questions.push("Does this announcement require a reply?");
    }

    questions.push("Where should clarifying questions be sent?");
    return { summary: summary, actions: actions, questions: questions.slice(0, 6) };
  }

  function weightedGrade(categories) {
    var sumW = 0;
    var sumScore = 0;
    (categories || []).forEach(function (c) {
      var w = parseFloat(c.weight);
      var a = parseFloat(c.average);
      if (!isFinite(w) || !isFinite(a) || w <= 0) return;
      sumW += w;
      sumScore += w * a;
    });
    if (sumW <= 0) return { percent: null, note: "Add category weights and averages." };
    var pct = Math.round((sumScore / sumW) * 10) / 10;
    var warn = Math.abs(sumW - 100) > 0.01 ? "Weights sum to " + sumW + "% (normalize if your syllabus expects 100%)." : "";
    return { percent: pct, note: warn };
  }

  function standingLabel(pct) {
    if (pct == null || !isFinite(pct)) return { key: "unknown", label: "—", className: "" };
    if (pct >= 90) return { key: "strong", label: "Strong", className: "is-strong" };
    if (pct >= 80) return { key: "good", label: "Good Standing", className: "is-good" };
    if (pct >= 70) return { key: "recover", label: "Recoverable", className: "is-recover" };
    return { key: "risk", label: "At Risk", className: "is-risk" };
  }

  function simulatedGradeFeedback(key) {
    var map = {
      strong:
        "Simulated coaching: keep momentum with spaced review — translate high scores into durable understanding before finals.",
      good:
        "Simulated coaching: shore up the lowest-weight categories early so one exam does not dominate your trend.",
      recover:
        "Simulated coaching: prioritize upcoming weighted items and use instructor hours for a targeted plan.",
      risk:
        "Simulated coaching: treat every remaining graded opportunity as essential and seek structured support now.",
      unknown: "Enter averages and weights to generate guidance tied to your snapshot.",
    };
    return map[key] || map.unknown;
  }

  function buildStudyPlan(input) {
    var course = input.course || "your course";
    var deadline = input.deadline || "the deadline";
    var conf = Math.min(5, Math.max(1, parseInt(input.confidence, 10) || 3));
    var status = input.gradeStatus || "Good standing";
    var time = input.timeAvailable || "your available study blocks";

    var focus =
      conf <= 2
        ? "Spend the first block rebuilding fundamentals with guided examples."
        : conf >= 4
          ? "Shift toward timed drills and self-quizzes that mimic test conditions."
          : "Alternate concept recap with a small set of practice problems.";

    var standing =
      status === "At risk"
        ? "Standing note: favor instructor guidance and highest point-value tasks first."
        : status === "Recoverable"
          ? "Standing note: quick wins on the next assignments can still move the trend."
          : "Standing note: protect consistency on participation and smaller checkpoints.";

    return {
      headline: "Study focus for " + course,
      blocks: [
        focus,
        "Split " +
          time +
          " into short sessions with one objective each (read, practice, review).",
        "Close each session with a two-sentence recap note for future you.",
        standing,
      ],
      disclaimer: "Simulated recommendation — not personalized machine learning.",
    };
  }

  function buildProfessorEmail(input) {
    var prof = input.professor || "Professor [Name]";
    var course = input.course || "[Course]";
    var reason = input.reason || "[Reason]";
    var situation = input.situation || "[Describe your situation.]";
    var tone = input.tone || "neutral";

    var opener =
      tone === "formal"
        ? "Dear " + prof + ","
        : tone === "warm"
          ? "Hi " + prof + ","
          : "Hello " + prof + ",";

    var closer =
      tone === "formal"
        ? "Sincerely,\n[Your Name]"
        : tone === "warm"
          ? "Thanks,\n[Your Name]"
          : "Thank you,\n[Your Name]";

    return (
      opener +
      "\n\n" +
      "I am writing about " +
      reason +
      " in " +
      course +
      ".\n\n" +
      situation +
      "\n\n" +
      "Please let me know if you need any additional details.\n\n" +
      closer +
      "\n\n---\nSimulated draft — edit names and specifics before sending."
    );
  }

  global.DegreePilotAI = {
    analyzeAnnouncement: analyzeAnnouncement,
    weightedGrade: weightedGrade,
    standingLabel: standingLabel,
    simulatedGradeFeedback: simulatedGradeFeedback,
    buildStudyPlan: buildStudyPlan,
    buildProfessorEmail: buildProfessorEmail,
  };
})(window);
