// backend/middleware/require-role.js
// Assumes requireAuth has already run and set req.user = { id, email, role }.

const DEFAULT_ALLOWED = ['Founder', 'Admin'];

export function requireRole(...allowed) {
  const list = allowed.length ? allowed : DEFAULT_ALLOWED;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Sign in required.',
      });
    }
    if (!list.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: `Role "${req.user.role}" cannot perform this action.`,
      });
    }
    next();
  };
}