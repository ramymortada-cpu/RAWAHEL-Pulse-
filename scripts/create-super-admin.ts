import { hashPassword } from "../server/_core/session";
import { upsertUser } from "../server/db";

const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME || "مدير نبض رواحل";

if (!email || !password) {
  throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required");
}

if (password.length < 12) {
  throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
}

const normalizedEmail = email.trim().toLowerCase();
const passwordHash = await hashPassword(password);

await upsertUser({
  openId: `local:${normalizedEmail}`,
  name,
  email: normalizedEmail,
  passwordHash,
  loginMethod: "local_password",
  role: "super_admin",
  status: "active",
  lastSignedIn: new Date(),
});

console.log(`Super admin ready: ${normalizedEmail}`);
