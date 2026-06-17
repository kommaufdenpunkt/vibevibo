"use client";

// 🎨 RichTextDisplay — Markdown sicher als JSX rendern.
// Unterstützt: **fett**, *kursiv*, ~~strike~~, `code`, [link](url),
// > zitat (zeilenanfang), - liste (zeilenanfang), ## überschrift,
// Zeilenumbrüche.
//
// XSS-sicher: alle URLs werden validiert (http/https/mailto only),
// Markdown wird in JSX-Elemente umgewandelt (kein dangerouslySetInnerHTML).

const URL_OK = /^(https?:\/\/|mailto:)/i;

// Inline-Patterns: ** * ~~ ` []()
// Wir parsen die Strings rekursiv von links nach rechts
function parseInline(text, keyBase = "") {
  const out = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const rest = text.slice(i);

    // Fett **xxx**
    let m = rest.match(/^\*\*([^*]+?)\*\*/);
    if (m) { out.push(<b key={keyBase + "_" + key++}>{parseInline(m[1], keyBase + "b" + key)}</b>); i += m[0].length; continue; }

    // Kursiv *xxx* — aber nicht ** (schon oben gehandled)
    m = rest.match(/^\*([^*\n]+?)\*/);
    if (m) { out.push(<i key={keyBase + "_" + key++}>{parseInline(m[1], keyBase + "i" + key)}</i>); i += m[0].length; continue; }

    // Strike ~~xxx~~
    m = rest.match(/^~~([^~\n]+?)~~/);
    if (m) { out.push(<s key={keyBase + "_" + key++}>{m[1]}</s>); i += m[0].length; continue; }

    // Code `xxx`
    m = rest.match(/^`([^`\n]+?)`/);
    if (m) { out.push(<code key={keyBase + "_" + key++} style={codeStyle}>{m[1]}</code>); i += m[0].length; continue; }

    // Bild ![alt](url)
    m = rest.match(/^!\[([^\]\n]*)\]\(([^)\n\s]+)\)/);
    if (m) {
      const url = m[2];
      const alt = m[1];
      if (URL_OK.test(url)) {
        out.push(
          <img
            key={keyBase + "_" + key++}
            src={url}
            alt={alt}
            loading="lazy"
            style={imgStyle}
          />
        );
      }
      i += m[0].length;
      continue;
    }

    // Link [text](url)
    m = rest.match(/^\[([^\]\n]+)\]\(([^)\n\s]+)\)/);
    if (m) {
      const url = m[2];
      const label = m[1];
      if (URL_OK.test(url)) {
        out.push(<a key={keyBase + "_" + key++} href={url} target="_blank" rel="noopener noreferrer ugc" style={linkStyle}>{label}</a>);
      } else {
        out.push(<span key={keyBase + "_" + key++}>{label}</span>);
      }
      i += m[0].length;
      continue;
    }

    // Auto-Link für nackte URLs
    m = rest.match(/^(https?:\/\/[^\s<>"]+)/);
    if (m) {
      const url = m[1];
      out.push(<a key={keyBase + "_" + key++} href={url} target="_blank" rel="noopener noreferrer ugc" style={linkStyle}>{url}</a>);
      i += m[0].length;
      continue;
    }

    // Fallback: ein Zeichen weiterschieben, in den letzten Text-String einfügen
    const last = out[out.length - 1];
    if (typeof last === "string") {
      out[out.length - 1] = last + text[i];
    } else {
      out.push(text[i]);
    }
    i++;
  }
  return out;
}

export default function RichTextDisplay({ text, style }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const blocks = [];
  let listBuffer = [];
  let quoteBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={"ul_" + key} style={listStyle}>
        {listBuffer.map((line, i) => <li key={i}>{parseInline(line, "l" + i)}</li>)}
      </ul>
    );
    listBuffer = [];
  };
  const flushQuote = (key) => {
    if (quoteBuffer.length === 0) return;
    blocks.push(
      <blockquote key={"bq_" + key} style={quoteStyle}>
        {quoteBuffer.map((line, i) => <div key={i}>{parseInline(line, "q" + i)}</div>)}
      </blockquote>
    );
    quoteBuffer = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (/^## /.test(line)) {
      flushList(idx); flushQuote(idx);
      blocks.push(<h3 key={"h_" + idx} style={headingStyle}>{parseInline(line.slice(3), "h" + idx)}</h3>);
    } else if (/^- /.test(line)) {
      flushQuote(idx);
      listBuffer.push(line.slice(2));
    } else if (/^> /.test(line)) {
      flushList(idx);
      quoteBuffer.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList(idx); flushQuote(idx);
      blocks.push(<div key={"sp_" + idx} style={{ height: 6 }} />);
    } else {
      flushList(idx); flushQuote(idx);
      blocks.push(<div key={"p_" + idx}>{parseInline(line, "p" + idx)}</div>);
    }
  }
  flushList("end"); flushQuote("end");

  return (
    <div style={{ fontSize: 14, lineHeight: 1.55, color: "#1f2937", wordBreak: "break-word", ...style }}>
      {blocks}
    </div>
  );
}

const codeStyle = {
  background: "#f1f5f9",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "ui-monospace, Menlo, monospace",
  color: "#475569",
};

const linkStyle = {
  color: "#ec4899",
  fontWeight: 700,
  textDecoration: "underline",
};

const listStyle = {
  paddingLeft: 22,
  margin: "4px 0",
};

const quoteStyle = {
  borderLeft: "3px solid #ec4899",
  paddingLeft: 10,
  margin: "6px 0",
  color: "#475569",
  fontStyle: "italic",
};

const headingStyle = {
  fontSize: 17,
  fontWeight: 900,
  margin: "8px 0 4px",
  color: "#1f2937",
};

const imgStyle = {
  maxWidth: "100%",
  maxHeight: 320,
  borderRadius: 10,
  display: "block",
  margin: "8px 0",
  border: "1px solid rgba(0,0,0,0.06)",
};
