export function bookingResponse(value: any, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export function bookingFailure(error: any) {
  const code = Number(error?.statusCode || 500);
  return bookingResponse(
    {
      error:
        code >= 500 && code !== 503
          ? "Unable to complete this booking action. Please try again."
          : error.message || "Booking is unavailable.",
    },
    code,
  );
}
export async function bookingBody(request: Request, max = 20000) {
  if (Number(request.headers.get("Content-Length") || 0) > max)
    throw Object.assign(new Error("Request is too large."), {
      statusCode: 413,
    });
  const text = await request.text();
  if (text.length > max)
    throw Object.assign(new Error("Request is too large."), {
      statusCode: 413,
    });
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Invalid request");
    return value;
  } catch {
    throw Object.assign(new Error("Invalid request."), { statusCode: 400 });
  }
}
export function bookingSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    throw Object.assign(new Error("Request origin is not allowed."), {
      statusCode: 403,
    });
}
