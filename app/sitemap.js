// 🗺 sitemap.xml — dynamisch generiert.
// Listet NUR fertige, content-reiche, öffentliche Pages.
// AdSense / Googlebot wird so explizit auf die "guten" Pages gelenkt und
// vermeidet automatisch alles unter /mcp/, /admin/, /api/ und alle
// "Coming-Soon"-Sections.

export default function sitemap() {
  const base = "https://vibevibo.de";
  const now = new Date();

  // 🌳 Statische Public-Pages mit echtem Content
  const staticPages = [
    { url: `${base}/`,              priority: 1.0, changeFrequency: "daily"   },
    { url: `${base}/about`,         priority: 0.9, changeFrequency: "monthly" },
    { url: `${base}/faq`,           priority: 0.8, changeFrequency: "monthly" },
    { url: `${base}/hilfe`,         priority: 0.8, changeFrequency: "monthly" },
    { url: `${base}/neu`,           priority: 0.7, changeFrequency: "weekly"  },
    { url: `${base}/agb`,           priority: 0.4, changeFrequency: "yearly"  },
    { url: `${base}/datenschutz`,   priority: 0.4, changeFrequency: "yearly"  },
    { url: `${base}/impressum`,     priority: 0.3, changeFrequency: "yearly"  },
    { url: `${base}/installieren`,  priority: 0.5, changeFrequency: "monthly" },
    { url: `${base}/coms`,          priority: 0.8, changeFrequency: "daily"   },
  ];

  return staticPages.map((p) => ({
    url: p.url,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
