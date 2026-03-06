export async function onRequestPost(context) {
  try {
    const apiKey = context.env.OPENAI_API_KEY;
    if (!apiKey) return json({ error: "Missing OPENAI_API_KEY in environment." }, 500);

    const body = await context.request.json().catch(() => null);
    const name = (body?.name ?? "").toString().trim();
    const quantity = Number(body?.quantity);

    if (!name) return json({ error: "Missing 'name'." }, 400);
    if (!Number.isFinite(quantity) || quantity < 1) return json({ error: "Invalid 'quantity'." }, 400);

    const prompt = `
You are a nutrition assistant.

User item:
- Name: ${name}
- Quantity: ${quantity}

Return ONLY valid JSON using this schema:

{
  "items": [
    {
      "name": string,
      "portion": string,
      "calories": number,
      "protein": number,
      "fat": number,
      "carbs": number
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalFat": number,
  "totalCarbs": number,
  "notes": string
}

Rules:
- Return ONE aggregated item only.
- Portion should reflect the quantity (example: "2 pieces", "3 servings").
- Protein, fat, carbs must be grams.
- totals must equal the item values since only one item exists.
- Rough estimates are acceptable.
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
              { type: "input_text", text: prompt }
            ]
          }
        ]
      })
    });

    const raw = await resp.json();
    if (!resp.ok) return json({ error: "OpenAI error", details: raw }, 502);

    const text =
      raw.output?.[0]?.content?.find(c => c.type === "output_text")?.text
      ?? raw.output_text
      ?? "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) parsed = JSON.parse(text.slice(start, end + 1));
      else return json({ error: "Could not parse model JSON", modelText: text }, 502);
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
