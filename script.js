/**
 * DegreePilot AI — front-end prototype (CSC 150 demo).
 *
 * IMPORTANT: This file does NOT call any real AI or machine-learning API.
 * Summaries, email drafts, study tips, and “analysis” are produced with
 * hand-written JavaScript rules, templates, and keyword checks so the
 * instructor can see a believable UI flow without network access or keys.
 */

(function () {
  "use strict";

  const STORAGE_PROFILE = "degreepilot_profile_v1";
  const STORAGE_COURSES = "degreepilot_courses_v1";

  /** @type {{ id: string, name: string, professor: string, grade: string, priority: string, link: string, notes: string }[]} */
  let courses = [];

  // --- DOM refs ---
  const el = (id) => document.getElementById(id);

  const formSetup = el("form-setup");
  const setupFeedback = el("setup-feedback");
  const formCourse = el("form-course");
  const courseList = el("course-list");
  const coursesEmpty = el("courses-empty");
  const btnLoadSample = el("btn-load-sample");
  const btnHeroSample = el("btn-hero-sample");
  const btnClearCourses = el("btn-clear-courses");
  const btnAnalyze = el("btn-analyze");
  const announcementText = el("announcement-text");
  const announcementOutput = el("announcement-output");
  const formGrades = el("form-grades");
  const gradeResult = el("grade-result");
  const gradeNumber = el("grade-number");
  const gradeLabel = el("grade-label");
  const gradeDetail = el("grade-detail");
  const formEmail = el("form-email");
  const emailOutput = el("email-output");
  const btnCopyEmail = el("btn-copy-email");
  const formStudy = el("form-study");
  const studyOutput = el("study-output");

  const nav = document.querySelector(".site-nav");
  const navToggle = document.querySelector(".nav-toggle");

  // --- Utilities ---
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function uid() {
    return "c_" + Math.random().toString(36).slice(2, 11);
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / private mode */
    }
  }

  // --- Mobile nav ---
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // --- Profile ---
  function readProfileFromForm() {
    return {
      name: el("student-name").value.trim(),
      university: el("student-university").value.trim(),
      major: el("student-major").value.trim(),
      semester: el("student-semester").value.trim(),
      goal: el("student-goal").value.trim(),
    };
  }

  function writeProfileToForm(p) {
    el("student-name").value = p.name || "";
    el("student-university").value = p.university || "";
    el("student-major").value = p.major || "";
    el("student-semester").value = p.semester || "";
    el("student-goal").value = p.goal || "";
  }

  const initialProfile = loadJson(STORAGE_PROFILE, {});
  writeProfileToForm(initialProfile);

  formSetup.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = readProfileFromForm();
    saveJson(STORAGE_PROFILE, p);
    setupFeedback.textContent = "Profile saved locally in this browser (demo only).";
    setTimeout(() => {
      setupFeedback.textContent = "";
    }, 3500);
  });

  // --- Courses ---
  function loadCourses() {
    courses = loadJson(STORAGE_COURSES, []);
    if (!Array.isArray(courses)) courses = [];
    renderCourses();
  }

  function saveCourses() {
    saveJson(STORAGE_COURSES, courses);
    renderCourses();
  }

  function renderCourses() {
    courseList.innerHTML = "";
    const has = courses.length > 0;
    coursesEmpty.hidden = has;

    courses.forEach((c) => {
      const card = document.createElement("article");
      card.className = "course-card";
      const pri = (c.priority || "Medium").toLowerCase();
      const gradeDisp =
        c.grade !== "" && c.grade != null && !Number.isNaN(Number(c.grade))
          ? `${Number(c.grade)}%`
          : "—";

      const safeLink =
        c.link && /^https?:\/\//i.test(c.link.trim())
          ? c.link.trim()
          : c.link
            ? "https://" + c.link.trim().replace(/^\/+/, "")
            : "";

      card.innerHTML = `
        <span class="course-badge ${pri}">${escapeHtml(c.priority || "Medium")} priority</span>
        <h3>${escapeHtml(c.name || "Untitled course")}</h3>
        <div class="course-meta">${escapeHtml(c.professor || "Professor TBD")}</div>
        <div class="course-grade" aria-label="Current grade">${escapeHtml(gradeDisp)}</div>
        ${
          safeLink
            ? `<a class="course-link" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">Open course link</a>`
            : ""
        }
        <p class="course-notes">${escapeHtml(c.notes || "No notes.")}</p>
        <div class="course-actions">
          <button type="button" data-remove="${escapeHtml(c.id)}">Remove course</button>
        </div>
      `;
      courseList.appendChild(card);
    });

    courseList.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove");
        courses = courses.filter((x) => x.id !== id);
        saveCourses();
      });
    });
  }

  formCourse.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = el("course-name").value.trim();
    if (!name) {
      el("course-name").focus();
      return;
    }
    courses.push({
      id: uid(),
      name,
      professor: el("course-professor").value.trim(),
      grade: el("course-grade").value.trim(),
      priority: el("course-priority").value,
      link: el("course-link").value.trim(),
      notes: el("course-notes").value.trim(),
    });
    formCourse.reset();
    el("course-priority").value = "Medium";
    saveCourses();
  });

  btnClearCourses.addEventListener("click", () => {
    if (!courses.length) return;
    if (confirm("Remove all courses from this demo dashboard?")) {
      courses = [];
      saveCourses();
    }
  });

  /**
   * Simulated “AI” announcement analysis: scans for keywords and themes,
   * then stitches canned explanations. Not NLP — deterministic prototype logic.
   */
  function analyzeAnnouncement(text) {
    const t = text.toLowerCase();
    const summary = [];
    const actions = [];
    const questions = [];

    if (!text.trim()) {
      return {
        summary: ["Paste an announcement first."],
        actions: ["Copy text from your LMS or email, then run the analyzer again."],
        questions: ["What dates or deliverables are mentioned?"],
      };
    }

    summary.push("This is a simulated AI-style read of the announcement (rule-based, offline).");

    if (/\b(exam|test|quiz|midterm|final)\b/.test(t)) {
      summary.push("The message appears to discuss graded assessments or evaluation.");
      actions.push("Add the exam or quiz date to your calendar and block review sessions backward from it.");
      questions.push("Will a formula sheet or notes be allowed for this assessment?");
    }
    if (/\b(due|deadline|submit|submission|assignment|homework|hw)\b/.test(t)) {
      summary.push("There is likely information about assignments or submission timing.");
      actions.push("Confirm the exact due time and timezone; set a reminder 24 hours early.");
      questions.push("Is late work accepted, and at what penalty?");
    }
    if (/\b(cancel|cancelled|canceled|no class|class is off)\b/.test(t)) {
      summary.push("A schedule change such as a cancellation may be mentioned.");
      actions.push("Update your planner and check whether content will be posted asynchronously.");
      questions.push("Will office hours still run if lecture is canceled?");
    }
    if (/\b(office hours|oh)\b/.test(t)) {
      summary.push("Office hours or instructor availability seem to be referenced.");
      actions.push("Book or note a specific slot if sign-up is required.");
      questions.push("Can I bring draft work for feedback before the next major deadline?");
    }
    if (/\b(zoom|teams|meet|link|recording)\b/.test(t)) {
      summary.push("Virtual meeting or link details may be included.");
      actions.push("Test the link early and save the meeting ID in your notes field for this course.");
      questions.push("Will sessions be recorded for students who cannot attend live?");
    }
    if (/\b(extension|late|illness|excused)\b/.test(t)) {
      summary.push("Policies around extensions or late work might be discussed.");
      actions.push("If you need flexibility, gather documentation and email before the deadline when possible.");
      questions.push("What is the preferred way to request an extension in this course?");
    }
    if (/\b(curve|grading|grade|rubric)\b/.test(t)) {
      summary.push("Grading expectations or rubric details may be involved.");
      actions.push("Compare the rubric to your draft outline before submitting.");
      questions.push("Which criteria are weighted most heavily on this deliverable?");
    }
    if (summary.length === 1) {
      summary.push("No strong keyword matches were found; re-read for dates, links, and bolded items manually.");
      actions.push("Highlight any dates, links, and “must do” lines in your course notes.");
      questions.push("Is there anything students must confirm by reply?");
    }

    questions.push("Are there any prerequisite readings before the next class?");
    questions.push("Where should questions be posted: email, discussion board, or in person?");

    return { summary, actions, questions: [...new Set(questions)].slice(0, 6) };
  }

  function renderAnnouncementBlocks(data) {
    const block = (title, items) => {
      const lis = items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
      return `<h4>${escapeHtml(title)}</h4><ul>${lis}</ul>`;
    };
    announcementOutput.innerHTML =
      block("Summary", data.summary) +
      block("Suggested action items", data.actions) +
      block("Questions you could ask", data.questions);
  }

  btnAnalyze.addEventListener("click", () => {
    const data = analyzeAnnouncement(announcementText.value);
    renderAnnouncementBlocks(data);
  });

  // --- Grade calculator (simple mean of entered category averages) ---
  function gradeStanding(avg) {
    if (avg >= 90) return { label: "Strong", className: "strong", detail: "Keep your routines; you have margin to deepen understanding, not just scores." };
    if (avg >= 80)
      return {
        label: "Good Standing",
        className: "good",
        detail: "Solid position — tighten weak categories before the next high-stakes assessment.",
      };
    if (avg >= 70)
      return {
        label: "Recoverable",
        className: "recoverable",
        detail: "You can still climb with focused effort on the next weighted items; avoid missing small points.",
      };
    return {
      label: "At Risk",
      className: "risk",
      detail: "Prioritize instructor guidance, tutoring, and every remaining graded opportunity.",
    };
  }

  formGrades.addEventListener("submit", (e) => {
    e.preventDefault();
    const vals = ["g-assignments", "g-discussions", "g-projects", "g-exams"].map((id) => {
      const v = parseFloat(el(id).value);
      return Number.isFinite(v) ? v : NaN;
    });
    const used = vals.filter((v) => !Number.isNaN(v));
    if (!used.length) {
      gradeResult.hidden = true;
      return;
    }
    const avg = used.reduce((a, b) => a + b, 0) / used.length;
    const rounded = Math.round(avg * 10) / 10;
    const s = gradeStanding(rounded);
    gradeNumber.textContent = `${rounded}%`;
    gradeLabel.textContent = s.label;
    gradeLabel.className = "grade-label " + s.className;
    gradeDetail.textContent = `Average of ${used.length} filled category/categories. ${s.detail}`;
    gradeResult.hidden = false;
  });

  // --- Email assistant (template composition; simulated writing aid) ---
  function buildEmailDraft() {
    const prof = el("email-prof").value.trim() || "Professor [Name]";
    const course = el("email-course").value.trim() || "[Course]";
    const reason = el("email-reason").value.trim() || "[Reason]";
    const situation = el("email-situation").value.trim() || "[Describe your situation briefly.]";
    const tone = el("email-tone").value;

    const openings = {
      formal: `Dear ${prof},`,
      neutral: `Hello ${prof},`,
      warm: `Hi ${prof},`,
    };
    const closings = {
      formal: "Sincerely,\n[Your Name]",
      neutral: "Thank you for your time,\n[Your Name]",
      warm: "Thanks again,\n[Your Name]",
    };

    const bodyTone =
      tone === "formal"
        ? "I am writing in regard to " + reason + " in " + course + "."
        : tone === "warm"
          ? "I hope you are doing well. I wanted to reach out about " + reason + " in " + course + "."
          : "I am writing about " + reason + " in " + course + ".";

    return (
      `${openings[tone] || openings.neutral}\n\n` +
      `${bodyTone}\n\n` +
      `${situation}\n\n` +
      `Please let me know if there is any additional information I can provide.\n\n` +
      `${closings[tone] || closings.neutral}\n\n` +
      `---\n(Simulated draft: edit names, add specifics, and proofread before sending.)`
    );
  }

  formEmail.addEventListener("submit", (e) => {
    e.preventDefault();
    emailOutput.textContent = buildEmailDraft();
  });

  btnCopyEmail.addEventListener("click", async () => {
    const t = emailOutput.textContent;
    try {
      await navigator.clipboard.writeText(t);
      btnCopyEmail.textContent = "Copied!";
      setTimeout(() => {
        btnCopyEmail.textContent = "Copy to clipboard";
      }, 2000);
    } catch {
      btnCopyEmail.textContent = "Copy blocked — select text manually";
    }
  });

  /**
   * Simulated study coach: mixes numeric confidence with categorical status.
   * No model inference — just structured advice strings for the demo UI.
   */
  function buildStudyRecommendation() {
    const course = el("study-course").value.trim() || "your course";
    const deadline = el("study-deadline").value.trim() || "the deadline";
    const conf = Math.min(5, Math.max(1, parseInt(el("study-confidence").value, 10) || 3));
    const status = el("study-grade-status").value;
    const timeAvail = el("study-time").value.trim() || "the time you listed";

    let focus = "Balance review of past feedback with a small amount of new practice.";
    if (conf <= 2) focus = "Prioritize foundational practice (definitions, worked examples) before harder problems.";
    if (conf >= 4) focus = "Shift from broad review to timed practice and self-quizzing under exam-like conditions.";

    let statusLine = "";
    if (status === "At risk") statusLine = "Because your standing is at risk, favor instructor resources and high-return assignments first.";
    else if (status === "Recoverable")
      statusLine = "Recoverable standing means targeted wins on upcoming items can move the needle quickly.";
    else if (status === "Strong") statusLine = "Strong standing is a good moment to lock in understanding, not only grades.";
    else statusLine = "Good standing: protect consistency and avoid losing easy points on participation or small tasks.";

    return `
      <div class="rec-block">
        <h4>Focus for ${escapeHtml(course)}</h4>
        <p>${escapeHtml(focus)}</p>
      </div>
      <div class="rec-block">
        <h4>Plan toward ${escapeHtml(deadline)}</h4>
        <ul>
          <li>Split ${escapeHtml(timeAvail)} into 2–4 focused blocks with a single objective each (e.g., “outline essay,” “drill problem set 3”).</li>
          <li>End each block with a 2-minute recap note so the next session starts faster.</li>
        </ul>
      </div>
      <div class="rec-block">
        <h4>Confidence (${conf}/5) and standing</h4>
        <p>${escapeHtml(statusLine)}</p>
      </div>
      <div class="rec-block">
        <h4>Simulated disclaimer</h4>
        <p class="muted">This panel mimics an AI study coach using fixed rules. It is not personalized machine learning advice.</p>
      </div>
    `.trim();
  }

  formStudy.addEventListener("submit", (e) => {
    e.preventDefault();
    studyOutput.innerHTML = buildStudyRecommendation();
  });

  // --- Sample semester (demo data for live presentation) ---
  const SAMPLE_PROFILE = {
    name: "Jordan Lee",
    university: "Quinnipiac University",
    major: "Data Science & Computing",
    semester: "Spring 2026",
    goal: "Stay organized across STEM and humanities, aim for strong midterms, and keep a sustainable sleep schedule.",
  };

  const SAMPLE_COURSES = [
    {
      id: "sample_csc150",
      name: "CSC 150 — Elements of AI",
      professor: "Dr. Lin",
      grade: "91",
      priority: "High",
      link: "",
      notes: "Module 5 build+demo; prototype due; review ethics readings before quiz.",
    },
    {
      id: "sample_mat210",
      name: "MAT 210 — Linear Algebra",
      professor: "Prof. Ortiz",
      grade: "84",
      priority: "High",
      link: "",
      notes: "Problem set every Thursday; office hours Wed 2–4.",
    },
    {
      id: "sample_eng",
      name: "EN 101 — Academic Writing",
      professor: "Dr. Patel",
      grade: "88",
      priority: "Medium",
      link: "",
      notes: "Draft workshop next week; bring printed peer feedback sheet.",
    },
    {
      id: "sample_phy",
      name: "PHY 101 — General Physics I",
      professor: "Dr. Nguyen",
      grade: "76",
      priority: "High",
      link: "",
      notes: "Lab reports double-spaced; review vectors worksheet before lab 6.",
    },
  ];

  const SAMPLE_ANNOUNCEMENT =
    "Hi everyone — quick updates for CSC 150. Your Track A prototype is due Sunday night. " +
    "Please submit a short reflection paragraph with your demo link. Office hours Friday 1–3pm (Zoom link on Canvas). " +
    "Next week’s quiz will include supervised vs unsupervised learning; no makeups without prior email. " +
    "If you need an extension for documented reasons, email me before the deadline. Thanks!";

  function loadSampleSemester() {
    writeProfileToForm(SAMPLE_PROFILE);
    saveJson(STORAGE_PROFILE, readProfileFromForm());

    courses = SAMPLE_COURSES.map((c) => ({ ...c, id: uid() }));
    saveJson(STORAGE_COURSES, courses);
    renderCourses();

    announcementText.value = SAMPLE_ANNOUNCEMENT;

    el("g-assignments").value = "90";
    el("g-discussions").value = "88";
    el("g-projects").value = "85";
    el("g-exams").value = "82";
    gradeResult.hidden = true;

    el("email-prof").value = "Dr. Lin";
    el("email-course").value = "CSC 150";
    el("email-reason").value = "Clarification on demo expectations";
    el("email-situation").value =
      "I am building the DegreePilot AI dashboard prototype. Could you confirm whether the reflection should mention simulated AI explicitly? I want to align with the rubric.";
    el("email-tone").value = "neutral";
    emailOutput.textContent = "Complete the form and click generate.";

    el("study-course").value = "PHY 101";
    el("study-deadline").value = "Lab report due Wednesday 11:59pm";
    el("study-confidence").value = "2";
    el("study-grade-status").value = "Recoverable";
    el("study-time").value = "3 hours Sunday, two 45-minute blocks Mon/Tue";
    studyOutput.innerHTML = '<p class="muted">Submit the form to see a structured recommendation.</p>';

    setupFeedback.textContent = "Sample semester loaded. Scroll to review each panel.";
    setTimeout(() => {
      setupFeedback.textContent = "";
    }, 4000);
  }

  btnLoadSample.addEventListener("click", loadSampleSemester);
  btnHeroSample.addEventListener("click", () => {
    loadSampleSemester();
    el("courses").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  loadCourses();
})();
