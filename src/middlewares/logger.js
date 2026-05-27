const logger = (req, res, next) => {
  const time = new Date().toLocaleString();
  const logMessage = `[${time}] ${req.method} ${req.originalUrl}`;

  console.log(logMessage); 

  next();
};

module.exports = logger;