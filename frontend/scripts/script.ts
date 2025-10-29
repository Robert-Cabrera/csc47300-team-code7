/*
	script.ts - Main Entry Point (converted from script.js)
	Minimal migration with lightweight types for module exports.
*/

/* for my sanity, since it wasnt loading cuz auth.js wasnt in dist for some reason */
console.log("Main script loaded");

import { initTheme } from './theme.js';
import { initAuth, isUserLoggedIn } from '../scripts/auth.js';
import { initNavbar } from './navbar.js';
import { initCrashCourse } from './crashCourse.js';
import { initSummary } from './summary.js';
import { initPracticeTest } from '../scripts/practiceTest.js';
import { initDashboard } from './dashboard.js';
import { initStatsAnimation } from './statsAnimation.js';

document.addEventListener('DOMContentLoaded', () => {
	// Initialize core functionality
	initTheme();
	initAuth();
	initNavbar();

	// Check login status (typed)
	const isLoggedIn: boolean = isUserLoggedIn();

	// Initialize page-specific features
	initDashboard(isLoggedIn);
	initCrashCourse(isLoggedIn);
	initSummary(isLoggedIn);
	initPracticeTest(isLoggedIn);
	
	// coolness factor am i right?
	initStatsAnimation();
});

