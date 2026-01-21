/* -------------------------------------------------------------------------- */
/*                               APPLICATION LOGIC                            */
/* -------------------------------------------------------------------------- */

// State
const state = {
    lang: localStorage.getItem('portfolio_lang') || 'en',
    theme: localStorage.getItem('portfolio_theme') || 'dark', // Default to dark as requested
    data: null
};

// Utils
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Initialization
// Initialization
const channel = new BroadcastChannel('portfolio_updates');

// Listen for updates from Admin
channel.onmessage = (event) => {
    if (event.data === 'update') {
        console.log('Received update signal. Reloading data...');
        loadData();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Force Scroll to Top
    if (history.scrollRestoration) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    applyTheme(state.theme);
    applyLang(state.lang);
    await loadData();

    // Signal Animations (Initial Load)
    setTimeout(() => {
        document.body.classList.add('loaded');
        if (window.initAnimations) window.initAnimations();
    }, 500);
});

async function loadData() {
    try {
        // ALWAYS Fetch default first to get structure and new keys
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const defaultData = await response.json();

        // Check LocalStorage for Admin edits
        const localData = localStorage.getItem('portfolioData');

        if (localData) {
            console.log('DEV MODE: Found Local Admin Data - Merging...');
            const parsedLocal = JSON.parse(localData);

            // INTELLIGENT MERGE:
            // We want to preserve user edits (from LocalStorage)
            // But ensure new schema keys (from data.json) exist.

            // 1. Start with Default Data (contains all new keys)
            state.data = { ...defaultData };

            // 2. Overlay Local Data properties
            // We iterate keys to ensure we don't just overwrite the whole object if structure changed slightly
            // But for now, a shallow merge of top-level keys + meta deep merge is enough.

            state.data = { ...defaultData, ...parsedLocal };

            // 3. Deep Merge Meta specifically (Crucial for Phone/Whatsapp)
            if (defaultData.meta && parsedLocal.meta) {
                state.data.meta = { ...defaultData.meta, ...parsedLocal.meta };
            }

            // Visual Indicator
            // Visual Indicator Removed as per user request
            // let badge = document.getElementById('dev-badge'); ...
        } else {
            // Production: Use Default
            state.data = defaultData;
            console.log('Using Default Data');
            const badge = document.getElementById('dev-badge');
            if (badge) badge.remove();
        }

        // Render
        renderContent();
        setupEventListeners();

    } catch (error) {
        console.error('Failed to load data:', error);
        $('#loader').innerHTML = '<p style="text-align:center; color:red; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);">Failed to load content. Ensure you are running on a local server (Live Server).</p>';
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio_theme', theme);

    // Update button icon
    const icon = theme === 'dark' ? '☀' : '☾';
    const btn = $('#theme-toggle .theme-icon');
    if (btn) btn.textContent = icon;
}

function applyLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr'); // Helper for CSS
    localStorage.setItem('portfolio_lang', lang);

    const btn = $('#lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? 'AR' : 'EN';

    // If data is loaded, re-render text
    if (state.data) {
        renderContent();
    }
}

function setupEventListeners() {
    // Theme Toggle
    $('#theme-toggle').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(state.theme);
    });

    // Lang Toggle
    $('#lang-toggle').addEventListener('click', () => {
        state.lang = state.lang === 'en' ? 'ar' : 'en';
        applyLang(state.lang);
    });

    // Mobile Menu
    $('#mobile-menu-btn').addEventListener('click', () => {
        $('#mobile-menu').classList.toggle('open');
        $('#mobile-menu').classList.toggle('hidden');
    });

    // Mobile Menu Links - close on click
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            $('#mobile-menu').classList.remove('open');
            $('#mobile-menu').classList.add('hidden');
        });
    });

    // Modal Close
    $('.modal-close').addEventListener('click', closeModal);
    $('.modal-backdrop').addEventListener('click', closeModal);

    // Global: Prevent default jump for empty links or '#'
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href') === '#') {
            e.preventDefault();
            console.log("Prevented jump for empty link");
        }
    });
}

function renderContent() {
    const langData = state.data[state.lang];
    if (!langData) return;

    // 1. Text Replacements (data-key)
    $$('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        const value = getNestedValue(langData, key);
        if (value) el.textContent = value;
    });

    // 1.5 Image Replacements
    if (langData.hero.profile_image) {
        const img = $('#hero-profile-img');
        if (img) img.src = langData.hero.profile_image;
    }

    // 2. Complex Components
    renderStats(langData.about.stats);
    renderExperience(langData.experience.items);
    renderEducation(langData.education.items);
    renderSkills(langData.skills.categories);
    renderProjects(langData.projects.items);
    renderServices(langData.services.items);
    renderFooterLinks();

    // Re-trigger global observer for new elements
    if (window.updateObservers) window.updateObservers();
}

// Helper for dot notation access (hero.title)
function getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
}

/* -------------------------------------------------------------------------- */
/*                              RENDER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

function renderStats(stats) {
    const container = $('.about-stats');
    container.innerHTML = stats.map((stat, index) => `
        <div class="stat-item animate-hidden delay-${(index + 1) * 100}">
            <span class="stat-value">${stat.value}</span>
            <span class="stat-label">${stat.label}</span>
        </div>
    `).join('');
}

function renderExperience(items) {
    const container = $('#experience-timeline');
    container.innerHTML = items.map((item, index) => `
        <div class="timeline-item animate-hidden delay-${(index + 1) * 100}">
            <span class="timeline-date">${item.period}</span>
            <div class="timeline-content">
                <h3>${item.role}</h3>
                <div class="timeline-company">${item.company}</div>
                <span class="timeline-location">${item.location}</span>
                <p class="timeline-desc">${item.description}</p>
            </div>
        </div>
    `).join('');
}

function renderEducation(items) {
    const container = $('#education-grid');
    if (!container) return;
    container.innerHTML = items.map((item, index) => `
        <div class="education-card animate-hidden delay-${(index + 1) * 100}">
            <h3 class="edu-degree">${item.degree}</h3>
            <div class="edu-school">${item.school}</div>
            <div class="edu-meta">${item.period}</div>
            <div class="edu-meta">${item.description}</div>
        </div>
    `).join('');
}

function renderSkills(categories) {
    const container = $('#skills-container');
    container.innerHTML = categories.map((cat, catIndex) => `
        <div class="skill-category animate-hidden delay-${catIndex * 100}">
            <h3>${cat.name}</h3>
            ${cat.items.map(skill => `
                <div class="skill-item">
                    <div class="skill-info">
                        <span>${skill.name}</span>
                        <span class="skill-percentage">0%</span>
                    </div>
                    <div class="skill-bar-bg">
                        <div class="skill-bar-fill" style="width: 0%" data-target="${skill.level}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function renderProjects(projects) {
    const container = $('#projects-grid');
    container.innerHTML = projects.map((proj, index) => `
        <div class="project-card animate-hidden delay-${(index % 3) * 100}" onclick="openModal(${proj.id})">
            <div class="project-image-wrapper">
                <img src="${proj.image}" alt="${proj.title}" class="project-image">
            </div>
            <div class="project-info">
                <span class="project-category">${proj.category}</span>
                <h3 class="project-title">${proj.title}</h3>
            </div>
        </div>
    `).join('');
}

function renderServices(services) {
    const container = $('#services-grid');
    container.innerHTML = services.map((service, index) => `
        <div class="service-card animate-hidden delay-${index * 100}">
            <h3>${service.title}</h3>
            <p>${service.description}</p>
        </div>
    `).join('');
}

function renderFooterLinks() {
    // New Logic: Update hrefs for existing icons based on Meta
    const meta = state.data.meta;
    if (!meta) return;

    setHref('link-linkedin', meta.linkedin);
    setHref('link-whatsapp', meta.whatsapp);
    setHref('link-email', 'mailto:' + meta.email);
    setHref('link-phone', 'tel:' + meta.phone);

    // Also update contact section links
    renderContactLinks();
}

function renderContactLinks() {
    const meta = state.data.meta;
    if (!meta) return;

    setHref('contact-linkedin', meta.linkedin);
    setHref('contact-whatsapp', meta.whatsapp);
    setHref('contact-phone', 'tel:' + meta.phone);

    // Contact Button
    const btn = document.getElementById('contact-btn');
    if (btn && meta.email) {
        btn.href = 'mailto:' + meta.email;
    }
}

function setHref(id, url) {
    const el = document.getElementById(id);
    if (el) {
        // Robust check: Ensure url is a string and not just "undefined" text or empty
        const validUrl = (url && typeof url === 'string') ? url.trim() : '';

        // Show if valid (allow '#' for placeholder visibility as requested)
        if (validUrl.length > 0 && validUrl !== 'null') {
            el.href = validUrl;
            // Use inline-flex to center ion-icon properly
            el.style.display = 'inline-flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        } else {
            el.style.display = 'none';
        }
    }
}

/* -------------------------------------------------------------------------- */
/*                                MODAL LOGIC                                 */
/* -------------------------------------------------------------------------- */
window.openModal = function (id) {
    const project = state.data[state.lang].projects.items.find(p => p.id === id);
    if (!project) return;

    const modal = $('#project-modal');
    modal.querySelector('.modal-image').src = project.image;
    modal.querySelector('.modal-title').textContent = project.title;
    modal.querySelector('.modal-category').textContent = project.category;
    modal.querySelector('.modal-description').textContent = project.description;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = $('#project-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ESC to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
