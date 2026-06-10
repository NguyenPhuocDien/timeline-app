import process from "node:process";

const baseUrl = (
  process.env.SMOKE_BASE_URL || "https://web-mocha-nine-b6g5yspqjk.vercel.app"
).replace(/\/$/, "");

const routes = ["/", "/login", "/w/demo-workspace"];

async function assertRoute(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
  });

  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  const body = await response.text();
  if (!body.includes("Timeline Focus")) {
    throw new Error(`${path} did not render the Timeline Focus shell`);
  }
}

async function assertHealth() {
  const response = await fetch(`${baseUrl}/api/health`, {
    redirect: "manual",
  });

  if (response.status !== 200) {
    throw new Error(`/api/health returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.status || !payload.timestamp) {
    throw new Error("/api/health did not return the expected JSON shape");
  }

  if (payload.status !== "ok" || payload.database !== "ok") {
    throw new Error(
      `/api/health is not ready: status=${payload.status}, database=${payload.database}`,
    );
  }
}

for (const route of routes) {
  await assertRoute(route);
}

await assertHealth();

console.log(`Smoke checks passed for ${baseUrl}`);
