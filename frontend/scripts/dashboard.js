/*
  dashboard.js
  
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
// CONSTANTS AND GLOBAL STATE
// ============================================================================

// Number of items to fetch per batch (KEEP IT OVER 4 FOR BETTER AESTHETICS)
const ITEMS_PER_PAGE = 4;

// Store user ID for API calls
let currentUserData = null;

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

export function initDashboard(isLoggedIn) {
  const dashboardContainer = document.querySelector(".dashboard-container");
  
  // If not on dashboard page, exit early
  if (!dashboardContainer) {
    return;
  }

  if (isLoggedIn) {
    const userData = getUserData();
    const dashboardHeader = document.querySelector('.dashboard-header h2');
    
    if (dashboardHeader && userData) {
      // Update the header to show the user's name
      dashboardHeader.textContent = `Welcome back, ${userData.username}!`;
    }

    // Load user data initially
    initializeUserData(userData);
  }
}

async function initializeUserData(userData) {
  if (!userData || !userData.id) return;

  try {
    // Store user ID for subsequent API calls
    currentUserData = { id: userData.id };
    
    // Fetch stats from backend (counts only)
    const statsResponse = await fetch(`/api/user/${userData.id}/stats`);
    if (!statsResponse.ok) {
      console.error('Failed to fetch user stats');
      return;
    }

    const stats = await statsResponse.json();
    
    // Update stats display
    updateStats(stats.totalSummaries, stats.totalCrashCourses);
    
    // Load first batch of summaries
    await loadMoreObjects('summaries',0);
    
    // Load first batch of crash courses
    await loadMoreObjects('crash-courses',0);

  } catch (err) {
    console.error('Error loading user history:', err);
  }
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchObjectsBatch(type, startIndex, limit) {
  // type: 'summaries' or 'crash-courses', 'practice-tests' needs to be added
  if (type !== 'summaries' && type !== 'crash-courses') {
    throw new Error(`Unknown type: ${type}`);
  }

   if (!currentUserData?.id) {
    throw new Error('User ID not available');
  }

  const response = await fetch(`/api/user/${currentUserData.id}/${type}?start=${startIndex}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch summaries');
  }

  return await response.json();
}

// ============================================================================
// MAIN LOAD FUNCTIONS
// ============================================================================

async function loadMoreObjects(type, startIndex) {
  
  // Configuration map for different object types
  const typeConfig = {
    'summaries': {
      containerClass: '.summaries-list-container',
      loadMoreBtnId: 'loadMoreSummaries',
      createItemFn: createSummaryItem
    },
    'crash-courses': {
      containerClass: '.crash-courses-list-container',
      loadMoreBtnId: 'loadMoreCrashCourses',
      createItemFn: createCrashCourseItem
    }
  };

  const config = typeConfig[type];
  if (!config) {
    console.error(`Unknown type: ${type}`);
    return;
  }

  const { containerClass, loadMoreBtnId, createItemFn } = config;

  const container = document.querySelector(containerClass);
  const loadMoreBtn = document.getElementById(loadMoreBtnId);

  if (!container) return;

  const isFirstLoad = startIndex === 0;

  if (isFirstLoad) {
    container.innerHTML = '';
  } else if (loadMoreBtn) {
    loadMoreBtn.style.display = 'none';
  }

  showLoadingAnimation(container, type);

  try {
    const { items, hasMore } = await fetchObjectsBatch(
      type === 'summaries' ? 'summaries' : 'crash-courses',
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

    updateLoadMoreButton(
      container,
      loadMoreBtn,
      hasMore,
      () => loadMoreObjects(type, startIndex + ITEMS_PER_PAGE)
    );
  } catch (err) {
    console.error(`Error loading ${type}:`, err);
    removeLoadingAnimation(container, type);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function updateStats(totalSummaries = 0, totalCrashCourses = 0) {
  const statsSection = document.querySelector('.dashboard-stats');
  if (statsSection) {
    statsSection.style.display = 'flex';
    document.getElementById('statSummaries').textContent = totalSummaries;
    document.getElementById('statCrashCourses').textContent = totalCrashCourses;
  }
}

function getOrCreateHistoryList(container) {
  let historyList = container.querySelector('.history-list');
  if (!historyList) {
    historyList = document.createElement('div');
    historyList.className = 'history-list';
    container.appendChild(historyList);
  }
  return historyList;
}

function updateLoadMoreButton(container, loadMoreBtn, hasMore, onClickHandler) {
  if (!loadMoreBtn) return;

  // Remove any existing load-more-btn elements
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

function createSummaryItem(summary) {
  const template = document.getElementById('history-item-template');
  if (!template) {
    console.error('History item template not found');
    return document.createElement('div');
  }
  
  const item = template.content.cloneNode(true).querySelector('.history-item');
  
  const date = new Date(summary.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Try to get preview from different possible fields
  let preview = 'No preview available';
  if (summary.executive_summary) {
    const firstSentence = summary.executive_summary.split(/[.!?]/)[0].trim();
    preview = firstSentence ? firstSentence + '.' : 'No preview available';
  }

  // Limit preview length
  if (preview.length > 200) {
    preview = preview.substring(0, 200) + '...';
  }

  // Populate template
  item.querySelector('[data-title]').textContent = summary.fileName || 'PDF Summary';
  item.querySelector('[data-date]').textContent = date;
  item.querySelector('[data-preview]').textContent = preview;

  // Add click handler to view full summary
  item.addEventListener('click', () => {
    viewSummary(summary);
  });

  return item;
}

function createCrashCourseItem(course) {
  const template = document.getElementById('history-item-template');
  if (!template) {
    console.error('History item template not found');
    return document.createElement('div');
  }
  
  const item = template.content.cloneNode(true).querySelector('.history-item');
  
  const date = new Date(course.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const preview = course.summary || course.overview || 'No preview available';

  // Populate template
  item.querySelector('[data-title]').textContent = course.topic || 'Crash Course';
  item.querySelector('[data-date]').textContent = date;
  item.querySelector('[data-preview]').textContent = preview;

  // Add click handler to view full crash course
  item.addEventListener('click', () => {
    viewCrashCourse(course);
  });

  return item;
}


// ============================================================================
// TEMPLATE/RENDERING FUNCTIONS
// ============================================================================

function showLoadingAnimation(container, type) {
  const template = document.getElementById('loading-template');
  if (!template) {
    console.error('Loading template not found');
    return;
  }
  
  const loadingOverlay = template.content.cloneNode(true).querySelector('.loading-overlay');
  loadingOverlay.id = `loading-${type}`;
  container.appendChild(loadingOverlay);
}

function removeLoadingAnimation(container, type) {
  const loadingElement = document.getElementById(`loading-${type}`);
  if (loadingElement) {
    loadingElement.remove();
  }
}

function showEmptyState(container, loadMoreBtn, type) {
  const template = document.getElementById('empty-state-template');
  if (!template) {
    console.error('Empty state template not found');
    return;
  }
  
  const emptyState = template.content.cloneNode(true);
  const line1 = emptyState.querySelector('[data-line1]');
  const line2 = emptyState.querySelector('[data-line2]');
  
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

function viewSummary(summary) {
  // TODO: Implement summary viewing functionality
  console.log('View summary:', summary);
  // Could redirect to summary page with loaded data, or show in modal
}

function viewCrashCourse(course) {
  // TODO: Implement crash course viewing functionality
  console.log('View crash course:', course);
  // Could redirect to crash course page with loaded data, or show in modal
}

