// Adapter that lets the original api/listings.js Vercel function
// (Node-style `handler(req, res)`) run unmodified inside a Next.js App
// Router route handler (which expects `(request: Request) => Response`).
//
// _handler.js is copied byte-for-byte from the old /api/listings.js — only
// its two relative imports (./limits.js, ./storage.js) were repointed to
// ../_lib/ since the file moved. Internal logic is untouched.
// Only this file's job is to translate between the two request/response
// shapes. If you need to change what an action does, edit _handler.js,
// not this file.
//
// listings.js is POST-only (even reads go through action-based dispatch),
// so only POST is wired up here — a GET/HEAD request will 405 inside the
// legacy handler itself, same as it did on Vercel.

import legacyHandler from "./_handler";

async function runLegacyHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());

  let body: any = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  // Minimal Node-style `res` shim: collects what the legacy handler sets
  // via res.status(...).json(...), so we can turn it into a real Response.
  let statusCode = 200;
  let responseBody: any = null;
  let sent = false;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      responseBody = payload;
      sent = true;
      return res;
    },
    headersSent: false,
  };

  const req = { query, body, method: request.method };

  await legacyHandler(req as any, res as any);

  if (!sent) {
    return new Response(JSON.stringify({ error: "No response from handler" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  return runLegacyHandler(request);
}
