/* 
  ? File: 
      summary.ts

  ? Main Contributors: 
      Robert
  
  ? Functionalities:
    - Handle PDF uploads, validation, and preprocessing (page count, token density)
    - Generate summary prompts and send to backend for AI summarization
    - Render summary data (title, executive summary, findings, and per-page content)
    - Enable text download of generated summaries
    - Provide theme-aware loading wheel and robust UI state transitions
*/

// ==================== IMPORTS AND CONSTANTS =======================
import { getUserData } from './auth.js';
declare const pdfjsLib: any; 

const FILE_SIZE_LIMIT_MB = 30;
const TOKEN_LIMIT = 20000;

// ==================== DOM HELPERS =======================
function getEl(id: string): HTMLElement | null {
  return document.getElementById(id);
}

// ==================== TYPE DEFINITIONS =======================
type SummarySection = { page_range: string; summary_points: string[] };
type SummarySchema = {
  document_title: string;
  executive_summary: string;
  key_findings: string[];
  section_summaries: SummarySection[];
};

// ==================== RESPONSE VALIDATION =======================

function checkForResponse(data: any): boolean {
  return !!(
    data?.candidates?.[0]?.content?.parts?.[0]?.text
  );
}

// ==================== PROMPT GENERATION =======================
function createPrompt(totalPages: number): string {
  // Generate structured instruction prompt depending on PDF length (either page-by-page or grouped)
  if (totalPages <= 20) {
    return `
      Analyze the attached PDF (${totalPages} pages total).

      1. **Global Analysis:** Provide 'document_title', 'executive_summary', and 3 'key_findings'.
      2. **Page-by-Page Analysis:** Create 'section_summaries' for EACH page:
         - Each uses page_range "N"
         - Include exactly 3 concise bullet points per page
         - Note if page is title, TOC, or empty

      Return output strictly as JSON matching the schema.
    `;
  }

  const groupSize = totalPages <= 40 ? 5 :
                    totalPages <= 75 ? 10 :
                    totalPages <= 150 ? 20 :
                    totalPages <= 300 ? 25 : 50;

  return `
    Analyze the attached PDF (${totalPages} pages total).

    1. **Global Analysis:** Provide 'document_title', 'executive_summary', and 3 'key_findings'.
    2. **Section Analysis:** For 'section_summaries', group content into ${groupSize}-page chunks:
       - Use "1-${groupSize}", "${groupSize + 1}-${groupSize * 2}", etc.
       - Each section has exactly 3 concise bullet points.

    Return output strictly as JSON matching the schema.
  `;
}

// ==================== API REQUESTS =======================
async function getPDFTokenCount(file: File): Promise<number> {
  // Ask backend for approximate token count of PDF
  const formData = new FormData();
  
  formData.append('pdf', file);
  const res = await fetch('/api/summary/token-count', { method: 'POST', body: formData });
  
  if (!res.ok) throw new Error('Failed to get token count');
  const data = await res.json();
  
  return data.totalTokens;
}

async function summarizePDF(file: File, prompt: string, totalPages: number): Promise<SummarySchema> {
  
  // Submit PDF and prompt to backend summarizer
  const userData = getUserData();
  
  
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('prompt', prompt);
  
  
  if (userData?.id) formData.append('userId', userData.id);

  const response = await fetch('/api/summary', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Failed to summarize PDF');

  const data = await response.json();
  if (!checkForResponse(data)) throw new Error('Invalid response format from API');

  const jsonText = data.candidates[0].content.parts[0].text;
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('Invalid JSON:', jsonText);
    throw new Error('Failed to parse API response');
  }
}


// ==================== RENDER SUMMARY =======================
function renderSummary(data: SummarySchema): void {
  
  // Fill summary sections with structured content
  if (!data || typeof data !== 'object') {
    const out = getEl('summary-output');
    if (out) out.innerHTML = '<p>Invalid summary data.</p>';
    return;
  }

  const title = getEl('summary-doc-title');
  if (title) title.textContent = data.document_title || 'Untitled Document';

  const exec = getEl('summary-executive');
  if (exec) exec.textContent = data.executive_summary || '';

  const findingsList = getEl('summary-key-findings');
  if (findingsList) {
    findingsList.innerHTML = '';
    data.key_findings?.forEach((finding, i) => {
      const li = document.createElement('li');
      li.setAttribute('data-index', String(i + 1));
      li.textContent = finding;
      findingsList.appendChild(li);
    });
  }

  const sectionsContainer = getEl('summary-sections');
  const sectionsTitle = getEl('summary-sections-title');
  if (sectionsContainer) sectionsContainer.innerHTML = '';

  if (Array.isArray(data.section_summaries)) {
    const isPageByPage = !data.section_summaries[0]?.page_range.includes('-');
    if (sectionsTitle)
      sectionsTitle.textContent = isPageByPage ? 'Page-by-Page Summary' : 'Content Summary by Section';

    data.section_summaries.forEach(section => {
      const card = document.createElement('div');
      card.className = 'page-summary-card';
      const label = section.page_range.includes('-')
        ? `Pages ${section.page_range}`
        : `Page ${section.page_range}`;
      const h5 = document.createElement('h5');
      h5.textContent = label;
      card.appendChild(h5);

      const ul = document.createElement('ul');
      section.summary_points.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        ul.appendChild(li);
      });
      card.appendChild(ul);
      sectionsContainer?.appendChild(card);
    });
  }
}

// ==================== TEXT DOWNLOAD HANDLER =======================
function downloadSummaryAsTxt(data: SummarySchema): void {
  // Build and trigger text file download
  if (!data) return;

  let txt = `${data.document_title}\n${'='.repeat(data.document_title.length)}\n\n`;
  txt += `EXECUTIVE SUMMARY\n${'-'.repeat(50)}\n${data.executive_summary}\n\n`;
  txt += `KEY FINDINGS\n${'-'.repeat(50)}\n`;
  data.key_findings.forEach((f, i) => (txt += `${i + 1}. ${f}\n`));
  txt += '\n';

  const header = data.section_summaries[0].page_range.includes('-')
    ? 'CONTENT SUMMARY BY SECTION'
    : 'PAGE-BY-PAGE SUMMARY';
  txt += `${header}\n${'-'.repeat(50)}\n\n`;

  data.section_summaries.forEach(sec => {
    const label = sec.page_range.includes('-')
      ? `PAGES ${sec.page_range}`
      : `PAGE ${sec.page_range}`;
    txt += `${label}\n`;
    sec.summary_points.forEach(p => (txt += `  • ${p}\n`));
    txt += '\n';
  });

  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'summary.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ==================== MAIN INITIALIZER =======================

export function initSummary(isLoggedIn: boolean): void {
  const container = document.querySelector('.summary-container');
  if (!container) return;

  // Element References
  const summaryLocked = getEl('summary-locked');
  const summaryUI = getEl('summary-ui');
  const summaryOutput = getEl('summary-output');
  const summarizeBtn = getEl('summarizeBtn') as HTMLButtonElement | null;
  const pdfInput = getEl('pdfUpload') as HTMLInputElement | null;
  const uploadBox = document.querySelector('.upload-box') as HTMLElement | null;

  let currentPdfPageCount = 0;
  if (!pdfInput || !uploadBox) return;

  const pdfInfo = getEl('pdf-info-container');
  const pdfFileName = getEl('pdf-file-name');
  const pdfPageCount = getEl('pdf-page-count');
  const pdfStatus = getEl('pdf-status');
  const removePdfBtn = getEl('removePdfBtn') as HTMLButtonElement | null;
  const pdfLottie = getEl('pdf-lottie') as HTMLImageElement | null;

  const originalPdfInfoHTML = pdfInfo ? pdfInfo.innerHTML : '';

  // Toggle UI based on login state
  function toggleLoginState(isLoggedIn: boolean): void {
    if (isLoggedIn) {
      summaryUI!.style.display = 'block';
      summaryLocked!.style.display = 'none';
      const limitEl = getEl('size-limit');
      if (limitEl) limitEl.textContent = `Maximum file size: ${FILE_SIZE_LIMIT_MB}MB`;
    } else {
      summaryLocked!.style.display = 'block';
      summaryUI!.style.display = 'none';
    }
  }
  toggleLoginState(isLoggedIn);

  // Display error in PDF info section
  function displayErrorInPdfInfo(errorMessage: string): void {
    if (!pdfInfo) return;
    uploadBox!.style.display = 'none';
    pdfInfo.style.display = 'flex';
    pdfInfo.innerHTML = `
      <lottie-player src="../assets/error.json" background="transparent" speed="1"
        style="width:80px;height:80px;" loop autoplay></lottie-player>
      <div class="pdf-info-text">
        <div class="pdf-file-name pdf-error-title" style="color:var(--clr_error);">Error</div>
        <div class="pdf-page-count pdf-error-message">${errorMessage}</div>
      </div>
      <button id="removePdfBtn" class="remove-pdf-btn" type="button">Choose Another File</button>
    `;

    if (summarizeBtn) {
      summarizeBtn.disabled = true;
      summarizeBtn.style.cursor = 'not-allowed';
      summarizeBtn.style.backgroundColor = 'gray';
    }

    const newRemoveBtn = pdfInfo.querySelector('#removePdfBtn') as HTMLButtonElement | null;
    newRemoveBtn?.addEventListener('click', resetUploadUI);
  }

  // Reset upload UI to initial state
  function resetUploadUI(): void {
    if (pdfInput) pdfInput.value = '';
    currentPdfPageCount = 0;
    uploadBox!.style.display = 'flex';
    pdfInfo!.style.display = 'none';
    summaryOutput!.style.display = 'none';
    if (summarizeBtn) {
      summarizeBtn.disabled = false;
      summarizeBtn.style.cursor = '';
      summarizeBtn.style.backgroundColor = '';
    }
  }

  // File Upload Handler
  pdfInput.addEventListener('change', async e => {
    clearErrorStyles();

    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) {
      resetUploadUI();
      return;
    }

    // --- Size Validation ---
    if (file.size > FILE_SIZE_LIMIT_MB * 1024 * 1024) {
      displayErrorInPdfInfo(`File is ${(file.size / (1024 * 1024)).toFixed(2)}MB (limit ${FILE_SIZE_LIMIT_MB}MB)`);
      return;
    }

    // --- Page Count Detection ---
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      currentPdfPageCount = pdf.numPages;
    } catch (err) {
      console.warn('Failed to read page count', err);
      currentPdfPageCount = 0;
    }

    // --- Token Validation ---
    const tokenCount = await getPDFTokenCount(file);
    if (tokenCount > TOKEN_LIMIT) {
      displayErrorInPdfInfo('Try splitting the PDF into smaller parts.');
      return;
    }

    // --- Display Valid PDF Info ---
    if (pdfInfo) pdfInfo.innerHTML = originalPdfInfoHTML;
    uploadBox.style.display = 'none';
    pdfInfo!.style.display = 'flex';

    const pdfFileNameNew = getEl('pdf-file-name');
    const pdfPageCountNew = getEl('pdf-page-count');
    const pdfStatusNew = getEl('pdf-status');
    const removePdfBtnNew = getEl('removePdfBtn') as HTMLButtonElement | null;
    const pdfLottieNew = getEl('pdf-lottie') as HTMLImageElement | null;

    if (pdfLottieNew) pdfLottieNew.style.display = 'block';
    if (pdfFileNameNew) pdfFileNameNew.textContent = `File: ${file.name}`;
    if (pdfPageCountNew) pdfPageCountNew.textContent = `Pages: ${currentPdfPageCount}`;
    if (pdfStatusNew) {
      pdfStatusNew.textContent = 'File is valid!';
      pdfStatusNew.classList.remove('error');
    }
    if (removePdfBtnNew) removePdfBtnNew.textContent = 'Remove PDF';

    if (summarizeBtn) {
      summarizeBtn.disabled = false;
      summarizeBtn.style.cursor = '';
      summarizeBtn.style.backgroundColor = '';
    }

    removePdfBtnNew?.addEventListener('click', resetUploadUI);
  });

  // Summarization Handler
  summarizeBtn?.addEventListener('click', async () => {
    const pdf = pdfInput.files?.[0];
    const loading = getEl('summary-loading');
    const output = getEl('summary-output');

    if (!pdf) {
      displayErrorInPdfInfo('Please upload a PDF first.');
      return;
    }

    output!.style.display = 'none';
    updateThemeLottie(loading);

    loading!.style.display = 'flex';
    loading.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      const pages = currentPdfPageCount || 1;
      const prompt = createPrompt(pages);
      const data = await summarizePDF(pdf, prompt, pages);

      loading!.style.display = 'none';
      output!.style.display = 'block';
      renderSummary(data);

      const downloadBtn = getEl('downloadSummaryBtn') as HTMLButtonElement | null;
      downloadBtn?.addEventListener('click', () => downloadSummaryAsTxt(data));
    } catch (err: any) {
      loading!.style.display = 'none';
      displayErrorInPdfInfo(err.message || 'Failed to generate summary.');
    }
  });


  // Remove PDF Handler (Initial)
  removePdfBtn?.addEventListener('click', resetUploadUI);

  // Utilities
  function clearErrorStyles(): void {
    if (pdfFileName) {
      pdfFileName.classList.remove('pdf-error-title');
      pdfFileName.textContent = '';
    }
    if (pdfPageCount) {
      pdfPageCount.classList.remove('pdf-error-message');
      pdfPageCount.textContent = '';
    }
    if (pdfStatus) {
      pdfStatus.classList.remove('error');
      pdfStatus.textContent = '';
    }
  }

  // Theme-aware Lottie Update
  function updateThemeLottie(loading: HTMLElement | null): void {
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const lottie = loading?.querySelector('#summary-lottie') as HTMLImageElement | null;
    if (!lottie) return;
    const src =
      theme === 'dark'
        ? '../assets/loading_dark.json'
        : '../assets/loading_light.json';
    lottie.setAttribute('src', src);
    try {
      (lottie as any).load(src);
    } catch {}
  }
}
