
// ============================================
// AI ANALYZER (Robust Failover Version)
// ============================================

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // 1. CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Validate Inputs
        const { imageBase64, mimeType } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!imageBase64) throw new Error('Image data missing');
        if (!apiKey) throw new Error('API Key missing');

        const pureBase64 = imageBase64.includes(",")
            ? imageBase64.split(",")[1]
            : imageBase64;

        // 3. ROBUST FAILOVER STRATEGY
        // We will try these models in order. If one fails (Quota or Not Found), we immediately try the next.
        // Priority: Lowest Cost/Highest Quota -> Newest/Experimental
        // 3. ROBUST FAILOVER STRATEGY
        // We will try these models in order. If one fails (Quota or Not Found), we immediately try the next.
        // Priority: Experimental/New (often free) -> High Quota 1.5 -> Standard 2.0 -> Standard 1.5
        const modelsToTry = [
            'gemini-2.0-flash-exp',            // Experimental often has separate/fresh usage limits
            'gemini-2.5-flash',                // Detected in user logs (New!)
            'gemini-1.5-flash-8b',             // High volume / lower cost
            'gemini-1.5-flash-001',            // Specific version (sometimes avoids alias quota)
            'gemini-1.5-flash',                // Standard Stable
            'gemini-2.0-flash-lite-preview-02-05', // Lite preview
            'gemini-2.5-pro',                  // Detected in user logs
            'gemini-2.0-flash',                // Standard 2.0
            'gemini-2.0-flash-001',
            'gemini-1.5-pro'                   // Fallback
        ];

        let lastError = null;
        let successfulData = null;
        let usedModel = '';

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Attempting model: ${modelName}`);
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const promptText = `
                  Analyze this image and identify ALL distinct English words, phrases, or objects explicitly visible (up to 30 items if possible).
                  For each item found, provide:
                  - "english": The word/phrase in English.
                  - "turkish": Turkish translation.
                  - "example_sentence": A simple English sentence using it.
                  - "turkish_sentence": Turkish translation of that sentence.
                  
                  Return ONLY a raw JSON array. No markdown, no 'json' code blocks.
                  Example: [{"english":"Cat","turkish":"Kedi","example_sentence":"...","turkish_sentence":"..."}]
                `;

                const requestBody = {
                    contents: [{
                        parts: [
                            { text: promptText },
                            {
                                inline_data: {
                                    mime_type: mimeType || 'image/jpeg',
                                    data: pureBase64
                                }
                            }
                        ]
                    }]
                };

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (!response.ok) {
                    const msg = data.error?.message || response.statusText;

                    // If it's a Quota or Not Found error, we SKIP to the next model.
                    if (response.status === 429 ||
                        response.status === 404 ||
                        msg.includes('quota') ||
                        msg.includes('not found') ||
                        msg.includes('not supported')) {

                        console.warn(`Model ${modelName} skipped due to error: ${msg}`);
                        lastError = new Error(`[${modelName}] ${msg}`);
                        continue; // try next
                    }

                    // Any other error (Auth, BadRequest) is fatal.
                    throw new Error(msg);
                }

                // Success!
                successfulData = data;
                usedModel = modelName;
                console.log(`Success with model: ${modelName}`);
                break;

            } catch (e: any) {
                console.warn(`Error trying ${modelName}:`, e);
                lastError = e;
            }
        }

        if (!successfulData) {
            console.error("All models exhausted.");
            const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
            throw new Error(`All AI models failed. Last Error: ${errorMessage}`);
        }

        // 5. Parse Response
        const rawText = successfulData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            throw new Error(`AI Model (${usedModel}) returned empty response.`);
        }

        const cleanJson = rawText.replace(/```json|```/g, '').trim();
        let parsedWords;

        try {
            parsedWords = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Fail:", rawText);
            throw new Error("Failed to parse AI response.");
        }

        const finalData = Array.isArray(parsedWords) ? parsedWords : [parsedWords];

        return new Response(JSON.stringify({ word: finalData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Processing failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
