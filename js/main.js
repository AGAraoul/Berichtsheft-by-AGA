import { state } from './state.js';
import { elements, navigateToStep, handleGenerate, resetApp, fallbackCopyText, updateCopyButton, showError } from './ui.js';
import { setupUpdatesWidget, setupFeedbackWidget } from './features.js';
import { callGeminiApi } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Initialisierung ---
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // --- LIBRARY LOADER ---
    const loadSortable = () => {
        if (document.getElementById('sortable-script')) return;
        const script = document.createElement('script');
        script.id = 'sortable-script';
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js";
        document.head.appendChild(script);
    };
    loadSortable();

    // --- EVENT LISTENERS (MAIN APP) ---
    if (elements.maleBtn) {
        elements.maleBtn.addEventListener('click', () => {
            state.selectedGender = 'male';
            elements.maleBtn.classList.add('active');
            elements.femaleBtn.classList.remove('active');
            setTimeout(() => navigateToStep(2), 300);
        });
    }

    if (elements.femaleBtn) {
        elements.femaleBtn.addEventListener('click', () => {
            state.selectedGender = 'female';
            elements.femaleBtn.classList.add('active');
            elements.maleBtn.classList.remove('active');
            setTimeout(() => navigateToStep(2), 300);
        });
    }

    if (elements.backToGenderBtn) {
        elements.backToGenderBtn.addEventListener('click', () => navigateToStep(1));
    }

    if (elements.generateBtn) {
        elements.generateBtn.addEventListener('click', handleGenerate);
    }

    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetApp);
    }

    if (elements.reportOutput) {
        elements.reportOutput.addEventListener('click', async (e) => {
            const copyButton = e.target.closest('.copy-btn');
            const regenButton = e.target.closest('.regenerate-btn');

            if (copyButton) {
                const textToCopy = copyButton.dataset.copytext;
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        updateCopyButton(copyButton);
                    }).catch(err => {
                        console.error('Modern copy failed:', err);
                        fallbackCopyText(textToCopy, copyButton);
                    });
                } else {
                    fallbackCopyText(textToCopy, copyButton);
                }
            }

            if (regenButton) {
                regenButton.disabled = true;
                const icon = regenButton.querySelector('i');
                if (icon) icon.classList.add('animate-spin');

                const card = regenButton.closest('.result-card');
                const dayIndex = parseInt(card.dataset.dayIndex, 10);
                const originalInput = card.dataset.input;

                const p = card.querySelector(`#report-text-${dayIndex}`);
                const originalTextHTML = p.innerHTML;
                p.innerHTML = `<span class="flex items-center gap-2 text-sm" style="color: var(--text-secondary);"><span class="loader-small"></span>Wird neu generiert...</span>`;

                try {
                    const inputsForApi = Array(state.days.length).fill('');
                    inputsForApi[dayIndex] = originalInput;

                    const result = await callGeminiApi(inputsForApi, state.selectedGender, state.days);
                    const newReport = result[dayIndex];

                    if (newReport && newReport.text) {
                        p.innerHTML = newReport.text;
                        const newSanitizedText = newReport.text.replace(/"/g, '&quot;');
                        card.querySelector('.copy-btn').dataset.copytext = newSanitizedText;
                    } else {
                        throw new Error('Kein gültiger Text von der API erhalten.');
                    }
                } catch (error) {
                    console.error("Regeneration failed:", error);
                    p.innerHTML = originalTextHTML;
                    showError("Regenerierung fehlgeschlagen.");
                } finally {
                    regenButton.disabled = false;
                    if (icon) icon.classList.remove('animate-spin');
                }
            }
        });
    }

    // --- THEME TOGGLE ---
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (elements.sunIcon) elements.sunIcon.classList.add('hidden');
        if (elements.moonIcon) elements.moonIcon.classList.remove('hidden');
    }

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (elements.sunIcon) elements.sunIcon.classList.toggle('hidden');
            if (elements.moonIcon) elements.moonIcon.classList.toggle('hidden');
            let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        });
    }

    // Start App
    navigateToStep(1);

    // Init Features
    setupUpdatesWidget();
    setupFeedbackWidget();
});
