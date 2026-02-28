export const setupUpdatesWidget = () => {
    const updatesTriggerButton = document.getElementById('updates-trigger-button');
    const updatesContainer = document.getElementById('updates-container');
    const closeUpdatesWidget = document.getElementById('close-updates-widget');
    const updateBadge = document.getElementById('update-new-badge');
    const CURRENT_APP_VERSION = 'v4.1';

    if (updatesTriggerButton && updatesContainer) {
        const lastSeenVersion = localStorage.getItem('lastSeenUpdateVersion');
        if (updateBadge && lastSeenVersion !== CURRENT_APP_VERSION) {
            updateBadge.classList.remove('hidden');
            updateBadge.classList.add('pulsing');
        }

        updatesTriggerButton.addEventListener('click', () => {
            updatesContainer.classList.add('active');
            updatesContainer.setAttribute('aria-hidden', 'false');
            if (window.lucide) window.lucide.createIcons();

            if (updateBadge) {
                updateBadge.classList.remove('pulsing');
                updateBadge.classList.add('hidden');
                localStorage.setItem('lastSeenUpdateVersion', CURRENT_APP_VERSION);
            }
        });
        closeUpdatesWidget.addEventListener('click', () => {
            updatesContainer.classList.remove('active');
            updatesContainer.setAttribute('aria-hidden', 'true');
        });
        updatesContainer.addEventListener('click', (e) => {
            if (e.target === updatesContainer) updatesContainer.classList.remove('active');
        });
    }
};

export const setupFeedbackWidget = () => {
    const feedbackTriggerButton = document.getElementById('feedback-trigger-button');
    const feedbackContainer = document.getElementById('feedback-container');
    const closeWidgetButton = document.getElementById('close-widget-button');
    const viewMain = document.getElementById('view-main');
    const viewFeedbackForm = document.getElementById('view-feedback-form');
    const viewBugForm = document.getElementById('view-bug-form');
    const viewConfirmation = document.getElementById('view-confirmation');
    const actionGiveFeedback = document.getElementById('action-give-feedback');
    const actionReportBug = document.getElementById('action-report-bug');
    const backButtons = document.querySelectorAll('.back-button');
    const doneButton = document.getElementById('done-button');

    const openWidget = () => {
        if (!feedbackContainer) return;
        feedbackContainer.classList.add('active');
        feedbackContainer.setAttribute('aria-hidden', 'false');
    }
    const closeWidget = () => {
        if (!feedbackContainer) return;
        feedbackContainer.classList.remove('active');
        feedbackContainer.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            if (viewMain) showView(viewMain);
        }, 300);
    };

    const showView = (viewToShow) => {
        [viewMain, viewFeedbackForm, viewBugForm, viewConfirmation].forEach(v => {
            if (v) v.classList.add('hidden')
        });
        if (viewToShow) viewToShow.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    };

    if (feedbackTriggerButton) feedbackTriggerButton.addEventListener('click', openWidget);
    if (closeWidgetButton) closeWidgetButton.addEventListener('click', closeWidget);
    if (actionGiveFeedback) actionGiveFeedback.addEventListener('click', () => showView(viewFeedbackForm));
    if (actionReportBug) actionReportBug.addEventListener('click', () => showView(viewBugForm));
    backButtons.forEach(button => button.addEventListener('click', () => showView(viewMain)));
    if (doneButton) doneButton.addEventListener('click', closeWidget);
};
