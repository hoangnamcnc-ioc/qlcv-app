// Sinh khóa cho máy chủ riêng: JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY (JWT HS256 hạn 10 năm) + các mật khẩu ngẫu nhiên.
// Chạy:  node deploy/gen-keys.mjs > keys.env     (KHÔNG commit keys.env; sao lưu nơi an toàn)
import { randomBytes, createHmac } from "node:crypto";
const b64u = b => Buffer.from(b).toString("base64url");
const rnd = n => randomBytes(n).toString("base64url").replace(/[-_]/g, "x").slice(0, n);
const jwt = (payload, secret) => {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(payload));
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
};
const secret = rnd(48);
const iat = Math.floor(Date.now() / 1000), exp = iat + 10 * 365 * 24 * 3600;
const out = {
  POSTGRES_PASSWORD: rnd(32),
  AUTHENTICATOR_PASSWORD: rnd(32),
  JWT_SECRET: secret,
  ANON_KEY: jwt({ role: "anon", iss: "supabase", iat, exp }, secret),
  SERVICE_ROLE_KEY: jwt({ role: "service_role", iss: "supabase", iat, exp }, secret),
  CRON_SECRET: rnd(40),
};
for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
