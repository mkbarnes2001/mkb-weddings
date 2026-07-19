type Env = {
  MKB_DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const row = await context.env.MKB_DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM venues) AS venues,
        (SELECT COUNT(*) FROM weddings) AS weddings,
        (SELECT COUNT(*) FROM images) AS images,
        (SELECT COUNT(*) FROM counties) AS counties,
        (SELECT COUNT(*) FROM moments) AS moments
    `).first<Record<string, number>>();

    return Response.json({
      ok: true,
      binding: "MKB_DB",
      counts: row || {},
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        binding: "MKB_DB",
        error:
          error instanceof Error
            ? error.message
            : "Unable to query D1.",
      },
      { status: 500 },
    );
  }
};
