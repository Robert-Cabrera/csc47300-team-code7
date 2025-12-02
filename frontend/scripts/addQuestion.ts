/* 
  ? File: 
      addQuestion.ts

  ? Main Contributors: 
      Team
  
  ? Functionalities:
    - Initialize and manage the add question form
    - Handle form submission and validation
    - Submit question data to backend API
*/

import { isUserLoggedIn, getUserData } from './auth.js';

/**
 * Show message in alert div
 */
function showMessage(elementId: string, message: string): void {
  const element = document.getElementById(elementId) as HTMLDivElement;
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

/**
 * Hide message
 */
function hideMessage(elementId: string): void {
  const element = document.getElementById(elementId) as HTMLDivElement;
  if (element) {
    element.style.display = 'none';
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  
  // Validate form
  if (!form.reportValidity()) return;

  // Check if user is logged in
  if (!isUserLoggedIn()) {
    showMessage('aq-error', '✗ You must be logged in to submit questions.');
    return;
  }

  // Get user data
  const userData = getUserData();
  if (!userData) {
    showMessage('aq-error', '✗ User data not found. Please log in again.');
    return;
  }

  // Get form data
  const formData = new FormData(form);
  const question = formData.get('question') as string;
  const correctAnswer = formData.get('correctAnswer') as string;
  const course = formData.get('course') as string;
  const topic = formData.get('topic') as string;
  const difficulty = formData.get('difficulty') as string;

  // Show loading
  const loadingOverlay = document.getElementById('aq-loading') as HTMLDivElement;
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }

  hideMessage('aq-error');
  hideMessage('aq-success');

  try {

    // ! CHECKMARK 1.5: Very little work is done here; most is in the backend route
    // Submit to backend API
    // ! CHECKMARK 1.1: Frontend that calls the API to ``INSERT``
    const response = await fetch('/api/submitQuestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        correctAnswer: correctAnswer,
        course: course,
        topic: topic,
        difficulty: difficulty,
        userId: userData.id,
        userName: userData.name,
        userEmail: userData.email
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit question');
    }

    // Success - show message and clear form
    showMessage('aq-success', '✓ Question submitted successfully! Thank you for contributing to NoteSmith.');
    form.reset();

    // Redirect after 2 seconds
    setTimeout(() => {
      window.location.href = './practice_tests.html';
    }, 2000);

  } catch (err) {
    console.error('Error submitting question:', err);
    showMessage('aq-error', '✗ Error submitting question. Please try again.');
  } finally {
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }
}

/**
 * Initialize add question page
 */
export function initAddQuestion(): void {
  // Check if user is logged in
  if (!isUserLoggedIn()) {
    const questionForm = document.getElementById('question-form') as HTMLDivElement;
    const lockedDiv = document.getElementById('test-locked') as HTMLDivElement;
    
    if (questionForm) questionForm.style.display = 'none';
    if (lockedDiv) lockedDiv.style.display = 'block';
    return;
  }

  // Set up form submission
  const form = document.getElementById('addQuestionForm') as HTMLFormElement;
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Set up profile picture input
  const profilePictureInput = document.getElementById('profilePictureInput') as HTMLInputElement;
  if (profilePictureInput) {
    profilePictureInput.addEventListener('change', handleProfilePictureSelect);
  }

  // Get user data and display info
  const userData = getUserData();
  if (userData) {
    console.log('User submitting question:', userData.name);
  }
}
