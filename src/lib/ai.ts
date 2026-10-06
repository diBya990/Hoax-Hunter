// =====================================================================
// The AI connection for Hoax Hunter.
// This is the ONLY file that talks to the AI provider (Google Gemini, free tier).
// To switch providers later, only callModel() below needs to change.
// The key is read on the server only and is never sent to the browser.
// =====================================================================

// A friendly error whose message is safe to show to the player
export class AIError extends Error {}

// Models to try, in order. If one is busy or too slow, we try the next.
// The lite model goes first: in testing it answers in about 3 seconds every time,
// while the bigger free-tier models were often overloaded or hung for a minute.
// Override in .env.local with GEMINI_MODEL=model-a,model-b
const MODELS = (
  process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest,gemini-3.5-flash,gemini-3.8-flash"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const MODEL_TIMEOUT_MS = 20_000; // longest we wait for one model

type CallOptions = {
  system: string; // the standing instructions
  prompt: string; // this request
  schema: object; // the exact JSON shape we want back
  temperature?: number; // higher = more creative and varied
};

// Sends the request to Gemini and returns the raw JSON text.
async function callModel({ system, prompt, schema, temperature = 0.8 }: CallOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIError("The AI isn't connected yet. Add GEMINI_API_KEY to .env.local and restart the app.");
  }

  let lastProblem = "";

  for (const model of MODELS) {
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: schema,
              temperature,
            },
          }),
          // a model that hangs is skipped instead of freezing the game
          signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
        }
      );
    } catch {
      lastProblem = `${model} timed out or could not be reached`;
      console.warn(`[ai] ${lastProblem}, trying the next model`);
      continue;
    }

    // Busy (503), free limit reached (429) or model unavailable (404): try the next model
    if ([404, 429, 500, 503].includes(response.status)) {
      lastProblem = `${model} answered ${response.status}`;
      console.warn(`[ai] ${lastProblem}, trying the next model`);
      continue;
    }

    if (!response.ok) {
      console.error("[ai] request failed", response.status, await response.text());
      throw new AIError("The AI couldn't process this request. Please try again.");
    }

    const data = await response.json();
    const text: string = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? "")
      .join("");

    if (!text) {
      lastProblem = `${model} returned an empty answer`;
      continue;
    }
    return text;
  }

  console.error("[ai] all models failed:", lastProblem);
  throw new AIError("The AI is busy right now (free tier). Please try again in a minute.");
}

/**
 * Asks the AI and returns its answer, checked and cleaned by `clean`.
 * `clean` must throw (or return something safe) if the answer is bad.
 */
export async function askAI<T>(options: CallOptions, clean: (raw: unknown) => T): Promise<T> {
  const text = await callModel(options);
  try {
    return clean(JSON.parse(text));
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError("The AI's answer was in the wrong format. Please try again.");
  }
}
