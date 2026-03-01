const { join } = require("path");

// AI Provider Configuration
// Options: 'codex' or 'zai'
const AI_PROVIDER = 'codex';

const SUMMARY_TEMPLATE = (notes) => `I am a manager and I am leading the meeting for my team.
Be my secretary and format what I send so it will be more readable.

You are formatting raw meeting notes.

Rules:
- No introductions.
- No explanations.
- No commentary.
- No closing remarks.
- No corporate language.
- Output only the structured notes.
- No em dash
- bold the names
- highlight product specific technical terms

If you feel that the update is of a specific type, use this formats:
For standups:
**[opening square bracket]Team Name[closing square bracket]** <date here>

Team Name 1
- updates here
- updates here

Team Name 2
- updates here 
- updates here

---

For meetings:
**Title of the meeting**

Description and brief of the meeting.
Use bullets for better formatting.
Highlight important parts.
Use headings or subheadings for better readability.

---

Notes:
${notes.join("\n\n")}`;

const ASK_TEMPLATE = (sessionsContext, question) => `${sessionsContext}

Answer the question based on ALL the sessions above.
Provide specific details and reference which session the information came from when relevant.
If the information is not available in the sessions, say so clearly.

For formatting, highlight important parts.
Use bullets and sub bullets for better formatting.
Use headings or subheadings for better readability.

Question: ${question}`;

const EXTRACT_TEMPLATE = (note) => `Extract all issues, blockers, and pending items from the notes below.
Return ONLY a JSON array. No markdown, no code blocks, no explanation.
Each item must have:
- "category": one of "issue", "blocker", "pending"
- "text": a short description of the item

If there are no items, return [].

Notes:
${note}`;

module.exports = {
  SUMMARY_TEMPLATE,
  ASK_TEMPLATE,
  EXTRACT_TEMPLATE,
  AI_PROVIDER
};
