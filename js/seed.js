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
        goalHeadline: "",
        goalFocusAreas: [],
        email: "",
        phone: "",
        expectedGraduation: "",
        advisorName: "",
        advisorEmail: "",
        advisorTitle: "Academic Advisor",
        advisorPhone: "",
        advisorOffice: "",
        advisorHours: "",
        theme: "ocean",
        weatherCity: "",
      },
      settingsAi: {
        learningStyles: [],
        interactionLevel: "balanced",
      },
      settings: {
        notifyAssignments: true,
        notifyGrades: true,
        notifyFinancial: true,
        notifyScheduleUpdates: true,
        notifyStudyReminders: false,
        notifyWeeklySummary: true,
        prefCompactCalendar: false,
        courseColorAccent: "blue",
        courseLinks: {
          syllabus: true,
          canvas: true,
          materials: true,
          textbooks: false,
        },
        courseDisplay: {
          progressBars: true,
          deadlinesOnCards: true,
          compactView: false,
          showCompleted: true,
          groupByTerm: true,
        },
        twoFactorEnabled: false,
        notifyEmail: true,
        notifyPush: true,
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
      notificationDismissals: [],
      withdrawalDeadlineNote: "Many institutions publish withdrawal deadlines around mid-semester — confirm with your registrar.",
      suggestedTasks: [],
      tasksPreferences: {
        progressScope: "week",
        suggestionDisplayCap: 5,
        upcomingDeadlineDays: 7,
      },
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
      email: "caleb.white@stateu.edu",
      phone: "(555) 987-6543",
      university: "State University",
      major: "Computer Science",
      minor: "Mathematics",
      semesterLabel: "Spring 2025",
      classYear: "Junior",
      expectedGraduation: "May 2026",
      academicGoal:
        "I want to raise my GPA by the end of the semester while building stronger study habits and staying on top of deadlines.",
      goalHeadline: "Improve my GPA to 3.7+",
      goalFocusAreas: [
        "Time management & consistency",
        "Stronger performance in exams",
        "Better understanding of core concepts",
        "Reduce stress and last-minute cramming",
      ],
      advisorName: "Dr. Maya Thompson",
      advisorTitle: "Academic Advisor",
      advisorEmail: "mthompson@stateu.edu",
      advisorPhone: "(555) 123-4567",
      advisorOffice: "Engineering Building, Room 204",
      advisorHours: "Mon, Wed 1:00 PM – 4:00 PM",
      theme: "ocean",
      weatherCity: "Hamden, CT",
    };
    s.settingsAi = {
      learningStyles: ["visual", "reading"],
      interactionLevel: "balanced",
    };
    s.semesterMeta = { label: "Spring 2025", totalWeeks: 16, currentWeek: 8, lastSemesterGpaApprox: 3.6 };
    s.notificationsUnread = 0;
    s.pendingAiQuestions = [
      { id: "pa1", text: "Which course should we prioritize if two assignments land on the same day?", dismissed: false },
      { id: "pa2", text: "Confirm your preferred deadline reminders: morning digest or night-before alerts?", dismissed: false },
      { id: "pa3", text: "Do you want exam dates auto-added as study blocks on lighter class days?", dismissed: false },
    ];

    var c1 = {
      id: "sam-c1",
      code: "CS 210",
      name: "Data Structures",
      subject: "CS",
      term: "current",
      professor: "Prof. Lee Johnson",
      professorEmail: "ljohnson@demo-university.edu",
      officeHours: "Tue/Thu 2–4pm",
      classFormat: "In-person lecture + lab",
      color: "#0056b3",
      priority: "High",
      notes: "Focus on Big-O and trees before midterm.",
      links: [
        { label: "Canvas", url: "https://canvas.instructure.com/", kind: "lms" },
        { label: "Syllabus PDF", url: "#", kind: "syllabus" },
      ],
      materials: [{ title: "Textbook", note: "OpenDSA modules online." }],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("CS 210", "Data Structures"),
      syllabusPdfUrl: "",
      rateMyProfessorUrl: "https://www.ratemyprofessors.com/search/professors?query=Lee+Johnson",
      courseNotesList: [
        {
          id: "cn-c1-1",
          text: "Midterm emphasis: BST rotations and amortized heap operations.",
          source: "syllabus",
          created: isoFromDate(addDays(today, -10)),
        },
        {
          id: "cn-c1-2",
          text: "Office hour queue — bring printout of lab 4 runtime table.",
          source: "lecture",
          created: isoFromDate(addDays(today, -3)),
        },
      ],
      alerts: [],
    };
    var c2 = {
      id: "sam-c2",
      code: "CS 330",
      name: "Software Engineering",
      subject: "CS",
      term: "current",
      professor: "Dr. Maya Thompson",
      professorEmail: "mthompson@demo-university.edu",
      officeHours: "Wed 10–12pm",
      classFormat: "Hybrid",
      color: "#16a34a",
      priority: "High",
      notes: "Team project milestones tracked here.",
      links: [
        { label: "Blackboard", url: "https://www.blackboard.com/", kind: "lms" },
        { label: "GitLab course group", url: "#", kind: "other" },
      ],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("CS 330", "Software Engineering"),
      syllabusPdfUrl: "",
      rateMyProfessorUrl: "https://www.ratemyprofessors.com/search/professors?query=Maya+Thompson",
      courseNotesList: [],
      alerts: [
        { text: "Sprint review Friday — sync slides early.", level: "warn" },
        { text: "Class attendance slipped — in-class labs are weighted heavily.", level: "risk" },
      ],
    };
    var c3 = {
      id: "sam-c3",
      code: "MATH 245",
      name: "Discrete Math",
      subject: "MATH",
      term: "current",
      professor: "Prof. Priya Patel",
      professorEmail: "ppatel@demo-university.edu",
      officeHours: "Mon 3–5pm",
      classFormat: "In-person",
      color: "#7c3aed",
      priority: "Medium",
      notes: "",
      links: [{ label: "Course site", url: "#", kind: "lms" }],
      materials: [{ title: "Rosen (digital)", note: "Library reserve." }],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("MATH 245", "Discrete Math"),
      syllabusPdfUrl: "",
      rateMyProfessorUrl: "",
      courseNotesList: [],
      alerts: [],
    };
    var c4 = {
      id: "sam-c4",
      code: "CS 340",
      name: "Database Systems",
      subject: "CS",
      term: "current",
      professor: "Dr. Samuel Kim",
      professorEmail: "skim@demo-university.edu",
      officeHours: "Fri 1–3pm",
      classFormat: "In-person",
      color: "#ea580c",
      priority: "Medium",
      notes: "",
      links: [{ label: "Canvas shell", url: "#", kind: "lms" }],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: fakeSyllabus("CS 340", "Database Systems"),
      syllabusPdfUrl: "",
      rateMyProfessorUrl: "",
      courseNotesList: [],
      alerts: [{ text: "Professor updated the syllabus for the final project requirements.", level: "warn" }],
    };
    var c5 = {
      id: "sam-c5",
      code: "ENG 201",
      name: "Technical Writing",
      subject: "ENG",
      term: "completed",
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
      syllabusPdfUrl: "",
      rateMyProfessorUrl: "",
      courseNotesList: [],
      alerts: [],
    };
    var c6 = {
      id: "sam-c6",
      code: "CS 410",
      name: "Algorithms",
      subject: "CS",
      term: "next",
      professor: "TBA",
      professorEmail: "",
      officeHours: "",
      classFormat: "Scheduled — Fall",
      color: "#64748b",
      priority: "Medium",
      notes: "Pre-registering from degree plan.",
      links: [],
      materials: [],
      syllabusExtracted: null,
      syllabusPlainText: "",
      syllabusPdfUrl: "",
      rateMyProfessorUrl: "",
      courseNotesList: [],
      alerts: [],
    };
    s.courses = [c1, c2, c3, c4, c5, c6];

    var d2 = isoFromDate(addDays(today, 2));
    var d4 = isoFromDate(addDays(today, 4));
    var d6 = isoFromDate(addDays(today, 6));
    var d9 = isoFromDate(addDays(today, 9));
    var dm3 = isoFromDate(addDays(today, -3));
    var dm7 = isoFromDate(addDays(today, -7));
    var d10 = isoFromDate(addDays(today, 10));
    var d12 = isoFromDate(addDays(today, 12));
    var d14 = isoFromDate(addDays(today, 14));
    var isoToday = isoFromDate(today);

    s.smartNotesText =
      "Transfer planning: compare CS 210 and CS 340 syllabi on file; confirm discrete math substitution with advisor; keep PDF exports of submitted work.";

    s.tasks = [
      {
        id: "sam-t0",
        title: "Data Structures – Problem Set 4",
        courseId: "sam-c1",
        type: "assignment",
        due: isoToday,
        dueTime: "23:59",
        priority: "High",
        estMinutes: 150,
        notes: "Focus on stacks & queues; cite two applications from lecture.",
        completed: false,
        source: "manual",
        archived: false,
        pointsPossible: 100,
        tags: ["Stacks", "Queues", "Recursion"],
        instructions: "Submit a single PDF: problems 1–6, include complexity for each. Use the course LaTeX template if available.",
        resources: [
          { id: "res1", name: "Problem Set 4.pdf", size: "240 KB" },
          { id: "res2", name: "Starter code.zip", size: "18 KB" },
        ],
        subtasks: [
          { id: "st1", text: "Implement stack using array", done: false },
          { id: "st2", text: "Queue with two stacks", done: false },
          { id: "st3", text: "Recursive tree size", done: false },
        ],
      },
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
        archived: true,
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

    s.tasks.forEach(function (task) {
      if (task.archived == null) task.archived = false;
      if (!Array.isArray(task.tags)) task.tags = [];
      if (!Array.isArray(task.resources)) task.resources = [];
      if (!Array.isArray(task.subtasks)) task.subtasks = [];
    });

    s.suggestedTasks = [
      {
        id: "sug-1",
        title: "Chapter 5 Reading",
        sourceLine: "Data Structures Syllabus",
        courseId: "sam-c1",
        type: "reading",
        priority: "Medium",
        due: isoFromDate(addDays(today, 2)),
        estMinutes: 45,
        rationaleTemplate:
          "This reading sets up the lecture on trees and is referenced on the midterm overview. Completing it now avoids cramming.",
      },
      {
        id: "sug-2",
        title: "Project Proposal Draft",
        sourceLine: "Software Eng. Announcement",
        courseId: "sam-c2",
        type: "project",
        priority: "High",
        due: d4,
        estMinutes: 120,
        rationaleTemplate:
          "The sprint board requires a written proposal before stand-up assigns roles. Submitting early gives time for TA feedback.",
      },
      {
        id: "sug-3",
        title: "Midterm Review Session",
        sourceLine: "Class Notes (" + isoFromDate(addDays(today, -2)) + ")",
        courseId: "sam-c3",
        type: "study",
        priority: "Medium",
        due: d6,
        estMinutes: 90,
        rationaleTemplate:
          "Practice problems flagged in lecture map directly to Exam 2. Blocking this yields better recall during timed conditions.",
      },
    ];

    s.tasksPreferences = {
      progressScope: "week",
      suggestionDisplayCap: 6,
      upcomingDeadlineDays: 7,
    };

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
        taskId: "sam-t2",
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
      {
        id: "sam-sch1",
        name: "Google Lime Scholarship",
        amount: "$10,000",
        deadline: isoFromDate(addDays(today, 7)),
        status: "In Progress",
        notes: "",
      },
      {
        id: "sam-sch2",
        name: "NSF S-STEM Scholarship",
        amount: "$8,000",
        deadline: isoFromDate(addDays(today, 22)),
        status: "Not Started",
        notes: "",
      },
      {
        id: "sam-sch3",
        name: "Women in Tech Scholarship",
        amount: "$5,000",
        deadline: isoFromDate(addDays(today, -18)),
        status: "Submitted",
        notes: "",
      },
      {
        id: "sam-sch4",
        name: "Code for Good Scholarship",
        amount: "$2,500",
        deadline: isoFromDate(addDays(today, 38)),
        status: "Saved",
        notes: "",
      },
    ];

    s.recLetterRequests = [
      {
        id: "sam-r1",
        professor: "Prof. Johnson",
        department: "Computer Science",
        status: "Received",
        due: isoFromDate(addDays(today, -19)),
        notes: "",
      },
      {
        id: "sam-r2",
        professor: "Dr. Lee",
        department: "Algorithms",
        status: "In Progress",
        due: isoFromDate(addDays(today, 5)),
        notes: "",
      },
      {
        id: "sam-r3",
        professor: "Prof. Martinez",
        department: "Data Structures",
        status: "Requested",
        due: isoFromDate(addDays(today, 10)),
        notes: "",
      },
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

    s.fafsaChecklist = [
      { id: "fa-s1", label: "Create FSA ID", done: true },
      { id: "fa-s2", label: "Add Schools", done: true },
      { id: "fa-s3", label: "Fill Out Application", done: true },
      { id: "fa-s4", label: "Review & Submit", done: false },
    ];

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
