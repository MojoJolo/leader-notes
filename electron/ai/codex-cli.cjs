const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const AIProvider = require("./provider.cjs");
const { SUMMARY_TEMPLATE } = require("./config.cjs");

class CodexCLIProvider extends AIProvider {
  summarize(notes) {
    const prompt = SUMMARY_TEMPLATE(notes);

    const outFile = path.join(os.tmpdir(), `leader-notes-${Date.now()}.txt`);

    return new Promise((resolve, reject) => {
      const child = spawn("codex", [
        "exec", "-",
        "--output-last-message", outFile,
        "--skip-git-repo-check"
      ], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env }
      });

      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });

      child.on("error", (err) => reject(new Error(err.message)));

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `codex exited with code ${code}`));
          return;
        }
        try {
          const result = fs.readFileSync(outFile, "utf-8").trim();
          fs.unlinkSync(outFile);
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to read output: ${err.message}`));
        }
      });

      child.stdin.write(prompt);
      child.stdin.end();
    });
  }
}

module.exports = CodexCLIProvider;
