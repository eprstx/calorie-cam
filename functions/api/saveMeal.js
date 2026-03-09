export async function onRequestPost(context) {

  const { request, env } = context;
  const data = await request.json();

  const {
    user_id,
    meal_name,
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
      items_json,
      total_calories,
      total_protein,
      total_fat,
      total_carbs,
      water,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    user_id,
    meal_name,
    JSON.stringify(items),
    total_calories,
    total_protein,
    total_fat,
    total_carbs,
    water || 0,
    notes || ""
  ).run();

  return new Response(JSON.stringify({
    success: true
  }), {
    headers: { "Content-Type": "application/json" }
  });

}
