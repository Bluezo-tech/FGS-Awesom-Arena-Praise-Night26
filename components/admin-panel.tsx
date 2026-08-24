"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { cleanTitleFromFilename, formatDate } from "@/lib/utils";

type Settings = {
  church_name: string;
  media_name: string;
  logo_url?: string;
  hero_title: string;
  hero_description?: string;
  footer_text?: string;
  social_links?: Record<string, string>;
};

type VideoMeta = {
  drive_file_id: string;
  title?: string;
  description_markdown?: string;
  category?: string;
  thumbnail_url?: string;
  playback_url?: string;
  featured?: boolean;
  published?: boolean;
  display_order?: number;
  allow_download?: boolean;
};

type DriveVideo = {
  id: string;
  name: string;
  createdTime: string;
  thumbnailLink?: string;
  meta?: VideoMeta | null;
};

type Comment = {
  id: string;
  drive_file_id: string;
  display_name: string;
  body: string;
  approved: boolean;
  created_at: string;
};

const emptySettings: Settings = {
  church_name: "Foursquare Gospel Church",
  media_name: "Foursquare Media",
  hero_title: "Every gathering, kept close.",
  hero_description: "",
};

const emptyVideo: VideoMeta = {
  drive_file_id: "",
  title: "",
  description_markdown: "",
  category: "",
  thumbnail_url: "",
  playback_url: "",
  published: true,
  allow_download: true,
};

export default function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<"site" | "videos" | "comments">("site");
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [videos, setVideos] = useState<DriveVideo[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editing, setEditing] = useState<VideoMeta | null>(null);
  const [video, setVideo] = useState<VideoMeta>(emptyVideo);
  const [notice, setNotice] = useState("");
  const [loadingVideos, setLoadingVideos] = useState(false);

  const supabase = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  })();

  const request = async (path: string, options?: RequestInit) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    return body;
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return setNotice("Add the Supabase URL and anon key to .env.local first.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return setNotice(error?.message ?? "Sign in failed.");
    setToken(data.session.access_token);
    try {
      const result = await request("/api/admin/settings");
      setSettings(result.settings);
      setNotice("Signed in. You can now edit the public site.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Access denied.");
    }
  };

  const loadVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch("/api/videos");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setVideos(body.videos ?? []);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not load videos.");
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  const loadComments = useCallback(async () => {
    try {
      const result = await request("/api/admin/comments");
      setComments(result.comments ?? []);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not load comments.");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === "videos") loadVideos();
    if (tab === "comments") loadComments();
  }, [token, tab, loadVideos, loadComments]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      setNotice("Site settings saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  const startEdit = (driveVideo: DriveVideo) => {
    const meta: VideoMeta = driveVideo.meta ?? {
      drive_file_id: driveVideo.id,
      title: "",
      description_markdown: "",
      category: "",
      thumbnail_url: "",
      playback_url: "",
      featured: false,
      published: true,
      allow_download: true,
    };
    const next: VideoMeta = {
      drive_file_id: driveVideo.id,
      title: meta.title ?? "",
      description_markdown: meta.description_markdown ?? "",
      category: meta.category ?? "",
      thumbnail_url: meta.thumbnail_url ?? "",
      playback_url: meta.playback_url ?? "",
      featured: meta.featured ?? false,
      published: meta.published ?? true,
      display_order: meta.display_order ?? undefined,
      allow_download: meta.allow_download ?? true,
    };
    setEditing(next);
    setVideo(next);
  };

  const saveVideo = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/videos", { method: "PATCH", body: JSON.stringify(video) });
      setNotice("Video metadata saved. It will override the Drive title and settings.");
      setEditing(null);
      loadVideos();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save video.");
    }
  };

  const approveComment = async (comment: Comment, approved: boolean) => {
    try {
      await request("/api/admin/comments", {
        method: "PATCH",
        body: JSON.stringify({ id: comment.id, approved }),
      });
      loadComments();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update comment.");
    }
  };

  const deleteComment = async (comment: Comment) => {
    try {
      await request("/api/admin/comments", {
        method: "DELETE",
        body: JSON.stringify({ id: comment.id }),
      });
      loadComments();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not delete comment.");
    }
  };

  if (!token) {
    return (
      <main className="admin-shell">
        <section className="admin-auth">
          <div className="wordmark"><b>FOURSQUARE</b><span>ADMIN</span></div>
          <h1>Manage your media.</h1>
          <p>Sign in with the Supabase administrator account configured for this site.</p>
          <form onSubmit={signIn}>
            <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
            <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
            <button className="admin-save">Sign in</button>
          </form>
          {notice && <p className="admin-notice">{notice}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="wordmark"><b>FOURSQUARE</b><span>CMS</span></div>
        <nav>
          <button className={tab === "site" ? "active" : ""} onClick={() => setTab("site")}>Site content</button>
          <button className={tab === "videos" ? "active" : ""} onClick={() => setTab("videos")}>Videos</button>
          <button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>Comments</button>
        </nav>
        <button className="sign-out" onClick={() => setToken("")}>Sign out</button>
      </header>
      <p className="admin-notice">{notice}</p>

      {tab === "site" && (
        <section className="admin-card">
          <div>
            <p className="admin-kicker">Brand and homepage</p>
            <h1>Public site content</h1>
            <p>All visible church identity, logo, hero copy, footer copy, and social links live here.</p>
          </div>
          <form className="admin-form" onSubmit={saveSettings}>
            <label>Church name<input value={settings.church_name} onChange={(e) => setSettings({ ...settings, church_name: e.target.value })} required /></label>
            <label>Media platform name<input value={settings.media_name} onChange={(e) => setSettings({ ...settings, media_name: e.target.value })} required /></label>
            <label>Logo image URL<input value={settings.logo_url ?? ""} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} placeholder="https://..." /></label>
            <label>Hero title<input value={settings.hero_title} onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })} required /></label>
            <label>Hero description<textarea value={settings.hero_description ?? ""} onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })} /></label>
            <label>Footer text<input value={settings.footer_text ?? ""} onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })} /></label>
            <button className="admin-save">Save changes</button>
          </form>
        </section>
      )}

      {tab === "videos" && (
        <section className="admin-card">
          <div>
            <p className="admin-kicker">Drive metadata</p>
            <h1>Control each video</h1>
            <p>Click a video to edit its public details. Custom titles always override the automatic filename title.</p>
          </div>

          {loadingVideos && <div className="admin-video-grid">{[1, 2, 3, 4].map((i) => <div className="admin-video-skeleton" key={i} />)}</div>}

          {!loadingVideos && videos.length === 0 && (
            <div className="state">
              <strong>No videos found.</strong>
              <p>Upload videos to the connected Google Drive folder and they will appear here.</p>
            </div>
          )}

          {!loadingVideos && videos.length > 0 && (
            <div className="admin-video-grid">
              {videos.map((v) => {
                const title = v.meta?.title || cleanTitleFromFilename(v.name);
                const thumb = v.meta?.thumbnail_url || v.thumbnailLink;
                return (
                  <button className="admin-video-card" key={v.id} onClick={() => startEdit(v)}>
                    <div className="admin-video-thumb">
                      {thumb ? <img src={thumb} alt="" /> : <div className="thumbnail-fallback" />}
                      {v.meta?.featured && <span className="admin-featured-badge">★ Featured</span>}
                      {!v.meta?.published && <span className="admin-unpublished-badge">Draft</span>}
                    </div>
                    <div className="admin-video-meta">
                      <strong>{title}</strong>
                      <span>{formatDate(v.createdTime)}</span>
                      {v.meta?.category && <span className="admin-category">{v.meta.category}</span>}
                    </div>
                    <span className="admin-edit-btn">Edit</span>
                  </button>
                );
              })}
            </div>
          )}

          {editing && (
            <div className="admin-editor">
              <div className="admin-editor-head">
                <h2>Edit video</h2>
                <button className="admin-close" onClick={() => setEditing(null)}>×</button>
              </div>
              <form className="admin-form" onSubmit={saveVideo}>
                <label>Public title<input value={video.title ?? ""} onChange={(e) => setVideo({ ...video, title: e.target.value })} placeholder="Leave blank to auto-generate from filename" /></label>
                <label>Rich description (Markdown)<textarea value={video.description_markdown ?? ""} onChange={(e) => setVideo({ ...video, description_markdown: e.target.value })} placeholder="Write the public description using Markdown." /></label>
                <label>Category<input value={video.category ?? ""} onChange={(e) => setVideo({ ...video, category: e.target.value })} placeholder="e.g. Praise Night, Worship, Choir" /></label>
                <label>Custom thumbnail URL<input value={video.thumbnail_url ?? ""} onChange={(e) => setVideo({ ...video, thumbnail_url: e.target.value })} placeholder="https://... (optional)" /></label>
                <label>Premium player URL (optional)<input value={video.playback_url ?? ""} onChange={(e) => setVideo({ ...video, playback_url: e.target.value })} placeholder="Mux, Cloudflare Stream, Bunny Stream, or YouTube playback URL" /></label>
                <label>Display order<input type="number" value={video.display_order ?? ""} onChange={(e) => setVideo({ ...video, display_order: e.target.value ? Number(e.target.value) : undefined })} placeholder="Lower numbers appear first" /></label>
                <div className="admin-toggles">
                  <label><input type="checkbox" checked={video.featured ?? false} onChange={(e) => setVideo({ ...video, featured: e.target.checked })} /> Featured</label>
                  <label><input type="checkbox" checked={video.published ?? true} onChange={(e) => setVideo({ ...video, published: e.target.checked })} /> Published</label>
                  <label><input type="checkbox" checked={video.allow_download ?? true} onChange={(e) => setVideo({ ...video, allow_download: e.target.checked })} /> Permit downloads</label>
                </div>
                <div className="admin-form-actions">
                  <button className="admin-save" type="submit">Save video settings</button>
                  <button className="admin-cancel" type="button" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {tab === "comments" && (
        <section className="admin-card">
          <div>
            <p className="admin-kicker">Moderation</p>
            <h1>Comments</h1>
            <p>Approve or remove visitor comments before they appear publicly.</p>
          </div>
          {comments.length === 0 && (
            <div className="state">
              <strong>No comments yet.</strong>
              <p>Visitor comments will appear here for approval.</p>
            </div>
          )}
          <div className="admin-comments-list">
            {comments.map((c) => (
              <div className={`admin-comment ${c.approved ? "" : "pending"}`} key={c.id}>
                <div className="admin-comment-head">
                  <strong>{c.display_name}</strong>
                  <span>{formatDate(c.created_at)}</span>
                  {!c.approved && <span className="admin-pending-badge">Pending</span>}
                </div>
                <p>{c.body}</p>
                <div className="admin-comment-actions">
                  {!c.approved && (
                    <button className="admin-save small" onClick={() => approveComment(c, true)}>Approve</button>
                  )}
                  {c.approved && (
                    <button className="admin-cancel small" onClick={() => approveComment(c, false)}>Unapprove</button>
                  )}
                  <button className="admin-delete small" onClick={() => deleteComment(c)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}