// const { GoogleGenerativeAI } = require("@google/generative-ai");

// // PASTE YOUR ACTUAL KEY INSIDE THE QUOTES BELOW
// const genAI = new GoogleGenerativeAI("AIzaSyAdHCIjfBRO5aCxJuDhv7mvtC8B3qLdXr4"); 
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// async function run() {
//   try {
//     console.log("Testing gemini-2.5-flash-lite...");
//     const result = await model.generateContent("Just say 'Online'");
//     console.log("✅ SUCCESS:", result.response.text());
//   } catch (error) {
//     console.error("❌ FAILED:", error.message);
//   }
// }

// run();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSy."); // Your Key

// TRY THE 4B MODEL:
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

async function run() {
  const start = Date.now();
  try {
    console.log("Testing gemini-2.0-flash-lite");
    // Give it a slightly complex task to ensure it's not "dumb"
    const prompt = `Generate a JSON list of 2 coding skills. Format: { "skills": ["a", "b"] } and tell the RPD FOR  model gemini-2.0-flash-lite`;
    
    const result = await model.generateContent(prompt);
    const duration = (Date.now() - start) / 1000;
    
    console.log(`⏱️ Duration: ${duration}s`);
    console.log("📝 Output:", result.response.text());
  } catch (error) {
    console.error("❌ FAILED:", error.message);
  }
}

run();