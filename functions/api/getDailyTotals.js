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

    const url = new URL(request.url);
    const day = (url.searchParams.get("day") || "").trim(); // YYYY-MM-DD

    if (!day) {
      return json({ success: false, error: "Missing day parameter." }, 400);
    }

    const stmt = env.DB.prepare(`
      SELECT
        COALESCE(SUM(total_calories), 0) AS total_calories,
        COALESCE(SUM(total_protein), 0) AS total_protein,
        COALESCE(SUM(total_fat), 0) AS total_fat,
        COALESCE(SUM(total_carbs), 0) AS total_carbs,
        COALESCE(SUM(water), 0) AS total_water,
        COUNT(*) AS meal_count
      FROM food_entries
      WHERE user_id = ?
        AND substr(COALESCE(consumed_at, saved_at), 1, 10) = ?
    `);

    const totals = await stmt.bind(user.id, day).first();

    return json({
      success: true,
      day,
      totals: {
        total_calories: Number(totals?.total_calories || 0),
        total_protein: Number(totals?.total_protein || 0),
        total_fat: Number(totals?.total_fat || 0),
        total_carbs: Number(totals?.total_carbs || 0),
        total_water: Number(totals?.total_water || 0),
        meal_count: Number(totals?.meal_count || 0)
      }
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
