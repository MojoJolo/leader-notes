const CodexCLIProvider = require("./codex-cli.cjs");
const ZAIProvider = require("./z-ai.cjs");

// Swap this line to change the AI provider
// Option 1: Use Codex CLI
const ai = new CodexCLIProvider();

// Option 2: Use Z AI (remember to set your API key in z-ai.cjs)
// const ai = new ZAIProvider();

module.exports = ai;
