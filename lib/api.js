"use client";

// Wrapper um fetch() für unsere eigene API.

async function req(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => req("/api/me"),
  ping: () => req("/api/ping", { method: "POST" }),
  login: (username, password) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (data) => req("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  logout: () => req("/api/auth/logout", { method: "POST" }),

  listUsers: () => req("/api/users"),
  getUser: (username) => req(`/api/users/${encodeURIComponent(username)}`),
  recordVisit: (username) => req(`/api/users/${encodeURIComponent(username)}/visit`, { method: "POST" }),
  buschfunk: () => req("/api/buschfunk"),
  updateMe: (username, patch) => req(`/api/users/${encodeURIComponent(username)}`, { method: "PATCH", body: JSON.stringify(patch) }),

  postPinnwand: (username, text) => req(`/api/users/${encodeURIComponent(username)}/pinnwand`, { method: "POST", body: JSON.stringify({ text }) }),
  deletePinnwand: (id) => req(`/api/pinnwand/${id}`, { method: "DELETE" }),

  sendGift: (username, giftId) => req(`/api/users/${encodeURIComponent(username)}/gifts`, { method: "POST", body: JSON.stringify({ giftId }) }),

  listConversations: () => req("/api/messages"),
  getConversation: (partner) => req(`/api/messages/${encodeURIComponent(partner)}`),
  sendMessage: (to, text) => req("/api/messages", { method: "POST", body: JSON.stringify({ to, text }) }),
  sendVoice: (to, audioUrl, onceOnly) => req("/api/messages", { method: "POST", body: JSON.stringify({ to, kind: "voice", audioUrl, onceOnly }) }),
  consumeMessage: (id) => req(`/api/voice/${id}`, { method: "POST" }),

  listAlbums: (username) => req(`/api/users/${encodeURIComponent(username)}/albums`),
  createAlbum: (username, name) => req(`/api/users/${encodeURIComponent(username)}/albums`, { method: "POST", body: JSON.stringify({ name }) }),
  listPhotos: (username, albumId) => req(`/api/users/${encodeURIComponent(username)}/photos${albumId ? `?album=${albumId}` : ""}`),
  uploadPhoto: (username, payload) => req(`/api/users/${encodeURIComponent(username)}/photos`, { method: "POST", body: JSON.stringify(payload) }),
  deletePhoto: (id) => req(`/api/photos/${id}`, { method: "DELETE" }),

  listGroups: () => req("/api/groups"),
  createGroup: (data) => req("/api/groups", { method: "POST", body: JSON.stringify(data) }),
  getGroup: (slug) => req(`/api/groups/${encodeURIComponent(slug)}`),
  joinGroup: (slug) => req(`/api/groups/${encodeURIComponent(slug)}/join`, { method: "POST" }),
  leaveGroup: (slug) => req(`/api/groups/${encodeURIComponent(slug)}/join`, { method: "DELETE" }),
  postGroup: (slug, text) => req(`/api/groups/${encodeURIComponent(slug)}/posts`, { method: "POST", body: JSON.stringify({ text }) }),
};
