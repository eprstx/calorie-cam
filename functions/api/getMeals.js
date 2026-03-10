export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Temporary: test user_id = 1
    const stmt = env.DB.prepare(`
      SELECT
        id,
        user_id,
        meal_name,
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

    const result = await stmt.bind(1).all();

    return new Response(JSON.stringify({
      success: true,
      meals: result.results || []
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: e?.message || "Server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
