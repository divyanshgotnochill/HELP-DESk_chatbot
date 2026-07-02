import { verifyAuthToken } from "../services/authService.js";

function getBearerToken(headerValue = "") {
  if (!headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice(7);
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req.headers.authorization);
  const user = verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  req.user = user;
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this resource." });
    }

    return next();
  };
}
