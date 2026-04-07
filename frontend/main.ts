import * as api from "./api.js";

// ── State ─────────────────────────────────────────────────────────────────────

let currentApiKey = "";

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function out(id: string, data: unknown) {
  const el = document.getElementById(id);
  if (el) el.textContent = JSON.stringify(data, null, 2);
}

function get<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

get<HTMLFormElement>("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target as HTMLFormElement);
  const data = await api.register(
    fd.get("email") as string,
    fd.get("password") as string
  );
  out("register-out", data);
});

get<HTMLFormElement>("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target as HTMLFormElement);
  const data = await api.login(
    fd.get("email") as string,
    fd.get("password") as string
  );
  out("login-out", data);
  if (data.apiKey) {
    currentApiKey = data.apiKey;
    get<HTMLInputElement>("api-key-input").value = data.apiKey;
  }
});

get<HTMLInputElement>("api-key-input").addEventListener("input", (e) => {
  currentApiKey = (e.target as HTMLInputElement).value.trim();
});

get<HTMLButtonElement>("clear-key-btn").addEventListener("click", () => {
  currentApiKey = "";
  get<HTMLInputElement>("api-key-input").value = "";
});

// ── Shorten ───────────────────────────────────────────────────────────────────

get<HTMLFormElement>("shorten-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target as HTMLFormElement);
  const slug = (fd.get("slug") as string).trim() || undefined;
  const data = await api.createLink(currentApiKey, fd.get("url") as string, slug);
  out("shorten-out", data);
  await loadLinks();
});

// ── Links table ───────────────────────────────────────────────────────────────

export async function loadLinks() {
  const data = await api.listLinks(currentApiKey);
  const tbody = get<HTMLTableSectionElement>("links-body");

  if (!Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = "<tr class='empty-row'><td colspan='5'>No links yet.</td></tr>";
    return;
  }

  tbody.innerHTML = data
    .map(
      (link: { slug: string; shortUrl: string; originalUrl: string; createdAt: string }) => `
      <tr>
        <td>${esc(link.slug)}</td>
        <td><a href="${esc(link.shortUrl)}" target="_blank">${esc(link.shortUrl)}</a></td>
        <td><a href="${esc(link.originalUrl)}" target="_blank">${esc(link.originalUrl)}</a></td>
        <td>${esc(new Date(link.createdAt).toLocaleString())}</td>
        <td class="table-actions">
          <button onclick="window.__showAnalytics('${esc(link.slug)}')">Analytics</button>
          <button class="danger" onclick="window.__deleteLink('${esc(link.slug)}')">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");
}

get<HTMLButtonElement>("refresh-btn").addEventListener("click", loadLinks);

// ── Analytics ─────────────────────────────────────────────────────────────────

async function showAnalytics(slug: string) {
  const data = await api.getAnalytics(currentApiKey, slug);
  get("analytics-slug").textContent = slug;
  out("analytics-out", data);
  const section = get("analytics-section");
  section.style.display = "block";
  section.scrollIntoView();
}

get<HTMLButtonElement>("close-analytics-btn").addEventListener("click", () => {
  get("analytics-section").style.display = "none";
});

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteLink(slug: string) {
  if (!confirm(`Delete ${slug}?`)) return;
  const status = await api.deleteLink(currentApiKey, slug);
  if (status === 204) await loadLinks();
  else alert(`Delete failed (status ${status})`);
}

// Expose to inline onclick handlers in table rows
(window as unknown as Record<string, unknown>).__showAnalytics = showAnalytics;
(window as unknown as Record<string, unknown>).__deleteLink = deleteLink;