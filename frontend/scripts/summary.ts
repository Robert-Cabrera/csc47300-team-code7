/*
  summary.ts

  TypeScript migration of summary.js. Keeps behavior intact but adds lightweight types
  and some small safety checks. Exports `initSummary(isLoggedIn: boolean)`.
*/

import { getUserData } from './auth.js';

declare const pdfjsLib: any; // pdf.js is loaded globally in the page

const FILE_SIZE_LIMIT_MB = 30;
const TOKEN_LIMIT = 20000;

type SummarySection = {
  page_range: string;
  summary_points: string[];
};

type SummarySchema = {
  document_title: string;
  executive_summary: string;
  key_findings: string[];
  section_summaries: SummarySection[];
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

class Summary {
  static async getPDFTokenCount(file: File): Promise<{ totalTokens: number }>{
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch('/api/summary/token-count', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to get token count');
    return response.json();
  }

  static createPrompt(totalPages: number): string {
    if (totalPages <= 20) {
      return `\n        Analyze the attached PDF, which has a total of ${totalPages} pages.\n\n        1. **Global Analysis:** Provide the 'document_title', 'executive_summary', and 3 'key_findings'.\n        2. **Page-by-Page Analysis:** For the 'section_summaries' array, provide a summary for EACH individual page.\n           * For page 1, use page_range "1"\n           * For page 2, use page_range "2"\n           * Continue for all ${totalPages} pages without exceeding the limit of ${totalPages} total pages.\n           * For each page, provide **EXACTLY 3 distinct, concise bullet points** summarizing that specific page's content.\n           * If a page is a title page, table of contents, or mostly empty, still include it but note this in the summary points.\n        \n        Return the output STRICTLY in the provided JSON schema format.\n        Be thorough, accurate, and concise in your summaries.\n      `;
    }

    let groupSize: number;
    if (totalPages <= 40) groupSize = 5;
    else if (totalPages <= 75) groupSize = 10;
    else if (totalPages <= 150) groupSize = 20;
    else if (totalPages <= 300) groupSize = 25;
    else groupSize = 50;

    return `\n        Analyze the attached PDF, which has a total of ${totalPages} pages.\n\n        1. **Global Analysis:** Provide the 'document_title', 'executive_summary', and 3 'key_findings'.\n        2. **Section Analysis:** For the 'section_summaries' array, group the content into chunks of ${groupSize} pages each.\n           * The first summary must cover pages 1 to ${groupSize} (use page_range "1-${groupSize}").\n           * The next summary must cover pages ${groupSize + 1} to ${groupSize * 2} (use page_range "${groupSize + 1}-${groupSize * 2}"), and so on, until the end of the document.\n           * For each resulting section, provide **EXACTLY 3 distinct, concise bullet points** summarizing the entire chunk.\n        \n        Return the output STRICTLY in the provided JSON schema format.\n        Be thorough, accurate, and concise in your summaries.\n      `;
  }

  static async summarizePDF(file: File, prompt: string, totalPages: number): Promise<SummarySchema> {
    const userData = getUserData();

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('prompt', prompt);
    if (userData?.id) formData.append('userId', userData.id);

    const response = await fetch('/api/summary', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Failed to summarize PDF');

    const data = await response.json();

    if (checkForResponse(data)) {
      const jsonText = data.candidates[0].content.parts[0].text;
      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse JSON response:', jsonText);
        throw new Error('Failed to parse API response as JSON');
      }

      if (!Summary.validateSchema(parsedData)) {
        console.error('Schema validation failed for:', parsedData);
        throw new Error('Response does not match expected schema');
      }

      return parsedData as SummarySchema;
    }

    throw new Error('Invalid response format from API');
  }

  static validateSchema(obj: any): boolean {
    if (
      typeof obj !== 'object' ||
      typeof obj.document_title !== 'string' ||
      typeof obj.executive_summary !== 'string' ||
      !Array.isArray(obj.key_findings) ||
      obj.key_findings.length < 1 ||
      !Array.isArray(obj.section_summaries) ||
      obj.section_summaries.length < 1
    ) return false;

    for (const finding of obj.key_findings) if (typeof finding !== 'string') return false;

    for (const section of obj.section_summaries) {
      if (
        typeof section !== 'object' ||
        typeof section.page_range !== 'string' ||
        !Array.isArray(section.summary_points) ||
        section.summary_points.length < 1
      ) return false;
      for (const point of section.summary_points) if (typeof point !== 'string') return false;
    }
    return true;
  }
}

function getEl(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderSummary(data: SummarySchema | any): void {
  if (!data || typeof data !== 'object') {
    const out = getEl('summary-output');
    if (out) out.innerHTML = '<p>Invalid summary data.</p>';
    return;
  }

  const title = getEl('summary-doc-title');
  if (title) title.textContent = data.document_title;

  const exec = getEl('summary-executive');
  if (exec) exec.textContent = data.executive_summary;

  const findingsList = document.getElementById('summary-key-findings');
  if (findingsList) {
    findingsList.innerHTML = '';
    if (Array.isArray(data.key_findings)) {
      data.key_findings.forEach((finding: string, index: number) => {
        const li = document.createElement('li');
        li.setAttribute('data-index', String(index + 1));
        li.textContent = finding;
        findingsList.appendChild(li);
      });
    }
  }

  const sectionsContainer = getEl('summary-sections');
  const sectionsTitle = getEl('summary-sections-title');
  if (sectionsContainer) sectionsContainer.innerHTML = '';

  if (Array.isArray(data.section_summaries) && data.section_summaries.length > 0) {
    const isPageByPage = data.section_summaries.length > 0 && !data.section_summaries[0].page_range.includes('-');
    if (sectionsTitle) sectionsTitle.textContent = isPageByPage ? 'Page-by-Page Summary' : 'Content Summary by Section';

    data.section_summaries.forEach((section: SummarySection) => {
      if (!Array.isArray(section.summary_points)) return;
      const card = document.createElement('div');
      card.className = 'page-summary-card';

      const label = section.page_range.includes('-') ? `Pages ${section.page_range}` : `Page ${section.page_range}`;
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

function downloadSummaryAsTxt(data: SummarySchema | any): void {
  if (!data || typeof data !== 'object') return;

  let txtContent = '';
  txtContent += `${data.document_title}\n`;
  txtContent += '='.repeat((data.document_title || '').length) + '\n\n';

  txtContent += 'EXECUTIVE SUMMARY\n';
  txtContent += '-'.repeat(50) + '\n';
  txtContent += `${data.executive_summary}\n\n`;

  if (Array.isArray(data.key_findings) && data.key_findings.length > 0) {
    txtContent += 'KEY FINDINGS\n';
    txtContent += '-'.repeat(50) + '\n';
    data.key_findings.forEach((finding: string, index: number) => {
      txtContent += `${index + 1}. ${finding}\n`;
    });
    txtContent += '\n';
  }

  if (Array.isArray(data.section_summaries) && data.section_summaries.length > 0) {
    const isPageByPage = data.section_summaries.length > 0 && !data.section_summaries[0].page_range.includes('-');
    const headerText = isPageByPage ? 'PAGE-BY-PAGE SUMMARY' : 'CONTENT SUMMARY BY SECTION';
    txtContent += headerText + '\n';
    txtContent += '-'.repeat(50) + '\n\n';

    data.section_summaries.forEach((section: SummarySection) => {
      if (!Array.isArray(section.summary_points)) return;
      const label = section.page_range.includes('-') ? `PAGES ${section.page_range}` : `PAGE ${section.page_range}`;
      txtContent += `${label}\n`;
      section.summary_points.forEach(point => {
        txtContent += `  • ${point}\n`;
      });
      txtContent += '\n';
    });
  }

  const blob = new Blob([txtContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `summary.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function initSummary(isLoggedIn: boolean): void {
  const summaryContainer = document.querySelector('.summary-container');
  if (!summaryContainer) return;

  const summaryLocked = getEl('summary-locked');
  const summaryUI = getEl('summary-ui');
  const summarizeBtn = getEl('summarizeBtn') as HTMLButtonElement | null;
  const summaryOutput = getEl('summary-output');

  if (isLoggedIn) {
    if (summaryUI) (summaryUI as HTMLElement).style.display = 'block';
    if (summaryLocked) (summaryLocked as HTMLElement).style.display = 'none';
    const sizeLimitElem = getEl('size-limit');
    if (sizeLimitElem) sizeLimitElem.textContent = `Maximum file size: ${FILE_SIZE_LIMIT_MB}MB`;
  } else {
    if (summaryLocked) (summaryLocked as HTMLElement).style.display = 'block';
    if (summaryUI) (summaryUI as HTMLElement).style.display = 'none';
  }

  let pdfInput = document.getElementById('pdfUpload') as HTMLInputElement | null;
  let uploadBox = document.querySelector('.upload-box') as HTMLElement | null;
  let currentPdfPageCount = 0;

  if (!pdfInput || !uploadBox) {
    console.debug('No PDF upload UI present on this page; skipping upload-related initialization', { pdfInput, uploadBox });
    pdfInput = null;
    uploadBox = null;
  } else {
    const pdfInfoContainer = getEl('pdf-info-container');
    const pdfFileName = getEl('pdf-file-name');
    const pdfPageCount = getEl('pdf-page-count');
    const pdfStatus = getEl('pdf-status');
    const removePdfBtn = getEl('removePdfBtn') as HTMLButtonElement | null;
    const pdfLottie = getEl('pdf-lottie') as HTMLImageElement | null;

    pdfInput.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files ? target.files[0] : undefined;
      if (!file) {
        currentPdfPageCount = 0;
        if (uploadBox) uploadBox.style.display = 'flex';
        if (pdfInfoContainer) pdfInfoContainer.style.display = 'none';
        if (summaryOutput) summaryOutput.style.display = 'none';
        return;
      }

      const maxSizeBytes = FILE_SIZE_LIMIT_MB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        if (uploadBox) uploadBox.style.display = 'none';
        if (pdfInfoContainer) pdfInfoContainer.style.display = 'flex';
        if (pdfLottie) pdfLottie.style.display = 'none';
        if (pdfFileName) {
          pdfFileName.textContent = 'File is too big';
          pdfFileName.classList.add('pdf-error-title');
        }
        if (pdfPageCount) {
          pdfPageCount.textContent = `Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed size is ${FILE_SIZE_LIMIT_MB}MB.`;
          pdfPageCount.classList.add('pdf-error-message');
        }
        if (pdfStatus) {
          pdfStatus.textContent = 'Error!';
          pdfStatus.classList.add('error');
        }
        if (removePdfBtn) removePdfBtn.textContent = 'Choose Another File';
        return;
      }

      let pageCount = 0;
      try {
        if (typeof pdfjsLib !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pageCount = pdf.numPages;
          currentPdfPageCount = pageCount;
        }
      } catch (err) {
        console.warn('pdf.js failed to get page count', err);
        pageCount = 0;
        currentPdfPageCount = 0;
      }

      const data = await Summary.getPDFTokenCount(file);

      if (data.totalTokens > TOKEN_LIMIT) {
        if (uploadBox) uploadBox.style.display = 'none';
        if (pdfInfoContainer) pdfInfoContainer.style.display = 'flex';
        if (pdfLottie) pdfLottie.style.display = 'none';
        if (pdfFileName) {
          pdfFileName.textContent = 'File is too dense!';
          pdfFileName.classList.add('pdf-error-title');
        }
        if (pdfPageCount) {
          pdfPageCount.textContent = 'Your PDF is too dense! Try separating it into parts.';
          pdfPageCount.classList.add('pdf-error-message');
        }
        if (pdfStatus) {
          pdfStatus.textContent = 'Error!';
          pdfStatus.classList.add('error');
        }
        if (removePdfBtn) removePdfBtn.textContent = 'Choose Another File';
        return;
      }

      if (uploadBox) uploadBox.style.display = 'none';
      if (pdfInfoContainer) pdfInfoContainer.style.display = 'flex';
      if (pdfLottie) pdfLottie.style.display = 'block';
      if (pdfFileName) {
        pdfFileName.textContent = `File: ${file.name}`;
        pdfFileName.classList.remove('pdf-error-title');
      }
      if (pdfPageCount) {
        pdfPageCount.textContent = `Pages: ${pageCount}`;
        pdfPageCount.classList.remove('pdf-error-message');
      }
      if (pdfStatus) {
        pdfStatus.textContent = 'File is valid!';
        pdfStatus.classList.remove('error');
      }
      if (removePdfBtn) removePdfBtn.textContent = 'Remove PDF';
    });

    if (typeof removePdfBtn !== 'undefined' && removePdfBtn) {
      removePdfBtn.addEventListener('click', () => {
        if (pdfInput) pdfInput.value = '';
        currentPdfPageCount = 0;
        if (uploadBox) uploadBox.style.display = 'flex';
        if (pdfInfoContainer) pdfInfoContainer.style.display = 'none';
        if (summaryOutput) summaryOutput.style.display = 'none';
      });
    }
  }

  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', async () => {
      const pdfEl = document.getElementById('pdfUpload') as HTMLInputElement | null;
      const pdf = pdfEl && pdfEl.files ? pdfEl.files[0] : undefined;
      const summaryOutputEl = getEl('summary-output');
      const loading = getEl('summary-loading') as HTMLElement | null;

      if (!pdf) {
        if (summaryOutputEl) {
          summaryOutputEl.style.display = 'block';
          summaryOutputEl.innerHTML = "<p style='text-align:center;'>Please upload a PDF first.</p>";
        }
        return;
      }

      if (summaryOutputEl) summaryOutputEl.style.display = 'none';

      const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const lottie = loading ? loading.querySelector('#summary-lottie') as HTMLImageElement | null : null;
      if (lottie) {
        const newSrc = theme === 'dark' ? '../assets/loading_dark.json' : '../assets/loading_light.json';
        lottie.setAttribute('src', newSrc);
        try { (lottie as any).load(newSrc); } catch (e) { /* ignore */ }
      }

      if (loading) loading.style.display = 'flex';

      try {
        const totalPages = currentPdfPageCount || 1;
        const prompt = Summary.createPrompt(totalPages);
        const data = await Summary.summarizePDF(pdf, prompt, totalPages);

        if (!data) throw new Error('No valid response from API.');

        if (loading) loading.style.display = 'none';
        if (summaryOutputEl) summaryOutputEl.style.display = 'block';

        renderSummary(data);

        const downloadBtn = getEl('downloadSummaryBtn') as HTMLButtonElement | null;
        if (downloadBtn) {
          downloadBtn.addEventListener('click', () => downloadSummaryAsTxt(data));
        }
      } catch (err: any) {
        if (loading) loading.style.display = 'none';
        if (summaryOutputEl) {
          summaryOutputEl.style.display = 'block';
          summaryOutputEl.innerHTML = `<p style='color:var(--clr_error);text-align:center;'>Error: ${err?.message || 'Failed to generate summary.'}</p>`;
        }
      }
    });
  }
}
