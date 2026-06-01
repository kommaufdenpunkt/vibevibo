// Avatar mit MSN-Style farbigem Ring je nach Presence.
// presenceInfo = { color, label, key } aus lib/presence.js
import Avatar from "./Avatar";

export default function PresenceAvatar({
  url, name = "", presenceInfo, size = 36, className = "vv-avatar", title,
}) {
  if (!presenceInfo) {
    return <Avatar url={url} name={name} className={className} style={{ width: size, height: size }} />;
  }
  const border = Math.max(2, Math.round(size * 0.09));
  return (
    <div
      title={title || presenceInfo.label}
      style={{
        width: size, height: size,
        padding: presenceInfo.key === "invisible" ? 1 : border * 0.6,
        borderRadius: "50%",
        background: `conic-gradient(${presenceInfo.color}, ${presenceInfo.color})`,
        boxShadow: presenceInfo.key === "online" || presenceInfo.key === "chill"
          ? `0 0 6px ${presenceInfo.color}66` : "none",
        boxSizing: "border-box", display: "inline-block", flexShrink: 0,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff", padding: 2, boxSizing: "border-box" }}>
        <Avatar url={url} name={name} className={className} style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
      </div>
    </div>
  );
}
