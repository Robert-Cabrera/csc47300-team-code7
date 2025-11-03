# Features to be implemented for Midterm
### Feature 1: AI-Powered Crash Course Generator

**Description:**
This feature allows a logged-in user to generate a structured, summary-style "crash course" on any topic using an AI model (referred to via CrashCourse methods).

**Code Link:**
[View Implementation](./frontend/scripts/crashCourse.ts)


### Feature 2: Practice Test Generator & Grader

This feature enables logged-in users to generate a multiple-choice practice test based on a specified course and topic, and then submit it for instant grading.

**Code Link:**
[View Implementation](./frontend/scripts/practiceTest.js)

### Feature 3: AI-Powered PDF Document Summarization

**Description:**
This feature allows logged-in users to upload a PDF file and generate a structured, comprehensive summary using an AI model. It is designed to handle large documents by dynamically adjusting the summarization strategy.

**Code Link:**
[View Implementation](./frontend/scripts/summary.ts)


# File Structure

```
csc47300-team-code7/
│
├── frontend/                  # Client-side application files
│   ├── assets/                # Static assets (images, icons, etc.)
│   ├── pages/                 # HTML pages for different features
│   ├── scripts/               # Client-side JavaScript files
│   ├── stylesheets/           # CSS styling files
│   └── index.html             # Main landing page
│
├── backend/                   # Server-side application files
    ├── routes/                # Express route handlers (API endpoints)
    ├── utils/                 # Utility functions (will be helpful when adding database)
    ├── data_objects/          # JSON objects files
    └── server.js              # Express server entry point
```


#  Notes and Updates

 ## TS Migration - Oct 28 2025
 Started migrating the JS (both front and back end) to TS. To run the website use the following command from the source directory:
 ```
npm install && npm run build:frontend && npm run build:backend && npm start
```

 ## Directory Refactoring - Oct 17 2025:
 Separated the files into `frontend/` and `backend/` for better organization, ensuring the biggest directory is the root directory as requested in the last email

 ## JS Migration - Oct 12 2025:  
 The `develop` branch transitioned from **static JavaScript** to a **Node.js** runtime to support **Gemini API Integration**, therefore GitHub pages deployment is  **disabled** until further notice. 
  
 To run the local version of the repository, execute:  
 ```bash
 node backend/server.js
 ```
A Gemini-API key is required, this can be obtained in https://aistudio.google.com/api-keys
  



# Homework Progress

## Continued Backend (HW3) - Oct 12 2025

### Crash course demo: 
> <img src="./frontend/assets/github/hw3/crash_course.gif" alt="hippo" width="600">

### PDF summary demo (small files - page by page):
> <img src="./frontend/assets/github/hw3/page_by_page.gif" alt="hippo" width="600">

### PDF summary demo (large files - page ranges):
> <img src="./frontend/assets/github/hw3/summary_range.gif" alt="hippo" width="600">

## Repository Creation and Frontend (HW1 & HW2) - Oct 06 2025

### Front-end navigation: 
> <img src="./frontend/assets/github/hw1_2/frontend_nav.png" width="600">

### Initial commit: 
> <img src="./frontend/assets/github/hw1_2/repo.png" width="600">
