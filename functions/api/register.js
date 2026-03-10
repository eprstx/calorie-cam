export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => null);

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return json({ success: false, error: "Email and password are required." }, 400);
    }

    if (password.length < 6) {
      return json({ success: false, error: "Password must be at least 6 characters." }, 400);
    }

    const existing = await env.DB.prepare(
      `SELECT id FROM users WHERE email = ? LIMIT 1`
    ).bind(email).first();

    if (existing) {
      return json({ success: false, error: "Email already registered." }, 400);
    }

    // Temporary simple hash placeholder for MVP
    // We will improve password hashing later
    const password_hash = btoa(password);

    const result = await env.DB.prepare(`
      INSERT INTO users (email, password_hash)
      VALUES (?, ?)
    `).bind(email, password_hash).run();

    return json({
      success: true,
      user_id: result.meta?.last_row_id || null
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
