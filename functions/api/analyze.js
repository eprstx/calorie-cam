export async function onRequestPost(context) {
  try {
    const form = await context.request.formData();
    const file = form.get("image");

    if (!file) {
      return json({ error: "No image uploaded (field name must be 'image')." }, 400);
    }

    // MVP: placeholder so we can confirm camera + deploy works.
    // Next step we’ll replace this with a real AI call (kept secret via env vars).
    const demo = {
      note: "Demo response (AI not connected yet). Next step will connect an AI vision model + calorie lookup.",
      items: [{ name: "example item", portion: "1 serving", calories: 400 }],
      totalCalories: 400
    };

    return json(demo, 200);
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
