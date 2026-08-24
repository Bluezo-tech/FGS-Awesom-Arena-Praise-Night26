"use client";

import { useEffect, useState } from "react";

type SiteSettings = {
  church_name?: string;
  logo_url?: string;
};

// Official Foursquare Gospel Church Nigeria logo — the image already contains
// the church name/wordmark, so no separate text label is rendered alongside it.
// Editable via /admin (settings.logo_url); this is only the fallback.
const DEFAULT_LOGO_URL = "https://foursquare.org.ng/site/cms/uploads/31687402_footer-logo%20(1).png";

export default function SiteHeader() {
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((b) => {
        if (b?.settings) setSettings(b.settings);
      })
      .catch(() => {});
  }, []);

  const logoUrl = settings.logo_url || DEFAULT_LOGO_URL;

  return (
    <header className="site-header">
      <a href="/" className="wordmark">
        <img className="header-logo" src={logoUrl} alt={settings.church_name || "Foursquare Gospel Church"} />
      </a>
      <nav>
        <a href="/#library">Library</a>
        <a href="/#about">About</a>
      </nav>
      <a className="header-link" href="/#library">Browse media <span>↗</span></a>
    </header>
  );
}