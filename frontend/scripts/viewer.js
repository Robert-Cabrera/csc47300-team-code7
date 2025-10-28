/*
  viewer.js — unified for Crash Course + Summary views
  Compatible with revised viewer.html layouts and viewer.css
*/

// -----------------------------
// Crash Course viewer section
// -----------------------------
(function () {
  function renderCrashCourse(data) {
    if (!data || typeof data !== "object") return;

    const topicEl = document.getElementById("crash-title");
    if (topicEl) topicEl.textContent = data.topic || "";

    const summaryEl = document.getElementById("crash-overview");
    if (summaryEl) summaryEl.textContent = data.summary || "";

    const overviewEl = document.getElementById("crash-overview-details");
    if (overviewEl)
      overviewEl.innerHTML = `<strong>Overview:</strong> ${data.overview || ""}`;

    const mainTopics = document.getElementById("crash-topic-list");
    if (!mainTopics) return;
    mainTopics.innerHTML = "";

    if (Array.isArray(data.main_topics)) {
      data.main_topics.forEach((topic) => {
        const topicDiv = document.createElement("div");
        topicDiv.className = "crash-topic-item";

        const titleDiv = document.createElement("div");
        titleDiv.className = "crash-topic-title";
        titleDiv.textContent = topic.title || "";
        topicDiv.appendChild(titleDiv);

        const descDiv = document.createElement("div");
        descDiv.className = "crash-topic-desc";
        descDiv.textContent = topic.description || "";
        topicDiv.appendChild(descDiv);

        if (Array.isArray(topic.subtopics)) {
          const subtopicsList = document.createElement("ul");
          subtopicsList.className = "crash-subtopic-list";
          topic.subtopics.forEach((sub) => {
            const li = document.createElement("li");
            li.className = "crash-subtopic-item";
            li.innerHTML = `<span class="crash-subtopic-title">${sub.title}:</span> <span class="crash-subtopic-details">${sub.details}</span>`;
            subtopicsList.appendChild(li);
          });
          topicDiv.appendChild(subtopicsList);
        }

        mainTopics.appendChild(topicDiv);
      });
    }

    const conclusionEl = document.getElementById("crash-conclusion");
    if (conclusionEl)
      conclusionEl.innerHTML = `<strong>Conclusion:</strong> ${data.conclusion || ""}`;
  }

  function getCrashCourseData() {
    try {
      const stored = localStorage.getItem("crashCourseView");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function renderCrashCourseList(courses, currentId) {
    const list = document.getElementById("crash-list");
    if (!list) return;
    list.innerHTML = "";

    (courses || []).forEach((course) => {
      const li = document.createElement("li");
      li.textContent = course.topic || "Untitled";
      li.className = "crash-list-item";
      if (course.id === currentId) li.classList.add("active");
      li.onclick = () => {
        localStorage.setItem("crashCourseView", JSON.stringify(course));
        location.reload();
      };
      list.appendChild(li);
    });
  }

  if (document.querySelector(".crash-container")) {
    document.addEventListener("DOMContentLoaded", () => {
      const data = getCrashCourseData();
      if (data) renderCrashCourse(data);

      const sidebarLoadingEl = document.getElementById("crash-sidebar-loading");
      if (sidebarLoadingEl) sidebarLoadingEl.style.display = "flex";

      const userDataRaw = localStorage.getItem("userData");
      let user = null;
      try {
        user = userDataRaw ? JSON.parse(userDataRaw) : null;
      } catch {}

      (async function loadCourses() {
        let allCourses = [];
        if (user && user.id) {
          try {
            const resp = await fetch(
              `/api/user/${user.id}/crash-courses?start=0&limit=1000`
            );
            if (resp.ok) {
              const json = await resp.json();
              allCourses = Array.isArray(json.items)
                ? json.items
                : json.items || [];
            }
          } catch (e) {
            console.warn(
              "Failed to fetch crash courses from server, falling back to local cache",
              e
            );
          }
        }

        if (!allCourses.length) {
          try {
            allCourses =
              JSON.parse(localStorage.getItem("allCrashCourses")) || [];
          } catch {}
        }

        allCourses = (allCourses || []).map((c) => {
          if (!c.id)
            c.id = c.createdAt
              ? String(c.createdAt)
              : String(c._id || Date.now() + Math.random());
          return c;
        });

        const currentId =
          (data && data.id) || (allCourses[0] && allCourses[0].id);
        renderCrashCourseList(allCourses, currentId);

        if (!data && allCourses[0]) {
          localStorage.setItem("crashCourseView", JSON.stringify(allCourses[0]));
          renderCrashCourse(allCourses[0]);
        }

        if (sidebarLoadingEl) sidebarLoadingEl.style.display = "none";
      })();

      const collapseBtn = document.getElementById("crash-sidebar-collapse-btn");
      const sidebar = document.getElementById("crash-sidebar");
      if (collapseBtn && sidebar) {
        collapseBtn.onclick = () => {
          sidebar.classList.toggle("collapsed");
          const icon = collapseBtn.querySelector(".material-symbols-outlined");
          if (icon)
            icon.textContent = sidebar.classList.contains("collapsed")
              ? "chevron_right"
              : "chevron_left";
        };
      }
    });
  }
})();

// -----------------------------
// Summary viewer section
// -----------------------------
(function () {
  function renderSummary(data) {
    if (!data || typeof data !== "object") return;

    const titleEl = document.getElementById("summary-title");
    if (titleEl)
      titleEl.textContent =
        data.document_title || data.fileName || "Summary";

    const execEl = document.getElementById("summary-exec");
    if (execEl) execEl.textContent = data.executive_summary || "";

    const findingsEl = document.getElementById("summary-key-findings");
    if (findingsEl) findingsEl.innerHTML = "";

    if (Array.isArray(data.key_findings) && data.key_findings.length) {
      const heading = document.createElement("strong");
      heading.textContent = "Key Findings:";
      const ul = document.createElement("ul");
      ul.className = "summary-key-findings-list";
      data.key_findings.forEach((f) => {
        const li = document.createElement("li");
        li.className = "summary-key-findings-item";
        li.textContent = f;
        ul.appendChild(li);
      });
      findingsEl.appendChild(heading);
      findingsEl.appendChild(ul);
    }

    const sections = document.getElementById("summary-sections");
    if (sections) sections.innerHTML = "";

    if (Array.isArray(data.section_summaries)) {
      data.section_summaries.forEach((sec) => {
        const container = document.createElement("div");
        container.className = "summary-section";

        const title = document.createElement("div");
        title.className = "summary-section-title";
        title.textContent = sec.page_range
          ? `Pages ${sec.page_range}`
          : "Section";
        container.appendChild(title);

        const list = document.createElement("ul");
        list.className = "summary-section-points";
        (sec.summary_points || []).forEach((pt) => {
          const li = document.createElement("li");
          li.className = "summary-section-point";
          li.textContent = pt;
          list.appendChild(li);
        });

        container.appendChild(list);
        sections.appendChild(container);
      });
    }
  }

  function getSummaryData() {
    try {
      const stored = localStorage.getItem("summaryView");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function renderSummaryList(list, currentId) {
    const el = document.getElementById("summary-list");
    if (!el) return;
    el.innerHTML = "";

    if (!list || !list.length) {
      const empty = document.createElement("li");
      empty.className = "summary-list-item";
      empty.style.opacity = "0.7";
      empty.textContent = "No summaries found";
      el.appendChild(empty);
      return;
    }

    list.forEach((s) => {
      const li = document.createElement("li");
      li.className = "summary-list-item";
      li.textContent = s.document_title || s.fileName || "Untitled";
      if (s.id) li.dataset.itemId = s.id;
      if (s.id === currentId) li.classList.add("active");
      li.onclick = () => {
        localStorage.setItem("summaryView", JSON.stringify(s));
        location.reload();
      };
      el.appendChild(li);
    });
  }

  if (document.querySelector(".summary-container")) {
    document.addEventListener("DOMContentLoaded", () => {
      const data = getSummaryData();
      if (data) renderSummary(data);

      const sidebarLoading = document.getElementById("summary-sidebar-loading");
      if (sidebarLoading) sidebarLoading.style.display = "flex";

      const userDataRaw = localStorage.getItem("userData");
      let user = null;
      try {
        user = userDataRaw ? JSON.parse(userDataRaw) : null;
      } catch {}

      (async function loadSummaries() {
        let allSummaries = [];
        if (user && user.id) {
          try {
            const resp = await fetch(
              `/api/user/${user.id}/summaries?start=0&limit=1000`
            );
            if (resp.ok) {
              const json = await resp.json();
              allSummaries = Array.isArray(json.items)
                ? json.items
                : json.items || [];
            }
          } catch (e) {
            console.warn("Failed to fetch summaries, using cache", e);
          }
        }

        if (!allSummaries.length) {
          try {
            allSummaries =
              JSON.parse(localStorage.getItem("allSummaries")) || [];
          } catch {}
        }

        allSummaries = (allSummaries || []).map((s) => {
          if (!s.id)
            s.id = s.createdAt
              ? String(s.createdAt)
              : String(Date.now() + Math.random());
          return s;
        });

        const currentId =
          (data && data.id) || (allSummaries[0] && allSummaries[0].id);
        renderSummaryList(allSummaries, currentId);

        if (!data && allSummaries[0]) {
          localStorage.setItem("summaryView", JSON.stringify(allSummaries[0]));
          renderSummary(allSummaries[0]);
        }

        if (sidebarLoading) sidebarLoading.style.display = "none";
      })();

      const collapseBtn = document.getElementById("summary-sidebar-collapse-btn");
      const sidebar = document.getElementById("summary-sidebar");
      if (collapseBtn && sidebar) {
        collapseBtn.onclick = () => {
          sidebar.classList.toggle("collapsed");
          const icon = collapseBtn.querySelector(".material-symbols-outlined");
          if (icon)
            icon.textContent = sidebar.classList.contains("collapsed")
              ? "chevron_right"
              : "chevron_left";
        };
      }
    });
  }
})();
