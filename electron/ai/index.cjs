const CodexCLIProvider = require("./codex-cli.cjs");

// Swap this line to change the AI provider
const ai = new CodexCLIProvider();

module.exports = ai;
