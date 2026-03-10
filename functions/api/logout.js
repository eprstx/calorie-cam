export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_token=([^;]+)/);
    const sessionToken = match ? match[1] : "";

    if (sessionToken) {
      await env.DB.prepare(`
        UPDATE users
        SET session_token = NULL
        WHERE session_token = ?
      `).bind(sessionToken).run();
    }

    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": "session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: e?.message || "Server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
