import "dotenv/config";

const API_KEY = process.env.NVIDIA_API_KEY;
const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = "z-ai/glm-5.2";

if (!API_KEY) {
  throw new Error("Missing NVIDIA_API_KEY in .env");
}

function now() {
  return Date.now();
}

async function postJson(
  name: string,
  body: Record<string, any>,
  timeoutMs = 300_000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = now();

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const elapsed = now() - started;

    console.log(`\n=== ${name} ===`);
    console.log("status:", res.status);
    console.log("elapsedMs:", elapsed);
    console.log("body:", text.slice(0, 3000));

    return { ok: res.ok, status: res.status, elapsed, text };
  } catch (err: any) {
    const elapsed = now() - started;
    console.log(`\n=== ${name} ===`);
    console.log("elapsedMs:", elapsed);
    console.log("error:", err.name === "AbortError" ? "LOCAL_TIMEOUT" : err.message);
    return { ok: false, status: 0, elapsed, text: err.name === "AbortError" ? "LOCAL_TIMEOUT" : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function postStream(
  name: string,
  body: Record<string, any>,
  timeoutMs = 300_000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = now();

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    console.log(`\n=== ${name} ===`);
    console.log("status:", res.status);

    if (!res.body) {
      console.log("error: no response body");
      return { ok: false, status: res.status, elapsed: now() - started, firstChunkMs: null };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let firstChunkMs: number | null = null;
    let totalChars = 0;
    let chunks = 0;
    let preview = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (firstChunkMs === null) {
        firstChunkMs = now() - started;
      }

      const text = decoder.decode(value, { stream: true });
      totalChars += text.length;
      chunks += 1;

      if (preview.length < 2000) {
        preview += text;
      }
    }

    const elapsed = now() - started;
    console.log("firstChunkMs:", firstChunkMs);
    console.log("elapsedMs:", elapsed);
    console.log("chunks:", chunks);
    console.log("preview:", preview.slice(0, 2000));

    return { ok: res.ok, status: res.status, elapsed, firstChunkMs, chunks, preview };
  } catch (err: any) {
    const elapsed = now() - started;
    console.log(`\n=== ${name} ===`);
    console.log("elapsedMs:", elapsed);
    console.log("error:", err.name === "AbortError" ? "LOCAL_TIMEOUT" : err.message);
    return { ok: false, status: 0, elapsed, firstChunkMs: null };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log("Testing model:", MODEL);
  console.log("Key prefix:", API_KEY.slice(0, 8) + "...");

  await postJson(
    "GLM tiny non-stream",
    {
      model: MODEL,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 8,
      temperature: 0,
    },
    60_000
  );

  await postStream(
    "GLM tiny stream",
    {
      model: MODEL,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 8,
      temperature: 0,
    },
    60_000
  );

  await postJson(
    "GLM medium non-stream",
    {
      model: MODEL,
      messages: [
        {
          role: "user",
          content:
            "Create a short JSON object with keys title, summary, tags. Keep summary under 20 words and return valid JSON only.",
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    },
    120_000
  );
}

main().catch(console.error);
