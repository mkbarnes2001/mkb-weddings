import {
  getCrmPaymentsOverview,
} from "../../../../serverless/crm-payments-overview-d1";

import {
  requireProfessionalContext,
} from "../../../../serverless/platform-auth-d1";


type Env = {
  MKB_DB: D1Database;

  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};


export const onRequestGet:
PagesFunction<Env> = async (
  context,
) => {
  try {
    const actor =
      await requireProfessionalContext(
        context.env.MKB_DB,
        context.request,
        context.env,
      );

    const payments =
      await getCrmPaymentsOverview(
        context.env.MKB_DB,
        actor,
      );

    return Response.json(
      {
        ok: true,
        payments,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message
          || "Unable to load payments.",
      },
      {
        status:
          Number(
            error?.statusCode || 500,
          ),
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  }
};
