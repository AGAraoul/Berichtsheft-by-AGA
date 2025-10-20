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

        // Aktualisiertes Modell für potenziell bessere Qualität
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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

            // --- NEUER, ANGEPASSTER PROMPT ---
            const userPrompt = `
                Du bist ein erfahrener Ausbildungsbetreuer, der einem ${genderText} Auszubildenden dabei hilft, ein vorbildliches Berichtsheft zu verfassen.
                Deine Aufgabe ist es, die stichpunktartigen oder unstrukturierten Tätigkeiten des Auszubildenden in einen professionellen und gut lesbaren Bericht umzuwandeln. Das Ziel ist eine qualitativ hochwertige und prägnante Zusammenfassung der Tagesaufgaben.

                Wichtige Regeln, die du ausnahmslos befolgen musst:
                1.  **Prägnanz und Klarheit:** Wandle die Stichpunkte in einen flüssigen Bericht um, der die Tätigkeiten klar beschreibt. Erläutere wichtige Aufgaben kurz und verständlich, ohne unnötig auszuschweifen. Das Ziel ist ein professioneller, gut lesbarer Text von angemessener Länge (ca. 4-6 Sätze), der die wesentlichen Tagesaufgaben zusammenfasst.
                2.  **Professioneller Stil:** Schreibe in der 3. Person Singular (z.B. "Der Auszubildende widmete sich...", "${pronoun} analysierte...", "${possessive} Hauptaufgabe war..."). Achte auf das korrekte Geschlecht. Verwende niemals "Ich" oder "Man". Nutze einen sachlichen, kompetenten Ton und integriere, wo passend, fachliche Begriffe.
                3.  **Flüssiger Textfluss:** Beginne den Bericht mit einem abwechslungsreichen Einleitungssatz, der den Wochentag organisch einbindet (z.B. "Am ${day} setzte der Auszubildende seine Arbeit an... fort." oder "Der ${day} stand ganz im Zeichen von..."). Verbinde die einzelnen Tätigkeiten logisch miteinander, anstatt sie nur aufzuzählen.
                4.  **Struktur:** Gliedere den Tagesablauf nachvollziehbar. Beginne oft mit der wichtigsten Aufgabe und beschreibe dann weitere Tätigkeiten in logischer Reihenfolge.
                5.  **Reiner Output:** Das Ergebnis darf NUR der Berichtshefttext sein. Keine Überschriften, keine Anmerkungen, keine Einleitungen wie "Hier ist der Bericht:" und nicht den Tagesnamen voranstellen.

                Hier sind die Tätigkeiten für den ${day}, die du ausarbeiten sollst:
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
