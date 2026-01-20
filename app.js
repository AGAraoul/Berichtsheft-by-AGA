document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // --- STATE MANAGEMENT ---
    const state = {
        currentStep: 1,
        selectedGender: null,
        days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'],
        lastInputs: [], 
    };

    // --- DOM ELEMENTS (MAIN APP) ---
    const steps = document.querySelectorAll('.step');
    const maleBtn = document.getElementById('btn-male');
    const femaleBtn = document.getElementById('btn-female');
    const dayInputsGrid = document.getElementById('day-inputs-grid');
    const backToGenderBtn = document.getElementById('back-to-gender-btn');
    const generateBtn = document.getElementById('generate-btn');
    const loadingStatus = document.getElementById('loading-status');
    const reportOutput = document.getElementById('report-output');
    const resetBtn = document.getElementById('reset-btn');
    const errorContainer = document.getElementById('error-container');

    // --- FUNCTIONS (MAIN APP) ---
    const showError = (message) => {
        errorContainer.innerHTML = `<div class="error-message p-2 rounded-md font-semibold">${message}</div>`;
        setTimeout(() => { errorContainer.innerHTML = ''; }, 3000);
    };

    // NEU: Erstellt eine einzelne Eingabezeile (Stichpunkt)
    const createBulletRow = (container, value = '', autoFocus = false) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 mb-2 bullet-row-animation'; // Animation Klasse aus CSS
        
        // Design: Kleiner Punkt vorne
        const bullet = document.createElement('div');
        bullet.className = 'w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0 mt-0.5';
        
        // Input Feld
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.className = 'w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 outline-none py-1 transition-colors text-base text-gray-800 dark:text-gray-100 placeholder-gray-400';
        input.placeholder = 'Tätigkeit eingeben...';
        
        // Event Listener für ENTER und BACKSPACE
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextRow = row.nextElementSibling;
                // Wenn es eine nächste Zeile gibt (und diese ein Input ist), springe dahin
                if (nextRow && nextRow.querySelector('input')) {
                    nextRow.querySelector('input').focus();
                } else {
                    // Sonst: Erstelle neue Zeile
                    createBulletRow(container, '', true); 
                }
            }
            // Backspace löscht leere Zeile (außer es ist die einzige)
            if (e.key === 'Backspace' && input.value === '' && container.querySelectorAll('input').length > 1) {
                e.preventDefault();
                const prevRow = row.previousElementSibling;
                row.remove();
                if (prevRow) {
                    const prevInput = prevRow.querySelector('input');
                    prevInput.focus();
                    // Cursor ans Ende setzen
                    const len = prevInput.value.length;
                    prevInput.setSelectionRange(len, len);
                }
            }
        });

        row.appendChild(bullet);
        row.appendChild(input);
        container.appendChild(row);

        if (autoFocus) input.focus();
    };

    // NEU: Erstellt die Karten mit den Listen-Inputs
    const createDayInputCards = () => {
        if (dayInputsGrid.children.length > 0) return; 
        
        // ÄNDERUNG: Layout angepasst für vertikale Liste (flex-col) und breitere Karten (max-w-5xl)
        // pb-32 sorgt für genug Abstand unten, damit man beim Scrollen nicht gegen den Button stößt
        dayInputsGrid.className = 'flex flex-col gap-6 p-4 w-full max-w-5xl mx-auto pb-32';

        state.days.forEach((day, index) => {
            // Karte Container
            const card = document.createElement('div');
            card.className = 'glass-card p-6 rounded-xl flex flex-col h-full border border-white/20 shadow-sm relative overflow-hidden';
            
            // Header (Wochentag)
            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';
            header.innerHTML = `<label class="font-display font-bold text-xl text-gray-800 dark:text-gray-100">${day}</label>`;
            card.appendChild(header);

            // Container für die Bullet Points
            const inputsContainer = document.createElement('div');
            inputsContainer.className = 'bullets-container flex-grow flex flex-col min-h-[80px]';
            inputsContainer.id = `inputs-container-${index}`;
            
            // Standardmäßig 3 leere Zeilen erzeugen
            for(let i=0; i<3; i++) {
                createBulletRow(inputsContainer);
            }
            card.appendChild(inputsContainer);

            // Plus Button
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'mt-4 flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors font-medium self-start focus:outline-none';
            addBtn.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i> Zeile hinzufügen`;
            addBtn.addEventListener('click', () => createBulletRow(inputsContainer, '', true));
            
            card.appendChild(addBtn);
            dayInputsGrid.appendChild(card);
        });
        
        // Icons neu rendern für die Plus-Buttons
        lucide.createIcons();
    };

    const navigateToStep = (stepNumber) => {
        if (stepNumber === 2) createDayInputCards();
        state.currentStep = stepNumber;
        steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === stepNumber);
        });
    };
    
    async function callGeminiApi(inputs, gender, onProgress = null) {
        const functionUrl = '/.netlify/functions/generate';
        let loadingInterval;

        if (onProgress) {
            // Filtere leere Tage raus für die Ladeanzeige
            const activeDays = inputs.map((inp, i) => inp ? state.days[i] : null).filter(Boolean);
            const loadingMessages = activeDays.map(d => `Formuliere ${d}...`);
            loadingMessages.push("Finalisiere Bericht...");
            let messageIndex = 0;
            
            const updateLoadingText = () => {
                if(messageIndex < loadingMessages.length) {
                    onProgress(loadingMessages[messageIndex]);
                    messageIndex++;
                }
            };
            updateLoadingText();
            loadingInterval = setInterval(updateLoadingText, 2000);
        }
        
        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    inputs: inputs, 
                    gender: gender,
                    days: state.days
                })
            });

            if (onProgress) clearInterval(loadingInterval);

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred.');
            }

            const results = await response.json();
            return results;

        } catch (error) {
            if (onProgress) clearInterval(loadingInterval);
            console.error("Error calling the Netlify Function:", error);
            throw error;
        }
    }
    
    // ANGEPASST: Liest die Inputs jetzt aus den Listenfeldern aus
    async function handleGenerate() {
        // Daten aus den Inputs sammeln und formatieren
        const inputs = state.days.map((_, index) => {
            const container = document.getElementById(`inputs-container-${index}`);
            if (!container) return '';
            
            // Alle Inputs in diesem Container finden
            const rowInputs = Array.from(container.querySelectorAll('input'));
            
            // Werte holen, leere filtern und als Liste formatieren
            // Ergebnis String: "- Tätigkeit A\n- Tätigkeit B"
            const dayText = rowInputs
                .map(input => input.value.trim())
                .filter(val => val !== '')
                .map(val => `- ${val}`) 
                .join('\n');
                
            return dayText;
        });

        // Prüfen, ob ALLES leer ist
        if (inputs.every(dayInput => dayInput === '')) {
             showError('Bitte gebe für mindestens einen Tag eine Tätigkeit ein.'); 
             return;
        }
        
        state.lastInputs = inputs; 
        navigateToStep(3);
        
        try {
            const onProgressUpdate = (message) => { loadingStatus.textContent = message; };
            const generatedReports = await callGeminiApi(inputs, state.selectedGender, onProgressUpdate);
            displayResults(generatedReports, inputs); 
            navigateToStep(4);
        } catch (error) {
            console.error("API call failed:", error);
            showError(`Fehler: ${error.message}`);
            navigateToStep(2);
        }
    };

    function displayResults(reports, originalInputs) {
        reportOutput.innerHTML = '';
        reports.forEach((report, index) => {
            if (report.text) {
                const card = document.createElement('div');
                card.className = 'result-card glass-card relative p-5 rounded-lg';
                card.dataset.dayIndex = index;
                // Speichere den formatierten Input (Liste), damit Regenerate funktioniert
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
                reportOutput.appendChild(card);
            }
        });
        lucide.createIcons();
    };

    function resetApp() {
        state.selectedGender = null;
        state.lastInputs = [];
        maleBtn.classList.remove('active');
        femaleBtn.classList.remove('active');
        
        // Grid komplett leeren, damit es neu aufgebaut wird
        dayInputsGrid.innerHTML = ''; 
        
        navigateToStep(1);
    };
    
    function updateCopyButton(button) {
        const textSpan = button.querySelector('.copy-text');
        if(textSpan) textSpan.textContent = 'Kopiert!';
        button.classList.add('copied');
        setTimeout(() => {
            if(textSpan) textSpan.textContent = 'Kopieren';
            button.classList.remove('copied');
        }, 2000);
    }

    function fallbackCopyText(text, button) {
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

    // --- EVENT LISTENERS (MAIN APP) ---
    maleBtn.addEventListener('click', () => {
        state.selectedGender = 'male';
        maleBtn.classList.add('active');
        femaleBtn.classList.remove('active');
        setTimeout(() => navigateToStep(2), 300);
    });

    femaleBtn.addEventListener('click', () => {
        state.selectedGender = 'female';
        femaleBtn.classList.add('active');
        maleBtn.classList.remove('active');
        setTimeout(() => navigateToStep(2), 300);
    });
    
    backToGenderBtn.addEventListener('click', () => navigateToStep(1));
    generateBtn.addEventListener('click', handleGenerate);
    resetBtn.addEventListener('click', resetApp);
    
    reportOutput.addEventListener('click', async (e) => {
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
            icon.classList.add('animate-spin');

            const card = regenButton.closest('.result-card');
            const dayIndex = parseInt(card.dataset.dayIndex, 10);
            const originalInput = card.dataset.input; // Das ist jetzt der formatierte String
            
            const p = card.querySelector(`#report-text-${dayIndex}`);
            const originalTextHTML = p.innerHTML;
            p.innerHTML = `<span class="flex items-center gap-2 text-sm" style="color: var(--text-secondary);"><span class="loader-small"></span>Wird neu generiert...</span>`;

            try {
                const inputsForApi = Array(state.days.length).fill('');
                inputsForApi[dayIndex] = originalInput;
                
                const result = await callGeminiApi(inputsForApi, state.selectedGender);
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
                icon.classList.remove('animate-spin');
            }
        }
    });

    // --- THEME TOGGLE ---
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        sunIcon.classList.toggle('hidden');
        moonIcon.classList.toggle('hidden');
        let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });

    // --- INITIALIZATION ---
    navigateToStep(1);


    // -----------------------------------------------------------------
    // --- UPDATES MODAL & FEEDBACK SYSTEM ---
    // (Restlicher Code bleibt identisch, wird hier nur der Vollständigkeit halber aufgeführt)
    // -----------------------------------------------------------------
    const updatesTriggerButton = document.getElementById('updates-trigger-button');
    const updatesContainer = document.getElementById('updates-container');
    const closeUpdatesWidget = document.getElementById('close-updates-widget');
    const LATEST_VERSION_SEEN_KEY = 'latestVersionSeen';
    const updateBadge = document.getElementById('update-new-badge');

    const markUpdatesAsSeen = () => {
        const appVersionSpan = document.getElementById('app-version');
        if (!appVersionSpan || !updateBadge) return;
        const currentVersion = appVersionSpan.textContent.trim();
        if (currentVersion) {
            localStorage.setItem(LATEST_VERSION_SEEN_KEY, currentVersion);
        }
        updateBadge.classList.add('hidden');
        updateBadge.classList.remove('pulsing');
    };

    const checkNewUpdates = () => {
        const appVersionSpan = document.getElementById('app-version');
        if (!appVersionSpan || !updateBadge) return;
        const currentVersion = appVersionSpan.textContent.trim();
        if (!currentVersion) return;
        const seenVersion = localStorage.getItem(LATEST_VERSION_SEEN_KEY);
        if (currentVersion !== seenVersion) {
            updateBadge.classList.remove('hidden');
            updateBadge.classList.add('pulsing');
        }
    };

    if (updatesTriggerButton && updatesContainer && closeUpdatesWidget) {
        const openUpdatesModal = () => {
            updatesContainer.classList.add('active');
            updatesContainer.setAttribute('aria-hidden', 'false');
            lucide.createIcons();
            markUpdatesAsSeen();
        }
        const closeUpdatesModal = () => {
            updatesContainer.classList.remove('active');
            updatesContainer.setAttribute('aria-hidden', 'true');
        }
        updatesTriggerButton.addEventListener('click', openUpdatesModal);
        closeUpdatesWidget.addEventListener('click', closeUpdatesModal);
        updatesContainer.addEventListener('click', (e) => {
            if (e.target === updatesContainer) closeUpdatesModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && updatesContainer.classList.contains('active')) closeUpdatesModal();
        });
    }

    // Feedback System
    const feedbackTriggerButton = document.getElementById('feedback-trigger-button');
    const feedbackContainer = document.getElementById('feedback-container'); 
    const feedbackWidget = document.getElementById('feedback-widget');
    const closeWidgetButton = document.getElementById('close-widget-button');
    const viewMain = document.getElementById('view-main');
    const viewFeedbackForm = document.getElementById('view-feedback-form');
    const viewBugForm = document.getElementById('view-bug-form');
    const viewConfirmation = document.getElementById('view-confirmation');
    const actionGiveFeedback = document.getElementById('action-give-feedback');
    const actionReportBug = document.getElementById('action-report-bug');
    const backButtons = document.querySelectorAll('.back-button');
    const feedbackForm = document.getElementById('feedback-form');
    const bugForm = document.getElementById('bug-form');
    const doneButton = document.getElementById('done-button');
    const categoryButtons = document.querySelectorAll('.category-button');

    const openWidget = () => {
        feedbackContainer.classList.add('active');
        feedbackContainer.setAttribute('aria-hidden', 'false');
    }
    const closeWidget = () => {
        feedbackContainer.classList.remove('active'); 
        feedbackContainer.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            showView(viewMain);
            document.querySelectorAll('.file-preview-wrapper').forEach(p => {
                p.innerHTML = '';
                p.classList.add('hidden');
            });
            document.querySelectorAll('.file-drop-zone').forEach(d => d.classList.remove('hidden'));
        }, 300); 
    };
    
    const showView = (viewToShow) => {
        [viewMain, viewFeedbackForm, viewBugForm, viewConfirmation].forEach(v => v.classList.add('hidden'));
        viewToShow.classList.remove('hidden');
         lucide.createIcons();
    };

    if(feedbackTriggerButton) feedbackTriggerButton.addEventListener('click', openWidget);
    if(closeWidgetButton) closeWidgetButton.addEventListener('click', closeWidget);
    if(actionGiveFeedback) actionGiveFeedback.addEventListener('click', () => showView(viewFeedbackForm));
    if(actionReportBug) actionReportBug.addEventListener('click', () => showView(viewBugForm));
    backButtons.forEach(button => button.addEventListener('click', () => showView(viewMain)));
    
    async function handleFormSubmit(event) {
        event.preventDefault(); 
        const form = event.target;
        const data = new FormData(form);
        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                showView(viewConfirmation);
                form.reset();
                const previewWrapper = form.querySelector('.file-preview-wrapper');
                const dropZone = form.querySelector('.file-drop-zone');
                if (previewWrapper && dropZone) {
                     previewWrapper.innerHTML = '';
                     previewWrapper.classList.add('hidden');
                     dropZone.classList.remove('hidden');
                }
            } else {
                console.error('Form submission failed', await response.json());
                alert('Fehler beim Senden des Formulars. Bitte erneut versuchen.');
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Fehler beim Senden des Formulars. Bitte Verbindung prüfen.');
        }
    }

    if(feedbackForm) feedbackForm.addEventListener('submit', handleFormSubmit);
    if(bugForm) bugForm.addEventListener('submit', handleFormSubmit);
    if(doneButton) doneButton.addEventListener('click', closeWidget);
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    const setupUploader = (containerSelector) => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const dropZone = container.querySelector('.file-drop-zone');
        const fileInput = container.querySelector('input[type="file"]');
        const previewWrapper = container.querySelector('.file-preview-wrapper');
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
        });
        dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
        const handleFiles = (files) => {
            const file = files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewWrapper.innerHTML = `
                        <div class="file-preview-container">
                            <img src="${e.target.result}" class="file-preview-img" />
                            <div class="file-remove-btn"><i data-lucide="x" class="w-4 h-4"></i></div>
                        </div>`;
                    lucide.createIcons();
                    previewWrapper.classList.remove('hidden');
                    dropZone.classList.add('hidden');
                    previewWrapper.querySelector('.file-remove-btn').addEventListener('click', () => {
                        fileInput.value = '';
                        previewWrapper.innerHTML = '';
                        previewWrapper.classList.add('hidden');
                        dropZone.classList.remove('hidden');
                    });
                }
                reader.readAsDataURL(file);
            }
        };
    };
    setupUploader('.feedback-file-upload-area');
    setupUploader('.bug-file-upload-area');

    document.addEventListener('click', (event) => {
        if (feedbackWidget && feedbackContainer.classList.contains('active')) {
            const isClickInsideWidget = feedbackWidget.contains(event.target);
            const isClickOnButton = feedbackTriggerButton.contains(event.target);
            if (!isClickInsideWidget && !isClickOnButton) {
               closeWidget();
            }
        }
    });
    
    checkNewUpdates();
});