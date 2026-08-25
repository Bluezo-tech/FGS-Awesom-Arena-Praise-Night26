const fs = require("fs");
const path = "components/video-watch.tsx";
let content = fs.readFileSync(path, "utf8");

function apply(old, next, label) {
  if (!content.includes(old)) throw new Error(`Anchor not found: ${label}`);
  content = content.replace(old, next);
}

apply(
  `type Comment = { id: string; display_name: string; body: string; created_at: string };`,
  `type Comment = { id: string; display_name: string; body: string; created_at: string; parent_id?: string | null };

const AVATAR_COLORS = ["#d4a94e", "#6b8f71", "#8f6b9a", "#c96b6b", "#5f8fb0", "#b08f5f"];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}`,
  "Comment type"
);

apply(
  `  const [visibleComments, setVisibleComments] = useState(5);`,
  `  const [visibleComments, setVisibleComments] = useState(5);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyBody, setReplyBody] = useState("");`,
  "visibleComments state"
);

apply(
  `      setCommentNotice("Comment posted!");
    } catch (err) {
      setCommentNotice(err instanceof Error ? err.message : "Could not submit comment.");
    }
  };`,
  `      setCommentNotice("Comment posted!");
    } catch (err) {
      setCommentNotice(err instanceof Error ? err.message : "Could not submit comment.");
    }
  };
  const handleReply = async (parentId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(\`/api/videos/\${videoId}/comments\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: replyName, body: replyBody, parent_id: parentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setComments((prev) => [...prev, body.comment]);
      setReplyName("");
      setReplyBody("");
      setReplyingTo(null);
    } catch (err) {
      setCommentNotice(err instanceof Error ? err.message : "Could not submit reply.");
    }
  };`,
  "handleComment end"
);

apply(
  `                <div className="comments-list">
                  {comments.length === 0 && <p className="no-comments">No comments yet. Be the first to share your thoughts.</p>}
                  {comments.slice(0, visibleComments).map((c) => (
                    <div className="comment" key={c.id}>
                      <div className="comment-head">
                        <strong>{c.display_name}</strong>
                        <span>{formatDate(c.created_at)}</span>
                      </div>
                      <p>{c.body}</p>
                    </div>
                  ))}
                </div>
                {comments.length > visibleComments && (
                  <button
                    type="button"
                    className="comments-load-more"
                    onClick={() => setVisibleComments((v) => v + 5)}
                  >
                    Show more comments
                  </button>
                )}`,
  `                <div className="comments-list">
                  {comments.length === 0 && <p className="no-comments">No comments yet. Be the first to share your thoughts.</p>}
                  {comments.filter((c) => !c.parent_id).slice().reverse().slice(0, visibleComments).map((c) => {
                    const replies = comments.filter((r) => r.parent_id === c.id);
                    return (
                      <div className="comment-thread" key={c.id}>
                        <div className="comment">
                          <div className="comment-avatar" style={{ background: avatarColor(c.display_name) }}>
                            {c.display_name.trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="comment-body">
                            <div className="comment-head">
                              <strong>{c.display_name}</strong>
                              <span>{formatDate(c.created_at)}</span>
                            </div>
                            <p>{c.body}</p>
                            <button
                              type="button"
                              className="comment-reply-btn"
                              onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                            >
                              Reply
                            </button>
                            {replyingTo === c.id && (
                              <form className="reply-form" onSubmit={(e) => handleReply(c.id, e)}>
                                <input
                                  value={replyName}
                                  onChange={(e) => setReplyName(e.target.value)}
                                  placeholder="Your name"
                                  required
                                  minLength={2}
                                  maxLength={80}
                                />
                                <textarea
                                  value={replyBody}
                                  onChange={(e) => setReplyBody(e.target.value)}
                                  placeholder={\`Reply to \${c.display_name}…\`}
                                  required
                                  minLength={2}
                                  maxLength={2000}
                                />
                                <div className="reply-form-actions">
                                  <button type="button" className="button ghost" onClick={() => setReplyingTo(null)}>Cancel</button>
                                  <button className="button primary" type="submit">Post reply</button>
                                </div>
                              </form>
                            )}
                          </div>
                        </div>
                        {replies.length > 0 && (
                          <div className="comment-replies">
                            {replies.map((r) => (
                              <div className="comment comment-reply" key={r.id}>
                                <div className="comment-avatar comment-avatar-sm" style={{ background: avatarColor(r.display_name) }}>
                                  {r.display_name.trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="comment-body">
                                  <div className="comment-head">
                                    <strong>{r.display_name}</strong>
                                    <span>{formatDate(r.created_at)}</span>
                                  </div>
                                  <p>{r.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {comments.filter((c) => !c.parent_id).length > visibleComments && (
                  <button
                    type="button"
                    className="comments-load-more"
                    onClick={() => setVisibleComments((v) => v + 5)}
                  >
                    Show more comments
                  </button>
                )}`,
  "comments-list block"
);

fs.writeFileSync(path, content, "utf8");
console.log("All 4 edits applied successfully.");
