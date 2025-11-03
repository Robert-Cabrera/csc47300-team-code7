/* 
  ? File:
      viewer.ts

  ? Main Contributors:
      Robert

  ? Functionalities:
    - Render and manage Crash Course viewer (main content + sidebar)
    - Render and manage Summary viewer (main content + sidebar)
    - Fetch history data from backend or local cache
    - Handle sidebar collapse and item selection for both views
*/

// ================================ TYPE DEFINITIONS -=====================================
type Subtopic = { title?: string; details?: string };
type MainTopic = { title?: string; description?: string; subtopics?: Subtopic[] };

type CrashCourseData = {
  topic?: string;
  summary?: string;
  overview?: string;
  main_topics?: MainTopic[];
  conclusion?: string;
  id?: string;
  createdAt?: number;
  _id?: string;
};

type SectionSummary = { page_range?: string; summary_points?: string[] };

type SummaryData = {
  document_title?: string;
  fileName?: string;
  executive_summary?: string;
  key_findings?: string[];
  section_summaries?: SectionSummary[];
  id?: string;
  createdAt?: number;
};

// ================================ DOM UTILITIES -=====================================
function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// ================================ CRASH COURSE VIEWER -=====================================
(function () {
  // Render crash course content into the main panel
  function renderCrashCourse(data: CrashCourseData | any) {
    if (!data || typeof data !== 'object') return;

    const title = getEl<HTMLElement>('crash-title');
    const summary = getEl<HTMLElement>('crash-overview');
    const overview = getEl<HTMLElement>('crash-overview-details');
    const mainTopics = getEl<HTMLElement>('crash-topic-list');
    const conclusion = getEl<HTMLElement>('crash-conclusion');

    if (title) title.textContent = data.topic || '';
    if (summary) summary.textContent = data.summary || '';
    if (overview) overview.innerHTML = `<strong>Overview:</strong> ${data.overview || ''}`;

    if (!mainTopics) return;
    mainTopics.innerHTML = '';

    if (Array.isArray(data.main_topics)) {
      data.main_topics.forEach((topic: MainTopic) => {
        const topicDiv = document.createElement('div');
        topicDiv.className = 'crash-topic-item';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'crash-topic-title';
        titleDiv.textContent = topic.title || '';
        topicDiv.appendChild(titleDiv);

        const descDiv = document.createElement('div');
        descDiv.className = 'crash-topic-desc';
        descDiv.textContent = topic.description || '';
        topicDiv.appendChild(descDiv);

        // Build subtopic list when present
        if (Array.isArray(topic.subtopics)) {
          const list = document.createElement('ul');
          list.className = 'crash-subtopic-list';
          topic.subtopics.forEach((sub: Subtopic) => {
            const li = document.createElement('li');
            li.className = 'crash-subtopic-item';
            li.innerHTML = `<span class="crash-subtopic-title">${sub.title}:</span> <span class="crash-subtopic-details">${sub.details}</span>`;
            list.appendChild(li);
          });
          topicDiv.appendChild(list);
        }

        mainTopics.appendChild(topicDiv);
      });
    }

    if (conclusion) {
      conclusion.innerHTML = `<strong>Conclusion:</strong> ${data.conclusion || ''}`;
    }
  }

  // Read current crash course payload from localStorage
  function getCrashCourseData(): CrashCourseData | null {
    try {
      const stored = localStorage.getItem('crashCourseView');
      return stored ? (JSON.parse(stored) as CrashCourseData) : null;
    } catch {
      return null;
    }
  }

  // Render crash course items into the sidebar list
  function renderCrashCourseList(courses: CrashCourseData[] | any, currentId?: string) {
    const list = getEl<HTMLElement>('crash-list');
    if (!list) return;
    list.innerHTML = '';

    (courses || []).forEach((course: any) => {
      const li = document.createElement('li');
      li.textContent = course.topic || 'Untitled';
      li.className = 'crash-list-item';
      if (course.id === currentId) li.classList.add('active');
      
      li.onclick = () => {
        localStorage.setItem('crashCourseView', JSON.stringify(course));
        renderCrashCourse(course);
        document.querySelectorAll('.crash-list-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
      };

      list.appendChild(li);
    });
  }

  // Mount only on crash course pages
  if (document.querySelector('.crash-container')) {
    document.addEventListener('DOMContentLoaded', () => {
      const data = getCrashCourseData();
      if (data) renderCrashCourse(data);

      const sidebarLoadingEl = getEl<HTMLElement>('crash-sidebar-loading');
      if (sidebarLoadingEl) sidebarLoadingEl.style.display = 'flex';

      const userDataRaw = localStorage.getItem('userData');
      let user: any = null;
      try {
        user = userDataRaw ? JSON.parse(userDataRaw) : null;
      } catch {}

      // Fetch courses from backend, fallback to local cache
      (async function loadCourses() {
        let allCourses: any[] = [];
        if (user && user.id) {
          try {
            const resp = await fetch(`/api/user/${user.id}/crash-courses?start=0&limit=1000`);
            if (resp.ok) {
              const json = await resp.json();
              allCourses = Array.isArray(json.items) ? json.items : json.items || [];
            }
          } catch (e) {
            console.warn('Failed to fetch crash courses from server, falling back to local cache', e);
          }
        }

        if (!allCourses.length) {
          try {
            allCourses = JSON.parse(localStorage.getItem('allCrashCourses') || '[]') || [];
          } catch {}
        }

        // Ensure each course has a stable id ( id -> createdAt -> random )
        allCourses = (allCourses || []).map((c: any) => {
          if (!c.id) c.id = c.createdAt ? String(c.createdAt) : String(c._id || Date.now() + Math.random());
          return c;
        });

        const currentId = (data && data.id) || (allCourses[0] && allCourses[0].id);
        renderCrashCourseList(allCourses, currentId);

        if (!data && allCourses[0]) {
          localStorage.setItem('crashCourseView', JSON.stringify(allCourses[0]));
          renderCrashCourse(allCourses[0]);
        }

        if (sidebarLoadingEl) sidebarLoadingEl.style.display = 'none';
      })();

      // Sidebar collapse/expand control
      const collapseBtn = getEl<HTMLElement>('crash-sidebar-collapse-btn');
      const sidebar = getEl<HTMLElement>('crash-sidebar');
      if (collapseBtn && sidebar) {
        collapseBtn.onclick = () => {
          sidebar.classList.toggle('collapsed');
          const icon = collapseBtn.querySelector('.material-symbols-outlined') as HTMLElement | null;
          if (icon) icon.textContent = sidebar.classList.contains('collapsed') ? 'chevron_right' : 'chevron_left';
        };
      }
    });
  }
})();

// ================================ SUMMARY VIEWER -=====================================
(function () {
  // Render summary content into the main panel
  function renderSummary(data: SummaryData | any) {
    if (!data || typeof data !== 'object') return;

    const titleEl = getEl<HTMLElement>('summary-title');
    const execEl = getEl<HTMLElement>('summary-exec');
    const findingsEl = getEl<HTMLElement>('summary-key-findings');
    const sections = getEl<HTMLElement>('summary-sections');

    if (titleEl) titleEl.textContent = data.document_title || data.fileName || 'Summary';
    if (execEl) execEl.textContent = data.executive_summary || '';

    if (findingsEl) findingsEl.innerHTML = '';
    if (Array.isArray(data.key_findings) && data.key_findings.length) {
      const heading = document.createElement('strong');
      heading.textContent = 'Key Findings:';
      const ul = document.createElement('ul');
      ul.className = 'summary-key-findings-list';
      data.key_findings.forEach((f: string) => {
        const li = document.createElement('li');
        li.className = 'summary-key-findings-item';
        li.textContent = f;
        ul.appendChild(li);
      });
      findingsEl?.appendChild(heading);
      findingsEl?.appendChild(ul);
    }

    if (sections) sections.innerHTML = '';
    if (Array.isArray(data.section_summaries)) {
      data.section_summaries.forEach((sec: SectionSummary) => {
        const container = document.createElement('div');
        container.className = 'summary-section';

        const title = document.createElement('div');
        title.className = 'summary-section-title';
        title.textContent = sec.page_range ? `Pages ${sec.page_range}` : 'Section';
        container.appendChild(title);

        const list = document.createElement('ul');
        list.className = 'summary-section-points';
        (sec.summary_points || []).forEach((pt: string) => {
          const li = document.createElement('li');
          li.className = 'summary-section-point';
          li.textContent = pt;
          list.appendChild(li);
        });

        container.appendChild(list);
        sections?.appendChild(container);
      });
    }
  }

  // Read current summary payload from localStorage
  function getSummaryData(): SummaryData | null {
    try {
      const stored = localStorage.getItem('summaryView');
      return stored ? (JSON.parse(stored) as SummaryData) : null;
    } catch {
      return null;
    }
  }

  // Render summary items into the sidebar list
  function renderSummaryList(list: SummaryData[] | any, currentId?: string) {
    const el = getEl<HTMLElement>('summary-list');
    if (!el) return;
    el.innerHTML = '';

    if (!list || !list.length) {
      const empty = document.createElement('li');
      empty.className = 'summary-list-item';
      empty.style.opacity = '0.7';
      empty.textContent = 'No summaries found';
      el.appendChild(empty);
      return;
    }

    list.forEach((s: any) => {
      const li = document.createElement('li');
      li.className = 'summary-list-item';
      li.textContent = s.document_title || s.fileName || 'Untitled';
      if (s.id) li.dataset.itemId = s.id;
      if (s.id === currentId) li.classList.add('active');
      
      li.onclick = () => {
        localStorage.setItem('summaryView', JSON.stringify(s));
        renderSummary(s);

        document.querySelectorAll('.summary-list-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
      };
      
      el.appendChild(li);
    });
  }

  // Mount only on summary pages
  if (document.querySelector('.summary-container')) {
    document.addEventListener('DOMContentLoaded', () => {
      const data = getSummaryData();
      if (data) renderSummary(data);

      const sidebarLoading = getEl<HTMLElement>('summary-sidebar-loading');
      if (sidebarLoading) sidebarLoading.style.display = 'flex';

      const userDataRaw = localStorage.getItem('userData');
      let user: any = null;
      try {
        user = userDataRaw ? JSON.parse(userDataRaw) : null;
      } catch {}

      // Fetch summaries from backend, fallback to local cache
      (async function loadSummaries() {
        let allSummaries: any[] = [];
        if (user && user.id) {
          try {
            const resp = await fetch(`/api/user/${user.id}/summaries?start=0&limit=1000`);
            if (resp.ok) {
              const json = await resp.json();
              allSummaries = Array.isArray(json.items) ? json.items : json.items || [];
            }
          } catch (e) {
            console.warn('Failed to fetch summaries, using cache', e);
          }
        }

        if (!allSummaries.length) {
          try {
            allSummaries = JSON.parse(localStorage.getItem('allSummaries') || '[]') || [];
          } catch {}
        }

        // Ensure each summary has a stable id
        allSummaries = (allSummaries || []).map((s: any) => {
          if (!s.id) s.id = s.createdAt ? String(s.createdAt) : String(Date.now() + Math.random());
          return s;
        });

        const currentId = (data && data.id) || (allSummaries[0] && allSummaries[0].id);
        renderSummaryList(allSummaries, currentId);

        if (!data && allSummaries[0]) {
          localStorage.setItem('summaryView', JSON.stringify(allSummaries[0]));
          renderSummary(allSummaries[0]);
        }

        if (sidebarLoading) sidebarLoading.style.display = 'none';
      })();

      // Sidebar collapse/expand control
      const collapseBtn = getEl<HTMLElement>('summary-sidebar-collapse-btn');
      const sidebar = getEl<HTMLElement>('summary-sidebar');
      if (collapseBtn && sidebar) {
        collapseBtn.onclick = () => {
          sidebar.classList.toggle('collapsed');
          const icon = collapseBtn.querySelector('.material-symbols-outlined') as HTMLElement | null;
          if (icon) icon.textContent = sidebar.classList.contains('collapsed') ? 'chevron_right' : 'chevron_left';
        };
      }
    });
  }
})();
