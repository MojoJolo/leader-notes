const Anthropic = require("@anthropic-ai/sdk");
const AIProvider = require("./provider.cjs");
const { SUMMARY_TEMPLATE } = require("./config.cjs");

class ClaudeProvider extends AIProvider {
  constructor() {
    super();
    this.client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async summarize(notes) {
    const prompt = SUMMARY_TEMPLATE(notes);

    const response = await this.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0]?.text;

    if (!content) {
      throw new Error("No content returned from Claude API");
    }

    return content;
  }
}

module.exports = ClaudeProvider;
