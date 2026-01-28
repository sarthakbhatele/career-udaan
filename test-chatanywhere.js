const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: "sk-n1oZatncrNsHVcpBK0Wvo8nz6CqsNNjR93TfEZY2SOkMvz49",
  baseURL: "https://api.chatanywhere.tech/v1"
});

async function testAPI() {
  const start = Date.now();
  
  try {
    console.log("🧪 Testing ChatAnywhere API...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Say 'Hello! API is working!' and tell me your model name."
        }
      ]
    });

    const duration = (Date.now() - start) / 1000;
    
    console.log(`✅ SUCCESS!`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📝 Response: ${response.choices[0].message.content}`);
    console.log(`📊 Tokens Used: ${response.usage.total_tokens}`);
    
  } catch (error) {
    console.error("❌ FAILED:", error.message);
  }
}

testAPI();