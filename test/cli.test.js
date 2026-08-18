const assert = require("assert");
const { execFileSync } = require("child_process");
const path = require("path");

describe("fossbook CLI", () => {
  it("prints the package version", () => {
    const output = execFileSync(process.execPath, [path.join(__dirname, "../bin/fossbook.js"), "--version"], {
      encoding: "utf8",
    });

    assert.strictEqual(output.trim(), `fossbook v${require("../package.json").version}`);
  });
});
