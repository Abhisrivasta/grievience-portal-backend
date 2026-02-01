const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../logs.txt'); 

const logger = (req, res, next) => {
  const time = new Date().toLocaleString();
  const logMessage = `[${time}] ${req.method} ${req.originalUrl}\n`;

  // Append log to file
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });

  console.log(logMessage.trim());

  next();
};

module.exports = logger;
