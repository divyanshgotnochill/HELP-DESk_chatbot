import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFile = path.resolve(__dirname, "../../storage/users.json");
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-auth-secret-change-me";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
}

async function getUsers() {
  const raw = await fs.readFile(usersFile, "utf-8");
  return JSON.parse(raw);
}

async function saveUsers(users) {
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
}

function sanitizeUser(user) {
  return {
    email: user.email,
    role: user.role,
    name: user.name,
    studentId: user.studentId || null,
    enrollmentNumber: user.enrollmentNumber || null,
    admissionYear: user.admissionYear || null,
  };
}

function createPasswordHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

function generateStudentId(users, admissionYear) {
  const year = String(admissionYear || new Date().getFullYear());
  const count = users.filter((entry) => entry.role === "student" && String(entry.admissionYear || "").startsWith(year)).length + 1;
  return `ABVV-${year}-${String(count).padStart(4, "0")}`;
}

export async function listStudents() {
  const users = await getUsers();
  return users
    .filter((entry) => entry.role === "student")
    .map(sanitizeUser)
    .sort((left, right) => right.studentId.localeCompare(left.studentId));
}

export async function authenticateUser(email, password) {
  const users = await getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return null;
  }

  const hash = createPasswordHash(password, user.salt);
  if (hash !== user.passwordHash) {
    return null;
  }

  return sanitizeUser(user);
}

export function createAuthToken(user) {
  const payload = {
    sub: user.email,
    role: user.role,
    name: user.name,
    studentId: user.studentId || null,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (signPayload(encodedPayload) !== signature) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  if (!payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

export async function createStudentAccount({ name, email, enrollmentNumber = "", admissionYear }) {
  const trimmedName = name?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedEnrollment = enrollmentNumber.trim();
  const year = String(admissionYear || new Date().getFullYear());

  if (!trimmedName || !normalizedEmail) {
    const error = new Error("Student name and registered email are required.");
    error.status = 400;
    throw error;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    const error = new Error("Please enter a valid registered email.");
    error.status = 400;
    throw error;
  }

  const users = await getUsers();
  const emailTaken = users.some((entry) => entry.email.toLowerCase() === normalizedEmail);
  if (emailTaken) {
    const error = new Error("A user with this email already exists.");
    error.status = 409;
    throw error;
  }

  const studentId = generateStudentId(users, year);
  const tempPassword = generateTempPassword();
  const salt = crypto.randomBytes(16).toString("hex");

  const student = {
    email: normalizedEmail,
    name: trimmedName,
    role: "student",
    studentId,
    enrollmentNumber: normalizedEnrollment || null,
    admissionYear: year,
    salt,
    passwordHash: createPasswordHash(tempPassword, salt),
  };

  users.push(student);
  await saveUsers(users);

  return {
    user: sanitizeUser(student),
    tempPassword,
  };
}
