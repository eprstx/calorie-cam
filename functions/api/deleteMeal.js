export async function onRequestPost(context) {
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

    const body = await request.json();
    const mealId = Number(body?.meal_id);

    if (!mealId) {
      return json({ success: false, error: "Missing meal_id" }, 400);
    }

    await env.DB.prepare(`
      DELETE FROM food_entries
      WHERE id = ?
      AND user_id = ?
    `).bind(mealId, user.id).run();

    return json({ success: true });

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
    headers: { "Content-Type": "application/json" }
  });
}
