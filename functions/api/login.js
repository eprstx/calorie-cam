export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => null);

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return json({ success: false, error: "Email and password are required." }, 400);
    }

    const user = await env.DB.prepare(`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ?
      LIMIT 1
    `).bind(email).first();

    if (!user) {
      return json({ success: false, error: "Invalid email or password." }, 401);
    }

    // Temporary MVP check matching current register.js
    const password_hash = btoa(password);

    if (user.password_hash !== password_hash) {
      return json({ success: false, error: "Invalid email or password." }, 401);
    }

    // Simple session token for MVP
    const sessionToken = crypto.randomUUID();

    await env.DB.prepare(`
      UPDATE users
      SET session_token = ?
      WHERE id = ?
    `).bind(sessionToken, user.id).run();

    return new Response(JSON.stringify({
      success: true,
      user_id: user.id,
      email: user.email
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `session_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
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
