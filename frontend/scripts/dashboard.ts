/*
  dashboard.ts
  
  Handles dashboard page functionality including user greeting and history display.
  
  Structure:
  1. Constants and Global State
  2. Initialization Functions
  3. Data Fetching Functions
  4. Main Load Functions
  5. Helper Functions
  6. Template/Rendering Functions
  7. Event Handlers
*/

import { getUserData } from './auth.js';

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  id: string;
  name: string;
  [key: string]: any;
}

interface Summary {
  id?: string;
  fileName?: string;
  createdAt: string | number;
  executive_summary?: string;
  [key: string]: any;
}

interface CrashCourse {
  id?: string;
  topic?: string;
  summary?: string;
  overview?: string;
  createdAt: string | number;
  [key: string]: any;
}

interface StatsResponse {
  totalSummaries: number;
  totalCrashCourses: number;
}

interface FetchBatchResult<T> {
  items: T[];
  hasMore: boolean;
}

// ============================================================================
// CONSTANTS AND GLOBAL STATE
// ============================================================================

const ITEMS_PER_PAGE = 4; // Number of items to fetch per batch
let currentUserData: { id: string } | null = null;

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

export function initDashboard(isLoggedIn: boolean): void {
  const dashboardContainer = document.querySelector<HTMLDivElement>(".dashboard-container");
  if (!dashboardContainer) return;

  if (isLoggedIn) {
    const userData = getUserData() as UserData | null;
    const dashboardHeader = document.querySelector<HTMLHeadingElement>('.dashboard-header h2');
    
    if (dashboardHeader && userData) {
      dashboardHeader.textContent = `Welcome back, ${userData.name}!`;
    }

    initializeUserData(userData);
  }
}

async function initializeUserData(userData: UserData | null): Promise<void> {
  if (!userData?.id) return;

  try {
    currentUserData = { id: userData.id };

    const statsResponse = await fetch(`/api/user/${userData.id}/stats`);
    if (!statsResponse.ok) {
      console.error('Failed to fetch user stats');
      return;
    }

    const stats: StatsResponse = await statsResponse.json();
    updateStats(stats.totalSummaries, stats.totalCrashCourses);

    await loadMoreObjects('summaries', 0);
    await loadMoreObjects('crash-courses', 0);
  } catch (err) {
    console.error('Error loading user history:', err);
  }
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchObjectsBatch<T>(
  type: 'summaries' | 'crash-courses',
  startIndex: number,
  limit: number
): Promise<FetchBatchResult<T>> {
  if (!currentUserData?.id) {
    throw new Error('User ID not available');
  }

  const response = await fetch(
    `/api/user/${currentUserData.id}/${type}?start=${startIndex}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}`);
  }

  return await response.json();
}

// ============================================================================
// MAIN LOAD FUNCTIONS
// ============================================================================

async function loadMoreObjects(type: 'summaries' | 'crash-courses', startIndex: number): Promise<void> {
  const typeConfig = {
    summaries: {
      containerClass: '.summaries-list-container',
      loadMoreBtnId: 'loadMoreSummaries',
      createItemFn: createSummaryItem,
    },
    'crash-courses': {
      containerClass: '.crash-courses-list-container',
      loadMoreBtnId: 'loadMoreCrashCourses',
      createItemFn: createCrashCourseItem,
    },
  } as const;

  const config = typeConfig[type];
  if (!config) {
    console.error(`Unknown type: ${type}`);
    return;
  }

  const { containerClass, loadMoreBtnId, createItemFn } = config;
  const container = document.querySelector<HTMLDivElement>(containerClass);
  const loadMoreBtn = document.getElementById(loadMoreBtnId) as HTMLButtonElement | null;

  if (!container) return;

  const isFirstLoad = startIndex === 0;
  if (isFirstLoad) {
    container.innerHTML = '';
  } else if (loadMoreBtn) {
    loadMoreBtn.style.display = 'none';
  }

  showLoadingAnimation(container, type);

  try {
    const { items, hasMore } = await fetchObjectsBatch<any>(
      type,
      startIndex,
      ITEMS_PER_PAGE
    );
    removeLoadingAnimation(container, type);

    if (items.length === 0 && isFirstLoad) {
      showEmptyState(container, loadMoreBtn, type);
      return;
    }

    const historyList = getOrCreateHistoryList(container);
    items.forEach(obj => {
      historyList.appendChild(createItemFn(obj));
    });

    if (historyList.scrollWidth > historyList.clientWidth) {
      historyList.style.overflowX = 'auto';
    }

    updateLoadMoreButton(container, loadMoreBtn, hasMore, () =>
      loadMoreObjects(type, startIndex + ITEMS_PER_PAGE)
    );
  } catch (err) {
    console.error(`Error loading ${type}:`, err);
    removeLoadingAnimation(container, type);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function updateStats(totalSummaries = 0, totalCrashCourses = 0): void {
  const statsSection = document.querySelector<HTMLDivElement>('.dashboard-stats');
  if (statsSection) {
    statsSection.style.display = 'flex';
    (document.getElementById('statSummaries') as HTMLElement).textContent = String(totalSummaries);
    (document.getElementById('statCrashCourses') as HTMLElement).textContent = String(totalCrashCourses);
  }
}

function getOrCreateHistoryList(container: HTMLElement): HTMLDivElement {
  let historyList = container.querySelector<HTMLDivElement>('.history-list');
  if (!historyList) {
    historyList = document.createElement('div');
    historyList.className = 'history-list';
    container.appendChild(historyList);
  }
  return historyList;
}

function updateLoadMoreButton(
  container: HTMLElement,
  loadMoreBtn: HTMLButtonElement | null,
  hasMore: boolean,
  onClickHandler: () => void
): void {
  if (!loadMoreBtn) return;

  const existingBtn = container.querySelector('.load-more-btn');
  if (existingBtn) existingBtn.remove();

  if (hasMore) {
    loadMoreBtn.style.display = 'flex';
    loadMoreBtn.onclick = onClickHandler;
    container.appendChild(loadMoreBtn);
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// ============================================================================
// ITEM CREATION FUNCTIONS
// ============================================================================

function createSummaryItem(summary: Summary): HTMLElement {
  const template = document.getElementById('history-item-template') as HTMLTemplateElement | null;
  if (!template) {
    console.error('History item template not found');
    return document.createElement('div');
  }

  // cloneNode returns DocumentFragment; narrow it explicitly
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const item = fragment.querySelector<HTMLElement>('.history-item');
  if (!item) {
    console.error('History item element not found in template');
    return document.createElement('div');
  }

  const date = new Date(summary.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let preview = 'No preview available';
  if (summary.executive_summary) {
    const firstSentence = summary.executive_summary.split(/[.!?]/)[0].trim();
    preview = firstSentence ? `${firstSentence}.` : preview;
  }

  if (preview.length > 200) preview = preview.substring(0, 200) + '...';

  const titleEl = item.querySelector<HTMLElement>('[data-title]');
  const dateEl = item.querySelector<HTMLElement>('[data-date]');
  const previewEl = item.querySelector<HTMLElement>('[data-preview]');

  if (titleEl) titleEl.textContent = summary.fileName || 'PDF Summary';
  else console.warn('[data-title] not found in history-item template');

  if (dateEl) dateEl.textContent = date;
  else console.warn('[data-date] not found in history-item template');

  if (previewEl) previewEl.textContent = preview;
  else console.warn('[data-preview] not found in history-item template');

  item.addEventListener('click', () => viewSummary(summary));
  return item;
}

function createCrashCourseItem(course: CrashCourse): HTMLElement {
  const template = document.getElementById('history-item-template') as HTMLTemplateElement | null;
  if (!template) {
    console.error('History item template not found');
    return document.createElement('div');
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const item = fragment.querySelector<HTMLElement>('.history-item');
  if (!item) {
    console.error('History item element not found in template');
    return document.createElement('div');
  }

  const date = new Date(course.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const preview = course.summary || course.overview || 'No preview available';

  const titleEl = item.querySelector<HTMLElement>('[data-title]');
  const dateEl = item.querySelector<HTMLElement>('[data-date]');
  const previewEl = item.querySelector<HTMLElement>('[data-preview]');

  if (titleEl) titleEl.textContent = course.topic || 'Crash Course';
  else console.warn('[data-title] not found in history-item template');

  if (dateEl) dateEl.textContent = date;
  else console.warn('[data-date] not found in history-item template');

  if (previewEl) previewEl.textContent = preview;
  else console.warn('[data-preview] not found in history-item template');

  item.addEventListener('click', () => viewCrashCourse(course));
  return item;
}

// ============================================================================
// TEMPLATE/RENDERING FUNCTIONS
// ============================================================================

function showLoadingAnimation(container: HTMLElement, type: string): void {
  const template = document.getElementById('loading-template') as HTMLTemplateElement | null;
  if (!template) {
    console.error('Loading template not found');
    return;
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const loadingOverlay = fragment.querySelector<HTMLElement>('.loading-overlay');
  if (!loadingOverlay) {
    console.error('Loading overlay not found in template');
    return;
  }

  loadingOverlay.id = `loading-${type}`;
  container.appendChild(loadingOverlay);
}

function removeLoadingAnimation(container: HTMLElement, type: string): void {
  const loadingElement = document.getElementById(`loading-${type}`);
  loadingElement?.remove();
}

function showEmptyState(container: HTMLElement, loadMoreBtn: HTMLElement | null, type: string): void {
  const template = document.getElementById('empty-state-template') as HTMLTemplateElement | null;
  if (!template) {
    console.error('Empty state template not found');
    return;
  }

  const emptyState = template.content.cloneNode(true) as DocumentFragment;
  const line1 = emptyState.querySelector('[data-line1]') as HTMLElement;
  const line2 = emptyState.querySelector('[data-line2]') as HTMLElement;

  if (type === 'summaries') {
    line1.textContent = 'No summaries generated yet.';
    line2.textContent = 'Create your first summary to see it here!';
  } else {
    line1.textContent = 'No crash courses generated yet.';
    line2.textContent = 'Create your first crash course to see it here!';
  }

  container.appendChild(emptyState);
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function viewSummary(summary: Summary): void {
  if (!summary.id) {
    summary.id = summary.createdAt ? String(summary.createdAt) : String(Date.now());
  }

  try {
    const raw = localStorage.getItem('allSummaries');
    const list: Summary[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(s => s?.id === summary.id);
    if (idx >= 0) list[idx] = summary;
    else list.unshift(summary);
    localStorage.setItem('allSummaries', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to update allSummaries in localStorage', e);
  }

  localStorage.setItem('summaryView', JSON.stringify(summary));
  window.open('./summary_view.html', '_blank');
}

function viewCrashCourse(course: CrashCourse): void {
  if (!course.id) {
    course.id = course.createdAt ? String(course.createdAt) : String(Date.now());
  }

  try {
    const raw = localStorage.getItem('allCrashCourses');
    const list: CrashCourse[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(c => c?.id === course.id);
    if (idx >= 0) list[idx] = course;
    else list.unshift(course);
    localStorage.setItem('allCrashCourses', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to update allCrashCourses in localStorage', e);
  }

  localStorage.setItem('crashCourseView', JSON.stringify(course));
  window.open('./crash_course_view.html', '_blank');
}
