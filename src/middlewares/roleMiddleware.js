const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // authMiddleware must run before this
    if (!req.user || !req.user.role) {
      res.status(403);
      return next(
        new Error("User role not found in request")
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error("You are not authorized to access this resource")
      );
    }

    next();
  };
};

module.exports = roleMiddleware;
