import {
  requestExternalBusinessSignup,
  type PlatformSignupEnv,
} from "../../../../../serverless/platform-signup-d1";

type Env =
  PlatformSignupEnv & {
    MKB_DB: D1Database;
  };

export const onRequestPost:
  PagesFunction<Env> =
async (context) => {
  try {
    const body: any =
      await context.request
        .json()
        .catch(() => ({}));

    const result =
      await requestExternalBusinessSignup(
        context.env.MKB_DB,
        context.env,
        context.request,
        body,
      );

    return Response.json(
      result,
      {
        status: 202,
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
          || "Unable to start WedPlanned signup.",
        ...(error?.code
          ? {
              code:
                String(error.code),
            }
          : {}),
      },
      {
        status:
          error?.statusCode
          || 500,
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  }
};
