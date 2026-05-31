"use client";

// Wrapper um fetch() für unsere eigene API.

async function req(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
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
  login: (username, password, totp) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, totp: totp || undefined }) }),
  twoFaSetup: () => req("/api/auth/2fa/setup", { method: "POST" }),
  twoFaEnable: (code) => req("/api/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }),
  twoFaDisable: (password, code) => req("/api/auth/2fa/disable", { method: "POST", body: JSON.stringify({ password, code }) }),
  register: (data) => req("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  logout: () => req("/api/auth/logout", { method: "POST" }),
  logoutAll: () => req("/api/auth/logout-all", { method: "POST" }),
  evidenceUrl: (username) => `/api/admin/evidence/${encodeURIComponent(username)}`,

  listUsers: () => req("/api/users"),
  getUser: (username) => req(`/api/users/${encodeURIComponent(username)}`),
  recordVisit: (username) => req(`/api/users/${encodeURIComponent(username)}/visit`, { method: "POST" }),
  buschfunk: () => req("/api/buschfunk"),
  updateMe: (username, patch) => req(`/api/users/${encodeURIComponent(username)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  setStatus: (text, isPublic, image) => req("/api/status", { method: "POST", body: JSON.stringify({ text, public: !!isPublic, image: image || undefined }) }),
  toggleReaction: (targetType, targetId, kind = "like") => req("/api/reactions", { method: "POST", body: JSON.stringify({ targetType, targetId, kind }) }),
  notifications: () => req("/api/notifications"),
  markNotificationsRead: () => req("/api/notifications", { method: "POST" }),
  reportMessage: (messageId, reason) => req("/api/reports", { method: "POST", body: JSON.stringify({ messageId, reason: reason || "" }) }),
  listPics: (username) => req(`/api/users/${encodeURIComponent(username)}/pics`),
  uploadPic: (username, image) => req(`/api/users/${encodeURIComponent(username)}/pics`, { method: "POST", body: JSON.stringify({ image }) }),
  deletePic: (id) => req(`/api/pics/${id}`, { method: "DELETE" }),
  setPrimaryPic: (id) => req(`/api/pics/${id}`, { method: "PATCH", body: JSON.stringify({ primary: true }) }),
  listPicComments: (id) => req(`/api/pics/${id}/comments`),
  addPicComment: (id, text, parentId) => req(`/api/pics/${id}/comments`, { method: "POST", body: JSON.stringify({ text, parentId }) }),

  postPinnwand: (username, text, image) => req(`/api/users/${encodeURIComponent(username)}/pinnwand`, { method: "POST", body: JSON.stringify({ text, image: image || undefined }) }),
  deletePinnwand: (id) => req(`/api/pinnwand/${id}`, { method: "DELETE" }),
  getGuestbook: (username) => req(`/api/users/${encodeURIComponent(username)}/guestbook`),
  postGuestbook: (username, text) => req(`/api/users/${encodeURIComponent(username)}/guestbook`, { method: "POST", body: JSON.stringify({ text }) }),
  deleteGuestbookEntry: (username, id) => req(`/api/users/${encodeURIComponent(username)}/guestbook?id=${id}`, { method: "DELETE" }),

  sendGift: (username, giftId) => req(`/api/users/${encodeURIComponent(username)}/gifts`, { method: "POST", body: JSON.stringify({ giftId }) }),

  listConversations: () => req("/api/messages"),
  getConversation: (partner) => req(`/api/messages/${encodeURIComponent(partner)}`),
  sendMessage: (to, text, image) => req("/api/messages", { method: "POST", body: JSON.stringify({ to, text, image: image || undefined }) }),
  sendVoice: (to, audioUrl, onceOnly) => req("/api/messages", { method: "POST", body: JSON.stringify({ to, kind: "voice", audioUrl, onceOnly }) }),
  consumeMessage: (id) => req(`/api/voice/${id}`, { method: "POST" }),
  setChatRetention: (partner, retentionDays) => req(`/api/messages/${encodeURIComponent(partner)}`, { method: "PATCH", body: JSON.stringify({ retentionDays }) }),

  listAlbums: (username) => req(`/api/users/${encodeURIComponent(username)}/albums`),
  createAlbum: (username, name) => req(`/api/users/${encodeURIComponent(username)}/albums`, { method: "POST", body: JSON.stringify({ name }) }),
  listPhotos: (username, albumId) => req(`/api/users/${encodeURIComponent(username)}/photos${albumId ? `?album=${albumId}` : ""}`),
  uploadPhoto: (username, payload) => req(`/api/users/${encodeURIComponent(username)}/photos`, { method: "POST", body: JSON.stringify(payload) }),
  deletePhoto: (id) => req(`/api/photos/${id}`, { method: "DELETE" }),

  // Cookie-frei: Admin-Passwort wird bei jedem Call als Header mitgeschickt.
  adminData: (pw) => req("/api/admin/data", { headers: { "x-admin-password": pw } }),
  adminUserAction: (pw, username, action, ip) => req("/api/admin/users", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify({ username, action, ip }) }),
  adminIpAction: (pw, ip, action, reason) => req("/api/admin/ips", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify({ ip, action, reason }) }),

  pushKey: () => req("/api/push/key"),
  pushSubscribe: (subscription) => req("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription }) }),
  pushUnsubscribe: (endpoint) => req("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),

  listMutes: () => req("/api/mutes"),
  setMute: (targetType, targetId, durationMs) => req("/api/mutes", { method: "POST", body: JSON.stringify({ targetType, targetId, durationMs }) }),
  removeMute: (targetType, targetId) => req(`/api/mutes?targetType=${encodeURIComponent(targetType)}${targetId != null ? `&targetId=${targetId}` : ""}`, { method: "DELETE" }),

  listRooms: () => req("/api/rooms"),
  createRoom: (name, emoji, memberUsernames) => req("/api/rooms", { method: "POST", body: JSON.stringify({ name, emoji, memberUsernames }) }),
  getRoom: (id) => req(`/api/rooms/${id}`),
  leaveRoom: (id) => req(`/api/rooms/${id}`, { method: "DELETE" }),
  addRoomMember: (id, username) => req(`/api/rooms/${id}/members`, { method: "POST", body: JSON.stringify({ username }) }),
  kickRoomMember: (id, username) => req(`/api/rooms/${id}/members?username=${encodeURIComponent(username)}`, { method: "DELETE" }),
  getRoomMessages: (id) => req(`/api/rooms/${id}/messages`),
  sendRoomMessage: (id, text, image) => req(`/api/rooms/${id}/messages`, { method: "POST", body: JSON.stringify({ text, image: image || undefined }) }),
  sendRoomVoice: (id, audioUrl) => req(`/api/rooms/${id}/messages`, { method: "POST", body: JSON.stringify({ kind: "voice", audioUrl }) }),

  sendTyping: (toUsername, roomId) => req("/api/typing", { method: "POST", body: JSON.stringify({ toUsername, roomId }) }),
  sendNudge: (toUsername) => req("/api/nudge", { method: "POST", body: JSON.stringify({ toUsername }) }),
  updateMyPrefs: (patch) => req("/api/me/prefs", { method: "PATCH", body: JSON.stringify(patch) }),

  // Credits
  credits: () => req("/api/credits"),
  claimDaily: () => req("/api/credits/daily", { method: "POST" }),

  // VIBO – das Pixel-Pet
  viboGet: () => req("/api/vibo"),
  viboHatch: (name, species) => req("/api/vibo", { method: "POST", body: JSON.stringify({ name, species }) }),
  viboAction: (action) => req("/api/vibo/action", { method: "POST", body: JSON.stringify({ action }) }),
  viboCemetery: () => req("/api/vibo/cemetery"),
  viboEpitaph: (id, epitaph) => req("/api/vibo/cemetery", { method: "PATCH", body: JSON.stringify({ id, epitaph }) }),
  viboOf: (username) => req(`/api/vibo/${encodeURIComponent(username)}`),
  viboKnuddel: (username) => req(`/api/vibo/${encodeURIComponent(username)}/knuddel`, { method: "POST" }),

  // Live-Calls (WebRTC)
  startCall: (opts) => req("/api/calls", { method: "POST", body: JSON.stringify(opts) }),
  getCall: (id) => req(`/api/calls/${id}`),
  joinCall: (id) => req(`/api/calls/${id}/join`, { method: "POST" }),
  leaveCall: (id) => req(`/api/calls/${id}/leave`, { method: "POST" }),
  activeCalls: () => req("/api/calls/active"),
  moderateCallFrame: (id, image) => req(`/api/calls/${id}/moderate`, { method: "POST", body: JSON.stringify({ image }) }),
  rtcSignal: (callId, toUserId, type, payload) => req("/api/rtc/signal", { method: "POST", body: JSON.stringify({ callId, toUserId, type, payload }) }),

  listGroups: () => req("/api/groups"),
  createGroup: (data) => req("/api/groups", { method: "POST", body: JSON.stringify(data) }),
  getGroup: (slug) => req(`/api/groups/${encodeURIComponent(slug)}`),
  joinGroup: (slug) => req(`/api/groups/${encodeURIComponent(slug)}/join`, { method: "POST" }),
  leaveGroup: (slug) => req(`/api/groups/${encodeURIComponent(slug)}/join`, { method: "DELETE" }),
  postGroup: (slug, text) => req(`/api/groups/${encodeURIComponent(slug)}/posts`, { method: "POST", body: JSON.stringify({ text }) }),
};
