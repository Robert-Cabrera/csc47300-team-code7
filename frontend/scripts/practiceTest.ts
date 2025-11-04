/*
  practiceTest.ts — minimal TS (no replaceAll)
*/

type Question = {
  id?: string;
  question_text?: string;
  options?: string[];
  correct_answer?: string | number | null;
  explanation?: string | null;
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

  const showLoading = (v = true) => show(loadingOverlay, v);

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

    const qWrap = qs<HTMLElement>("#pt-questions", outputEl)!;

    questions.forEach((q, i) => {
      const qId = `q_${i + 1}`;
      const card = document.createElement("section");
      card.className = "question-card";
      (card as any).dataset.questionId = q.id || qId;

      const title = document.createElement("h4");
      title.className = "question-title";
      title.innerHTML = `<span style="color:var(--clr_accent);">Q${i + 1}.</span> ${escapeHtml(
        q.question_text || ""
      )}`;
      card.appendChild(title);

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

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const course = courseInput?.value.trim();
    const topic = topicInput?.value.trim();
    const difficulty = difficultySelect?.value;

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
      const res = await fetch(`${window.location.origin}/api/practice-test/generate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: currentController.signal,
        body: JSON.stringify({ course, topic, difficulty, num_questions: 5 })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server returned ${res.status}. ${text || "Please try again."}`);
      }

      const data = (await res.json()) as Test;
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