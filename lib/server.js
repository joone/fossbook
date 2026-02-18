const express = require("express");

function serve(config, port) {
  const app = express();
  const PORT = port || process.env.PORT || 3000;

  app.use(express.static(config.dev.outdir));

  app.listen(PORT, () => {
    console.log(`fossbook dev server running at http://localhost:${PORT}`);
  });
}

module.exports = { serve };
