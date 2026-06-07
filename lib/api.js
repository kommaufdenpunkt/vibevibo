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
  setStatus: (text, isPublic, image, boost, audio, musicUrl) => req("/api/status", { method: "POST", body: JSON.stringify({ text, public: !!isPublic, image: image || undefined, boost: boost === true ? true : undefined, audio: audio || undefined, musicUrl: musicUrl || undefined }) }),
  toggleReaction: (targetType, targetId, kind = "like") => req("/api/reactions", { method: "POST", body: JSON.stringify({ targetType, targetId, kind }) }),
  notifications: () => req("/api/notifications"),
  markNotificationsRead: () => req("/api/notifications", { method: "POST" }),
  markAllRead: () => req("/api/messages/read-all", { method: "POST" }),
  reportMessage: (messageId, reason) => req("/api/reports", { method: "POST", body: JSON.stringify({ messageId, reason: reason || "" }) }),
  listPics: (username) => req(`/api/users/${encodeURIComponent(username)}/pics`),
  uploadPic: (username, image) => req(`/api/users/${encodeURIComponent(username)}/pics`, { method: "POST", body: JSON.stringify({ image }) }),
  deletePic: (id) => req(`/api/pics/${id}`, { method: "DELETE" }),
  setPrimaryPic: (id) => req(`/api/pics/${id}`, { method: "PATCH", body: JSON.stringify({ primary: true }) }),
  listPicComments: (id) => req(`/api/pics/${id}/comments`),
  addPicComment: (id, text, parentId) => req(`/api/pics/${id}/comments`, { method: "POST", body: JSON.stringify({ text, parentId }) }),

  postPinnwand: (username, text, image, audio, musicUrl) => req(`/api/users/${encodeURIComponent(username)}/pinnwand`, { method: "POST", body: JSON.stringify({ text, image: image || undefined, audio: audio || undefined, musicUrl: musicUrl || undefined }) }),
  deletePinnwand: (id) => req(`/api/pinnwand/${id}`, { method: "DELETE" }),
  getGuestbook: (username) => req(`/api/users/${encodeURIComponent(username)}/guestbook`),
  postGuestbook: (username, text, image) => req(`/api/users/${encodeURIComponent(username)}/guestbook`, { method: "POST", body: JSON.stringify({ text, image: image || undefined }) }),
  deleteGuestbookEntry: (username, id) => req(`/api/users/${encodeURIComponent(username)}/guestbook?id=${id}`, { method: "DELETE" }),

  sendGift: (username, giftId, note, visibility, wrap) => req(`/api/users/${encodeURIComponent(username)}/gifts`, {
    method: "POST",
    body: JSON.stringify({ giftId, note: note || "", visibility: visibility || "public", wrap: wrap || "" }),
  }),
  pinGift:   (id) => req(`/api/gifts/${id}/pin`, { method: "POST" }),
  unpinGift: (id) => req(`/api/gifts/${id}/pin`, { method: "DELETE" }),

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
  adminResetPassword: (pw, username, newPassword) => req("/api/admin/users", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify({ username, action: "reset_password", newPassword }) }),
  adminUnlockLogin: (pw, username, ip) => req("/api/admin/users", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify({ username, action: "unlock_login", ip: ip || "" }) }),
  adminIpAction: (pw, ip, action, reason) => req("/api/admin/ips", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify({ ip, action, reason }) }),
  adminBroadcast: (pw, text) => req("/api/admin/broadcast", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify({ text }) }),
  adminSettingsGet: (pw) => req("/api/admin/settings", { headers: { "x-admin-password": pw } }),
  adminSettingsSet: (pw, patch) => req("/api/admin/settings", { method: "POST", headers: { "x-admin-password": pw }, body: JSON.stringify(patch) }),

  pushKey: () => req("/api/push/key"),
  pushSubscribe: (subscription) => req("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription }) }),
  pushUnsubscribe: (endpoint) => req("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  pushTest: () => req("/api/push/test", { method: "POST" }),
  pushPrefs: () => req("/api/me/push-prefs"),
  pushPrefsSet: (prefs) => req("/api/me/push-prefs", { method: "POST", body: JSON.stringify({ prefs }) }),

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
  // 💬 Buschfunk-Kommentare auf JEDEM Event-Typ (status/pinnwand/gift/grouppost/newpic)
  listBuschfunkComments: (postId, type = "status") =>
    req(`/api/buschfunk/${postId}/comments?type=${encodeURIComponent(type)}`),
  addBuschfunkComment: (postId, text, replyToId = 0, type = "status", audioUrl = "") =>
    req(`/api/buschfunk/${postId}/comments`, { method: "POST", body: JSON.stringify({ text, replyToId, type, audioUrl }) }),
  deleteBuschfunkComment: (postId, commentId, type = "status") =>
    req(`/api/buschfunk/${postId}/comments?cid=${commentId}&type=${encodeURIComponent(type)}`, { method: "DELETE" }),
  reportBuschfunkComment: (commentId, reason) =>
    req("/api/reports", { method: "POST", body: JSON.stringify({ targetType: "buschfunk_comment", targetId: commentId, reason }) }),

  // 💑 Familienstand setzen + optional in Buschfunk posten
  setRelationship: ({ status, announceBuschfunk }) =>
    req("/api/me/relationship", { method: "POST", body: JSON.stringify({ status, announceBuschfunk }) }),
  getRelationship: () => req("/api/me/relationship"),
  // 💑 Partnerschafts-Anfrage senden / listen / antworten / abbrechen / trennen
  sendPartnershipRequest: (targetUsername) =>
    req("/api/me/relationship/request", { method: "POST", body: JSON.stringify({ targetUsername }) }),
  listPartnershipRequests: () => req("/api/me/relationship/request"),
  respondPartnershipRequest: (requestId, accept) =>
    req("/api/me/relationship/respond", { method: "POST", body: JSON.stringify({ requestId, accept }) }),
  cancelPartnershipRequest: (requestId) =>
    req("/api/me/relationship/cancel", { method: "POST", body: JSON.stringify({ requestId }) }),
  unlinkPartnership: () => req("/api/me/relationship/unlink", { method: "POST" }),
  // 💕 Flirt-Modus an/aus
  setFlirtEnabled: (enabled) => req("/api/me/flirt", { method: "POST", body: JSON.stringify({ enabled }) }),

  // Credits
  credits: () => req("/api/credits"),
  claimDaily: () => req("/api/credits/daily", { method: "POST" }),
  creditsHistory: (limit = 50, offset = 0) => req(`/api/credits/history?limit=${limit}&offset=${offset}`),

  // VIBO – das Pixel-Pet
  viboGet: () => req("/api/vibo"),
  viboHatch: (name, species) => req("/api/vibo", { method: "POST", body: JSON.stringify({ name, species }) }),
  viboAction: (action) => req("/api/vibo/action", { method: "POST", body: JSON.stringify({ action }) }),
  viboCemetery: () => req("/api/vibo/cemetery"),
  viboEpitaph: (id, epitaph) => req("/api/vibo/cemetery", { method: "PATCH", body: JSON.stringify({ id, epitaph }) }),
  viboOf: (username) => req(`/api/vibo/${encodeURIComponent(username)}`),
  viboKnuddel: (username) => req(`/api/vibo/${encodeURIComponent(username)}/knuddel`, { method: "POST" }),

  // VIBO-Zuhause (Möbel platzieren)
  viboRoom: () => req("/api/vibo/room"),
  viboRoomPlace: (kind, slot = null) => req("/api/vibo/room/place", { method: "POST", body: JSON.stringify({ kind, slot }) }),
  viboRoomRemove: (slot) => req("/api/vibo/room/remove", { method: "POST", body: JSON.stringify({ slot }) }),
  viboRoomUpgrade: () => req("/api/vibo/room/upgrade", { method: "POST" }),
  viboMinigame: (score, durationMs) => req("/api/vibo/minigame", { method: "POST", body: JSON.stringify({ score, durationMs }) }),

  // Realitätskarte
  worldItems: (lat, lng, acc) => req(`/api/world/items?lat=${lat}&lng=${lng}&acc=${acc || 0}`),
  worldPickup: (itemId, lat, lng, accuracy, favored) => req("/api/world/pickup", { method: "POST", body: JSON.stringify({ itemId, lat, lng, accuracy, favored: favored || undefined }) }),
  worldWeather: (lat, lng) => req(`/api/world/weather?lat=${lat}&lng=${lng}`),
  worldDex: () => req("/api/world/dex"),
  worldFish: (lat, lng, accuracy, water) => req("/api/world/fish", { method: "POST", body: JSON.stringify({ lat, lng, accuracy, water: water ? { lat: water.lat, lng: water.lng, radiusM: water.radiusM, name: water.name } : undefined }) }),
  worldWaters: (lat, lng, r = 600) => req(`/api/world/waters?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&r=${encodeURIComponent(r)}`),
  market: (lat, lng) => req(
    "/api/market" + (Number.isFinite(lat) && Number.isFinite(lng) ? `?lat=${lat}&lng=${lng}` : "")
  ),
  marketSetHome: (lat, lng) => req("/api/market", { method: "POST", body: JSON.stringify({ lat, lng }) }),
  marketSell: (merchantId, ids, lat, lng) => req("/api/market/sell", {
    method: "POST",
    body: JSON.stringify({ merchantId, ids, lat, lng }),
  }),
  marketKeep: (id, kept) => req("/api/market/keep", { method: "POST", body: JSON.stringify({ id, kept }) }),
  poiNearby: (lat, lng, radius) => req(`/api/world/poi?lat=${lat}&lng=${lng}&radius=${radius || 500}`),
  poiUse: (kind, osmId, lat, lng) => req("/api/world/poi/use", {
    method: "POST", body: JSON.stringify({ kind, osmId, lat, lng }),
  }),
  locationConsent: (value) => req("/api/me/location-consent", {
    method: "POST", body: JSON.stringify({ value }),
  }),
  locationConsentGet: () => req("/api/me/location-consent"),
  worldLocation: (lat, lng, accuracy) => req("/api/world/location", { method: "POST", body: JSON.stringify({ lat, lng, accuracy }) }),
  worldInventory: () => req("/api/world/inventory"),

  // Premium-Shop (freikaufen mit Vibes)
  premium: () => req("/api/premium"),
  premiumBuy: (kind, payload) => req("/api/premium/buy", { method: "POST", body: JSON.stringify({ kind, payload }) }),

  // Quests, Shop, Sammelkarten
  quests: () => req("/api/quests"),
  questClaim: (id) => req("/api/quests/claim", { method: "POST", body: JSON.stringify({ id }) }),
  shop: () => req("/api/shop"),
  shopBuy: (kind) => req("/api/shop/buy", { method: "POST", body: JSON.stringify({ kind }) }),
  cards: () => req("/api/cards"),

  // Nostalgie: Top-5-Freunde, Geburtstage, Glückskeks
  topFriends: (username) => req(`/api/top-friends${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  topFriendsPin: (username, slot) => req("/api/top-friends", { method: "POST", body: JSON.stringify({ username, slot }) }),
  topFriendsUnpin: (slot) => req(`/api/top-friends?slot=${slot}`, { method: "DELETE" }),
  birthdays: () => req("/api/birthdays"),
  fortune: () => req("/api/fortune"),

  // 🏫 Schul-/Stadt-Verzeichnis
  schools: (city) => req("/api/schools/list" + (city ? `?city=${encodeURIComponent(city)}` : "")),
  schoolUsers: (name) => req(`/api/schools/${encodeURIComponent(name)}`),
  cities: () => req("/api/cities"),

  // 🎁 Komplimente
  complimentPresets: () => req("/api/compliments?presets=1"),
  sendCompliment: (toUsername, body) => req("/api/compliments", { method: "POST", body: JSON.stringify({ toUsername, ...body }) }),
  complimentInbox: () => req("/api/compliments/inbox"),

  // 🎥 Live-Streams
  liveList:    () => req("/api/live"),
  liveCreate:  (opts) => req("/api/live", { method: "POST", body: JSON.stringify(opts) }),
  liveGet:     (id) => req(`/api/live/${id}`),
  liveEnd:     (id) => req(`/api/live/${id}`, { method: "DELETE" }),
  liveJoin:    (id) => req(`/api/live/${id}/join`, { method: "POST" }),
  liveLeave:   (id) => req(`/api/live/${id}/leave`, { method: "POST" }),
  liveCohost:  (id) => req(`/api/live/${id}/cohost`, { method: "POST" }),
  liveRequests: (id) => req(`/api/live/${id}/cohost`),
  liveApproveRequest: (id, reqId) => req(`/api/live/${id}/cohost/${reqId}/approve`, { method: "POST" }),
  liveRejectRequest:  (id, reqId) => req(`/api/live/${id}/cohost/${reqId}/reject`,  { method: "POST" }),
  liveMod:    (id, uid) => req(`/api/live/${id}/mod/${uid}`,   { method: "POST" }),
  liveUnmod:  (id, uid) => req(`/api/live/${id}/mod/${uid}`,   { method: "DELETE" }),
  liveMute:   (id, uid, minutes) => req(`/api/live/${id}/mute/${uid}`, { method: "POST", body: JSON.stringify({ minutes }) }),
  liveUnmute: (id, uid) => req(`/api/live/${id}/mute/${uid}`,  { method: "DELETE" }),
  liveBan:    (id, uid, reason) => req(`/api/live/${id}/ban/${uid}`, { method: "POST", body: JSON.stringify({ reason: reason || "" }) }),
  liveUnban:  (id, uid) => req(`/api/live/${id}/ban/${uid}`,   { method: "DELETE" }),
  liveDemote: (id, uid) => req(`/api/live/${id}/demote/${uid}`,{ method: "POST" }),
  liveReport: (id, targetUserId, reason, detail, kind) => req(`/api/live/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ targetUserId, reason, detail: detail || "", kind: kind || "manual" }),
  }),
  adminLiveReports: () => req("/api/admin/live-reports"),
  adminLiveResolve: (reportId, action) => req("/api/admin/live-reports", {
    method: "POST", body: JSON.stringify({ reportId, action }),
  }),
  adminLiveStrike: (username, reason) => req("/api/admin/live-strike", {
    method: "POST", body: JSON.stringify({ username, reason }),
  }),
  adminLiveUnblock: (username) => req("/api/admin/live-strike", {
    method: "DELETE", body: JSON.stringify({ username }),
  }),
  liveMessage: (id, text) => req(`/api/live/${id}/message`, { method: "POST", body: JSON.stringify({ text }) }),
  liveEmote:   (id, emoteId) => req(`/api/live/${id}/emote`, { method: "POST", body: JSON.stringify({ emoteId }) }),
  liveSignal:  (id, toUserId, type, payload) => req(`/api/live/${id}/signal`, {
    method: "POST", body: JSON.stringify({ toUserId, type, payload }),
  }),

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
