// ============================================
// AI ANALYZER (Robust Failover Version)
// ============================================

// Fix for VS Code error: "Cannot find name 'Deno'"
declare const Deno: any;

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
        const { imageBase64, mimeType, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!imageBase64) throw new Error('Image data missing');
        if (!apiKey) throw new Error('API Key missing');

        const pureBase64 = imageBase64.includes(",")
            ? imageBase64.split(",")[1]
            : imageBase64;

        // PROMPT STRATEGIES
        const PROMPT_GENERAL = `
          Analyze this image and identify ALL distinct English words, phrases, or objects explicitly visible (up to 30 items if possible).
          For each item found, provide:
          - "english": The word/phrase in English.
          - "turkish": Turkish translation.
          - "example_sentence": A simple English sentence using it.
          - "turkish_sentence": Turkish translation of that sentence.
          
          Return ONLY a raw JSON array. No markdown, no 'json' code blocks.
          Example: [{"english":"Cat","turkish":"Kedi","example_sentence":"The cat is sleeping.","turkish_sentence":"Kedi uyuyor."}]
        `;

        const PROMPT_DOCUMENT = `
  You are a STRICT OCR extraction engine. Your ONLY job is to extract EVERY line of text visible in this image.

  🚨 MANDATORY EXTRACTION RULES:
  1. Count EVERY line/sentence in the image BEFORE starting extraction.
  2. If you count 47 lines, return EXACTLY 47 JSON objects. If 12, return 12. NO EXCEPTIONS.
  3. Do NOT create summaries, samples, or shortened versions.
  4. Do NOT skip lines because they seem repetitive or similar.
  5. Multi-column documents: Read LEFT column completely, then RIGHT column completely.
  6. VERBATIM transcription: Copy text exactly as shown. Do not paraphrase.

  🌐 LANGUAGE AUTO-DETECTION:
  - If line is in ENGLISH → Put in "example_sentence", translate to Turkish in "turkish_sentence"
  - If line is in TURKISH → Put in "turkish_sentence", translate to English in "example_sentence"
  - For "english" and "turkish" fields: Extract the main topic/keyword from the sentence.

  📊 OUTPUT FORMAT (Raw JSON Array):
  [
    {
      "english": "main keyword in English",
      "turkish": "ana anahtar kelime Türkçe",
      "example_sentence": "Full sentence in English",
      "turkish_sentence": "Tam cümle Türkçe"
    },
    ...CONTINUE FOR ALL LINES...
  ]

  ⚠️ FINAL CHECK: Before responding, verify your array length matches the total line count in the image.
`;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // 3. ROBUST FAILOVER STRATEGY
        // We will try these models in order. If one fails (Quota or Not Found), we immediately try the next.
        // Priority: Capability (Pro) -> Stability (Flash) -> Speed/Cost
        const modelsToTry = [
            'gemini-1.5-pro',                  // BEST for Vision/OCR
            'gemini-1.5-pro-001',
            'gemini-1.5-flash',                // Good fallback
            'gemini-2.0-flash-exp',
            'gemini-2.5-flash'
        ];

        let lastError = null;
        let successfulData = null;
        let usedModel = '';

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Attempting model: ${modelName}`);
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const requestBody = {
                    contents: [{
                        parts: [
                            { text: selectedPrompt },
                            {
                                inline_data: {
                                    mime_type: mimeType || 'image/jpeg',
                                    data: pureBase64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.0,
                        maxOutputTokens: 30000,
                    }
                };

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                // Log raw response for debugging (visible in Supabase logs)
                console.log(`[${modelName}] Response:`, JSON.stringify(data).substring(0, 200) + '...');

                if (!response.ok) {
                    const msg = data.error?.message || response.statusText;
                    if (response.status === 429 || response.status === 404 || msg.includes('quota') || msg.includes('not found')) {
                        console.warn(`Model ${modelName} skipped: ${msg}`);
                        lastError = new Error(`[${modelName}] ${msg}`);
                        continue;
                    }
                    throw new Error(msg);
                }

                // Check if candidate exists and has text
                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    // console.warn(`Model ${modelName} returned empty text. Skipping.`);
                    lastError = new Error(`[${modelName}] Empty response`);
                    continue;
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
