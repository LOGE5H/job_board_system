const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;

// Returns true if a real API key is configured (not placeholder)
function hasRealKey() {
  return API_KEY && API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' && API_KEY.length > 10;
}

// Get a Gemini model instance
function getModel(modelName = 'gemini-3.8-flash') {
  if (!hasRealKey()) return null;
  const genAI = new GoogleGenerativeAI(API_KEY);
  return genAI.getGenerativeModel({ model: modelName });
}

// Generate text with Gemini, with fallback
async function generate(prompt, fallbackFn) {
  if (!hasRealKey()) {
    return fallbackFn ? fallbackFn() : 'AI key not configured. Add GEMINI_API_KEY to .env';
  }
  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini error:', err.message);
    if (fallbackFn) return fallbackFn();
    throw err;
  }
}

// Parse JSON from Gemini response (strips markdown code fences if present)
function parseJSON(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

module.exports = { generate, parseJSON, hasRealKey, getModel };
