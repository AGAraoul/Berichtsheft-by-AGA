// Wir importieren node-fetch, da die Standard-fetch-API in dieser Node.js-Umgebung nicht immer verfügbar ist.
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
    // Nur POST-Anfragen erlauben
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { inputs, gender, days } = JSON.parse(event.body);
        
        // API-Schlüssel sicher aus den Netlify-Umgebungsvariablen holen
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("API key is not set in environment variables.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

        // Die Logik zur Erstellung der Prompts und der parallelen API-Aufrufe
        // wird vom Frontend ins sichere Backend verschoben.
        const apiPromises = inputs.map((activities, index) => {
            if (!activities) {
                return Promise.resolve({ day: days[index], text: null });
            }

            const day = days[index];
            const genderText = gender === 'male' ? 'männlichen' : 'weiblichen';
            const pronoun = gender === 'male' ? 'Er' : 'Sie';
            const possessive = gender === 'male' ? 'Seine' : 'Ihre';

            const userPrompt = `
                Du bist ein Assistent, der Auszubildenden hilft, ihr Berichtsheft zu schreiben.
                Deine Aufgabe ist es, die vom Benutzer eingegebenen Tätigkeiten für einen ${genderText} Auszubildenden in einen professionellen, zusammenhängenden Bericht umzuwandeln. Die Eingabe kann aus Stichpunkten, kommagetrennten Sätzen oder unstrukturiertem Text bestehen.

                Wichtige Regeln, die du unbedingt befolgen musst:
                1. Formuliere einen flüssigen Einleitungssatz. Beginne den Bericht mit einer natürlichen Formulierung, die den Wochentag einbezieht. Starre Anfänge wie "Am Montag hat der Auszubildende..." sollen vermieden werden. Gutes Beispiel: "Der ${day} begann für den Auszubildenden mit..." oder "Am ${day}morgen startete der Auszubildende mit der Aufgabe, ...".
                2. Schreibe den gesamten Text in der 3. Person Singular (z.B. "Der Auszubildende hat...", "${pronoun} führte aus...", "${possessive} Aufgaben umfassten..."). Beachte das Geschlecht. Verwende niemals "Ich" oder "Man".
                3. Schreibe in einem sachlichen, aber natürlichen Stil, so wie es ein Auszubildender in seinem Berichtsheft tun würde. Es sollte kompetent klingen, aber nicht übertrieben formell oder gestelzt. Formuliere ganze, grammatikalisch korrekte Sätze.
                4. Fasse die Tätigkeiten logisch zusammen. Wandle die Stichpunkte in einen flüssig lesbaren Text um und zähle sie nicht einfach nur auf.
                5. Der Output darf NUR der reine Berichtshefttext sein, ohne zusätzliche Anmerkungen, Titel oder den Tagesnamen am Anfang (z.B. "Montag: ..."). Gib nur den Fließtext zurück.

                Hier sind die Tätigkeiten für den ${day}:
                ---
                ${activities}
                ---
                `;

            const payload = { contents: [{ parts: [{ text: userPrompt }] }] };

            return fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(new Error(err.error.message || `API error for ${day}`))))
            .then(result => {
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error(`Keine gültige Antwort von der API für ${day} erhalten.`);
                return { day: day, text: text.trim() };
            });
        });
        
        const results = await Promise.all(apiPromises);

        return {
            statusCode: 200,
            body: JSON.stringify(results)
        };

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};