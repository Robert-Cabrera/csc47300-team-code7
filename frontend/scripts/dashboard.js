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

// Number of items to fetch per batch
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
    await loadMoreSummaries(0);
    
    // Load first batch of crash courses
    await loadMoreCrashCourses(0);

  } catch (err) {
    console.error('Error loading user history:', err);
  }
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

// Fetch summaries batch from backend
async function fetchSummariesBatch(startIndex, limit) {
  if (!currentUserData?.id) {
    throw new Error('User ID not available');
  }

  const response = await fetch(`/api/user/${currentUserData.id}/summaries?start=${startIndex}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch summaries');
  }

  return await response.json();
}

// Fetch crash courses batch from backend
async function fetchCrashCoursesBatch(startIndex, limit) {
  if (!currentUserData?.id) {
    throw new Error('User ID not available');
  }

  const response = await fetch(`/api/user/${currentUserData.id}/crash-courses?start=${startIndex}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch crash courses');
  }

  return await response.json();
}

// ============================================================================
// MAIN LOAD FUNCTIONS
// ============================================================================

async function loadMoreSummaries(startIndex) {
  const container = document.querySelector('.summaries-list-container');
  const loadMoreBtn = document.getElementById('loadMoreSummaries');
  
  // If container not found, exit
  if (!container) return;

  const isFirstLoad = startIndex === 0;

  // Prepare UI for loading (take the button out of view)
  if (isFirstLoad) {
    container.innerHTML = '';
  } else if (loadMoreBtn) {
    loadMoreBtn.style.display = 'none';
  }

  showLoadingAnimation(container, 'summaries');

  try {
    // Parse the response:
    /*

    We send:
      startIndex: number (where to start fetching)
      limit: number (how many to fetch)

    We get back:
      items: Array of objects (summaries or crash courses)
      hasMore: boolean (do we have more to load? - helps with button display)
    */
    const { items, hasMore } = await fetchSummariesBatch(startIndex, ITEMS_PER_PAGE);
    removeLoadingAnimation(container, 'summaries');

    // Handle empty state
    if (items.length === 0 && isFirstLoad) {
      showEmptyState(container, loadMoreBtn, 'summaries');
      return;
    }

    // Get or create history list
    const historyList = getOrCreateHistoryList(container);

    // Append new items
    items.forEach(summary => {
      historyList.appendChild(createSummaryItem(summary));
    });

    // Check if content overflows and enable scrolling if needed
    if (historyList.scrollWidth > historyList.clientWidth) {
      historyList.style.overflowX = 'auto';
    }

    /* 
      Update load more button (note that startIndex is captured in the closure so:
      firstLoad = 0 
      => nextLoad = 0 + 4 = 4
      => nextLoad = 4 + 4 = 8
      etc.
    */
    updateLoadMoreButton(container, loadMoreBtn, hasMore, () => loadMoreSummaries(startIndex + ITEMS_PER_PAGE));

  } catch (err) {
    console.error('Error loading summaries:', err);
    removeLoadingAnimation(container, 'summaries');
  }
}

async function loadMoreCrashCourses(startIndex) {
  const container = document.querySelector('.crash-courses-list-container');
  const loadMoreBtn = document.getElementById('loadMoreCrashCourses');
  
  // If container not found, exit
  if (!container) return;

  const isFirstLoad = startIndex === 0;

  // Prepare UI for loading
  if (isFirstLoad) {
    container.innerHTML = '';
  } else if (loadMoreBtn) {
    loadMoreBtn.style.display = 'none';
  }

  showLoadingAnimation(container, 'crash-courses');

  try {

    // Parse the response:
    /*

    We send:
      startIndex: number (where to start fetching)
      limit: number (how many to fetch)

    We get back:
      items: Array of objects (summaries or crash courses)
      hasMore: boolean (do we have more to load? - helps with button display)
    */
    const { items, hasMore} = await fetchCrashCoursesBatch(startIndex, ITEMS_PER_PAGE);
    removeLoadingAnimation(container, 'crash-courses');

    // Handle empty state
    if (items.length === 0 && isFirstLoad) {
      showEmptyState(container, loadMoreBtn, 'crash-courses');
      return;
    }

    // Get or create history list
    const historyList = getOrCreateHistoryList(container);

    // Append new items
    items.forEach(course => {
      historyList.appendChild(createCrashCourseItem(course));
    });

    // Check if content overflows and enable scrolling if needed
    if (historyList.scrollWidth > historyList.clientWidth) {
      historyList.style.overflowX = 'auto';
    }

    // Update load more button
    updateLoadMoreButton(container, loadMoreBtn, hasMore, () => loadMoreCrashCourses(startIndex + ITEMS_PER_PAGE));

  } catch (err) {
    console.error('Error loading crash courses:', err);
    removeLoadingAnimation(container, 'crash-courses');
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

