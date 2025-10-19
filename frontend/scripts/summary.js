/*
  summary.js
  
  Handles PDF summary generation logic, file validation, and UI rendering.
  Uses the Summary class for structured output from Gemini API.
*/

import { getUserData } from './auth.js';

const FILE_SIZE_LIMIT_MB = 30;
const TOKEN_LIMIT = 20000;

// General helper to check for valid response
const checkForResponse = (data) => {
  if (
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text
  ) {
    return true;
  }
  return false;
};

class Summary {
  static async getPDFTokenCount(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch('/api/summary/token-count', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to get token count');
    }

    const data = await response.json();
    return data;
  }

  static createPrompt(totalPages) {
    if (totalPages <= 20) {
      return `
        Analyze the attached PDF, which has a total of ${totalPages} pages.

        1. **Global Analysis:** Provide the 'document_title', 'executive_summary', and 3 'key_findings'.
        2. **Page-by-Page Analysis:** For the 'section_summaries' array, provide a summary for EACH individual page.
           * For page 1, use page_range "1"
           * For page 2, use page_range "2"
           * Continue for all ${totalPages} pages
           * For each page, provide **EXACTLY 3 distinct, concise bullet points** summarizing that specific page's content.
           * If a page is a title page, table of contents, or mostly empty, still include it but note this in the summary points.
        
        Return the output STRICTLY in the provided JSON schema format.
        Be thorough, accurate, and concise in your summaries.
      `;
    } else {
      let groupSize;
      if (totalPages <= 40) groupSize = 5;
      else if (totalPages <= 75) groupSize = 10;
      else if (totalPages <= 150) groupSize = 20;
      else if (totalPages <= 300) groupSize = 25;
      else groupSize = 50;

      return `
        Analyze the attached PDF, which has a total of ${totalPages} pages.

        1. **Global Analysis:** Provide the 'document_title', 'executive_summary', and 3 'key_findings'.
        2. **Section Analysis:** For the 'section_summaries' array, group the content into chunks of ${groupSize} pages each.
           * The first summary must cover pages 1 to ${groupSize} (use page_range "1-${groupSize}").
           * The next summary must cover pages ${groupSize + 1} to ${groupSize * 2} (use page_range "${groupSize + 1}-${groupSize * 2}"), and so on, until the end of the document.
           * For each resulting section, provide **EXACTLY 3 distinct, concise bullet points** summarizing the entire chunk.
        
        Return the output STRICTLY in the provided JSON schema format.
        Be thorough, accurate, and concise in your summaries.
      `;
    }
  }

  static async summarizePDF(file, prompt, totalPages) {
    // Get user data to include userId
    const userData = getUserData();
    
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('prompt', prompt);
    if (userData?.id) {
      formData.append('userId', userData.id);
    }

    const response = await fetch('/api/summary', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to summarize PDF');
    }

    const data = await response.json();

    if (checkForResponse(data)) {
      const jsonText = data.candidates[0].content.parts[0].text;
      
      let parsedData;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', jsonText);
        throw new Error('Failed to parse API response as JSON');
      }

      console.log('Parsed summary data:', parsedData);

      if (!Summary.validateSchema(parsedData)) {
        console.error('Schema validation failed for:', parsedData);
        throw new Error('Response does not match expected schema');
      }

      return parsedData;
    }

    throw new Error('Invalid response format from API');
  }
  
  static validateSchema(obj) {
    if (
      typeof obj !== "object" ||
      typeof obj.document_title !== "string" ||
      typeof obj.executive_summary !== "string" ||
      !Array.isArray(obj.key_findings) ||
      obj.key_findings.length < 1 ||
      !Array.isArray(obj.section_summaries) ||
      obj.section_summaries.length < 1
    ) return false;

    for (const finding of obj.key_findings) {
      if (typeof finding !== "string") return false;
    }

    for (const section of obj.section_summaries) {
      if (
        typeof section !== "object" ||
        typeof section.page_range !== "string" ||
        !Array.isArray(section.summary_points) ||
        section.summary_points.length < 1
      ) return false;

      for (const point of section.summary_points) {
        if (typeof point !== "string") return false;
      }
    }
    return true;
  }
}

// Helper functions for rendering
function renderSummary(data) {
  if (!data || typeof data !== 'object') {
    document.getElementById('summary-output').innerHTML = '<p>Invalid summary data.</p>';
    return;
  }

  // Populate document title
  document.getElementById('summary-doc-title').textContent = data.document_title;

  // Populate executive summary
  document.getElementById('summary-executive').textContent = data.executive_summary;

  // Populate key findings
  const findingsList = document.getElementById('summary-key-findings');
  findingsList.innerHTML = '';
  if (Array.isArray(data.key_findings) && data.key_findings.length > 0) {
    data.key_findings.forEach((finding, index) => {
      const li = document.createElement('li');
      li.setAttribute('data-index', index + 1);
      li.textContent = finding;
      findingsList.appendChild(li);
    });
  }

  // Populate sections
  const sectionsContainer = document.getElementById('summary-sections');
  const sectionsTitle = document.getElementById('summary-sections-title');
  sectionsContainer.innerHTML = '';
  
  if (Array.isArray(data.section_summaries) && data.section_summaries.length > 0) {
    const isPageByPage = data.section_summaries.length > 0 && 
                         !data.section_summaries[0].page_range.includes('-');
    
    sectionsTitle.textContent = isPageByPage ? "Page-by-Page Summary" : "Content Summary by Section";

    data.section_summaries.forEach(section => {
      if (Array.isArray(section.summary_points)) {
        const card = document.createElement('div');
        card.className = 'page-summary-card';
        
        const label = section.page_range.includes('-') ? `Pages ${section.page_range}` : `Page ${section.page_range}`;
        const title = document.createElement('h5');
        title.textContent = label;
        card.appendChild(title);
        
        const ul = document.createElement('ul');
        section.summary_points.forEach(point => {
          const li = document.createElement('li');
          li.textContent = point;
          ul.appendChild(li);
        });
        card.appendChild(ul);
        
        sectionsContainer.appendChild(card);
      }
    });
  }
}

function downloadSummaryAsTxt(data) {
  if (!data || typeof data !== 'object') return;
  
  let txtContent = '';
  
  txtContent += `${data.document_title}\n`;
  txtContent += '='.repeat(data.document_title.length) + '\n\n';
  
  txtContent += 'EXECUTIVE SUMMARY\n';
  txtContent += '-'.repeat(50) + '\n';
  txtContent += `${data.executive_summary}\n\n`;
  
  if (Array.isArray(data.key_findings) && data.key_findings.length > 0) {
    txtContent += 'KEY FINDINGS\n';
    txtContent += '-'.repeat(50) + '\n';
    data.key_findings.forEach((finding, index) => {
      txtContent += `${index + 1}. ${finding}\n`;
    });
    txtContent += '\n';
  }
  
  if (Array.isArray(data.section_summaries) && data.section_summaries.length > 0) {
    const isPageByPage = data.section_summaries.length > 0 && 
                         !data.section_summaries[0].page_range.includes('-');
    
    const headerText = isPageByPage ? 'PAGE-BY-PAGE SUMMARY' : 'CONTENT SUMMARY BY SECTION';
    txtContent += headerText + '\n';
    txtContent += '-'.repeat(50) + '\n\n';
    
    data.section_summaries.forEach(section => {
      if (Array.isArray(section.summary_points)) {
        const label = section.page_range.includes('-') ? `PAGES ${section.page_range}` : `PAGE ${section.page_range}`;
        txtContent += `${label}\n`;
        section.summary_points.forEach(point => {
          txtContent += `  • ${point}\n`;
        });
        txtContent += '\n';
      }
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

export function initSummary(isLoggedIn) {
  const summaryContainer = document.querySelector(".summary-container");
  
  // If not on summary page, exit early
  if (!summaryContainer) {
    return;
  }

  const summaryLocked = document.getElementById("summary-locked");
  const summaryUI = document.getElementById("summary-ui");
  const summarizeBtn = document.getElementById("summarizeBtn");
  const summaryOutput = document.getElementById("summary-output");

  if (isLoggedIn) {
    if (summaryUI) summaryUI.style.display = "block";
    if (summaryLocked) summaryLocked.style.display = "none";
    const sizeLimitElem = document.getElementById("size-limit");
    if (sizeLimitElem) {
      sizeLimitElem.textContent = `Maximum file size: ${FILE_SIZE_LIMIT_MB}MB`;
    }
  } else {
    if (summaryLocked) summaryLocked.style.display = "block";
    if (summaryUI) summaryUI.style.display = "none";
  }

  const pdfInput = document.getElementById("pdfUpload");
  const uploadBox = document.querySelector(".upload-box");
  let currentPdfPageCount = 0;

  if (!pdfInput || !uploadBox) {
    console.error('PDF upload elements not found:', { pdfInput, uploadBox });
    return;
  }

  const pdfInfoContainer = document.getElementById("pdf-info-container");
  const pdfFileName = document.getElementById("pdf-file-name");
  const pdfPageCount = document.getElementById("pdf-page-count");
  const pdfStatus = document.getElementById("pdf-status");
  const removePdfBtn = document.getElementById("removePdfBtn");
  const pdfLottie = document.getElementById("pdf-lottie");

  if (!pdfInfoContainer) {
    console.error('PDF info container not found');
    return;
  }

  pdfInput.addEventListener("change", async (e) => {
    console.log('PDF input change event fired');
    const file = e.target.files[0];
    console.log('Selected file:', file);

      if (!file) {
        currentPdfPageCount = 0;
        uploadBox.style.display = "flex";
        pdfInfoContainer.style.display = "none";
        summaryOutput.style.display = "none";
        return;
      }

      const maxSizeBytes = FILE_SIZE_LIMIT_MB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        uploadBox.style.display = "none";
        pdfInfoContainer.style.display = "flex";
        
        // Hide lottie, show error state
        pdfLottie.style.display = "none";
        pdfFileName.textContent = "File is too big";
        pdfFileName.classList.add('pdf-error-title');
        pdfPageCount.textContent = `Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed size is ${FILE_SIZE_LIMIT_MB}MB.`;
        pdfPageCount.classList.add('pdf-error-message');
        pdfStatus.textContent = "Error!";
        pdfStatus.classList.add('error');
        removePdfBtn.textContent = "Choose Another File";
        return;
      }

      let pageCount = 0;
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pageCount = pdf.numPages;
        currentPdfPageCount = pageCount;
      }

      const data = await Summary.getPDFTokenCount(file);

      if (data.totalTokens > TOKEN_LIMIT) {
        uploadBox.style.display = "none";
        pdfInfoContainer.style.display = "flex";
        
        // Hide lottie, show error state
        pdfLottie.style.display = "none";
        pdfFileName.textContent = "File is too dense!";
        pdfFileName.classList.add('pdf-error-title');
        pdfPageCount.textContent = "Your PDF is too dense! Try separating it into parts.";
        pdfPageCount.classList.add('pdf-error-message');
        pdfStatus.textContent = "Error!";
        pdfStatus.classList.add('error');
        removePdfBtn.textContent = "Choose Another File";
        return;
      }

      // Show success state
      uploadBox.style.display = "none";
      pdfInfoContainer.style.display = "flex";
      
      // Reset to normal state
      pdfLottie.style.display = "block";
      pdfFileName.textContent = `File: ${file.name}`;
      pdfFileName.classList.remove('pdf-error-title');
      pdfPageCount.textContent = `Pages: ${pageCount}`;
      pdfPageCount.classList.remove('pdf-error-message');
      pdfStatus.textContent = "File is valid!";
      pdfStatus.classList.remove('error');
      removePdfBtn.textContent = "Remove PDF";
  });

  // Remove PDF button handler
  if (removePdfBtn) {
    removePdfBtn.addEventListener("click", () => {
      pdfInput.value = "";
      currentPdfPageCount = 0;
      uploadBox.style.display = "flex";
      pdfInfoContainer.style.display = "none";
      summaryOutput.style.display = "none";
    });
  }

  if (summarizeBtn) {
    summarizeBtn.addEventListener("click", async () => {
      const pdf = document.getElementById("pdfUpload").files[0];
      const summaryOutput = document.getElementById("summary-output");
      const loading = document.getElementById("summary-loading");
      
      if (!pdf) {
        summaryOutput.style.display = "block";
        summaryOutput.innerHTML = "<p style='text-align:center;'>Please upload a PDF first.</p>";
        return;
      }

      // Hide output
      summaryOutput.style.display = "none";

      // Set the correct loading animation based on theme BEFORE showing it
      const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const lottie = loading.querySelector('#summary-lottie');
      if (lottie) {
        const newSrc = theme === 'dark' ? '../assets/loading_dark.json' : '../assets/loading_light.json';
        lottie.setAttribute('src', newSrc);
        lottie.load(newSrc); // Force reload the animation
      }

      // Now show loading
      loading.style.display = "flex";

      try {
        const totalPages = currentPdfPageCount || 1;
        const prompt = Summary.createPrompt(totalPages);
        const data = await Summary.summarizePDF(pdf, prompt, totalPages);

        if (!data) throw new Error('No valid response from API.');

        // Hide loading, show output
        loading.style.display = "none";
        summaryOutput.style.display = "block";
        
        // Populate the HTML structure
        renderSummary(data);
        
        // Attach download button handler
        const downloadBtn = document.getElementById("downloadSummaryBtn");
        if (downloadBtn) {
          downloadBtn.addEventListener("click", () => {
            downloadSummaryAsTxt(data);
          });
        }
      } catch (err) {
        loading.style.display = "none";
        summaryOutput.style.display = "block";
        summaryOutput.innerHTML = `<p style='color:var(--clr_error);text-align:center;'>Error: ${err.message || 'Failed to generate summary.'}</p>`;
      }
    });
  }
}
