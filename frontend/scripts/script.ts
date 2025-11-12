/* 
  ? File: 
      script.ts

  ? Main Contributors: 
	  Team
  
  ? Functionalities:
	- Initialize core frontend functionalities on DOM load

*/

console.log("Main script loaded");

import { initTheme } from './theme.js';
import { initAuth, isUserLoggedIn } from './auth.js';
import { initNavbar } from './navbar.js';
import { initCrashCourse } from './crashCourse.js';
import { initSummary } from './summary.js';
import { initPracticeTest } from './practiceTest.js';
import { initDashboard } from './dashboard.js';
import { initStatsAnimation } from './statsAnimation.js';
import { initPopup } from './popup.js';
import { initAddQuestion } from './addQuestion.js';

document.addEventListener('DOMContentLoaded', () => {
	
	// Initialize core functionality (each of this function returns early if not needed)
	initTheme();
	initAuth();
	initNavbar();
	initPopup();

	// Check login status
	const isLoggedIn: boolean = isUserLoggedIn();

	// Initialize page-specific features
	initDashboard(isLoggedIn);
	initCrashCourse(isLoggedIn);
	initSummary(isLoggedIn);
	initPracticeTest(isLoggedIn);
	initAddQuestion();
	
	// coolness factor am i right?  -David
	// very cool indeed 			-Robert
	initStatsAnimation();
});

