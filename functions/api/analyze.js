export async function onRequestPost(context) {
  try {
    const apiKey = context.env.OPENAI_API_KEY;
    if (!apiKey) return json({ error: "Missing OPENAI_API_KEY in environment." }, 500);

    const form = await context.request.formData();
    const file = form.get("image");
    if (!file) return json({ error: "No image uploaded (field name must be 'image')." }, 400);

    // Convert image to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Base64 encode (Cloudflare Workers/Pages doesn't use Node Buffer)
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const b64 = btoa(binary);

    const contentType = file.type || "image/jpeg";
    const dataUrl = `data:${contentType};base64,${b64}`;

    // Prompt: ask for aggregated items (no duplicates)
    const prompt = `
You are a nutrition assistant. From the photo, identify the food items.

Return ONLY valid JSON with this schema:
{
  "items": [{"name": string, "portion": string, "calories": number}],
  "totalCalories": number,
  "notes": string
}

Rules:
- IMPORTANT: Do NOT repeat identical items. Aggregate them.
  Example: instead of 5 separate "Banana" entries, return ONE item:
  { "name": "Banana", "portion": "5 medium", "calories": 525 }
- Be conservative and "rough estimate" is OK.
- If unsure, say so in notes and make best guess.
- totalCalories must equal sum of item calories.
`;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: dataUrl }
            ]
          }
        ]
      })
    });

    const raw = await resp.json();
    if (!resp.ok) {
      return json({ error: "OpenAI error", details: raw }, 502);
    }

    // Extract text output from Responses API
    const text =
      raw.output?.[0]?.content?.find(c => c.type === "output_text")?.text
      ?? raw.output_text
      ?? "";

    // Parse JSON from model
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // If the model returned extra text, try to salvage JSON
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(text.slice(start, end + 1));
      } else {
        return json({ error: "Could not parse model JSON", modelText: text }, 502);
      }
    }

    return json(parsed, 200);
  } catch (e) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
