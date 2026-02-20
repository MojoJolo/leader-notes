class AIProvider {
  async summarize(notes) {
    throw new Error("summarize() not implemented");
  }

  async ask(notes, question) {
    throw new Error("ask() not implemented");
  }
}

module.exports = AIProvider;
