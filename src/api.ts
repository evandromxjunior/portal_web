/** Base da API em producao (ex.: https://api.seudominio.com). Vazio = mesmo host (dev com proxy Vite). */
export function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
