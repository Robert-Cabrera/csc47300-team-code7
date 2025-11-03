/* 
  ? File: 
      crashCourse.ts

  ? Main Contributors: 
      Robert
  
  ? Functionalities:
    - Generate crash course content based on user input topic
    - Parse API response and render course sections in DOM
    - Manage UI state (locked/unlocked, loading, error)
*/

import { getUserData } from './auth.js';

// ==================== UTILITY TYPES FOR SCHEMA VALIDATION =======================
type Subtopic = { title: string; details: string };
type MainTopic = { title: string; description: string; subtopics: Subtopic[] };
type CrashCourseSchema = { topic: string; summary: string; overview: string; main_topics: MainTopic[]; conclusion: string };

// ==================== API & VALIDATION =======================
async function fetchCrashCourse(prompt: string): Promise<CrashCourseSchema> {
  const userData = getUserData();

  // Call backend API to generate crash course
  const resp = await fetch('/api/crash-course', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, userId: userData?.id })
  });

  if (!resp.ok) throw new Error('Failed to fetch crash course');
  const data = await resp.json();

  try {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid API response');
  }
}

// ==================== PROMPT BUILDER =======================
function makePrompt(topic: string): string {
  return `Generate a concise crash course on "${topic}" with a summary, overview, several main topics (each with 3 subtopics), and a short conclusion. Keep it clear, educational, and structured.`;
}

// ==================== RENDER HELPERS =======================
function getEl(id: string) {
  return document.getElementById(id);
}

function renderCrashCourse(data: CrashCourseSchema) {
  const topicTitle = getEl('crash-topic-title');
  const summary = getEl('crash-summary');
  const overview = getEl('crash-overview');
  const mainTopics = getEl('crash-main-topics');
  const conclusion = getEl('crash-conclusion');
  if (!topicTitle || !summary || !overview || !mainTopics || !conclusion) return;

  topicTitle.innerHTML = `<span class="crash-shine">${data.topic}</span>`;
  summary.textContent = data.summary;
  overview.innerHTML = `<strong>Overview:</strong> ${data.overview}`;
  mainTopics.innerHTML = '';

  data.main_topics.forEach(topic => {
    const block = document.createElement('div');
    block.className = 'crash-topic';
    block.innerHTML = `
      <div class="crash-topic-title">${topic.title}</div>
      <div class="crash-topic-desc">${topic.description}</div>
      <ul class="crash-subtopics">
        ${topic.subtopics.map(s => `<li><strong>${s.title}:</strong> ${s.details}</li>`).join('')}
      </ul>`;
    mainTopics.appendChild(block);
  });

  conclusion.innerHTML = `<strong>Conclusion:</strong> ${data.conclusion}`;
}

// ==================== INITIALIZATION =======================
export function initCrashCourse(isLoggedIn: boolean) {
  const container = document.querySelector('.crash-course-container');
  if (!container) return;

  const locked = getEl('locked-message');
  const form = getEl('crash-course-form');
  if (locked && form) {
    locked.style.display = isLoggedIn ? 'none' : 'block';
    form.style.display = isLoggedIn ? 'block' : 'none';
  }

  const btn = getEl('generateBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    
    // Get input elements
    const topicInput = getEl('topicInput') as HTMLInputElement;
    const loading = getEl('crash-loading');
    const output = getEl('output');
    if (!topicInput || !loading || !output) return;
    
    // Validate input using HTML5 validation and check for empty value
    if (!topicInput.value.trim()) {
      topicInput.setCustomValidity('Please enter a topic.');
      topicInput.reportValidity();
      return;
    } else {
      topicInput.setCustomValidity('');
    }
    if (!topicInput.checkValidity()) {
      topicInput.reportValidity();
      return;
    }
    const topic = topicInput.value.trim();

    // Show loading state
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const lottie = loading?.querySelector('#crash-lottie') as HTMLImageElement | null;
    if (lottie) {
      const newSrc = theme === 'dark'
      ? '../assets/loading_dark.json'
      : '../assets/loading_light.json';
      lottie.setAttribute('src', newSrc);
      try { (lottie as any).load(newSrc); } catch {}
    }
    loading.style.display = 'flex';
    output.style.display = 'none';

    // Scroll down slightly to show the animation
    loading.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      const data = await fetchCrashCourse(makePrompt(topic));
      renderCrashCourse(data);
      output.style.display = 'block';
    } catch (err: any) {
      alert(err.message || 'Error generating crash course.');
    } finally {
      loading.style.display = 'none';
    }
  });
}
