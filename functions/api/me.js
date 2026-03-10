export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_token=([^;]+)/);
    const sessionToken = match ? match[1] : "";

    if (!sessionToken) {
      return json({ success: true, logged_in: false, user: null });
    }

    const user = await env.DB.prepare(`
      SELECT id, email, created_at, height, weight
      FROM users
      WHERE session_token = ?
      LIMIT 1
    `).bind(sessionToken).first();

    if (!user) {
      return json({ success: true, logged_in: false, user: null });
    }

    return json({
      success: true,
      logged_in: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        height: user.height,
        weight: user.weight
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
