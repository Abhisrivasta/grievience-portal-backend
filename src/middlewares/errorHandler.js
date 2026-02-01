const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode
    ? res.statusCode
    : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : null,
  });
};

module.exports = errorHandler;
