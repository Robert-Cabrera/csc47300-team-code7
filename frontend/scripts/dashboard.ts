/* 
  ? File: 
      dashboard.ts

  ? Main Contributors: 
      David
  
  ? Functionalities:
    - Manage user dashboard including greeting, stats, and content history
    - Fetch and render user summaries and crash courses from backend
    - Display interactive elements like loading overlays, empty states, and modals
    - Support pagination ("load more") and deletion of items
    - Handle view navigation and synchronization with localStorage
*/

// ==================== IMPORTS =======================
import { getUserData } from './auth.js';

// ==================== UTILITY TYPE DEFINITIONS =======================
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

// ==================== CONSTANTS AND GLOBAL STATE =======================
const ITEMS_PER_PAGE = 4; // number of records to load per batch
let currentUserData: { id: string } | null = null; // active user reference

// ==================== INITIALIZATION FUNCTIONS =======================
export function initDashboard(isLoggedIn: boolean): void {
  // Initialize dashboard if user is logged in
  const dashboardContainer = document.querySelector<HTMLDivElement>(".dashboard-container");
  if (!dashboardContainer) return;

  if (isLoggedIn) {
    const userData = getUserData() as UserData | null;
    const dashboardHeader = document.querySelector<HTMLHeadingElement>('.dashboard-header h2');
    
    // Greet user by name if available
    if (dashboardHeader && userData) {
      dashboardHeader.textContent = `Welcome back, ${userData.name}!`;
    }

    // Begin loading user data and dashboard content
    initializeUserData(userData);
  }
}

async function initializeUserData(userData: UserData | null): Promise<void> {
  // Load user dashboard data including stats and content lists
  if (!userData?.id) return;

  try {
    currentUserData = { id: userData.id };

    // Fetch stats first then load both sections
    updateStats();

    await loadMoreObjects('summaries', 0);
    await loadMoreObjects('crash-courses', 0);
  } catch (err) {
    console.error('Error loading user history:', err);
  }
}

// ==================== DATA FETCHING FUNCTIONS =======================
async function fetchObjectsBatch<T>(
  type: 'summaries' | 'crash-courses',
  startIndex: number,
  limit: number
): Promise<FetchBatchResult<T>> {
  // Retrieve paginated items from backend for given user
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

// ==================== MAIN LOAD FUNCTIONS =======================
async function loadMoreObjects(type: 'summaries' | 'crash-courses', startIndex: number): Promise<void> {
  // Dynamically load dashboard content sections (summaries or crash courses)
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

  // Show temporary loading overlay
  showLoadingAnimation(container, type);

  try {
    // Fetch a batch of data from server
    const { items, hasMore } = await fetchObjectsBatch<any>(
      type,
      startIndex,
      ITEMS_PER_PAGE
    );
    removeLoadingAnimation(container, type);

    // Handle empty state when no items exist
    if (items.length === 0 && isFirstLoad) {
      showEmptyState(container, loadMoreBtn, type);
      return;
    }

    // Append new items into the dashboard list
    const historyList = getOrCreateHistoryList(container);
    items.forEach(obj => {
      historyList.appendChild(createItemFn(obj));
    });

    // Enable horizontal scroll when overflowing
    if (historyList.scrollWidth > historyList.clientWidth) {
      historyList.style.overflowX = 'auto';
    }

    // Handle pagination / "Load more" visibility
    updateLoadMoreButton(container, loadMoreBtn, hasMore, () =>
      loadMoreObjects(type, startIndex + ITEMS_PER_PAGE)
    );
  } catch (err) {
    console.error(`Error loading ${type}:`, err);
    removeLoadingAnimation(container, type);
  }
}

// ==================== HELPER FUNCTIONS =======================
async function updateStats(): Promise<void> {
  // Fetch and update summary/crash course counters in dashboard header
  let userData = getUserData() as UserData | null;
  const statsResponse = await fetch(`/api/user/${userData.id}/stats`);
    if (!statsResponse.ok) {
      console.error('Failed to fetch user stats');
      return;
    }
  
  const stats: StatsResponse = await statsResponse.json();
  const statsSection = document.querySelector<HTMLDivElement>('.dashboard-stats');
  if (statsSection) {
    statsSection.style.display = 'flex';
    (document.getElementById('statSummaries') as HTMLElement).textContent = String(stats.totalSummaries);
    (document.getElementById('statCrashCourses') as HTMLElement).textContent = String(stats.totalCrashCourses);
  }
}

function getOrCreateHistoryList(container: HTMLElement): HTMLDivElement {
  // Reuse or build the inner list container dynamically
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
  // Control the visibility and callback of "Load More" button
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

// ==================== ITEM CREATION FUNCTIONS =======================
function createSummaryItem(summary: Summary): HTMLElement {
  // Build a summary history card from template
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

  // Format date and prepare short preview
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

  // Populate text fields
  const titleEl = item.querySelector<HTMLElement>('[data-title]');
  const dateEl = item.querySelector<HTMLElement>('[data-date]');
  const previewEl = item.querySelector<HTMLElement>('[data-preview]');

  if (titleEl) titleEl.textContent = summary.fileName || 'PDF Summary';
  if (dateEl) dateEl.textContent = date;
  if (previewEl) previewEl.textContent = preview;

  // Register click handlers for viewing and deleting
  item.addEventListener('click', () => viewSummary(summary));
  const deleteIcon = item.querySelector('.delete-icon');
  if (deleteIcon) {
    deleteIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await showConfirm('Delete summary', 'Are you sure you want to delete this summary?');
      if (ok) await deleteSummary(summary.id);
    });
  }
  return item;
}

function createCrashCourseItem(course: CrashCourse): HTMLElement {
  // Build a crash course history card from template
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

  // Format date and short preview content
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
  if (dateEl) dateEl.textContent = date;
  if (previewEl) previewEl.textContent = preview;

  // Attach click and delete listeners
  item.addEventListener('click', () => viewCrashCourse(course));
  const deleteIcon = item.querySelector('.delete-icon');
  if (deleteIcon) {
    deleteIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await showConfirm('Delete crash course', 'Are you sure you want to delete this crash course?');
      if (ok) await deleteCrashCourse(course.id);
    });
  }
  return item;
}

// ==================== DELETE FUNCTIONS =======================
async function deleteSummary(summaryId?: string) {
  // Delete summary record from server and refresh dashboard
  if (!currentUserData?.id || !summaryId) return;
  try {
    const res = await fetch(`/api/summary/user/${currentUserData.id}/${summaryId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete summary');
    await updateStats();
    await loadMoreObjects('summaries', 0);
  } catch (err) {
    await showInfo('Error deleting summary');
    console.error(err);
  }
}

async function deleteCrashCourse(courseId?: string) {
  // Delete crash course record from server and refresh dashboard
  if (!currentUserData?.id || !courseId) return;
  try {
    const res = await fetch(`/api/crash-course/user/${currentUserData.id}/${courseId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete crash course');
    await loadMoreObjects('crash-courses', 0);
    await updateStats();
  } catch (err) {
    await showInfo('Error deleting crash course');
    console.error(err);
  }
}

// ==================== MODALS =======================
function showConfirm(title: string, message: string): Promise<boolean> {
  // Display confirmation dialog with Cancel/Delete options
  const overlay = document.getElementById('modalOverlay') as HTMLElement | null;
  if (!overlay) return Promise.resolve(window.confirm(message));

  const titleEl = overlay.querySelector('[data-modal-title]') as HTMLElement | null;
  const msgEl = overlay.querySelector('[data-modal-message]') as HTMLElement | null;
  const confirmBtn = overlay.querySelector('.confirm-btn') as HTMLButtonElement | null;
  const cancelBtn = overlay.querySelector('.cancel-btn') as HTMLButtonElement | null;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (!confirmBtn || !cancelBtn) return Promise.resolve(window.confirm(message));

  confirmBtn.textContent = 'Delete';
  cancelBtn.style.display = '';

  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise<boolean>((resolve) => {
    function cleanup(result: boolean) {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
      resolve(result);
    }

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onOverlayClick = (e: Event) => { if (e.target === overlay) cleanup(false); };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
  });
}

function showInfo(message: string, title = 'Notice'): Promise<void> {
  // Display informational modal (single "OK" button)
  const overlay = document.getElementById('modalOverlay') as HTMLElement | null;
  if (!overlay) {
    window.alert(message);
    return Promise.resolve();
  }

  const titleEl = overlay.querySelector('[data-modal-title]') as HTMLElement | null;
  const msgEl = overlay.querySelector('[data-modal-message]') as HTMLElement | null;
  const confirmBtn = overlay.querySelector('.confirm-btn') as HTMLButtonElement | null;
  const cancelBtn = overlay.querySelector('.cancel-btn') as HTMLButtonElement | null;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (!confirmBtn) return Promise.resolve();

  const prevConfirmText = confirmBtn.textContent || '';
  const prevCancelDisplay = cancelBtn ? cancelBtn.style.display : '';
  if (cancelBtn) cancelBtn.style.display = 'none';
  confirmBtn.textContent = 'OK';

  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise<void>((resolve) => {
    function cleanup() {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      confirmBtn.removeEventListener('click', onOk);
      overlay.removeEventListener('click', onOverlayClick);
      confirmBtn.textContent = prevConfirmText;
      if (cancelBtn) cancelBtn.style.display = prevCancelDisplay;
      resolve();
    }

    const onOk = () => cleanup();
    const onOverlayClick = (e: Event) => { if (e.target === overlay) cleanup(); };

    confirmBtn.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlayClick);
  });
}

// ==================== TEMPLATE AND RENDERING FUNCTIONS =======================
function showLoadingAnimation(container: HTMLElement, type: string): void {
  // Display loading overlay using template
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
  // Remove loading overlay when finished
  const loadingElement = document.getElementById(`loading-${type}`);
  loadingElement?.remove();
}

function showEmptyState(container: HTMLElement, loadMoreBtn: HTMLElement | null, type: string): void {
  // Display an empty-state message when no records exist
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

// ==================== EVENT HANDLERS =======================
function viewSummary(summary: Summary): void {
  // Open a saved summary in a new tab and cache locally
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
  // Open a saved crash course in a new tab and cache locally
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
