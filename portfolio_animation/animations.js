/* -------------------------------------------------------------------------- */
/*                               ANIMATION LOGIC                              */
/* -------------------------------------------------------------------------- */

const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.remove('animate-hidden');
            entry.target.classList.add('animate-visible');

            if (entry.target.classList.contains('skill-category')) {
                animateSkills(entry.target);
            }

            observer.unobserve(entry.target);
        }
    });
};

const observer = new IntersectionObserver(observerCallback, observerOptions);

window.initAnimations = function () {
    const heroElements = document.querySelectorAll('.animate-text, .animate-up');
    heroElements.forEach((el, index) => {
        el.classList.add('animate-hidden');
        el.style.transitionDelay = `${index * 100}ms`;
        observer.observe(el);
    });

    window.updateObservers();

    // Init Advanced Motion
    initCursor();
    initHeroTilt();
};

window.updateObservers = function () {
    const elements = document.querySelectorAll('.animate-hidden');
    elements.forEach(el => observer.observe(el));
};

function animateSkills(categoryElement) {
    const bars = categoryElement.querySelectorAll('.skill-bar-fill');
    const percentages = categoryElement.querySelectorAll('.skill-percentage');

    bars.forEach((bar, index) => {
        const targetWidth = bar.getAttribute('data-target');
        const targetNumber = parseInt(targetWidth); // Extract number
        const percentageText = percentages[index];

        // Staggered Delay
        setTimeout(() => {
            // 1. Animate Width
            bar.style.width = targetWidth;

            // 2. Animate Number Counter
            animateCounter(percentageText, targetNumber, 1500); // Duration matches CSS transition

        }, index * 150); // 150ms delay between each bar
    });
}

function animateCounter(element, target, duration) {
    let startTimestamp = null;
    const start = 0;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Ease out expo for number to match bar physics
        // 1 - Math.pow(2, -10 * progress) is standard easeOutExpo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const current = Math.floor(easeProgress * (target - start) + start);
        element.textContent = current + "%";

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = target + "%"; // Ensure exact final value
        }
    };

    window.requestAnimationFrame(step);
}

// Navbar Scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

/* -------------------------------------------------------------------------- */
/*                                CUSTOM CURSOR                               */
/* -------------------------------------------------------------------------- */
function initCursor() {
    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');

    // Safety check for mobile
    if (!dot || !outline || window.innerWidth < 1000) return;

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        // Dot follows instantly
        dot.style.left = `${posX}px`;
        dot.style.top = `${posY}px`;

        // Outline follows with slight delay (animation in CSS transition handles smooth)
        // We use animate() for smoother trailing if preferred, or just set props
        outline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    // Add interactions
    const interactiveElements = document.querySelectorAll('a, button, .project-card, input, textarea');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
    });
}

/* -------------------------------------------------------------------------- */
/*                               3D TILT EFFECT                               */
/* -------------------------------------------------------------------------- */
function initHeroTilt() {
    const hero = document.getElementById('hero');
    const tiltContainer = document.querySelector('.hero-image-tilt');
    const profileImg = document.querySelector('.profile-img');

    if (!hero || !tiltContainer || window.innerWidth < 1000) return;

    hero.addEventListener('mousemove', (e) => {
        const { offsetWidth: width, offsetHeight: height } = hero;
        const { clientX: x, clientY: y } = e;

        // Calculate center relative to viewport/closest parent
        // For simplicity, using window center or element center
        // Let's use simple generic tilt based on mouse position in section
        const xVal = (x / width - 0.5) * 20; // Range -10 to 10 deg
        const yVal = (y / height - 0.5) * -20; // Invert Y

        tiltContainer.style.transform = `perspective(1000px) rotateY(${xVal}deg) rotateX(${yVal}deg)`;

        // Parallax for image inside
        if (profileImg) {
            profileImg.style.transform = `translateZ(30px) translateX(${xVal * -0.5}px) translateY(${yVal * -0.5}px)`;
        }
    });

    hero.addEventListener('mouseleave', () => {
        tiltContainer.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
        if (profileImg) {
            profileImg.style.transform = `translateZ(20px)`;
        }
    });
}
