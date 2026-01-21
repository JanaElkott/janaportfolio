/* 
 * Admin Dashboard Logic
 * Handles data loading, form generation, and persistence.
 */

let fullData = null; // Holds the entire JSON object
let currentTab = 'hero';
let currentLang = 'en';

// Define Schemas for complex objects to allow "Adding New"
const SCHEMAS = {
    experience: {
        role: "New Role",
        company: "Company Name",
        period: "2024 - Present",
        location: "Location",
        description: "Description of the role..."
    },
    education: {
        degree: "Degree Name",
        school: "School Name",
        period: "2020 - 2024",
        description: "GPA / Major"
    },
    projects: {
        id: Date.now(),
        title: "New Project",
        category: "Web Dev",
        image: "https://placehold.co/800x600",
        description: "Project details..."
    },
    services: {
        title: "Service Name",
        description: "Service Description..."
    },
    skills: {
        items: [{ name: "New Skill", level: 50 }] // Category structure handled differently
    }
};

document.addEventListener('DOMContentLoaded', initAdmin);

function initAdmin() {
    // Check Auth
    if (sessionStorage.getItem('adminAuth') === 'true') {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('admin-app').classList.remove('hidden');
        loadData();
    }
}

function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123') {
        sessionStorage.setItem('adminAuth', 'true');
        initAdmin();
    } else {
        document.getElementById('login-error').innerText = "Incorrect Password!";
    }
}

async function loadData() {
    try {
        // ALWAYS Fetch default first to get structure
        const response = await fetch('data.json');
        const defaultData = await response.json();

        fullData = defaultData;

        // Overlay LocalStorage if exists
        const localData = localStorage.getItem('portfolioData');
        if (localData) {
            const parsedLocal = JSON.parse(localData);
            // Simple Merge: We want to keep local edits but also get new fields from data.json
            // Since we can't easily deep merge safely without library, 
            // We will trust LocalStorage BUT logic:
            // If LocalStorage 'meta' is missing 'phone', we should probably use default's.
            // For now, let's just use parsedLocal because 'Reset' is the clean way.
            // But to help THIS user instantly:
            if (!parsedLocal.meta.phone) {
                parsedLocal.meta.phone = defaultData.meta.phone || "";
                parsedLocal.meta.whatsapp = defaultData.meta.whatsapp || "";
                parsedLocal.meta.linkedin = defaultData.meta.linkedin || "";
            }

            fullData = parsedLocal;
            console.log('Loaded from LocalStorage (with patch)');
        } else {
            console.log('Loaded from data.json');
        }
        renderCurrentTab();
    } catch (e) {
        alert("Error loading data: " + e.message);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    currentTab = tabName;
    document.getElementById('current-section-title').innerText = tabName.charAt(0).toUpperCase() + tabName.slice(1);
    renderCurrentTab();
}

function renderCurrentTab() {
    if (!fullData) return;

    currentLang = document.getElementById('lang-select').value;
    const container = document.getElementById('editor-area');
    container.innerHTML = ''; // Clear

    // Special Case: Meta (Global Settings)
    if (currentTab === 'meta') {
        document.getElementById('current-section-title').innerText = "Global Contact Info";
        // Meta is at root, shared across languages usually, or we can treat keys as simple fields
        generateSimpleFields(fullData.meta, container, ['meta']);
        return;
    }

    const dataSection = fullData[currentLang][currentTab];

    if (!dataSection) {
        container.innerHTML = '<p>No data for this section.</p>';
        return;
    }

    // Generate Form Fields
    // If it's an object with simple keys (nav, hero, about)
    if (currentTab === 'hero' || currentTab === 'about' || currentTab === 'contact' || currentTab === 'footer') {
        generateSimpleFields(dataSection, container, [currentLang, currentTab]);
    }

    // Arrays (Experience, Education, Projects, Services)
    if (currentTab === 'experience' || currentTab === 'education' || currentTab === 'projects' || currentTab === 'services') {
        // Usually these have { title: "", items: [] }
        generateSimpleFields({ title: dataSection.title }, container, [currentLang, currentTab]); // Title field
        generateArrayManager(dataSection.items, container, [currentLang, currentTab, 'items'], currentTab);
    }

    // Special Case: Skills (Categories -> Items)
    if (currentTab === 'skills') {
        generateSkillsEditor(dataSection, container);
    }
}

// ------------------------------------------------------------------
// Form Generation Helpers
// ------------------------------------------------------------------

function generateSimpleFields(obj, container, path) {
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        const fieldPath = [...path, key];

        if (typeof val === 'string' || typeof val === 'number') {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.className = 'form-label';
            label.innerText = key.replace(/_/g, ' ').toUpperCase();

            let input;
            if (key === 'description' || key.includes('text')) {
                input = document.createElement('textarea');
                input.className = 'form-textarea';
                input.value = val;
                input.oninput = (e) => updateData(fieldPath, e.target.value);
            } else if (key.includes('image') || key.includes('img') || key.includes('profile')) {
                // Image Handling Container
                const imgContainer = document.createElement('div');
                imgContainer.style.display = 'flex';
                imgContainer.style.flexDirection = 'column';
                imgContainer.style.gap = '10px';

                // 1. Text Input (for URL or Base64)
                input = document.createElement('input');
                input.className = 'form-input';
                input.type = 'text';
                input.value = val;
                input.placeholder = "Image URL or Base64...";
                input.oninput = (e) => updateData(fieldPath, e.target.value);

                // 2. File Upload Button
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.color = '#fff';

                // Preview Image
                const preview = document.createElement('img');
                preview.src = val;
                preview.style.height = '80px';
                preview.style.width = 'auto';
                preview.style.borderRadius = '4px';
                preview.style.objectFit = 'cover';
                preview.style.border = '1px solid #444';
                if (!val) preview.style.display = 'none';

                // File Change Handler (Convert to Base64)
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Restriction: Warn if > 2MB (JSON bloat)
                    if (file.size > 2 * 1024 * 1024) {
                        alert("Warning: Large images will slow down your site. Try to use images under 1MB.");
                    }

                    const reader = new FileReader();
                    reader.onload = function (evt) {
                        const base64 = evt.target.result;
                        input.value = base64; // Update text input
                        preview.src = base64;
                        preview.style.display = 'block';
                        updateData(fieldPath, base64); // Update Data State
                    };
                    reader.readAsDataURL(file);
                };

                imgContainer.appendChild(preview);
                imgContainer.appendChild(input);
                imgContainer.appendChild(fileInput);

                // Append special container instead of direct input
                group.appendChild(label);
                group.appendChild(imgContainer);
                container.appendChild(group);
                return; // Skip default append
            } else {
                input = document.createElement('input');
                input.className = 'form-input';
                input.type = 'text';
                input.value = val;
                input.oninput = (e) => updateData(fieldPath, e.target.value);
            }

            group.appendChild(label);
            group.appendChild(input);
            container.appendChild(group);
        }
    });
}

function generateArrayManager(array, container, path, type) {
    const title = document.createElement('h4');
    title.className = 'section-subtitle';
    title.innerText = type.toUpperCase() + ' ITEMS';
    container.appendChild(title);

    const listDiv = document.createElement('div');
    listDiv.className = 'array-list';

    array.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'array-item-card';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
        removeBtn.onclick = () => removeItem(path, index);
        card.appendChild(removeBtn);

        generateSimpleFields(item, card, [...path, index]);
        listDiv.appendChild(card);
    });

    container.appendChild(listDiv);

    // Add Button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerText = `+ Add New ${type} Item`;
    addBtn.onclick = () => addItem(path, type);
    container.appendChild(addBtn);
}


function generateSkillsEditor(dataSection, container) {
    // Title
    generateSimpleFields({ title: dataSection.title }, container, [currentLang, 'skills']);

    const categories = dataSection.categories;
    const path = [currentLang, 'skills', 'categories'];

    categories.forEach((cat, catIndex) => {
        const catContainer = document.createElement('div');
        catContainer.style.background = '#222';
        catContainer.style.padding = '20px';
        catContainer.style.borderRadius = '8px';
        catContainer.style.marginBottom = '20px';
        catContainer.style.border = '1px solid #333';

        // Category Name Edit
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        nameGroup.innerHTML = `<label class="form-label">CATEGORY NAME</label>`;
        const nameInput = document.createElement('input');
        nameInput.className = 'form-input';
        nameInput.value = cat.name;
        nameInput.oninput = (e) => updateData([...path, catIndex, 'name'], e.target.value);
        nameGroup.appendChild(nameInput);
        catContainer.appendChild(nameGroup);

        // Items Loop
        cat.items.forEach((item, itemIndex) => {
            const row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '2fr 1fr';
            row.style.gap = '10px';
            row.style.marginBottom = '10px';

            const iName = document.createElement('input');
            iName.className = 'form-input';
            iName.value = item.name;
            iName.oninput = (e) => updateData([...path, catIndex, 'items', itemIndex, 'name'], e.target.value);

            const iLevel = document.createElement('input');
            iLevel.className = 'form-input';
            iLevel.type = 'number';
            iLevel.value = item.level;
            iLevel.oninput = (e) => updateData([...path, catIndex, 'items', itemIndex, 'level'], parseInt(e.target.value));

            row.appendChild(iName);
            row.appendChild(iLevel);
            catContainer.appendChild(row);
        });

        container.appendChild(catContainer);
    });
}

// ------------------------------------------------------------------
// Data Manipulation
// ------------------------------------------------------------------

function updateData(path, value) {
    // Traverse object by path array reference
    let obj = fullData;
    for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = value;

    // Auto-save to temp (optional, maybe just on button click)
    // console.log('Updated:', path, value);
}

function addItem(path, type) {
    let arr = fullData;
    for (let i = 0; i < path.length; i++) {
        arr = arr[path[i]];
    }

    // Clone schema
    const newItem = JSON.parse(JSON.stringify(SCHEMAS[type] || {}));
    arr.push(newItem);
    renderCurrentTab();
}

function removeItem(path, index) {
    if (!confirm('Delete this item?')) return;

    let arr = fullData;
    // Path points to the array itself
    for (let i = 0; i < path.length; i++) {
        arr = arr[path[i]];
    }

    arr.splice(index, 1);
    renderCurrentTab();
}

// ------------------------------------------------------------------
// Persistence
// ------------------------------------------------------------------

function saveToLocal() {
    localStorage.setItem('portfolioData', JSON.stringify(fullData));

    // Notify Main Site
    const channel = new BroadcastChannel('portfolio_updates');
    channel.postMessage('update');

    // Customized Alert
    const btn = document.querySelector('.save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<ion-icon name="checkmark-circle"></ion-icon> Saved!';
    btn.style.background = '#10b981'; // Green

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
    }, 2000);
}

function downloadJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function resetData() {
    if (confirm("Reset all changes? This will clear LocalStorage and revert to the original file.")) {
        localStorage.removeItem('portfolioData');
        location.reload();
    }
}
