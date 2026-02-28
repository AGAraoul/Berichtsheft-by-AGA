import { state } from './state.js';
import { callGeminiApi } from './api.js';

// --- DOM ELEMENTS ---
export const elements = {
    steps: document.querySelectorAll('.step'),
    maleBtn: document.getElementById('btn-male'),
    femaleBtn: document.getElementById('btn-female'),
    dayInputsGrid: document.getElementById('day-inputs-grid'),
    backToGenderBtn: document.getElementById('back-to-gender-btn'),
    generateBtn: document.getElementById('generate-btn'),
    loadingStatus: document.getElementById('loading-status'),
    reportOutput: document.getElementById('report-output'),
    resetBtn: document.getElementById('reset-btn'),
    errorContainer: document.getElementById('error-container'),
    themeToggle: document.getElementById('theme-toggle'),
    sunIcon: document.getElementById('theme-icon-sun'),
    moonIcon: document.getElementById('theme-icon-moon'),
};

export const showError = (message) => {
    elements.errorContainer.innerHTML = `<div class="error-message p-2 rounded-md font-semibold">${message}</div>`;
    setTimeout(() => { elements.errorContainer.innerHTML = ''; }, 3000);
};

export const navigateToStep = (stepNumber) => {
    if (stepNumber === 2) createDayInputCards();
    state.currentStep = stepNumber;
    elements.steps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === stepNumber);
    });
};

export const createBulletRow = (container, value = '', autoFocus = false) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 mb-2 bullet-row-animation group';

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle cursor-grab text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0';
    dragHandle.innerHTML = `<i data-lucide="grip-vertical" class="w-4 h-4"></i>`;

    const bullet = document.createElement('div');
    bullet.className = 'w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0 mt-0.5';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 outline-none py-1 transition-colors text-base text-gray-800 dark:text-gray-100 placeholder-gray-400';
    input.placeholder = 'Tätigkeit eingeben...';

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextRow = row.nextElementSibling;
            if (nextRow && nextRow.querySelector('input')) {
                nextRow.querySelector('input').focus();
            } else {
                createBulletRow(container, '', true);
            }
        }
        if (e.key === 'Backspace' && input.value === '' && container.querySelectorAll('input').length > 1) {
            e.preventDefault();
            const prevRow = row.previousElementSibling;
            row.remove();
            if (prevRow) {
                const prevInput = prevRow.querySelector('input');
                prevInput.focus();
                const len = prevInput.value.length;
                prevInput.setSelectionRange(len, len);
            }
        }
    });

    row.appendChild(dragHandle);
    row.appendChild(bullet);
    row.appendChild(input);
    container.appendChild(row);

    if (window.lucide) {
        window.lucide.createIcons({ root: row });
    }

    if (autoFocus) input.focus();
};

export const createDayInputCards = () => {
    if (elements.dayInputsGrid.children.length > 0) return;

    elements.dayInputsGrid.className = 'flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto pb-32';

    state.days.forEach((day, index) => {
        const card = document.createElement('div');
        card.className = 'glass-card p-6 rounded-xl flex flex-col h-full border border-white/20 shadow-sm relative overflow-hidden';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-4';
        header.innerHTML = `<label class="font-display font-bold text-xl text-gray-800 dark:text-gray-100">${day}</label>`;
        card.appendChild(header);

        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'bullets-container flex-grow flex flex-col min-h-[80px]';
        inputsContainer.id = `inputs-container-${index}`;

        for (let i = 0; i < 3; i++) {
            createBulletRow(inputsContainer);
        }
        card.appendChild(inputsContainer);

        const initSortable = () => {
            if (typeof Sortable !== 'undefined') {
                new Sortable(inputsContainer, {
                    group: 'shared',
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'sortable-ghost',
                    dragClass: 'sortable-drag',
                });
            } else {
                setTimeout(initSortable, 100);
            }
        };
        initSortable();

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'mt-4 flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors font-medium self-start focus:outline-none';
        addBtn.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i> Zeile hinzufügen`;
        addBtn.addEventListener('click', () => createBulletRow(inputsContainer, '', true));

        card.appendChild(addBtn);
        elements.dayInputsGrid.appendChild(card);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

export const displayResults = (reports, originalInputs) => {
    elements.reportOutput.innerHTML = '';
    reports.forEach((report, index) => {
        if (report.text) {
            const card = document.createElement('div');
            card.className = 'result-card glass-card relative p-5 rounded-lg';
            card.dataset.dayIndex = index;
            card.dataset.input = originalInputs[index] || '';
            card.style.animationDelay = `${index * 100}ms`;

            const sanitizedText = report.text.replace(/"/g, '&quot;');

            card.innerHTML = `
                <h3 class="font-display text-xl font-bold mb-2 text-[var(--accent-color)]">${report.day}</h3>
                <p id="report-text-${index}" class="leading-relaxed pr-24 text-gray-700 dark:text-gray-300">${report.text}</p>
                <div class="absolute top-4 right-4 flex items-center gap-2">
                    <button title="Neu generieren" class="regenerate-btn p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                    <button class="copy-btn text-sm font-semibold py-2 px-3 rounded-md flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-copytext="${sanitizedText}">
                       <i data-lucide="copy" style="width:16px; height: 16px;"></i> <span class="copy-text">Kopieren</span>
                    </button>
                </div>
            `;
            elements.reportOutput.appendChild(card);
        }
    });
    if (window.lucide) {
        window.lucide.createIcons();
    }
};

export const resetApp = () => {
    state.selectedGender = null;
    state.lastInputs = [];
    elements.maleBtn.classList.remove('active');
    elements.femaleBtn.classList.remove('active');
    elements.dayInputsGrid.innerHTML = '';
    navigateToStep(1);
};

export const updateCopyButton = (button) => {
    const textSpan = button.querySelector('.copy-text');
    if (textSpan) textSpan.textContent = 'Kopiert!';
    button.classList.add('copied');
    setTimeout(() => {
        if (textSpan) textSpan.textContent = 'Kopieren';
        button.classList.remove('copied');
    }, 2000);
}

export const fallbackCopyText = (text, button) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        updateCopyButton(button);
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
};

export const handleGenerate = async () => {
    const inputs = state.days.map((_, index) => {
        const container = document.getElementById(`inputs-container-${index}`);
        if (!container) return '';

        const rowInputs = Array.from(container.querySelectorAll('input'));

        const dayText = rowInputs
            .map(input => input.value.trim())
            .filter(val => val !== '')
            .map(val => `- ${val}`)
            .join('\n');

        return dayText;
    });

    if (inputs.every(dayInput => dayInput === '')) {
        showError('Bitte gebe für mindestens einen Tag eine Tätigkeit ein.');
        return;
    }

    state.lastInputs = inputs;
    navigateToStep(3);

    try {
        const onProgressUpdate = (message) => { elements.loadingStatus.textContent = message; };
        const generatedReports = await callGeminiApi(inputs, state.selectedGender, state.days, onProgressUpdate);
        displayResults(generatedReports, inputs);
        navigateToStep(4);
    } catch (error) {
        console.error("API call failed:", error);
        showError(`Fehler: ${error.message}`);
        navigateToStep(2);
    }
};
