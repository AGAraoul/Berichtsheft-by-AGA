export async function callGeminiApi(inputs, gender, days, onProgress = null) {
    const functionUrl = '/.netlify/functions/generate';
    let loadingInterval;

    if (onProgress) {
        const activeDays = inputs.map((inp, i) => inp ? days[i] : null).filter(Boolean);
        const loadingMessages = activeDays.map(d => `Formuliere ${d}...`);
        loadingMessages.push("Finalisiere Bericht...");
        let messageIndex = 0;

        const updateLoadingText = () => {
            if (messageIndex < loadingMessages.length) {
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
                days: days
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
