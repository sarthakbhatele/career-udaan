// export function buildQuizPrompt({ context, skills, difficulty, existingQuestions = [] }) {
//   const difficultyGuidance = {
//     easy: "foundational concepts, definitions, basic syntax",
//     medium: "problem-solving, debugging scenarios, design patterns",
//     hard: "system design, optimization, advanced architecture",
//   };

//   return `You are an expert technical interviewer. Generate interview questions for a candidate.

// GROUNDING CONTEXT (for industry awareness only):
// ${context}

// PRIMARY FOCUS: Generate questions testing these skills:
// ${skills.join(", ")}

// DIFFICULTY: ${difficulty}
// Focus on: ${difficultyGuidance[difficulty]}

// CONSTRAINTS:
// 1. Questions must be practical interview questions, NOT industry trivia
// 2. Test hands-on coding/design knowledge, not market facts
// 3. Each question must cover a DIFFERENT aspect of the skills
// 4. Avoid semantic overlap with existing questions

// ${existingQuestions.length > 0 ? `ALREADY GENERATED (avoid similar):
// ${existingQuestions.map((q) => `- ${q}`).join("\n")}` : ""}

// OUTPUT FORMAT (JSON only, no markdown):
// {
//   "questions": [
//     {
//       "question": "string (plain text, no code blocks - describe code instead)",
//       "options": ["A", "B", "C", "D"],
//       "correctAnswer": "string",
//       "explanation": "string",
//       "skill": "string",
//       "difficulty": "${difficulty}"
//     }
//   ]
// }

// NOTE: For code-related questions, describe the code scenario clearly in plain text rather than including actual code snippets.

// Generate 15-20 diverse questions. Stop when skill coverage is complete.`;
// }

// v2
export function buildQuizPrompt({ context, skills, difficulty, existingQuestions, batchSize = [] }) {
  const difficultyGuidance = {
    easy: "fundamental concepts, basic definitions, introductory scenarios",
    medium: "applied problem-solving, analytical thinking, practical decision-making",
    hard: "advanced strategy, complex scenarios, expert-level judgment",
  };

  return `You are an expert interviewer across ALL professional domains (technology, marketing, finance, design, management, teaching, etc.).

Generate PRACTICAL INTERVIEW QUESTIONS that test a candidate's competency in their field.

GROUNDING CONTEXT (for industry awareness ONLY - do NOT ask about this):
${context}

PRIMARY FOCUS: Test these skills through interview questions:
${skills.join(", ")}

DIFFICULTY: ${difficulty}
Focus on: ${difficultyGuidance[difficulty]}

CRITICAL RULES:
1. Questions MUST test SKILLS and COMPETENCY, not industry facts or market data
2. Ask about:
   - Concepts and principles
   - Problem-solving approaches
   - Practical scenarios
   - Best practices
   - Real-world applications
3. DO NOT ask about:
   - Market outlook, growth rates, salary ranges
   - Industry statistics or trends
   - Generic trivia
4. Questions must be domain-agnostic in structure:
   - Tech: algorithms, debugging, architecture
   - Marketing: campaign strategy, metrics, channels
   - Finance: analysis, risk assessment, valuation
   - Design: principles, user research, prototyping
   - Management: team leadership, conflict resolution, planning
5. Each question must test a DIFFERENT aspect of the skills
6. Avoid semantic overlap with existing questions

${existingQuestions.length > 0
      ? `ALREADY GENERATED (create NEW topics):
${existingQuestions.slice(-20).map((q) => `- ${q.substring(0, 100)}...`).join("\n")}`
      : ""
    }

OUTPUT FORMAT (strict JSON, no markdown):
{
  "questions": [
    {
      "question": "Clear, scenario-based question testing skill application",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A) ..." (must match exactly),
      "explanation": "Why this answer is correct and others are wrong",
      "skill": "specific skill tested",
      "difficulty": "${difficulty}"
    }
  ]
}

Generate exactly ${batchSize} diverse, skill-testing questions.`;
}