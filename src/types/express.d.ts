// Lets controllers read req.user (set by auth.middleware.ts).
declare namespace Express {
  interface Request {
    user?: { id: string; email: string };
  }
}
