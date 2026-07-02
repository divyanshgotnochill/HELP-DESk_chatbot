import { authenticateUser, createAuthToken } from "../services/authService.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    return res.json({
      token: createAuthToken(user),
      user,
    });
  } catch (error) {
    return next(error);
  }
}

export function me(req, res) {
  res.json({ user: req.user });
}
