import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getXpLog, getXpSourceStats } from "@/lib/db";
import { rankProgress, rankName, rankEmoji, rankColor, RANK_FEATURES } from "@/lib/rank";

const SOURCE_LABELS = {
  pinnwand_post:   ["📌", "Pinnwand-Eintrag"],
  guestbook_post:  ["📖", "Gästebuch-Eintrag"],
  gift_send:       ["🎁", "Geschenk verschickt"],
  gift_recv:       ["🎀", "Geschenk bekommen"],
  compliment_send: ["💌", "Kompliment verschickt"],
  compliment_recv: ["💖", "Kompliment bekommen"],
  photo_upload:    ["📸", "Foto hochgeladen"],
  daily_login:     ["🎁", "Tages-Bonus"],
  quest_complete:  ["🥇", "Quest abgeschlossen"],
  vibo_care:       ["🥚", "VIBO gepflegt"],
  world_pickup:    ["🗺", "Item gefunden"],
  status_set:      ["💬", "Status gesetzt"],
  group_post:      ["🏘", "Gruppen-Post"],
};

export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 30)));
  const p = rankProgress(me.xp || 0);
  const log = getXpLog(me.id, limit).map((e) => {
    const [emoji, label] = SOURCE_LABELS[e.source] || ["✨", e.source];
    return { ...e, emoji, label };
  });
  const stats = getXpSourceStats(me.id).map((s) => {
    const [emoji, label] = SOURCE_LABELS[s.source] || ["✨", s.source];
    return { ...s, emoji, label };
  });
  return NextResponse.json({
    xp: me.xp || 0,
    rank: p.rank,
    rankName: rankName(p.rank),
    rankEmoji: rankEmoji(p.rank),
    rankColor: rankColor(p.rank),
    progress: p.progress,
    neededXp: p.neededXp,
    totalToNext: p.totalToNext,
    features: RANK_FEATURES,
    // XP_REWARDS bewusst NICHT mitsenden — die genauen Werte bleiben geheim,
    // damit niemand sein XP-Farming optimiert. Server validiert intern.
    log,
    stats,
  });
}
