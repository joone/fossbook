const express = require("express");

function serve(config, port) {
  const app = express();
  const PORT = port || process.env.PORT || 3000;

  const basePath = config.basePath || "/";
  app.use(basePath, express.static(config.dev.outdir));

  // Redirect root to basePath if basePath is not "/"
  if (basePath !== "/") {
    app.get("/", (req, res) => res.redirect(basePath));
  }

  app.listen(PORT, () => {
    console.log(`fossbook dev server running at http://localhost:${PORT}`);
  });
}

module.exports = { serve };
