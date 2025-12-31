/**
 * Mock AI generator (for finishing the MVP TODAY).
 * Replace with real LLM (LLaMA/Ollama/OpenAI) by swapping this function.
 */

const vocabByGrade = {
  4: ["family", "school", "friend", "happy", "sad", "big", "small"],
  5: ["weather", "holiday", "city", "country", "friendly", "careful"],
  6: ["practice", "healthy", "important", "different", "example"],
  7: ["present simple", "past simple", "comparative", "superlative"],
  8: ["present perfect", "modal verbs", "passive voice"],
  9: ["reported speech", "conditional", "relative clauses"],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateQuestions({ grade = 5, skill = "vocabulary", difficulty = "easy", count = 10 } = {}) {
  const bank = vocabByGrade[grade] || vocabByGrade[5];
  const out = [];
  for (let i = 0; i < count; i++) {
    const id = Date.now() + i;
    if (skill === "grammar") {
      const q = {
        id,
        type: "mcq",
        question: `Choose the correct option (${difficulty}): She ____ to school every day.`,
        choices: shuffle(["go", "goes", "going", "goed"]),
        correctIndex: 0, // will fix after shuffle
      };
      q.correctIndex = q.choices.indexOf("goes");
      out.push(q);
    } else if (skill === "reading") {
      const passage = "Sara has a small cat. The cat is white and friendly.";
      const q = {
        id,
        type: "mcq",
        passage,
        question: "What color is Sara's cat?",
        choices: shuffle(["white", "black", "brown", "gray"]),
        correctIndex: 0,
      };
      q.correctIndex = q.choices.indexOf("white");
      out.push(q);
    } else {
      const word = pick(bank);
      const q = {
        id,
        type: "mcq",
        question: `Choose the best word: ${word} (meaning / usage).`,
        choices: shuffle([word, pick(bank), pick(bank), pick(bank)]),
        correctIndex: 0,
      };
      q.correctIndex = q.choices.indexOf(word);
      out.push(q);
    }
  }
  return out;
}
