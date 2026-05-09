/**
 * Demo seed content for DegreePilot AI (browser-only prototype).
 * These objects populate cards, lists, and the calendar — not form inputs.
 * Replace or extend this file if you want different default demo lectures for class.
 */

(function (global) {
  "use strict";

  /**
   * Returns a fresh copy of the instructor-ready demo semester snapshot.
   */
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  /** YYYY-MM-DD in local time — keeps seeded tasks/events visible in the current month. */
  function isoFromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function addDays(base, days) {
    var x = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    x.setDate(x.getDate() + days);
    return x;
  }

  function buildDemoState() {
    var today = new Date();
    var d3 = addDays(today, 3);
    var d5 = addDays(today, 5);
    var d7 = addDays(today, 7);
    var d10 = addDays(today, 10);

    return {
      version: 1,
      profile: {
        displayName: "",
        university: "",
        major: "",
        semesterLabel: "",
        goal: "",
        theme: "ocean",
      },
      courses: [
        {
          id: "seed-csc150",
          code: "CSC 150",
          name: "Elements of AI",
          professor: "Dr. Lin",
          color: "#2563eb",
          grade: 91,
          priority: "High",
          notes: "Track A build + demo · emphasize simulated AI labeling in UI.",
        },
        {
          id: "seed-mat210",
          code: "MAT 210",
          name: "Linear Algebra",
          professor: "Prof. Ortiz",
          color: "#16a34a",
          grade: 84,
          priority: "High",
          notes: "Problem sets due weekly · office hours Wed afternoon.",
        },
        {
          id: "seed-en101",
          code: "EN 101",
          name: "Academic Writing",
          professor: "Dr. Patel",
          color: "#7c3aed",
          grade: 88,
          priority: "Medium",
          notes: "Draft workshop upcoming · bring peer feedback sheet.",
        },
      ],
      tasks: [
        {
          id: "seed-t1",
          title: "Submit prototype reflection paragraph",
          courseId: "seed-csc150",
          due: isoFromDate(d3),
          completed: false,
        },
        {
          id: "seed-t2",
          title: "Problem set — eigenvectors",
          courseId: "seed-mat210",
          due: isoFromDate(d5),
          completed: false,
        },
        {
          id: "seed-t3",
          title: "Outline persuasive essay",
          courseId: "seed-en101",
          due: isoFromDate(addDays(today, -1)),
          completed: true,
        },
      ],
      events: [
        {
          id: "seed-e1",
          title: "CSC 150 demo checkpoint",
          courseId: "seed-csc150",
          date: isoFromDate(d5),
          time: "3:00 PM",
          notes: "Bring browser build ready to scroll through dashboard panels.",
        },
        {
          id: "seed-e2",
          title: "MAT 210 quiz window opens",
          courseId: "seed-mat210",
          date: isoFromDate(d10),
          time: "8:00 AM",
          notes: "Timed online · review practice sheet 4.",
        },
        {
          id: "seed-e3",
          title: "Writing studio block",
          courseId: "seed-en101",
          date: isoFromDate(d7),
          time: "6:30 PM",
          notes: "Campus writing center · optional but recommended.",
        },
      ],
      announcements: [
        {
          id: "seed-a1",
          title: "Prototype expectations",
          courseId: "seed-csc150",
          body:
            "Reminder: your Track A submission should include the dashboard URL or zip, plus a short reflection. " +
            "Office hours Friday 1–3pm (see Canvas). Quiz next week covers supervised vs unsupervised learning basics.",
        },
        {
          id: "seed-a2",
          title: "Exam policy note",
          courseId: "seed-mat210",
          body:
            "No make-up quizzes without prior email. If you need an extension for documented reasons, contact me before the deadline.",
        },
      ],
      gradeCategories: [
        { id: "seed-g1", name: "Assignments", weight: 30, average: 90 },
        { id: "seed-g2", name: "Projects", weight: 35, average: 85 },
        { id: "seed-g3", name: "Exams", weight: 35, average: 82 },
      ],
    };
  }

  global.DegreePilotSeed = {
    buildDemoState: buildDemoState,
  };
})(window);
