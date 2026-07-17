import jwt from "jsonwebtoken";

export function verifyAuth(request: Request): { id: string; username: string; role: string; sessionId?: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { id: string; username: string; role: string; sessionId?: string };
  } catch {
    return null;
  }
}
