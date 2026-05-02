export type WordResult = {
  expected: string;
  got?: string;
  status: "correct" | "wrong" | "missing" | "extra";
};

export type ScoreResult = {
  results: WordResult[];
  correctCount: number;
  totalExpected: number;
  accuracy: number;
  isCorrect: boolean;
};

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

export function tokenize(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

export function maskSentence(text: string): string {
  return text.replace(/[A-Za-z0-9']/g, "*");
}

export function scoreSentence(truth: string, input: string): ScoreResult {
  const truthTokens = tokenize(truth);
  const inputTokens = tokenize(input);
  const max = Math.max(truthTokens.length, inputTokens.length);
  const results: WordResult[] = [];

  for (let i = 0; i < max; i++) {
    const t = truthTokens[i];
    const u = inputTokens[i];
    if (t === undefined && u !== undefined) {
      results.push({ expected: "", got: u, status: "extra" });
    } else if (u === undefined && t !== undefined) {
      results.push({ expected: t, status: "missing" });
    } else if (t !== undefined && u !== undefined) {
      results.push({
        expected: t,
        got: u,
        status: normalize(t) === normalize(u) ? "correct" : "wrong",
      });
    }
  }

  const correctCount = results.filter((r) => r.status === "correct").length;
  const totalExpected = truthTokens.length;
  const isCorrect = correctCount === totalExpected && results.every((r) => r.status === "correct");

  return {
    results,
    correctCount,
    totalExpected,
    accuracy: totalExpected === 0 ? 0 : correctCount / totalExpected,
    isCorrect,
  };
}
