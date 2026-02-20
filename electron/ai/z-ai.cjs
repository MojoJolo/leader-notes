const https = require("https");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const AIProvider = require("./provider.cjs");

class ZAIProvider extends AIProvider {
  constructor() {
    super();
    this.apiKey = process.env.ZAI_API_KEY;
  }

  summarize(notes) {
    const prompt = `I am a manager and I am leading the meeting for my team.
Be my secretary and format what I send so it will be more readable.

You are formatting raw meeting notes.

Rules:
- No introductions.
- No explanations.
- No commentary.
- No closing remarks.
- Output only the structured notes.

Notes:
${notes.join("\n\n")}`;

    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: "glm-4.7-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      const options = {
        hostname: "api.z.ai",
        port: 443,
        path: "/api/paas/v4/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept-Language": "en-US,en"
        }
      };

      const req = https.request(options, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(body);

            if (res.statusCode !== 200) {
              reject(new Error(`Z AI API error: ${res.statusCode} - ${response.error?.message || body}`));
              return;
            }

            // Extract content from Z AI response
            const content = response.choices?.[0]?.message?.content;

            if (!content) {
              reject(new Error("No content returned from Z AI API"));
              return;
            }

            resolve(content);
          } catch (err) {
            reject(new Error(`Failed to parse Z AI response: ${err.message}`));
          }
        });
      });

      req.on("error", (err) => {
        reject(new Error(`Z AI request failed: ${err.message}`));
      });

      req.write(data);
      req.end();
    });
  }
}

module.exports = ZAIProvider;
