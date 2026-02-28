// Wir importieren node-fetch, da die Standard-fetch-API in dieser Node.js-Umgebung nicht immer verfügbar ist.
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.handler = async (event) => {
    // Nur POST-Anfragen erlauben
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { inputs, gender, days } = JSON.parse(event.body);

        // API-Schlüssel sicher aus den Netlify-Umgebungsvariablen holen
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error("GROQ_API_KEY is not set in environment variables. Please add it to your Netlify settings.");
        }

        const apiUrl = `https://api.groq.com/openai/v1/chat/completions`;
        const modelName = "llama-3.3-70b-versatile"; // Ein sehr leistungsstarkes und schnelles Modell

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

            // --- ANGEPASSTER PROMPT (INKL. DEINEM FEEDBACK ZU REGEL 3) ---
            const userPrompt = `
Du bist ein erfahrener Ausbildungsbetreuer, der einem ${genderText} Auszubildenden dabei hilft, ein vorbildliches Berichtsheft zu verfassen.
Deine Aufgabe ist es, die stichpunktartigen oder unstrukturierten Tätigkeiten des Auszubildenden in einen professionellen und gut lesbaren Bericht umzuwandeln. Das Ziel ist eine qualitativ hochwertige und prägnante Zusammenfassung der Tagesaufgaben.

Wichtige Regeln, die du ausnahmslos befolgen musst:
1.  **Prägnanz und Klarheit:** Wandle die Stichpunkte in einen flüssigen Bericht um, der die Tätigkeiten klar beschreibt. Erläutere wichtige Aufgaben kurz und verständlich, ohne unnötig auszuschweifen. Das Ziel ist ein professioneller, gut lesbarer Text von angemessener Länge (ca. 4-6 Sätze), der die wesentlichen Tagesaufgaben zusammenfasst.
2.  **Professioneller Stil:** Schreibe in der 3. Person Singular (z.B. "Der Auszubildende widmete sich...", "${pronoun} analysierte...", "${possessive} Hauptaufgabe war..."). Achte auf das korrekte Geschlecht. Verwende niemals "Ich" oder "Man". Nutze einen sachlichen, kompetenten Ton und integriere, wo passend, fachliche Begriffe.
3.  **Flüssiger Textfluss und Logik:** Beginne den Bericht mit einem abwechslungsreichen Einleitungssatz, der den Wochentag organisch einbindet (z.B. "Am ${day} setzte der Auszubildende seine Arbeit an... fort."). Verbinde Tätigkeiten logisch miteinander, **aber nur, wenn der Zusammenhang offensichtlich ist.** Behandle unzusammenhängende Stichpunkte (z.B. 'Termin über Ausbildung' und 'Informationen über Thema X gesammelt') als **separate, voneinander unabhängige Aufgaben.** Erfinde keine künstlichen Zusammenhänge (z.B. nicht '...ein Termin, *in dem* Informationen gesammelt wurden', sondern '...nahm an einem Termin teil. Zusätzlich sammelte er Informationen zu Thema X.').
4.  **Struktur:** Gliedere den Tagesablauf nachvollziehbar. Beginne oft mit der wichtigsten Aufgabe und beschreibe dann weitere Tätigkeiten in logischer Reihenfolge.
5.  **Keine Zusammenfassungen:** Verzichte am Ende des Berichts vollständig auf ausschweifende, lobende oder abschließende Zusammenfassungen (z.B. "Diese Tätigkeiten ermöglichten es dem Auszubildenden..."). Beende den Text sachlich nach der Beschreibung der letzten Aufgabe.
6.  **Reiner Output:** Das Ergebnis darf NUR der Berichtshefttext sein. Keine Überschriften, keine Anmerkungen, keine Einleitungen wie "Hier ist der Bericht:" und nicht den Tagesnamen voranstellen. Gib direkt den reinen Text aus.

Hier sind die Tätigkeiten für den ${day}, die du ausarbeiten sollst:
---
${activities}
---
                `;

            const payload = {
                model: modelName,
                messages: [{ role: "user", content: userPrompt }],
                temperature: 0.7,
                max_tokens: 1024
            };

            // Exponential Backoff bei API-Fehlern (einfache Implementierung)
            const fetchWithRetry = (url, options, retries = 3, delay = 1000) => {
                return fetch(url, options)
                    .then(response => {
                        if (response.status === 429 && retries > 0) { // Too Many Requests
                            console.warn(`Rate limit hit for ${day}. Retrying in ${delay}ms... (${retries} retries left)`);
                            return new Promise(resolve => setTimeout(resolve, delay))
                                .then(() => fetchWithRetry(url, options, retries - 1, delay * 2));
                        }
                        if (!response.ok) {
                            return response.json().then(err => Promise.reject(new Error(err.error?.message || `API error for ${day} with status ${response.status}`)));
                        }
                        return response.json();
                    });
            };

            return fetchWithRetry(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            })
                .then(result => {
                    const text = result.choices?.[0]?.message?.content;
                    if (!text) throw new Error(`Keine gültige Antwort von der API für ${day} erhalten. Result: ${JSON.stringify(result)}`);
                    return { day: day, text: text.trim() };
                })
                .catch(error => {
                    // Fehler für einen einzelnen Tag abfangen, damit Promise.all() nicht abbricht
                    console.error(`Error processing ${day}:`, error.message);
                    return { day: day, text: `Fehler bei der Generierung für ${day}: ${error.message}` };
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
