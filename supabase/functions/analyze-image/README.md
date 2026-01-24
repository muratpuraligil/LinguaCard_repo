
# Analyze Image Edge Function

This function analyzes images using Google Gemini 1.5 Flash to extract English vocabulary words.

## Deployment

1.  Make sure you have the Supabase CLI installed and logged in.
2.  Set your Gemini API Key in your Supabase project secrets:
    ```bash
    supabase secrets set GEMINI_API_KEY="your-google-gemini-api-key"
    ```
3.  Deploy the function:
    ```bash
    supabase functions deploy analyze-image
    ```

## Functionality
- Accepts `POST` requests with `{ imageBase64, mimeType }`.
- Handles CORS (safe to call from localhost).
- Validates the Image and API Key.
- Returns a JSON object with `{ word: [...] }`.
