const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      req.user = {
        id: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      res.status(401);
      next(new Error("Invalid or expired token"));
    }
  } else {
    res.status(401);
    next(new Error("No authorization token provided"));
  }
};

module.exports = authMiddleware;
