const CodexCLIProvider = require("./codex-cli.cjs");
const ZAIProvider = require("./z-ai.cjs");
const ClaudeProvider = require("./claude.cjs");
const { AI_PROVIDER } = require("./config.cjs");

// AI provider is configured in config.cjs
let ai;
switch (AI_PROVIDER) {
  case 'claude':
    ai = new ClaudeProvider();
    break;
  case 'zai':
    ai = new ZAIProvider();
    break;
  case 'codex':
  default:
    ai = new CodexCLIProvider();
    break;
}

module.exports = ai;
