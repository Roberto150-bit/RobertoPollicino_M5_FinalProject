/**
 * DegreePilot AI — dashboard seed data (v2).
 * buildBlankState: default empty dashboard (profile preset for Quinnelle demo).
 * buildSampleState: fictional “Caleb White” dataset — no real schools or people from the author.
 */

(function (global) {
  "use strict";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function isoFromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function addDays(base, days) {
    var x = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    x.setDate(x.getDate() + days);
    return x;
  }

  function defaultFafsa() {
    return [
      { id: "fa1", label: "Create / verify FSA ID", done: false },
      { id: "fa2", label: "Gather tax documents", done: false },
      { id: "fa3", label: "Submit FAFSA form", done: false },
      { id: "fa4", label: "Review Student Aid Report", done: false },
      { id: "fa5", label: "Respond to verification requests", done: false },
    ];
  }

  function buildBlankState() {
    return {
      version: 2,
      sampleDataMode: false,
      profile: {
        displayName: "admin",
        university: "Quinnelle University",
        major: "Computer Science",
        minor: "",
        semesterLabel: "Spring 2025",
        classYear: "Junior",
        academicGoal: "",
        advisorName: "",
        advisorEmail: "",
        theme: "ocean",
      },
      settings: {
        notifyAssignments: true,
        notifyGrades: true,
        notifyFinancial: true,
        prefCompactCalendar: false,
      },
      semesterMeta: {
        label: "Spring 2025",
        totalWeeks: 16,
        currentWeek: 1,
        lastSemesterGpaApprox: null,
      },
      courses: [],
      tasks: [],
      calendarEvents: [],
      updates: [],
      gradeEntries: [],
      studyPlans: [],
      studyItems: [],
      flashcards: [],
      emailDrafts: [],
      scholarships: [],
      fafsaChecklist: defaultFafsa(),
      recLetterRequests: [],
      essayBrainstorm: "",
      essayOutline: "",
      essayDraft: "",
      smartNotesText: "",
      savedAnnouncementPaste: "",
      notificationsUnread: 0,
      pendingAiQuestions: [],
      withdrawalDeadlineNote: "Many institutions publish withdrawal deadlines around mid-semester — confirm with your registrar.",
    };
  }

  function fakeSyllabus(code, title) {
    return (
      "OFFICIAL SYLLABUS — " +
      code +
      " " +
      title +
      "\n\nCourse overview: objectives, prerequisites, and outcomes aligned with ABET-style competencies.\n" +
      "Transfer & credit: students transferring mid-year should archive this syllabus and grade artifacts for articulation.\n" +
      "Academic integrity & ADA: see student handbook; accommodations coordinated through the accessibility office.\n" +
      "Assessment breakdown — homework/labs, quizzes/midterm, final project or exam as listed in LMS.\n" +
      "Late work policy, collaboration rules, and required software/texts are maintained on the course site.\n" +
      "Keywords for search demo: syllabus archive, withdrawal deadline, internship eligibility, honors contract."
    );
  }

  function buildSampleState() {
    var today = new Date();
    var s = buildBlankState();
    s.sampleDataMode = true;
    s.profile = {
      displayName: "Caleb White",
      university: "State University",
      major: "Computer Science",
      minor: "Mathematics",
      semesterLabel: "Spring 2025",
      classYear: "Junior",
      academicGoal: "Maintain solid standing in upper-level CS while balancing discrete math depth.",
      advisorName: "Dr. Jordan Ellis",
      advisorEmail: "jellis@demo-university.edu",
      theme: "ocean",
    };
    s.semesterMeta = { label: "Spring 2025", totalWeeks: 16, currentWeek: 8, lastSemesterGpaApprox: 3.6 };
    s.notificationsUnread = 3;
    s.pendingAiQuestions = [
      { id: "pa1", text: "Which course should we prioritize if two assignments land on the same day?", dismissed: false },
      { id: "pa2", text: "Confirm your preferred deadline reminders: morning digest or night-before alerts?", dismissed: false },
      { id: "pa3", text: "Do you want exam dates auto-added as study blocks on lighter class days?", dismissed: false },
    ];

    var c1 = {
      id: "sam-c1",
      code: "CS 210",
      name: "Data Structures",
      professor: "Prof. Lee Johnson",
      professorEmail: "ljohnson@demo-university.edu",
      officeHours: "Tue/Thu 2–4pm",
      classFormat: "In-person lecture + lab",
      color: "#0056b3",
      priority: "High",
      notes: "Focus on Big-O and trees before midterm.",
      links: [{ label: "Syllabus PDF", url: "#" }],
      materials: [{ title: "Textbook", note: "OpenDSA modules online." }],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("CS 210", "Data Structures"),
      alerts: [],
    };
    var c2 = {
      id: "sam-c2",
      code: "CS 330",
      name: "Software Engineering",
      professor: "Dr. Maya Thompson",
      professorEmail: "mthompson@demo-university.edu",
      officeHours: "Wed 10–12pm",
      classFormat: "Hybrid",
      color: "#16a34a",
      priority: "High",
      notes: "Team project milestones tracked here.",
      links: [{ label: "GitLab course group", url: "#" }],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("CS 330", "Software Engineering"),
      alerts: [
        { text: "Sprint review Friday — sync slides early.", level: "warn" },
        { text: "Class attendance slipped — in-class labs are weighted heavily.", level: "risk" },
      ],
    };
    var c3 = {
      id: "sam-c3",
      code: "MATH 245",
      name: "Discrete Math",
      professor: "Prof. Priya Patel",
      professorEmail: "ppatel@demo-university.edu",
      officeHours: "Mon 3–5pm",
      classFormat: "In-person",
      color: "#7c3aed",
      priority: "Medium",
      notes: "",
      links: [],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("MATH 245", "Discrete Math"),
      alerts: [],
    };
    var c4 = {
      id: "sam-c4",
      code: "CS 340",
      name: "Database Systems",
      professor: "Dr. Samuel Kim",
      professorEmail: "skim@demo-university.edu",
      officeHours: "Fri 1–3pm",
      classFormat: "In-person",
      color: "#ea580c",
      priority: "Medium",
      notes: "",
      links: [],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("CS 340", "Database Systems"),
      alerts: [{ text: "Professor updated the syllabus for the final project requirements.", level: "warn" }],
    };
    var c5 = {
      id: "sam-c5",
      code: "ENG 201",
      name: "Technical Writing",
      professor: "Prof. Maria Garcia",
      professorEmail: "mgarcia@demo-university.edu",
      officeHours: "Thu 11–1pm",
      classFormat: "In-person workshop",
      color: "#0891b2",
      priority: "Low",
      notes: "",
      links: [],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("ENG 201", "Technical Writing"),
      alerts: [],
    };
    s.courses = [c1, c2, c3, c4, c5];

    var d2 = isoFromDate(addDays(today, 2));
    var d4 = isoFromDate(addDays(today, 4));
    var d6 = isoFromDate(addDays(today, 6));
    var d9 = isoFromDate(addDays(today, 9));
    var dm3 = isoFromDate(addDays(today, -3));
    var dm7 = isoFromDate(addDays(today, -7));
    var d10 = isoFromDate(addDays(today, 10));
    var d12 = isoFromDate(addDays(today, 12));
    var d14 = isoFromDate(addDays(today, 14));

    s.smartNotesText =
      "Transfer planning: compare CS 210 and CS 340 syllabi on file; confirm discrete math substitution with advisor; keep PDF exports of submitted work.";

    s.tasks = [
      {
        id: "sam-t1",
        title: "Implement balanced BST rotations lab",
        courseId: "sam-c1",
        type: "assignment",
        due: d4,
        priority: "High",
        estMinutes: 180,
        notes: "Use starter repo; implement rotateLeft/rotateRight; write 3 test cases; push before midnight.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t2",
        title: "Read sprint retrospective guidelines",
        courseId: "sam-c2",
        type: "reading",
        due: d2,
        priority: "Medium",
        estMinutes: 45,
        notes: "Focus on action items section; bring two questions to stand-up.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t3",
        title: "Problem set — graph proofs",
        courseId: "sam-c3",
        type: "assignment",
        due: d6,
        priority: "High",
        estMinutes: 120,
        notes: "Prove connectivity lemmas; show spanning tree argument from homework hints.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t4",
        title: "Normalization worksheet draft",
        courseId: "sam-c4",
        type: "assignment",
        due: d9,
        priority: "Medium",
        estMinutes: 90,
        notes: "Through 3NF; diagram FDs for campus library schema.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t5",
        title: "Memo revision workshop prep",
        courseId: "sam-c5",
        type: "assignment",
        due: isoFromDate(addDays(today, -1)),
        priority: "Low",
        estMinutes: 60,
        notes: "Bring printed draft; peer review worksheet attached in LMS.",
        completed: true,
        source: "manual",
      },
      {
        id: "sam-t6",
        title: "Heaps & priority queues practice set",
        courseId: "sam-c1",
        type: "assignment",
        due: d2,
        priority: "High",
        estMinutes: 60,
        notes: "Complete odd-numbered problems; compare binary heap vs d-heap build times.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t7",
        title: "Team charter & roles doc",
        courseId: "sam-c2",
        type: "assignment",
        due: d4,
        priority: "Medium",
        estMinutes: 45,
        notes: "Define Git branching model and code review checklist.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t8",
        title: "UML sequence diagram for milestone 2",
        courseId: "sam-c2",
        type: "assignment",
        due: d6,
        priority: "Medium",
        estMinutes: 90,
        notes: "Cover login + OAuth happy path; export PNG to repo /docs.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t9",
        title: "Induction proof portfolio",
        courseId: "sam-c3",
        type: "assignment",
        due: d9,
        priority: "Medium",
        estMinutes: 75,
        notes: "Three short proofs; cite textbook section 5.2.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t10",
        title: "SQL lab — joins & EXPLAIN",
        courseId: "sam-c4",
        type: "assignment",
        due: d2,
        priority: "High",
        estMinutes: 120,
        notes: "Use sample ’university’ DB; paste query plans into report.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t11",
        title: "Transaction isolation write-up",
        courseId: "sam-c4",
        type: "reading",
        due: d10,
        priority: "Low",
        estMinutes: 40,
        notes: "Summarize Serializable vs Snapshot Isolation with one example each.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t12",
        title: "Peer review — technical memo draft",
        courseId: "sam-c5",
        type: "assignment",
        due: d4,
        priority: "Medium",
        estMinutes: 50,
        notes: "Use department rubric; leave inline comments in shared doc.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t13",
        title: "Abstract & keywords revision",
        courseId: "sam-c5",
        type: "assignment",
        due: d12,
        priority: "Low",
        estMinutes: 35,
        notes: "Target 150–200 words; include transfer pathway keywords if applicable.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t14",
        title: "Catch-up: hash tables & collision strategies",
        courseId: "sam-c1",
        type: "study",
        due: dm3,
        priority: "Medium",
        estMinutes: 90,
        notes: "Re-watch lecture 11; implement separate chaining vs open addressing comparison.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t15",
        title: "Past reflection — sprint 3 retro notes",
        courseId: "sam-c2",
        type: "reading",
        due: dm7,
        priority: "Low",
        estMinutes: 30,
        notes: "Archived for portfolio; link to board screenshot in Drive.",
        completed: true,
        source: "manual",
      },
      {
        id: "sam-t16",
        title: "Final project ER diagram checkpoint",
        courseId: "sam-c4",
        type: "assignment",
        due: d14,
        priority: "High",
        estMinutes: 150,
        notes: "Entities: Student, Course, Enrollment; include cardinality on every edge.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t17",
        title: "Weekly proof salon prep",
        courseId: "sam-c3",
        type: "study",
        due: d10,
        priority: "Low",
        estMinutes: 45,
        notes: "Bring combinatorics teaser problem from PS 8.",
        completed: false,
        source: "manual",
      },
      {
        id: "sam-t18",
        title: "Accessibility audit of team UI",
        courseId: "sam-c2",
        type: "assignment",
        due: d12,
        priority: "Medium",
        estMinutes: 80,
        notes: "Run axe-core; file issues with severity tags in backlog.",
        completed: false,
        source: "manual",
      },
    ];

    s.calendarEvents = [
      {
        id: "sam-e1",
        title: "CS 210 Quiz — heaps/priority queues",
        type: "exam",
        courseId: "sam-c1",
        date: d6,
        time: "10:00 AM",
        priority: "high",
        color: "",
      },
      {
        id: "sam-e2",
        title: "Team sprint planning",
        type: "assignment",
        courseId: "sam-c2",
        date: d2,
        time: "3:30 PM",
        priority: "medium",
        color: "",
      },
      {
        id: "sam-e3",
        title: "Study block — discrete proofs",
        type: "study",
        courseId: "sam-c3",
        date: isoFromDate(addDays(today, 1)),
        time: "7:00 PM",
        priority: "medium",
        color: "",
      },
      {
        id: "sam-e4",
        title: "Campus tech fair",
        type: "school",
        courseId: "",
        date: d9,
        time: "12:00 PM",
        priority: "low",
        color: "#64748b",
      },
      {
        id: "sam-e5",
        title: "Office hours — CS 340",
        type: "school",
        courseId: "sam-c4",
        date: d4,
        time: "2:00 PM",
        priority: "medium",
        color: "",
      },
      {
        id: "sam-e6",
        title: "Draft ER diagram review",
        type: "assignment",
        courseId: "sam-c4",
        date: d12,
        time: "11:00 AM",
        priority: "medium",
        color: "",
      },
    ];

    s.gradeEntries = [
      { id: "sam-g1", courseId: "sam-c1", category: "homework", assignment: "HW3 Structures", score: 88, pointsPossible: 100, weightPercent: 15 },
      { id: "sam-g2", courseId: "sam-c1", category: "quiz", assignment: "Quiz 2", score: 92, pointsPossible: 100, weightPercent: 15 },
      { id: "sam-g3", courseId: "sam-c2", category: "project", assignment: "Milestone 1", score: 90, pointsPossible: 100, weightPercent: 20 },
      { id: "sam-g4", courseId: "sam-c3", category: "homework", assignment: "PS 6", score: 78, pointsPossible: 100, weightPercent: 20 },
      { id: "sam-g5", courseId: "sam-c4", category: "homework", assignment: "SQL Lab 4", score: 91, pointsPossible: 100, weightPercent: 25 },
      { id: "sam-g6", courseId: "sam-c5", category: "project", assignment: "Memo draft v1", score: 86, pointsPossible: 100, weightPercent: 30 },
    ];

    s.studyPlans = [
      { id: "sam-sp1", title: "Trees review — CS 210", date: isoFromDate(addDays(today, 1)), durationMin: 45, courseId: "sam-c1", notes: "Sketches + two practice deletes." },
    ];

    s.studyItems = [
      { id: "sam-si1", title: "Review ER diagrams before SQL lab", courseId: "sam-c4", notes: "Focus keys & joins.", createdAt: isoFromDate(today) },
    ];

    s.flashcards = [
      { id: "sam-fc1", front: "What is Big-O?", back: "Upper bound on growth of runtime vs input size.", flipped: false },
      { id: "sam-fc2", front: "Normalization 3NF", back: "Every determinant is a candidate key; no transitive deps on non-keys.", flipped: false },
    ];

    s.scholarships = [
      { id: "sam-sch1", name: "STEM Merit Supplement", amount: "$2,500", deadline: isoFromDate(addDays(today, 21)), status: "Planning", notes: "Needs faculty statement." },
      { id: "sam-sch2", name: "Regional Honors Grant", amount: "$1,000", deadline: isoFromDate(addDays(today, 45)), status: "Applied", notes: "" },
    ];

    s.recLetterRequests = [
      { id: "sam-r1", professor: "Prof. Lee Johnson", status: "Requested", due: isoFromDate(addDays(today, 14)), notes: "Send resume packet." },
    ];

    s.updates = [
      {
        id: "sam-pc1",
        kind: "task",
        title: "Practice quiz — heaps (inferred)",
        detail: "Detected from sample announcement mentioning quiz Friday.",
        checked: true,
        payload: { title: "Practice quiz — heaps", courseId: "sam-c1", due: d6, type: "quiz", priority: "High" },
      },
      {
        id: "sam-pc2",
        kind: "event",
        title: "Calendar: sprint review reminder",
        detail: "Optional calendar block before Friday stand-up.",
        checked: false,
        payload: { title: "Sprint review prep", courseId: "sam-c2", date: d4, time: "9:00 AM", type: "assignment" },
      },
    ];

    s.fafsaChecklist.forEach(function (row, i) {
      row.done = i < 2;
    });

    return s;
  }

  /** @deprecated use buildBlankState — kept for migration code paths */
  function buildDemoState() {
    return buildBlankState();
  }

  global.DegreePilotSeed = {
    buildBlankState: buildBlankState,
    buildSampleState: buildSampleState,
    buildDemoState: buildDemoState,
  };
})(window);
