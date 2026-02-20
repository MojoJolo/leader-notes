const { join } = require("path");

const SUMMARY_TEMPLATE = (notes) => `I am a manager and I am leading the meeting for my team.
Be my secretary and format what I send so it will be more readable.
Write like a senior engineer writing personal notes.
Direct. Dense. No fluff.

You are formatting raw meeting notes.

Rules:
- No introductions.
- No explanations.
- No commentary.
- No closing remarks.
- No corporate language.
- Output only the structured notes.

Notes:
${notes.join("\n\n")}`;

module.exports = {
  SUMMARY_TEMPLATE
};
