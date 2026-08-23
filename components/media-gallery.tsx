"use client";

import { useEffect, useMemo, useState } from "react";
type Video = { id: string; name: string; createdTime: string; thumbnailLink?: string };

export default function MediaGallery() {
  const [videos, setVideos] = useState<Video[]>([]); const [query, setQuery] = useState(""); const [error, setError] = useState(""); const [active, setActive] = useState<Video | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/videos").then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setVideos(body.videos); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => videos.filter((video) => video.name.toLowerCase().includes(query.toLowerCase())), [videos, query]);
  const date = (value: string) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
  return <>
    <header className="header"><a href="#top" className="wordmark"><b>FOURSQUARE</b><span>GOSPEL CHURCH</span></a><nav><a href="#videos">Videos</a><a href="#about">About</a><a href="#connect">Connect</a></nav><a className="header-link" href="#videos">Browse media <span>↗</span></a></header>
    <main id="top">
      <section className="hero"><div><p className="kicker">Foursquare Media Gallery</p><h1>Worship worth<br /><em>revisiting.</em></h1><p className="lede">A dedicated home for Foursquare Gospel Church videos, available to watch, download, and share.</p><a className="button primary" href="#videos">Explore recordings <span>↓</span></a></div><div className="hero-frame"><div className="light light-one"/><div className="light light-two"/><div className="frame-copy"><span>FOURSQUARE</span><strong>Media<br />Gallery</strong><small>Every recording, in one place.</small></div></div></section>
      <section className="gallery" id="videos"><div className="heading"><div><p className="kicker">Media library</p><h2>Watch the latest.</h2></div><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recordings" aria-label="Search recordings" /></label></div>
        {loading && <div className="video-grid" aria-label="Loading videos">{[1,2,3,4].map((item) => <div className="skeleton" key={item}/>)}</div>}
        {!loading && error && <div className="state error"><strong>We could not load the media folder.</strong><p>{error}</p><p>Set the Google Drive values in <code>.env.local</code>, then restart the site.</p></div>}
        {!loading && !error && visible.length === 0 && <div className="state"><strong>{videos.length ? "No recordings match your search." : "The gallery is ready for its first recording."}</strong><p>{videos.length ? "Try another search term." : "When a video is uploaded to the connected Drive folder, it will appear here automatically."}</p></div>}
        {!loading && !error && visible.length > 0 && <div className="video-grid">{visible.map((video) => <article className="video" key={video.id}><button className="thumbnail" onClick={() => setActive(video)} aria-label={`Watch ${video.name}`}>{video.thumbnailLink ? <img src={video.thumbnailLink} alt="" /> : <div className="thumbnail-fallback"/>}<span className="play">▶</span></button><div className="video-meta"><h3>{video.name}</h3><p>Foursquare Gospel Church <span>•</span> {date(video.createdTime)}</p><div><span>Views and reactions available soon</span><button aria-label={`Like ${video.name}`}>♡</button></div></div></article>)}</div>}
      </section>
      <section className="about" id="about"><p className="kicker">Made for the moments</p><h2>One place for every gathering.</h2><p>New uploads are discovered from the church media folder and presented here for a simple, uninterrupted viewing experience.</p></section>
    </main>
    <footer id="connect"><div className="wordmark"><b>FOURSQUARE</b><span>GOSPEL CHURCH</span></div><div><p className="footer-title">Stay connected</p><a href="mailto:media@foursquaregospelchurch.org">media@foursquaregospelchurch.org</a><a href="#top">Facebook</a><a href="#top">Instagram</a><a href="#top">YouTube</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Foursquare Gospel Church</span><span>Built by Bluezo Tech</span></div></footer>
    {active && <div className="modal" role="dialog" aria-modal="true" aria-label={active.name}><button className="close" onClick={() => setActive(null)} aria-label="Close player">×</button><div className="player"><iframe src={`https://drive.google.com/file/d/${active.id}/preview`} title={active.name} allow="autoplay" allowFullScreen /></div><div className="modal-footer"><div><p className="kicker">Now playing</p><h2>{active.name}</h2></div><a className="button primary" href={`https://drive.usercontent.google.com/download?id=${active.id}&export=download&confirm=t`} target="_blank" rel="noreferrer">Download <span>↓</span></a></div></div>}
  </>;
}
