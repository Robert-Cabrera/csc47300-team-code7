/*
	statsAnimation.ts - Animate statistics numbers on scroll
*/

export function initStatsAnimation(): void {
	const statNumbers = document.querySelectorAll<HTMLElement>('.stat-number');
	if (statNumbers.length === 0) return;

	const observerOptions: IntersectionObserverInit = {
		threshold: 0.25, 
		rootMargin: '0px 0px -100px 0px' 
	};

	const animateStat = (element: HTMLElement): void => {
		const target = parseInt(element.getAttribute('data-target') || '0', 10);
		animateNumber(element, target);
		
		// Animate the progress bar
		const statBox = element.closest('.stat-box');
		if (statBox) {
			const barFill = statBox.querySelector<HTMLElement>('.stat-bar-fill');
			if (barFill) {
				const percentage = Math.min((target / 100) * 100, 100);
				setTimeout(() => {
					barFill.style.width = `${percentage}%`;
				}, 200);
			}
		}
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const element = entry.target as HTMLElement;
				animateStat(element);
				observer.unobserve(entry.target);
			}
		});
	}, observerOptions);


	statNumbers.forEach(stat => {
		const rect = stat.getBoundingClientRect();
		const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
		// for when the page is loaded with numbers already in view
		if (isVisible) {
			animateStat(stat);
		} else {
			observer.observe(stat);
		}
	});
}

function animateNumber(element: HTMLElement, target: number): void {
	// timing for animation
	const duration = 2000;
	const steps = 60;
	const increment = target / steps;
	const stepDuration = duration / steps;
	let current = 0;

	const timer = setInterval(() => {
		current += increment;
		if (current >= target) {
			element.textContent = String(target);
			clearInterval(timer);
		} else {
			element.textContent = String(Math.floor(current));
		}
	}, stepDuration);
}

