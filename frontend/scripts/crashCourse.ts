/*
  crashCourse.ts

  TypeScript migration of crashCourse.js. Preserves behavior and exports `initCrashCourse(isLoggedIn)`.
*/

import { getUserData } from '../scripts/auth.js';

type Subtopic = { title: string; details: string };
type MainTopic = { title: string; description: string; subtopics: Subtopic[] };

type CrashCourseSchema = {
  topic: string;
  summary: string;
  overview: string;
  main_topics: MainTopic[];
  conclusion: string;
};

const checkForResponse = (data: any): boolean => {
  return !!(
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text
  );
};

class CrashCourse {
  static validateSchema(obj: any): boolean {
    if (
      typeof obj !== 'object' ||
      typeof obj.topic !== 'string' ||
      typeof obj.summary !== 'string' ||
      typeof obj.overview !== 'string' ||
      !Array.isArray(obj.main_topics) ||
      typeof obj.conclusion !== 'string'
    ) return false;

    for (const topic of obj.main_topics) {
      if (
        typeof topic !== 'object' ||
        typeof topic.title !== 'string' ||
        typeof topic.description !== 'string' ||
        !Array.isArray(topic.subtopics) ||
        topic.subtopics.length !== 3
      ) return false;

      for (const sub of topic.subtopics) {
        if (
          typeof sub !== 'object' ||
          typeof sub.title !== 'string' ||
          typeof sub.details !== 'string'
        ) return false;
      }
    }
    return true;
  }

  static async getValidJsonResponse(prompt: string): Promise<CrashCourseSchema> {
    const userData = getUserData();

    let response: Response;
    try {
      response = await fetch('/api/crash-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId: userData?.id })
      });
    } catch (networkError: any) {
      throw new Error('Network error while generating crash course');
    }

    if (!response.ok) throw new Error('Failed to generate crash course');

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Failed to parse crash course response');
    }

    if (checkForResponse(data)) {
      const jsonText = data.candidates[0].content.parts[0].text;
      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', jsonText);
        throw new Error('Failed to parse API response as JSON');
      }

      if (!CrashCourse.validateSchema(parsedData)) {
        console.error('Schema validation failed for:', parsedData);
        throw new Error('Response does not match expected schema');
      }

      return parsedData as CrashCourseSchema;
    }

    throw new Error('Invalid response format from API');
  }

  static createPrompt(topic: string): string {
    return `\n      Generate a comprehensive crash course on: ${topic}\n\n      Guidelines:\n      - Provide a concise summary (≤50 words) that captures the essence of the topic.\n      - Include an overview (≤80 words) explaining what will be covered.\n      - Create multiple main topics, each with a description (≤60 words).\n      - For each main topic, include exactly 3 subtopics:\n        * Each subtopic title should be ≤10 words\n        * Each subtopic details should be ≤70 words\n      - End with a conclusion (≤40 words) that ties everything together.\n      \n      Make the content educational, clear, and easy to understand for someone learning this topic for the first time.\n    `;
  }
}

function getEl(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderCrashCourse(data: CrashCourseSchema | any): void {
  if (!data || typeof data !== 'object') {
    console.error('Invalid crash course data:', data);
    return;
  }

  const topicTitle = getEl('crash-topic-title');
  const summary = getEl('crash-summary');
  const overview = getEl('crash-overview');
  const mainTopics = getEl('crash-main-topics');
  const conclusion = getEl('crash-conclusion');

  if (!topicTitle || !summary || !overview || !mainTopics || !conclusion) {
    console.error('One or more crash course output elements not found in DOM');
    return;
  }

  topicTitle.innerHTML = `<span class="crash-shine">${data.topic}</span>`;
  summary.textContent = data.summary || '';
  overview.innerHTML = `<strong>Overview:</strong> ${data.overview || ''}`;

  mainTopics.innerHTML = '';
  if (Array.isArray(data.main_topics)) {
    data.main_topics.forEach((topic: MainTopic) => {
      const topicDiv = document.createElement('div');
      topicDiv.className = 'crash-topic';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'crash-topic-title';
      titleDiv.textContent = topic.title;

      const descDiv = document.createElement('div');
      descDiv.className = 'crash-topic-desc';
      descDiv.textContent = topic.description;

      topicDiv.appendChild(titleDiv);
      topicDiv.appendChild(descDiv);

      if (Array.isArray(topic.subtopics)) {
        const subtopicsList = document.createElement('ul');
        subtopicsList.className = 'crash-subtopics';
        topic.subtopics.forEach(sub => {
          const li = document.createElement('li');
          li.className = 'crash-subtopic';
          li.innerHTML = `<span class="crash-subtopic-title">${sub.title}:</span> <span class="crash-subtopic-details">${sub.details}</span>`;
          subtopicsList.appendChild(li);
        });
        topicDiv.appendChild(subtopicsList);
      }

      mainTopics.appendChild(topicDiv);
    });
  }

  conclusion.innerHTML = `<strong>Conclusion:</strong> ${data.conclusion || ''}`;
}

export function initCrashCourse(isLoggedIn: boolean): void {
  const crashCourseContainer = document.querySelector('.crash-course-container');
  if (!crashCourseContainer) return;

  const lockedMessage = getEl('locked-message');
  const crashForm = getEl('crash-course-form');

  if (isLoggedIn) {
    if (crashForm) (crashForm as HTMLElement).style.display = 'block';
    if (lockedMessage) (lockedMessage as HTMLElement).style.display = 'none';
  } else {
    if (lockedMessage) (lockedMessage as HTMLElement).style.display = 'block';
    if (crashForm) (crashForm as HTMLElement).style.display = 'none';
  }

  const generateBtn = getEl('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const topicInput = getEl('topicInput') as HTMLInputElement | null;
      const output = getEl('output') as HTMLElement | null;
      const loading = getEl('crash-loading') as HTMLElement | null;

      if (!topicInput || !output || !loading) {
        console.error('Required crash course elements not found in DOM');
        return;
      }

      const topic = topicInput.value.trim();

      if (!topic) {
        const topicTitle = getEl('crash-topic-title');
        if (topicTitle) {
          topicTitle.textContent = 'Please enter a topic';
          topicTitle.classList.add('error-message');
        }
        const s = getEl('crash-summary');
        const o = getEl('crash-overview');
        const m = getEl('crash-main-topics');
        const c = getEl('crash-conclusion');
        if (s) s.textContent = '';
        if (o) o.textContent = '';
        if (m) m.innerHTML = '';
        if (c) c.textContent = '';
        output.style.display = 'block';
        loading.style.display = 'none';
        return;
      }

      const topicTitle = getEl('crash-topic-title');
      if (topicTitle) topicTitle.classList.remove('error-message');

      output.style.display = 'none';

      const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const lottie = loading ? loading.querySelector('#crash-lottie') as HTMLImageElement | null : null;
      if (lottie) {
        const newSrc = theme === 'dark' ? '../assets/loading_dark.json' : '../assets/loading_light.json';
        lottie.setAttribute('src', newSrc);
        try { (lottie as any).load(newSrc); } catch (e) { /* ignore */ }
      }

      loading.style.display = 'flex';

      try {
        const prompt = CrashCourse.createPrompt(topic);
        const data = await CrashCourse.getValidJsonResponse(prompt);
        if (!data) throw new Error('No valid response from Gemini.');

        loading.style.display = 'none';
        output.style.display = 'block';

        renderCrashCourse(data);
      } catch (err: any) {
        loading.style.display = 'none';
        output.style.display = 'block';
        const topicTitle = getEl('crash-topic-title');
        if (topicTitle) {
          topicTitle.textContent = `Error: ${err?.message || 'Failed to generate crash course.'}`;
          topicTitle.classList.add('error-message');
        }
        const s = getEl('crash-summary');
        const o = getEl('crash-overview');
        const m = getEl('crash-main-topics');
        const c = getEl('crash-conclusion');
        if (s) s.textContent = '';
        if (o) o.textContent = '';
        if (m) m.innerHTML = '';
        if (c) c.textContent = '';
      }
    });
  }
}
