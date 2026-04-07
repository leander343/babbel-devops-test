const API = import.meta.env.VITE_API_URL;

function authHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function register(email: string, password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function createLink(
  apiKey: string,
  url: string,
  slug?: string
) {
  const body: Record<string, string> = { url };
  if (slug) body.slug = slug;
  const res = await fetch(`${API}/links`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function listLinks(apiKey: string) {
  const res = await fetch(`${API}/links`, { headers: authHeaders(apiKey) });
  return res.json();
}

export async function deleteLink(apiKey: string, slug: string) {
  const res = await fetch(`${API}/links/${slug}`, {
    method: "DELETE",
    headers: authHeaders(apiKey),
  });
  return res.status;
}

export async function getAnalytics(apiKey: string, slug: string, limit = 100) {
  const res = await fetch(`${API}/links/${slug}/analytics?limit=${limit}`, {
    headers: authHeaders(apiKey),
  });
  return res.json();
}
