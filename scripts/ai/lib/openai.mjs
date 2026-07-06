export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractOutputText(json) {
  if (json.output_text) return json.output_text;
  const parts = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function stripJsonFences(text) {
  return String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function parseJsonOutput(text) {
  const cleaned = stripJsonFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error(`Could not parse JSON output: ${cleaned.slice(0, 300)}`);
  }
}

export async function responsesRequest({ apiKey, model, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const text = await response.text();
    const err = new Error(`OpenAI error ${response.status}: ${text}`);
    err.status = response.status;
    err.retryAfter = retryAfter ? Number(retryAfter) * 1000 : null;
    throw err;
  }

  return response.json();
}
