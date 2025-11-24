/*
  practiceTest.ts — minimal TS (no replaceAll)
*/

type Question = {
  id?: string;
  question_text?: string;
  options?: string[];
  correct_answer?: string | number | null;
  explanation?: string | null;
  isFromCommunity?: boolean;
  communityUserName?: string;
  communityUserProfilePicture?: string | null;
};

type Test = {
  course?: string | null;
  topic?: string | null;
  duration_minutes?: number | null;
  num_questions?: number | null;
  instructions?: string | null;
  questions?: Question[];
};

const qs = <T extends Element = Element>(s: string, r: ParentNode = document) =>
  r.querySelector(s) as T | null;

const show = (el: HTMLElement | null, v: boolean) => {
  if (!el) return;
  el.style.display = v ? "block" : "none";
  el.setAttribute("aria-hidden", v ? "false" : "true");
};

// --- Safe helpers (ES5/ES6-compatible) ---
const escapeHtml = (str: unknown) =>
  String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = (str: unknown) => escapeHtml(str).replace(/`/g, "&#96;");

export function initPracticeTest(isLoggedIn: boolean): void {
  const container = qs<HTMLElement>(".practice-test-container");
  if (!container) return;

  const testLocked = qs<HTMLElement>("#test-locked");
  const testForm = qs<HTMLElement>("#test-form");

  show(testForm, !!isLoggedIn);
  show(testLocked, !isLoggedIn);

  if (!isLoggedIn) return;

  const form = qs<HTMLFormElement>("#practiceTestForm");
  const courseInput = qs<HTMLInputElement>("#practiceTestCourseInput");
  const topicInput = qs<HTMLInputElement>("#practiceTestTopicInput");
  const difficultySelect = qs<HTMLSelectElement>("#practiceTestDifficulty");
  const barFill = qs<HTMLElement>("#difficultyBarFill");

  const loadingOverlay = qs<HTMLElement>("#pt-loading");
  const outputEl = qs<HTMLElement>("#pt-output");
  const errorEl = qs<HTMLElement>("#pt-error");

  let currentController: AbortController | null = null;

  const showLoading = (v = true) => {
    if (!loadingOverlay) return;
    loadingOverlay.style.display = v ? "flex" : "none";
    loadingOverlay.setAttribute("aria-hidden", v ? "false" : "true");
    if (v) {
      loadingOverlay.focus();
      loadingOverlay.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const showError = (m: string) => {
    if (!errorEl) return;
    errorEl.textContent = m;
    errorEl.style.display = "block";
  };

  const clearError = () => {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.style.display = "none";
  };

  // Range slider handler
  const setupRangeSlider = () => {
    const rangeInput = qs<HTMLInputElement>("#practiceTestNumQuestions");
    const displaySpan = qs<HTMLElement>("#numQuestionsDisplay");
    const sliderTrack = qs<HTMLElement>(".slider-track");

    if (!rangeInput || !displaySpan) return;

    const updateDisplay = () => {
      const value = parseInt(rangeInput.value, 10);
      displaySpan.textContent = String(value);
      
      // Update CSS variable for gradient progress
      const progress = ((value - parseInt(rangeInput.min, 10)) / (parseInt(rangeInput.max, 10) - parseInt(rangeInput.min, 10))) * 100;
      if (sliderTrack) {
        sliderTrack.style.setProperty('--slider-progress', progress + '%');
      }
      
      // Trigger animation
      displaySpan.style.animation = "none";
      setTimeout(() => {
        displaySpan.style.animation = "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
      }, 10);
    };

    rangeInput.addEventListener("input", updateDisplay);
    // Initial update
    updateDisplay();
  };

  setupRangeSlider();

  const gradePracticeTest = (questions: Question[]) => {
    const qWrap = qs<HTMLElement>("#pt-questions");
    if (!qWrap || !outputEl) return;

    const cards = Array.from(qWrap.querySelectorAll<HTMLElement>(".question-card"));
    let correctCount = 0;
    const total = questions.length;

    cards.forEach((card, i) => {
      const q = questions[i] || {};
      const selected = card.querySelector<HTMLInputElement>('input[type="radio"]:checked');
      card.style.borderWidth = "2px";

      const selectedVal = selected ? String(selected.value).trim() : null;
      const correctVal = q.correct_answer != null ? String(q.correct_answer).trim() : null;

      const isCorrect = !!selectedVal && !!correctVal && selectedVal === correctVal;
      if (isCorrect) {
        correctCount++;
        card.style.borderColor = "var(--clr_success, #26a269)";
        card.style.boxShadow =
          "0 0 0 2px color-mix(in srgb, var(--clr_success, #26a269) 20%, transparent)";
      } else {
        card.style.borderColor = "var(--clr_error, #e5534b)";
        card.style.boxShadow =
          "0 0 0 2px color-mix(in srgb, var(--clr_error, #e5534b) 20%, transparent)";
      }

      const expl = card.querySelector<HTMLElement>(".explanation");
      if (expl) {
        const text = q.explanation ? String(q.explanation) : "No explanation provided.";
        expl.innerHTML = `<strong>Explanation:</strong> ${escapeHtml(text)}`;
        expl.style.display = "block";
      }
    });

    let scoreEl = outputEl.querySelector<HTMLElement>("#pt-score");
    const pct = Math.round((correctCount / Math.max(1, total)) * 100);
    if (!scoreEl) {
      scoreEl = document.createElement("div");
      scoreEl.id = "pt-score";
      scoreEl.className = "pt-instructions";
      const meta = outputEl.querySelector(".pt-meta");
      meta?.nextSibling ? outputEl.insertBefore(scoreEl, meta.nextSibling) : outputEl.prepend(scoreEl);
    }
    scoreEl.innerHTML = `<strong>Score:</strong> ${correctCount}/${total} &nbsp;•&nbsp; <strong>Percentage:</strong> ${pct}%`;

    const submitBtn = qs<HTMLButtonElement>("#submitTestBtn");
    if (submitBtn) submitBtn.disabled = true;
  };

  const renderTest = (test: Test) => {
    if (!outputEl) return;

    const {
      course,
      topic,
      duration_minutes,
      num_questions,
      instructions,
      questions = []
    } = test || {};

    outputEl.innerHTML = `
      <h3 class="pt-title">Practice Test</h3>
      <div class="pt-meta">
        <span><strong>Course:</strong> ${escapeHtml(course ?? "-")}</span> •
        <span><strong>Topic:</strong> ${escapeHtml(topic ?? "-")}</span> •
        <span><strong>Duration:</strong> ${duration_minutes ? `${duration_minutes} min` : "-"}</span> •
        <span><strong>Questions:</strong> ${num_questions ?? questions.length}</span>
      </div>
      ${instructions ? `<div class="pt-instructions"><strong>Instructions:</strong> ${escapeHtml(instructions)}</div>` : ""}
      <div id="pt-questions"></div>
      <div class="pt-actions">
        <button id="submitTestBtn" class="submit-test-btn" type="button">Submit for Grading</button>
      </div>
    `;

    // Add test-active class to hide buttons
    const container = qs<HTMLElement>(".practice-test-container");
    if (container) {
      container.classList.add("test-active");
    }

    const qWrap = qs<HTMLElement>("#pt-questions", outputEl)!;
    
    console.log(`[renderTest] Rendering ${questions.length} questions`);

    questions.forEach((q, i) => {
      const qId = `q_${i + 1}`;
      console.log(`[renderTest] Question ${i + 1}: isFromCommunity=${q.isFromCommunity}, text="${q.question_text?.substring(0, 40)}..."`);

      const card = document.createElement("section");
      card.className = "question-card";
      if (q.isFromCommunity) {
        card.classList.add("community-question");
      }
      (card as any).dataset.questionId = q.id || qId;

      const titleWrapper = document.createElement("div");
      titleWrapper.className = "question-title-wrapper";
      
      const title = document.createElement("h4");
      title.className = "question-title";
      title.innerHTML = `<span style="color:var(--clr_accent);">Q${i + 1}.</span> ${escapeHtml(
        q.question_text || ""
      )}`;
      titleWrapper.appendChild(title);
      
      // Add community badge if question is from community
      if (q.isFromCommunity) {
        const badge = document.createElement("div");
        badge.className = "community-badge";
        
        let badgeHTML = `<span class="community-star" title="This question was submitted by the community. Submitted by: ${escapeHtml(q.communityUserName || "Unknown")}">★</span>`;
        
        // Add profile picture if available
        if (q.communityUserProfilePicture) {
          badgeHTML = `<img src="${escapeAttr(q.communityUserProfilePicture)}" alt="${escapeHtml(q.communityUserName || "User")}" class="community-pfp" title="Submitted by: ${escapeHtml(q.communityUserName || "Unknown")}" />${badgeHTML}`;
        }
        
        badge.innerHTML = badgeHTML;
        titleWrapper.appendChild(badge);
      }
      
      card.appendChild(titleWrapper);

      const ul = document.createElement("ul");
      ul.className = "options-list";
      (q.options || []).forEach((opt, j) => {
        const optId = `${qId}_opt_${j}`;
        const li = document.createElement("li");
        li.className = "option";
        li.innerHTML = `
          <input type="radio" id="${optId}" name="${qId}" value="${escapeAttr(opt)}" />
          <label for="${optId}">${escapeHtml(opt)}</label>
        `;
        li.addEventListener("click", (e) => {
          if ((e.target as HTMLElement).tagName !== "INPUT") {
            const input = li.querySelector<HTMLInputElement>('input[type="radio"]');
            if (input) input.checked = true;
          }
        });
        ul.appendChild(li);
      });

      const expl = document.createElement("div");
      expl.className = "explanation";
      expl.style.display = "none";
      expl.style.marginTop = ".75rem";
      expl.style.padding = ".65rem .75rem";
      expl.style.background = "var(--clr_output_bg)";
      expl.style.border = "1px solid var(--clr_output_border)";
      expl.style.borderRadius = "8px";

      card.appendChild(ul);
      card.appendChild(expl);
      qWrap.appendChild(card);
    });

    qs<HTMLButtonElement>("#submitTestBtn", outputEl)?.addEventListener("click", () =>
      gradePracticeTest(questions)
    );

    outputEl.style.display = "block";
    outputEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  difficultySelect?.addEventListener("change", () => {
    if (!barFill || !difficultySelect) return;
    barFill.className = `difficulty-bar-fill ${difficultySelect.value}`;
  });

  // Slider: update displayed value and ensure within 1..20
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  // Radio buttons are self-contained, no need for slider update logic

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const course = courseInput?.value.trim();
    const topic = topicInput?.value.trim();
    const difficulty = difficultySelect?.value;
    const includeCommunityCheckbox = document.querySelector<HTMLInputElement>('#includeCommunityQuestionsCheckbox');
    const includeCommunity = includeCommunityCheckbox?.checked ?? false;

    console.log(`[Practice Test Frontend] Checkbox element:`, includeCommunityCheckbox);
    console.log(`[Practice Test Frontend] Checkbox checked property:`, includeCommunityCheckbox?.checked);
    console.log(`[Practice Test Frontend] Form submitted with includeCommunity=${includeCommunity}`);

    if (!course || !topic || !difficulty) {
      showError("Please provide Course, Topic, and Difficulty.");
      difficultySelect?.classList.add("error");
      setTimeout(() => difficultySelect?.classList.remove("error"), 1200);
      return;
    }

    currentController?.abort();
    currentController = new AbortController();

    showLoading(true);
    if (outputEl) {
      outputEl.style.display = "none";
      outputEl.innerHTML = "";
    }

    try {
      // Get selected num_questions from range slider
      const rangeInput = form?.querySelector<HTMLInputElement>('input[type="range"][name="num-questions"]');
      const numQuestionsValue = rangeInput ? parseInt(rangeInput.value, 10) : 10;

      console.log(`[Practice Test Frontend] Sending request with course="${course}", topic="${topic}", includeCommunity=${includeCommunity}`);

      const res = await fetch(`${window.location.origin}/api/practice-test/generate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: currentController.signal,
        body: JSON.stringify({
          course,
          topic,
          difficulty,
          num_questions: numQuestionsValue,
          includeCommunity
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server returned ${res.status}. ${text || "Please try again."}`);
      }

      const data = (await res.json()) as Test;
      console.log(`[Practice Test Frontend] Received ${data.questions.length} questions from backend`);
      const communityCount = data.questions.filter((q: any) => q.isFromCommunity).length;
      console.log(`[Practice Test Frontend] Community questions in response: ${communityCount}`);
      renderTest(data);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Practice test error:", err);
      showError("Could not generate the practice test. " + (err?.message || "Please try again."));
    } finally {
      showLoading(false);
    }
  });
}

// ---- Requirement Modal wiring (append to end of file) ----
function setupRequirementModalGuard(): void {
  const container = qs<HTMLElement>(".practice-test-container");
  if (!container) return; // only on this page

  const form   = qs<HTMLFormElement>("#practiceTestForm");
  const course = qs<HTMLInputElement>("#practiceTestCourseInput");
  const topic  = qs<HTMLInputElement>("#practiceTestTopicInput");

  const modal      = qs<HTMLElement>("#requirementModal");
  const modalMsg   = qs<HTMLElement>("#requirementModalMsg");
  const modalClose = qs<HTMLButtonElement>("#requirementModalClose");

  if (!form || !course || !topic || !modal || !modalMsg || !modalClose) return;

  const openModal = (message: string) => {
    modalMsg.textContent = message;
    modal.hidden = false;
    modalClose.focus();
  };
  const closeModal = () => { modal.hidden = true; };

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // Capture-phase submit guard so it runs BEFORE the existing submit handler
  form.addEventListener(
    "submit",
    (e) => {
      const missingCourse = !course.value.trim();
      const missingTopic  = !topic.value.trim();

      if (missingCourse || missingTopic) {
        e.preventDefault();
        // Stop other submit listeners (including the generator) from running
        // @ts-ignore - not in TS lib typings, but supported by browsers
        if (typeof (e as any).stopImmediatePropagation === "function") {
          (e as any).stopImmediatePropagation();
        }
        const what =
          missingCourse && missingTopic
            ? "a course and a topic"
            : missingCourse
            ? "a course"
            : "a topic";
        openModal(`You need to enter ${what} before generating a test.`);
      }
    },
    { capture: true }
  );
}

// Auto-wire on module load (safe no-op on other pages)
setupRequirementModalGuard();

// TIMER