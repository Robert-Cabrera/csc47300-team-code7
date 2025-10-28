/*
	script.ts - Main Entry Point (converted from script.js)
	Minimal migration with lightweight types for module exports.
*/


import { initTheme } from './theme.js';
import { initAuth, isUserLoggedIn } from '../scripts/auth.js';
import { initNavbar } from '../scripts/navbar.js';
import { initCrashCourse } from './crashCourse.js';
import { initSummary } from './summary.js';
import { initPracticeTest } from '../scripts/practiceTest.js';
import { initDashboard } from '../scripts/dashboard.js';

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
});

