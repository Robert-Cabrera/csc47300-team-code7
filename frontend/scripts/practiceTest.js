/*
  practiceTest.js
  
  Handles practice test page logic (placeholder for now).
*/

export function initPracticeTest(isLoggedIn) {
  const practiceTestContainer = document.querySelector(".practice-test-container");
  
  // If not on practice test page, exit early
  if (!practiceTestContainer) {
    return;
  }

  const testLocked = document.getElementById("test-locked");
  const testForm = document.getElementById("test-form");

  if (isLoggedIn) {
    if (testForm) testForm.style.display = "block";
    if (testLocked) testLocked.style.display = "none";

  const form = document.getElementById('practiceTestForm');
  const courseInput = document.getElementById('practiceTestCourseInput');
  const topicInput  = document.getElementById('practiceTestTopicInput');

  const loadingOverlay = document.getElementById('pt-loading');
  const outputEl = document.getElementById('pt-output');
  const errorEl  = document.getElementById('pt-error');

  let currentController = null;

  function showLoading(show = true) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    loadingOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function clearError() {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  // ===== Grading =====
  function gradePracticeTest(questions) {
    const qWrap = document.querySelector('#pt-questions');
    if (!qWrap) return;

    const cards = [...qWrap.querySelectorAll('.question-card')];
    let correctCount = 0;
    const total = questions.length;

    cards.forEach((card, idx) => {
      const q = questions[idx] || {};
      const selected = card.querySelector('input[type="radio"]:checked');

      // ensure visible border width for feedback
      card.style.borderWidth = '2px';

      const selectedVal = selected ? String(selected.value).trim() : null;
      const correctVal  = q.correct_answer != null ? String(q.correct_answer).trim() : null;

      const isCorrect = selectedVal && correctVal && selectedVal === correctVal;
      if (isCorrect) {
        correctCount++;
        card.style.borderColor = 'var(--clr_success, #26a269)';
        card.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--clr_success, #26a269) 20%, transparent)';
      } else {
        card.style.borderColor = 'var(--clr_error, #e5534b)';
        card.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--clr_error, #e5534b) 20%, transparent)';
      }

      // Show explanation
      const expl = card.querySelector('.explanation');
      if (expl) {
        const text = q.explanation ? String(q.explanation) : 'No explanation provided.';
        expl.innerHTML = `<strong>Explanation:</strong> ${escapeHtml(text)}`;
        expl.style.display = 'block';
      }
    });

    // Score banner (insert once, update later)
    if (outputEl) {
      let scoreEl = outputEl.querySelector('#pt-score');
      const pct = Math.round((correctCount / Math.max(1, total)) * 100);

      if (!scoreEl) {
        scoreEl = document.createElement('div');
        scoreEl.id = 'pt-score';
        scoreEl.className = 'pt-instructions';

        const meta = outputEl.querySelector('.pt-meta');
        if (meta && meta.nextSibling) {
          outputEl.insertBefore(scoreEl, meta.nextSibling);
        } else {
          outputEl.prepend(scoreEl);
        }
      }
      scoreEl.innerHTML = `<strong>Score:</strong> ${correctCount}/${total} &nbsp;•&nbsp; <strong>Percentage:</strong> ${pct}%`;
    }

    // Disable submit after grading
    const submitBtn = document.getElementById('submitTestBtn');
    if (submitBtn) submitBtn.disabled = true;
  }

  function renderTest(test) {
    const {
      course, topic, duration_minutes, num_questions, instructions, questions = []
    } = test || {};

    outputEl.innerHTML = `
      <h3 class="pt-title">Practice Test</h3>
      <div class="pt-meta">
        <span><strong>Course:</strong> ${escapeHtml(course || '-')}</span> •
        <span><strong>Topic:</strong> ${escapeHtml(topic || '-')}</span> •
        <span><strong>Duration:</strong> ${duration_minutes ? `${duration_minutes} min` : '-'}</span> •
        <span><strong>Questions:</strong> ${num_questions ?? questions.length}</span>
      </div>
      ${instructions ? `<div class="pt-instructions"><strong>Instructions:</strong> ${escapeHtml(instructions)}</div>` : ''}
      <div id="pt-questions"></div>
      <div class="pt-actions">
        <button id="submitTestBtn" class="submit-test-btn" type="button">Submit for Grading</button>
      </div>
    `;

    const qWrap = outputEl.querySelector('#pt-questions');

    questions.forEach((q, index) => {
      const qId = `q_${index + 1}`;
      const card = document.createElement('section');
      card.className = 'question-card';
      card.setAttribute('data-question-id', q.id || qId);

      const title = document.createElement('h4');
      title.className = 'question-title';
      title.innerHTML = `<span style="color:var(--clr_accent);">Q${index + 1}.</span> ${escapeHtml(q.question_text || '')}`;
      card.appendChild(title);

      const ul = document.createElement('ul');
      ul.className = 'options-list';
      (q.options || []).forEach((opt, optIdx) => {
        const optId = `${qId}_opt_${optIdx}`;
        const li = document.createElement('li');
        li.className = 'option';
        li.innerHTML = `
          <input type="radio" id="${optId}" name="${qId}" value="${escapeAttr(opt)}" />
          <label for="${optId}">${escapeHtml(opt)}</label>
        `;
        ul.appendChild(li);
      });

      card.appendChild(ul);

      // Hidden explanation block (shown after grading)
      const expl = document.createElement('div');
      expl.className = 'explanation';
      expl.style.display = 'none';
      expl.style.marginTop = '.75rem';
      expl.style.padding = '.65rem .75rem';
      expl.style.background = 'var(--clr_output_bg)';
      expl.style.border = '1px solid var(--clr_output_border)';
      expl.style.borderRadius = '8px';
      card.appendChild(expl);

      qWrap.appendChild(card);
    });

    // Wire up grading with the same questions array
    const submitBtn = outputEl.querySelector('#submitTestBtn');
    submitBtn.addEventListener('click', () => gradePracticeTest(questions));

    // Show output
    outputEl.style.display = 'block';
    outputEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function escapeAttr(str) {
    return escapeHtml(str).replaceAll('`', '&#96;');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const course = courseInput.value.trim();
    const topic  = topicInput.value.trim();

    if (!course || !topic) {
      showError('Please provide both Course and Topic.');
      return;
    }

    // Abort any in-flight request if user re-submits
    if (currentController) currentController.abort();
    currentController = new AbortController();

    // UI: show loading and hide old output
    showLoading(true);
    outputEl.style.display = 'none';
    outputEl.innerHTML = '';

    try {
      const res = await fetch(`${window.location.origin}/api/practice-test/generate-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: currentController.signal,
        body: JSON.stringify({
          course,
          topic,
          num_questions: 5
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Server returned ${res.status}. ${text || 'Please try again.'}`);
      }

      const data = await res.json();
      renderTest(data);
    } catch (err) {
      if (err.name === 'AbortError') return; // re-submitted; ignore
      console.error('Practice test error:', err);
      showError('Could not generate the practice test. ' + (err?.message ?? 'Please try again.'));
    } finally {
      showLoading(false);
    }
  });


  } else {
    if (testLocked) testLocked.style.display = "block";
    if (testForm) testForm.style.display = "none";
  }
}
  