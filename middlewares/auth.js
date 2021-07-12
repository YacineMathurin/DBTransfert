const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function (req, res, next) {
  const token = req.header("x-auth-token");
  if (!token)
    return res
      .status(401)
      .json({ res: false, message: "Access denied, token missing !" });

  try {
    const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
    // put decoded token payload in the request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send();
  }
};
