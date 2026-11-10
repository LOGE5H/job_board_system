const pdfParse = require('pdf-parse');
const fs = require('fs');

async function extractPdfText(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (err) {
    console.error('PDF extract error:', err.message);
    return '';
  }
}

module.exports = { extractPdfText };
