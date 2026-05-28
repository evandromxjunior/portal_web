const apiBase = (process.argv[2] ?? process.env.API_URL ?? "").replace(/\/$/, "");

if (!apiBase) {
  console.error("Uso: npm run verify:api -- https://sua-api.up.railway.app");
  process.exit(1);
}

async function check(path: string) {
  const url = `${apiBase}${path}`;
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  return { url, ok: response.ok, status: response.status, body };
}

async function main() {
  console.log(`Verificando API em ${apiBase}\n`);

  const health = await check("/api/health");
  console.log("GET /api/health");
  console.log(`  status: ${health.status}`);
  console.log(`  body:`, health.body);

  if (!health.ok) {
    process.exit(1);
  }

  const document = process.argv[3] ?? "85862589546";
  const receivables = await check(`/api/receivables?document=${document}`);
  console.log("\nGET /api/receivables");
  console.log(`  status: ${receivables.status}`);

  if (receivables.ok && typeof receivables.body === "object" && receivables.body !== null) {
    const payload = receivables.body as { count?: number };
    console.log(`  titulos: ${payload.count ?? "?"}`);
  } else {
    console.log(`  body:`, receivables.body);
    process.exit(1);
  }

  console.log("\nAPI OK para uso com VITE_API_URL na Vercel.");
}

main().catch((error) => {
  console.error("\nFalha na verificacao:", error);
  process.exit(1);
});
