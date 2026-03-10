export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_token=([^;]+)/);
    const sessionToken = match ? match[1] : "";

    if (!sessionToken) {
      return json({ success: false, error: "Not logged in." }, 401);
    }

    const user = await env.DB.prepare(`
      SELECT id
      FROM users
      WHERE session_token = ?
      LIMIT 1
    `).bind(sessionToken).first();

    if (!user) {
      return json({ success: false, error: "Invalid session." }, 401);
    }

    const stmt = env.DB.prepare(`
      SELECT
        id,
        user_id,
        meal_name,
        consumed_at,
        ingredients_summary,
        items_json,
        total_calories,
        total_protein,
        total_fat,
        total_carbs,
        water,
        notes,
        saved_at
      FROM food_entries
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 10
    `);

    const result = await stmt.bind(user.id).all();

    return json({
      success: true,
      meals: result.results || []
    });
  } catch (e) {
    return json({
      success: false,
      error: e?.message || "Server error"
    }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
