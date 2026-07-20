import { errorResponse } from "../../../../serverless/venue-d1";
import { listPublicWeddings } from "../../../../serverless/wedding-d1";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const state = await listPublicWeddings(context.env.MKB_DB);
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
