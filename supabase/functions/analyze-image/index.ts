import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

serve(async (req) => {
  try {
    /* ------------------------------
       1. AUTH KONTROL (LOCK YOK)
    ------------------------------ */
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401 }
      )
    }

    /* ------------------------------
       2. REQUEST BODY
    ------------------------------ */
    const body = await req.json()
    const imageBase64 = body.imageBase64

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400 }
      )
    }

    /* ------------------------------
       3. GEMINI (AUTH'TAN BAĞIMSIZ)
    ------------------------------ */
    const genAI = new GoogleGenerativeAI(
      Deno.env.get("GEMINI_API_KEY")!
    )

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/webp",
          data: imageBase64
        }
      },
      "Identify the main object in the image and return only ONE simple English word."
    ])

    const word = result.response.text()

    /* ------------------------------
       4. RESPONSE
    ------------------------------ */
    return new Response(
      JSON.stringify({ word }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    )
  } catch (err) {
    console.error("AI ERROR:", err)

    return new Response(
      JSON.stringify({ error: "AI processing failed" }),
      { status: 500 }
    )
  }
})
