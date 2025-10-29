/*
  viewer.ts — unified for Crash Course + Summary views (TypeScript)
*/

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

function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// -----------------------------
// Crash Course viewer section
// -----------------------------
(function () {
  function renderCrashCourse(data: CrashCourseData | any) {
    if (!data || typeof data !== 'object') return;

    const topicEl = getEl<HTMLElement>('crash-title');
    if (topicEl) topicEl.textContent = data.topic || '';

    const summaryEl = getEl<HTMLElement>('crash-overview');
    if (summaryEl) summaryEl.textContent = data.summary || '';

    const overviewEl = getEl<HTMLElement>('crash-overview-details');
    if (overviewEl) overviewEl.innerHTML = `<strong>Overview:</strong> ${data.overview || ''}`;

    const mainTopics = getEl<HTMLElement>('crash-topic-list');
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

        if (Array.isArray(topic.subtopics)) {
          const subtopicsList = document.createElement('ul');
          subtopicsList.className = 'crash-subtopic-list';
          topic.subtopics.forEach((sub: Subtopic) => {
            const li = document.createElement('li');
            li.className = 'crash-subtopic-item';
            li.innerHTML = `<span class="crash-subtopic-title">${sub.title}:</span> <span class="crash-subtopic-details">${sub.details}</span>`;
            subtopicsList.appendChild(li);
          });
          topicDiv.appendChild(subtopicsList);
        }

        mainTopics.appendChild(topicDiv);
      });
    }

    const conclusionEl = getEl<HTMLElement>('crash-conclusion');
    if (conclusionEl) conclusionEl.innerHTML = `<strong>Conclusion:</strong> ${data.conclusion || ''}`;
  }

  function getCrashCourseData(): CrashCourseData | null {
    try {
      const stored = localStorage.getItem('crashCourseView');
      return stored ? (JSON.parse(stored) as CrashCourseData) : null;
    } catch {
      return null;
    }
  }

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
        location.reload();
      };
      list.appendChild(li);
    });
  }

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

// -----------------------------
// Summary viewer section
// -----------------------------
(function () {
  function renderSummary(data: SummaryData | any) {
    if (!data || typeof data !== 'object') return;

    const titleEl = getEl<HTMLElement>('summary-title');
    if (titleEl) titleEl.textContent = data.document_title || data.fileName || 'Summary';

    const execEl = getEl<HTMLElement>('summary-exec');
    if (execEl) execEl.textContent = data.executive_summary || '';

    const findingsEl = getEl<HTMLElement>('summary-key-findings');
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
      findingsEl.appendChild(heading);
      findingsEl.appendChild(ul);
    }

    const sections = getEl<HTMLElement>('summary-sections');
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
        sections.appendChild(container);
      });
    }
  }

  function getSummaryData(): SummaryData | null {
    try {
      const stored = localStorage.getItem('summaryView');
      return stored ? (JSON.parse(stored) as SummaryData) : null;
    } catch {
      return null;
    }
  }

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
        location.reload();
      };
      el.appendChild(li);
    });
  }

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
