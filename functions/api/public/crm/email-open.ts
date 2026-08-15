import {
  recordCrmEmailOpen,
} from "../../../../serverless/crm-email-engagement-d1";

type Env = {
  MKB_DB: D1Database;
};

const TRACKING_GIF =
  Uint8Array.from([
    71, 73, 70, 56, 57, 97,
    1, 0, 1, 0, 128, 0, 0,
    255, 255, 255, 0, 0, 0,
    33, 249, 4, 1, 0, 0, 0, 0,
    44, 0, 0, 0, 0, 1, 0, 1, 0,
    0, 2, 2, 68, 1, 0, 59,
  ]);

export const onRequestGet:
  PagesFunction<Env> =
  async (context) => {
    try {
      const url =
        new URL(
          context.request.url,
        );

      const token =
        String(
          url.searchParams
            .get("token")
          || "",
        );

      if (token) {
        try {
          await recordCrmEmailOpen(
            context.env.MKB_DB,
            token,
          );
        } catch {
          // Tracking must never interfere with
          // rendering or disclose database state.
        }
      }
    } catch {
      // Return the same pixel for every request.
    }

    return new Response(
      TRACKING_GIF,
      {
        status: 200,
        headers: {
          "Content-Type":
            "image/gif",
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-Robots-Tag":
            "noindex, nofollow",
        },
      },
    );
  };
