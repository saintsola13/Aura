// The OpenNext worker is generated during `opennextjs-cloudflare build`.
// @ts-ignore The generated module exists at deployment time and is not present in fresh checkouts.
import openNextWorker from "./.open-next/worker.js";

interface ServiceBinding {
  fetch(request: Request): Promise<Response>;
}

interface WebEnv {
  AURA_API: ServiceBinding;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: WebEnv, ctx: ExecutionContextLike) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const apiUrl = new URL(`${url.pathname.slice(4) || "/"}${url.search}`, "https://aura-api.internal");
      return env.AURA_API.fetch(new Request(apiUrl, request));
    }

    return openNextWorker.fetch(request, env, ctx);
  },
};
