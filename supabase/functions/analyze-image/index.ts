// ============================================
// AI ANALYZER (Deterministic OCR Version)
// ============================================

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageBase64, mimeType, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!imageBase64) throw new Error('Image data missing');
        if (!apiKey) throw new Error('API Key missing');

        const pureBase64 = imageBase64.includes(",")
            ? imageBase64.split(",")[1]
            : imageBase64;

        // --- PROMPT SETTINGS ---

        const PROMPT_GENERAL = `
          Extract words/phrases from this image for English learning.
          Return a JSON array: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const PROMPT_DOCUMENT = `
          ACT AS A HIGH-PRECISION OCR ENGINE.
          IMAGE CONTENT: A list of sentences or words for language learning.
          
          TASK:
          1. TRANSCRIBE EVERY SINGLE VISIBLE LINE. Do not skip or summarize.
          2. Maintain the original order.
          3. If multi-column, read all columns (Left then Right).
          4. For each line:
             - Detect language (English or Turkish).
             - "example_sentence": The English version.
             - "turkish_sentence": The Turkish version.
             - "english": A main keyword/topic in English.
             - "turkish": A main keyword/topic in Turkish.
          
          STRICT LIMIT: Return ALL items found in the image. If 30 lines exist, return 30 objects.
          
          OUTPUT: Return ONLY a raw JSON array.
          Example: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // --- MODEL FAILOVER ---
        const modelsToTry = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-2.0-flash-exp'
        ];

        let resultText = "";
        let usedModel = "";

        for (const modelName of modelsToTry) {
            try {
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: selectedPrompt },
                                { inline_data: { mime_type: mimeType || 'image/jpeg', data: pureBase64 } }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.0,
                            topP: 0.1,
                            maxOutputTokens: 20480
                        }
                    })
                });

                const data = await response.json();
                if (!response.ok) continue;

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    resultText = text;
                    usedModel = modelName;
                    break;
                }
            } catch (e) {
                console.error(`Error with ${modelName}:`, e);
            }
        }

        if (!resultText) throw new Error("AI failed to process image.");

        // --- PARSING ---
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        const finalArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        return new Response(JSON.stringify({ word: finalArray, model: usedModel }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
