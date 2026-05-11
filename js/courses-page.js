/**
 * DegreePilot — dedicated Courses workspace (courses.html)
 * Shares localStorage with dashboard via DegreePilotStorage.
 */
(function () {
  "use strict";

  var D = window.DegreePilotDashboardCore;
  var Save = window.DegreePilotStorage;
  var Seed = window.DegreePilotSeed;

  var state = Save.loadState();
  var ui = {
    termFilter: "all",
    filterText: "",
    selectedId: null,
    detailTab: "overview",
  };

  var syllabusDraft = null;

  function save() {
    Save.saveState(state);
  }

  function normalizeCourse(c) {
    if (!c.term) c.term = "current";
    if (!c.subject) {
      var parts = String(c.code || "")
        .trim()
        .split(/\s+/);
      c.subject = parts[0] || "";
    }
    if (!Array.isArray(c.links)) c.links = [];
    if (!Array.isArray(c.materials)) c.materials = [];
    if (!Array.isArray(c.courseNotesList)) c.courseNotesList = [];
    if (!Array.isArray(c.alerts)) c.alerts = [];
    if (c.rateMyProfessorUrl == null) c.rateMyProfessorUrl = "";
    if (c.syllabusPdfUrl == null) c.syllabusPdfUrl = "";
    c.links.forEach(function (l) {
      if (!l.kind) l.kind = "other";
    });
  }

  function normalizeAll() {
    (state.courses || []).forEach(normalizeCourse);
  }

  function esc(s) {
    return D.escapeHtml(s == null ? "" : String(s));
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

  function courseIconGlyph(subject) {
    var s = String(subject || "").toUpperCase();
    if (s.indexOf("MATH") >= 0 || s === "Σ") return "Σ";
    if (s.indexOf("CS") >= 0) return "</>";
    if (s.indexOf("ENG") >= 0) return "Aa";
    if (s.indexOf("DB") >= 0 || s.indexOf("340") >= 0) return "🗄";
    return "◆";
  }

  function filteredCourses() {
    normalizeAll();
    var q = ui.filterText.trim().toLowerCase();
    return state.courses.filter(function (c) {
      if (ui.termFilter !== "all" && c.term !== ui.termFilter) return false;
      if (!q) return true;
      var code = (c.code || "").toLowerCase();
      var name = (c.name || "").toLowerCase();
      var sub = (c.subject || "").toLowerCase();
      return code.indexOf(q) >= 0 || name.indexOf(q) >= 0 || sub.indexOf(q) >= 0;
    });
  }

  function courseById(id) {
    return state.courses.find(function (c) {
      return c.id === id;
    });
  }

  function renderSidebarSemester() {
    var meta = state.semesterMeta || {};
    var pct = document.getElementById("courses-sidebar-sem-pct");
    var fill = document.getElementById("courses-sidebar-progress-fill");
    var wk = document.getElementById("courses-sidebar-week-label");
    var tw = meta.totalWeeks || 16;
    var cw = meta.currentWeek || 1;
    var p = Math.min(100, Math.round((cw / tw) * 100));
    if (pct) pct.textContent = p + "%";
    if (fill) fill.style.width = p + "%";
    if (wk) wk.textContent = "Week " + cw + " of " + tw + " · " + (state.profile && state.profile.semesterLabel ? state.profile.semesterLabel : "");
  }

  function renderList() {
    var host = document.getElementById("courses-list-host");
    if (!host) return;
    var items = filteredCourses();
    if (!items.length) {
      host.innerHTML =
        '<p class="muted" style="padding:1rem;">No courses match. Try another tab or clear the filter.</p>';
      return;
    }
    host.innerHTML = items
      .map(function (c) {
        var pct = D.courseGradePercent(c.id, state.gradeEntries);
        var letter = letterFromPercent(pct);
        var pri = (c.priority || "Medium") === "High";
        var sel = ui.selectedId === c.id ? " is-selected" : "";
        return (
          '<button type="button" class="courses-card' +
          sel +
          '" data-course-id="' +
          esc(c.id) +
          '">' +
          '<div class="courses-card-icon" style="background:' +
          esc(c.color || "#0056b3") +
          '">' +
          esc(courseIconGlyph(c.subject)) +
          "</div>" +
          '<div class="courses-card-body"><h3>' +
          esc(c.code) +
          "</h3><p>" +
          esc(c.name) +
          '</p><div class="courses-card-meta">' +
          esc(c.professor || "") +
          (c.professorEmail ? " · " + esc(c.professorEmail) : "") +
          "</div></div>" +
          '<div class="courses-card-grade"><span>Current grade</span><strong style="color:' +
          esc(c.color || "#0056b3") +
          '">' +
          esc(letter) +
          "</strong></div>" +
          '<span class="courses-card-priority' +
          (pri ? " is-high" : "") +
          '">' +
          esc(c.priority || "Medium") +
          "</span></button>"
        );
      })
      .join("");

    host.querySelectorAll("[data-course-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.selectedId = btn.getAttribute("data-course-id");
        ui.detailTab = "overview";
        renderList();
        renderDetail();
      });
    });
  }

  function renderDetail() {
    var wrap = document.getElementById("courses-detail-inner");
    if (!wrap) return;
    var c = courseById(ui.selectedId);
    if (!c) {
      wrap.className = "courses-empty-panel";
      wrap.innerHTML = "Select a course to see overview, links, materials, and syllabus.";
      return;
    }
    normalizeCourse(c);
    var pct = D.courseGradePercent(c.id, state.gradeEntries);
    var letter = letterFromPercent(pct);
    var tabs = ["overview", "links", "materials", "syllabus"];
    var tabHtml = tabs
      .map(function (t) {
        return (
          '<button type="button" data-detail-tab="' +
          t +
          '" class="' +
          (ui.detailTab === t ? "is-active" : "") +
          '">' +
          t.charAt(0).toUpperCase() +
          t.slice(1) +
          "</button>"
        );
      })
      .join("");

    var alertsHtml = (c.alerts || [])
      .map(function (a) {
        var cls = a.level === "risk" ? "is-risk" : "is-warn";
        return '<div class="courses-alert ' + cls + '">' + esc(a.text) + "</div>";
      })
      .join("");

    var notesHtml = (c.courseNotesList || [])
      .map(function (n) {
        return (
          '<div class="courses-note-item"><span class="courses-note-tag">' +
          esc(n.source || "note") +
          "</span> · " +
          esc(n.created || "") +
          "<p style=\"margin:0.25rem 0 0;\">" +
          esc(n.text) +
          "</p></div>"
        );
      })
      .join("");

    wrap.className = "";
    wrap.innerHTML =
      '<div class="courses-detail-card">' +
      '<div class="courses-detail-head">' +
      '<div class="courses-detail-title-row">' +
      '<div class="courses-card-icon" style="background:' +
      esc(c.color) +
      ';width:40px;height:40px;font-size:0.95rem;">' +
      esc(courseIconGlyph(c.subject)) +
      "</div>" +
      "<div><h2>" +
      esc(c.code + " — " + c.name) +
      '</h2><p class="courses-detail-sub">' +
      esc(c.classFormat || "") +
      " · " +
      esc({ current: "This semester", next: "Next semester", completed: "Completed" }[c.term] || c.term) +
      "</p></div></div>" +
      '<button type="button" class="btn btn-secondary btn-sm" id="courses-detail-edit">Edit</button>' +
      "</div>" +
      '<div class="courses-detail-tabs" role="tablist">' +
      tabHtml +
      "</div>" +
      '<div class="courses-detail-body">' +
      '<div class="courses-detail-pane" data-pane="overview" ' +
      (ui.detailTab !== "overview" ? 'hidden' : "") +
      ">" +
      '<div class="courses-snapshot">' +
      '<div class="courses-snapshot-item"><span class="muted" style="font-size:0.72rem;">Grade</span><strong>' +
      esc(letter) +
      "</strong>" +
      (pct != null ? '<span class="muted" style="font-size:0.75rem;">~' + esc(String(pct)) + "%</span>" : "") +
      "</div>" +
      '<div class="courses-snapshot-item"><span class="muted" style="font-size:0.72rem;">Priority</span><strong>' +
      esc(c.priority || "—") +
      '</strong><span class="muted" style="font-size:0.72rem;">Focus level</span></div>' +
      '<div class="courses-snapshot-item"><span class="muted" style="font-size:0.72rem;">Trend</span><strong style="color:#16a34a;">+0.3</strong><span class="muted" style="font-size:0.72rem;">vs last week (demo)</span></div>' +
      "</div>" +
      (alertsHtml ? "<div><strong>Alerts</strong>" + alertsHtml + "</div>" : "") +
      "<div><strong>Notes &amp; reminders</strong>" +
      (notesHtml || '<p class="muted">No structured notes yet.</p>') +
      '<div class="field mt-sm"><label for="courses-new-note">Add note</label><textarea id="courses-new-note" rows="2" placeholder="From lecture, announcement, or your summary…"></textarea>' +
      '<div class="form-row-2 mt-sm">' +
      '<select id="courses-new-note-source"><option value="lecture">Class lecture</option><option value="announcement">Announcement</option><option value="syllabus">Syllabus</option><option value="other">Other</option></select>' +
      '<button type="button" class="btn btn-primary btn-sm" id="courses-btn-add-note">Add note</button></div></div>' +
      '<details class="courses-prof-block"><summary>Professor &amp; contact</summary>' +
      '<div class="courses-prof-body">' +
      "<p><strong>" +
      esc(c.professor || "—") +
      "</strong></p>" +
      '<p><a href="mailto:' +
      esc(c.professorEmail) +
      '">' +
      esc(c.professorEmail || "") +
      "</a></p>" +
      "<p>Office hours: " +
      esc(c.officeHours || "—") +
      "</p>" +
      (c.rateMyProfessorUrl
        ? '<p><a href="' +
          esc(c.rateMyProfessorUrl) +
          '" target="_blank" rel="noopener">Rate My Professors profile →</a></p>'
        : '<p class="muted">Add a Rate My Professors link under Edit course.</p>') +
      "</div></details>" +
      "</div>" +
      '<div class="courses-detail-pane" data-pane="links" ' +
      (ui.detailTab !== "links" ? 'hidden' : "") +
      ">" +
      "<p class=\"muted\" style=\"font-size:0.82rem;\">LMS shortcuts (Canvas, Blackboard, etc.) and class links.</p>" +
      '<div id="courses-links-list"></div>' +
      '<div class="form-row-2 mt-sm"><input id="courses-link-label" placeholder="Label" /><input id="courses-link-url" placeholder="https://…" /></div>' +
      '<div class="form-row-2 mt-sm"><select id="courses-link-kind"><option value="lms">LMS / Class site</option><option value="syllabus">Syllabus</option><option value="other">Other</option></select>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="courses-btn-add-link">Add link</button></div>' +
      "</div>" +
      '<div class="courses-detail-pane" data-pane="materials" ' +
      (ui.detailTab !== "materials" ? 'hidden' : "") +
      ">" +
      '<div id="courses-materials-list"></div>' +
      '<div class="form-row-2 mt-sm"><input id="courses-mat-title" placeholder="Title (e.g. textbook)" /><input id="courses-mat-note" placeholder="Notes / URL hint" /></div>' +
      '<button type="button" class="btn btn-secondary btn-sm mt-sm" id="courses-btn-add-mat">Add material</button>' +
      "</div>" +
      '<div class="courses-detail-pane" data-pane="syllabus" ' +
      (ui.detailTab !== "syllabus" ? 'hidden' : "") +
      ">" +
      '<p class="muted" style="font-size:0.82rem;">Plain-text syllabus on file (searchable). PDF URL is reference only in this prototype.</p>' +
      '<div class="field"><label for="courses-syllabus-url">Syllabus PDF / doc URL</label><input id="courses-syllabus-url" type="url" placeholder="https://…" value="' +
      esc(c.syllabusPdfUrl) +
      '" /></div>' +
      '<div class="field"><label for="courses-syllabus-text">Syllabus text</label><textarea id="courses-syllabus-text" rows="8">' +
      esc(c.syllabusPlainText || "") +
      "</textarea></div>" +
      '<button type="button" class="btn btn-primary btn-sm" id="courses-btn-save-syllabus">Save syllabus</button> ' +
      '<button type="button" class="btn btn-secondary btn-sm" id="courses-btn-dl-syllabus">Download .txt</button>' +
      "</div>" +
      "</div></div>";

    wrap.querySelectorAll("[data-detail-tab]").forEach(function (b) {
      b.addEventListener("click", function () {
        ui.detailTab = b.getAttribute("data-detail-tab");
        renderDetail();
      });
    });

    function fillLinkRows() {
      var lh = document.getElementById("courses-links-list");
      if (!lh) return;
      lh.innerHTML = (c.links || [])
        .map(function (l, i) {
          var badge = l.kind === "lms" ? '<span class="courses-lms-badge">LMS</span>' : "";
          return (
            '<div class="courses-link-row"><div>' +
            badge +
            ' <a href="' +
            esc(l.url) +
            '" target="_blank" rel="noopener">' +
            esc(l.label) +
            '</a></div><button type="button" class="btn btn-ghost btn-sm" data-rm-link="' +
            i +
            '">Remove</button></div>'
          );
        })
        .join("") || '<p class="muted">No links yet.</p>';
      lh.querySelectorAll("[data-rm-link]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var ix = parseInt(btn.getAttribute("data-rm-link"), 10);
          c.links.splice(ix, 1);
          save();
          renderDetail();
        });
      });
    }

    function fillMatRows() {
      var mh = document.getElementById("courses-materials-list");
      if (!mh) return;
      mh.innerHTML = (c.materials || [])
        .map(function (m, i) {
          return (
            '<div class="courses-link-row"><div><strong>' +
            esc(m.title) +
            "</strong> — " +
            esc(m.note || "") +
            '</div><button type="button" class="btn btn-ghost btn-sm" data-rm-mat="' +
            i +
            '">Remove</button></div>'
          );
        })
        .join("") || '<p class="muted">No materials yet.</p>';
      mh.querySelectorAll("[data-rm-mat]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var ix = parseInt(btn.getAttribute("data-rm-mat"), 10);
          c.materials.splice(ix, 1);
          save();
          renderDetail();
        });
      });
    }

    fillLinkRows();
    fillMatRows();

    var btnEdit = document.getElementById("courses-detail-edit");
    if (btnEdit) btnEdit.addEventListener("click", function () {
      openManualModal(c.id);
    });

    var btnNote = document.getElementById("courses-btn-add-note");
    if (btnNote) {
      btnNote.addEventListener("click", function () {
        var tx = document.getElementById("courses-new-note");
        var src = document.getElementById("courses-new-note-source");
        if (!tx || !tx.value.trim()) return;
        c.courseNotesList.push({
          id: D.uid(),
          text: tx.value.trim(),
          source: src ? src.value : "other",
          created: D.isoFromDate(new Date()),
        });
        tx.value = "";
        save();
        renderDetail();
      });
    }

    var btnL = document.getElementById("courses-btn-add-link");
    if (btnL) {
      btnL.addEventListener("click", function () {
        var lab = document.getElementById("courses-link-label");
        var url = document.getElementById("courses-link-url");
        var kind = document.getElementById("courses-link-kind");
        if (!lab.value.trim() || !url.value.trim()) return;
        c.links.push({ label: lab.value.trim(), url: url.value.trim(), kind: kind.value });
        lab.value = "";
        url.value = "";
        save();
        renderDetail();
      });
    }

    var btnM = document.getElementById("courses-btn-add-mat");
    if (btnM) {
      btnM.addEventListener("click", function () {
        var t = document.getElementById("courses-mat-title");
        var n = document.getElementById("courses-mat-note");
        if (!t.value.trim()) return;
        c.materials.push({ title: t.value.trim(), note: (n && n.value.trim()) || "" });
        t.value = "";
        if (n) n.value = "";
        save();
        renderDetail();
      });
    }

    var btnSy = document.getElementById("courses-btn-save-syllabus");
    if (btnSy) {
      btnSy.addEventListener("click", function () {
        var u = document.getElementById("courses-syllabus-url");
        var t = document.getElementById("courses-syllabus-text");
        c.syllabusPdfUrl = u ? u.value.trim() : "";
        c.syllabusPlainText = t ? t.value : "";
        save();
        alert("Syllabus saved.");
      });
    }
    var btnDl = document.getElementById("courses-btn-dl-syllabus");
    if (btnDl) {
      btnDl.addEventListener("click", function () {
        var text = c.syllabusPlainText || "";
        var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = String(c.code || "course").replace(/\s+/g, "_") + "-syllabus.txt";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }
  }

  function renderAll() {
    normalizeAll();
    renderSidebarSemester();
    renderList();
    renderDetail();
  }

  function simulatedExtractedText(filename) {
    return (
      "SIMULATED EXTRACTION — " +
      filename +
      "\n\n(In production, OCR / PDF parsing would run here.)\n\n" +
      "Course objectives: foundational mastery and assessment alignment.\n" +
      "Grading: assignments 30%, exams 45%, project 25%.\n" +
      "Important dates: Problem set 2 due next week; midterm in week 8.\n" +
      "Academic integrity and ADA statements apply.\n" +
      "LMS: all submissions through the class shell.\n"
    );
  }

  function openManualModal(editId) {
    var modal = document.getElementById("courses-modal-manual");
    var del = document.getElementById("courses-manual-delete");
    document.getElementById("courses-manual-title").textContent = editId ? "Edit course" : "Add course";
    document.getElementById("courses-manual-edit-id").value = editId || "";
    del.hidden = !editId;
    if (editId) {
      var c = courseById(editId);
      if (!c) return;
      document.getElementById("courses-m-code").value = c.code || "";
      document.getElementById("courses-m-name").value = c.name || "";
      document.getElementById("courses-m-term").value = c.term || "current";
      document.getElementById("courses-m-prof").value = c.professor || "";
      document.getElementById("courses-m-email").value = c.professorEmail || "";
      document.getElementById("courses-m-hours").value = c.officeHours || "";
      document.getElementById("courses-m-format").value = c.classFormat || "";
      document.getElementById("courses-m-priority").value = c.priority || "Medium";
      document.getElementById("courses-m-color").value = c.color || "#0056b3";
      document.getElementById("courses-m-rmp").value = c.rateMyProfessorUrl || "";
      document.getElementById("courses-m-notes").value = c.notes || "";
    } else {
      document.getElementById("courses-form-manual").reset();
      document.getElementById("courses-m-color").value = "#0056b3";
    }
    modal.hidden = false;
  }

  function closeManualModal() {
    var modal = document.getElementById("courses-modal-manual");
    if (modal) modal.hidden = true;
  }

  function syncTopBar() {
    var p = state.profile || {};
    var dn = document.getElementById("profile-display-name");
    var mj = document.getElementById("profile-major-line");
    var av = document.getElementById("profile-avatar");
    if (dn) dn.textContent = p.displayName || "Student";
    if (mj) mj.textContent = [p.major, p.university].filter(Boolean).join(" · ") || "";
    if (av) {
      var initials = (p.displayName || "S")
        .split(/\s+/)
        .map(function (x) {
          return x[0];
        })
        .join("")
        .slice(0, 2)
        .toUpperCase();
      av.textContent = initials;
    }
    var badge = document.getElementById("notification-badge");
    if (badge) {
      var n = typeof state.notificationsUnread === "number" ? state.notificationsUnread : 0;
      badge.hidden = n <= 0;
      badge.textContent = String(Math.min(Math.max(n, 0), 9));
    }
  }

  function applySyllabusSimulationToState(courseId) {
    var ext = D.syllabusSimulation(courseId);
    ext.tasks.forEach(function (t) {
      state.tasks.push({
        id: D.uid(),
        title: t.title,
        courseId: courseId,
        type: t.type || "assignment",
        due: t.due,
        priority: t.priority || "Medium",
        estMinutes: 90,
        notes: "Imported from syllabus.",
        completed: false,
        source: "syllabus",
      });
    });
    (ext.exams || []).forEach(function (ex) {
      state.calendarEvents.push({
        id: D.uid(),
        title: ex.title,
        type: "exam",
        courseId: courseId,
        date: ex.date,
        time: "",
        priority: "high",
        color: "",
        notes: "",
      });
    });
  }

  function bind() {
    document.querySelectorAll("[data-term-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.termFilter = btn.getAttribute("data-term-filter");
        document.querySelectorAll("[data-term-filter]").forEach(function (b) {
          b.classList.toggle("is-active", b.getAttribute("data-term-filter") === ui.termFilter);
        });
        renderList();
      });
    });

    var searchInp = document.getElementById("global-search");
    if (searchInp) {
      searchInp.addEventListener("input", function () {
        ui.filterText = searchInp.value;
        renderList();
      });
    }

    document.getElementById("courses-btn-filter-icon").addEventListener("click", function () {
      if (searchInp) searchInp.focus();
    });

    document.querySelectorAll(".courses-preset-swatch").forEach(function (sw) {
      sw.addEventListener("click", function () {
        var hex = sw.getAttribute("data-hex");
        var inp = document.getElementById("courses-m-color");
        if (inp && hex) inp.value = hex;
      });
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
            '<p class="ov-notify-empty muted" style="padding:0.65rem 0.85rem;font-size:0.85rem;margin:0;">Open <a href="updates.html">Updates</a> for intake tools, or the <a href="dashboard.html#overview">dashboard</a> for quick actions. The badge reflects your saved unread count.</p>';
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

    document.getElementById("courses-btn-add-manual").addEventListener("click", function () {
      openManualModal(null);
    });

    document.getElementById("courses-manual-close").addEventListener("click", closeManualModal);
    document.querySelector("#courses-modal-manual .modal-backdrop").addEventListener("click", closeManualModal);

    document.getElementById("courses-form-manual").addEventListener("submit", function (e) {
      e.preventDefault();
      var editId = document.getElementById("courses-manual-edit-id").value;
      var payload = {
        code: document.getElementById("courses-m-code").value.trim(),
        name: document.getElementById("courses-m-name").value.trim(),
        term: document.getElementById("courses-m-term").value,
        professor: document.getElementById("courses-m-prof").value.trim(),
        professorEmail: document.getElementById("courses-m-email").value.trim(),
        officeHours: document.getElementById("courses-m-hours").value.trim(),
        classFormat: document.getElementById("courses-m-format").value.trim(),
        priority: document.getElementById("courses-m-priority").value,
        color: document.getElementById("courses-m-color").value,
        rateMyProfessorUrl: document.getElementById("courses-m-rmp").value.trim(),
        notes: document.getElementById("courses-m-notes").value.trim(),
      };
      var parts = payload.code.split(/\s+/);
      payload.subject = parts[0] || "";
      if (editId) {
        var c = courseById(editId);
        if (c) Object.assign(c, payload);
      } else {
        state.courses.push(
          Object.assign(
            {
              id: D.uid(),
              links: [],
              materials: [],
              syllabusExtracted: null,
              syllabusPlainText: "",
              syllabusPdfUrl: "",
              alerts: [],
              courseNotesList: [],
            },
            payload
          )
        );
        ui.selectedId = state.courses[state.courses.length - 1].id;
      }
      save();
      closeManualModal();
      renderAll();
    });

    document.getElementById("courses-manual-delete").addEventListener("click", function () {
      var editId = document.getElementById("courses-manual-edit-id").value;
      if (!editId || !confirm("Delete this course?")) return;
      state.courses = state.courses.filter(function (x) {
        return x.id !== editId;
      });
      state.tasks = state.tasks.filter(function (t) {
        return t.courseId !== editId;
      });
      state.calendarEvents = state.calendarEvents.filter(function (ev) {
        return ev.courseId !== editId;
      });
      ui.selectedId = null;
      save();
      closeManualModal();
      renderAll();
    });

    document.getElementById("courses-btn-upload-syllabus").addEventListener("click", function () {
      document.getElementById("courses-syllabus-file").click();
    });

    document.getElementById("courses-syllabus-file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!f) return;
      var name = f.name || "syllabus.pdf";
      var reader = new FileReader();
      reader.onload = function () {
        var plain = "";
        if (/\.txt$/i.test(name)) {
          plain = String(reader.result || "");
        } else {
          plain = simulatedExtractedText(name);
        }
        var guessedCode = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").slice(0, 18).trim() || "NEW 100";
        syllabusDraft = { filename: name, plain: plain };
        document.getElementById("courses-syllabus-filename").textContent = "File: " + name + " · simulated extraction";
        document.getElementById("courses-syllabus-code").value = guessedCode.toUpperCase();
        document.getElementById("courses-syllabus-name").value = "Imported course";
        document.getElementById("courses-syllabus-prof").value = "";
        document.getElementById("courses-syllabus-email").value = "";
        document.getElementById("courses-syllabus-plain").value = plain;
        var prev = document.getElementById("courses-syllabus-extraction-preview");
        prev.innerHTML =
          "<p><strong>Preview tasks / exams</strong> (demo generator)</p><ul><li>Uses the same simulation as the dashboard syllabus analyzer.</li></ul>";
        document.getElementById("courses-modal-syllabus").hidden = false;
      };
      if (/\.txt$/i.test(name)) reader.readAsText(f);
      else reader.readAsArrayBuffer(f);
    });

    document.getElementById("courses-syllabus-close").addEventListener("click", function () {
      document.getElementById("courses-modal-syllabus").hidden = true;
      syllabusDraft = null;
    });
    document.querySelector("#courses-modal-syllabus .modal-backdrop").addEventListener("click", function () {
      document.getElementById("courses-modal-syllabus").hidden = true;
      syllabusDraft = null;
    });
    document.getElementById("courses-syllabus-cancel").addEventListener("click", function () {
      document.getElementById("courses-modal-syllabus").hidden = true;
      syllabusDraft = null;
    });

    document.getElementById("courses-syllabus-confirm").addEventListener("click", function () {
      var code = document.getElementById("courses-syllabus-code").value.trim();
      var title = document.getElementById("courses-syllabus-name").value.trim();
      var prof = document.getElementById("courses-syllabus-prof").value.trim();
      var email = document.getElementById("courses-syllabus-email").value.trim();
      var plain = document.getElementById("courses-syllabus-plain").value;
      if (!code || !title) {
        alert("Enter at least course code and title.");
        return;
      }
      var parts = code.split(/\s+/);
      var id = D.uid();
      var newCourse = {
        id: id,
        code: code,
        name: title,
        subject: parts[0] || "",
        term: "current",
        professor: prof,
        professorEmail: email,
        officeHours: "",
        classFormat: "",
        color: "#0056b3",
        priority: "Medium",
        notes: "Created from syllabus import.",
        links: [],
        materials: [],
        syllabusExtracted: null,
        syllabusPlainText: plain,
        syllabusPdfUrl: "",
        rateMyProfessorUrl: "",
        courseNotesList: [],
        alerts: [],
      };
      normalizeCourse(newCourse);
      state.courses.push(newCourse);
      applySyllabusSimulationToState(id);
      save();
      document.getElementById("courses-modal-syllabus").hidden = true;
      syllabusDraft = null;
      ui.selectedId = id;
      ui.detailTab = "syllabus";
      renderAll();
      alert("Course created with demo tasks and exam placeholders. Open Tasks or Calendar to review.");
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
        normalizeAll();
        ui.selectedId = state.courses[0] ? state.courses[0].id : null;
        samp.checked = !!state.sampleDataMode;
        renderAll();
        syncTopBar();
      });
    }
  }

  normalizeAll();
  bind();
  renderAll();
  syncTopBar();
})();
