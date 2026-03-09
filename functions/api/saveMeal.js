export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    const {
      user_id,
      meal_name,
      ingredients_summary,
      items,
      total_calories,
      total_protein,
      total_fat,
      total_carbs,
      water,
      notes
    } = data;

    const stmt = env.DB.prepare(`
      INSERT INTO food_entries (
        user_id,
        meal_name,
        ingredients_summary,
        items_json,
        total_calories,
        total_protein,
        total_fat,
        total_carbs,
        water,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      user_id,
      meal_name || "",
      ingredients_summary || "",
      JSON.stringify(items || []),
      total_calories || 0,
      total_protein || 0,
      total_fat || 0,
      total_carbs || 0,
      water || 0,
      notes || ""
    ).run();

    return new Response(JSON.stringify({
      success: true
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
