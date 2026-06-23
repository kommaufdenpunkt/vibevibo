import "./mcp.css";

export const metadata = {
  title: "MCP — VibeVibo Moderator Control Panel",
  description: "Internes Panel — nur für Mitglieder des VibeVibo-Teams.",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#0a0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function McpRootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <meta name="theme-color" content="#060611" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="mcp-body-root">{children}</body>
    </html>
  );
}
