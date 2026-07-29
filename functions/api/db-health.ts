type Env = {
  MKB_DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const row = await context.env.MKB_DB.prepare(`
      SELECT value AS schema_version
      FROM schema_meta
      WHERE key = 'schema_version'
      LIMIT 1
    `).first<Record<string, string>>();

    return Response.json({
      ok: true,
      binding: "MKB_DB",
      schemaVersion: String(row?.schema_version || ""),
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
