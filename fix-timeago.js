const fs = require("fs");
const path = "components/video-watch.tsx";
let content = fs.readFileSync(path, "utf8");

function apply(old, next, label) {
  if (!content.includes(old)) throw new Error(`Anchor not found: ${label}`);
  content = content.replace(old, next);
}

apply(
  `function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}`,
  `function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return \`\${min}m\`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return \`\${hr}h\`;
  const day = Math.floor(hr / 24);
  if (day < 7) return \`\${day}d\`;
  const week = Math.floor(day / 7);
  if (week < 4) return \`\${week}w\`;
  const month = Math.floor(day / 30);
  if (month < 12) return \`\${month}mo\`;
  return \`\${Math.floor(day / 365)}y\`;
}`,
  "avatarColor function"
);

apply(
  `                            <div className="comment-head">
                              <strong>{c.display_name}</strong>
                              <span>{formatDate(c.created_at)}</span>
                            </div>`,
  `                            <div className="comment-head">
                              <strong>{c.display_name}</strong>
                              <span>{timeAgo(c.created_at)}</span>
                            </div>`,
  "top comment timestamp"
);

apply(
  `                                  <div className="comment-head">
                                    <strong>{r.display_name}</strong>
                                    <span>{formatDate(r.created_at)}</span>
                                  </div>`,
  `                                  <div className="comment-head">
                                    <strong>{r.display_name}</strong>
                                    <span>{timeAgo(r.created_at)}</span>
                                  </div>`,
  "reply timestamp"
);

fs.writeFileSync(path, content, "utf8");
console.log("timeAgo applied successfully.");
