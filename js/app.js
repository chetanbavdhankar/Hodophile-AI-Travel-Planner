/* ═══════════════════════════════════════════════════════════════
   HODOPHILE — Main Application
   Initialization, particles, scroll effects, counters
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // ─── Initialize Engine & UI ───
    const engine = new HodophileEngine();
    const ui = new HodophileUI(engine);

    // ─── Navigation Scroll Effect ───
    const nav = document.getElementById('main-nav');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        if (scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollY = scrollY;
    });

    // ─── Active Nav Link ───
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    const updateActiveNav = () => {
        const scrollY = window.scrollY + 100;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.dataset.section === id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', updateActiveNav);

    // ─── Counter Animation ───
    const animateCounters = () => {
        const counters = document.querySelectorAll('[data-count]');

        counters.forEach(counter => {
            const target = parseInt(counter.dataset.count);
            const duration = 2000;
            const startTime = performance.now();

            const step = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(eased * target);

                counter.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            };

            requestAnimationFrame(step);
        });
    };

    // Trigger counter animation when hero is visible
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                heroObserver.disconnect();
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) heroObserver.observe(heroStats);

    // ─── Particle System ───
    const particleField = document.getElementById('particle-field');

    if (particleField) {
        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const size = Math.random() * 3 + 1;
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            const endX = startX + (Math.random() - 0.5) * 200;
            const endY = startY - Math.random() * 300 - 100;
            const duration = Math.random() * 15 + 10;
            const delay = Math.random() * 10;
            const opacity = Math.random() * 0.4 + 0.1;

            const colors = [
                'rgba(99, 102, 241, 0.4)',
                'rgba(6, 182, 212, 0.3)',
                'rgba(245, 158, 11, 0.2)',
                'rgba(16, 185, 129, 0.3)'
            ];

            particle.style.cssText = `
                --size: ${size}px;
                --start-x: ${startX}px;
                --start-y: ${startY}px;
                --end-x: ${endX}px;
                --end-y: ${endY}px;
                --duration: ${duration}s;
                --delay: ${delay}s;
                --max-opacity: ${opacity};
                --color: ${colors[Math.floor(Math.random() * colors.length)]};
                left: 0;
                top: 0;
            `;

            particleField.appendChild(particle);

            // Remove and recreate after animation ends
            setTimeout(() => {
                particle.remove();
                createParticle();
            }, (duration + delay) * 1000);
        };

        // Create initial particles
        for (let i = 0; i < 30; i++) {
            setTimeout(createParticle, Math.random() * 5000);
        }
    }

    // ─── Scroll Reveal ───
    const revealElements = document.querySelectorAll('.agent-card, .about-card');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.animation = `fadeInUp 0.6s ease-out forwards`;
                    entry.target.style.opacity = '1';
                }, i * 100);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
        el.style.opacity = '0';
        revealObserver.observe(el);
    });

    // ─── Smooth Scroll for Nav Links ───
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ─── Brand Click → Scroll to Top ───
    document.getElementById('nav-brand').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ─── Console Branding ───
    console.log('%c🧭 Hodophile', 'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
    console.log('%cMulti-Origin Travel Optimization Engine', 'font-size: 12px; color: #9ca3af;');
    console.log('%cFinding the mathematical minimum for group travel.', 'font-size: 11px; color: #6b7280;');
});
