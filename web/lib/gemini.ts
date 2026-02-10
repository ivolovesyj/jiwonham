import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const AI_MODEL = 'gemini-2.5-flash'

export function getModel() {
  return genAI.getGenerativeModel({
    model: AI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })
}

// Gemini에서 JSON 응답을 안전하게 파싱
export function parseGeminiJSON(text: string): Record<string, unknown> {
  try {
    // Gemini가 가끔 ```json ... ``` 로 감싸는 경우 처리
    const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    return JSON.parse(cleaned)
  } catch {
    console.error('Failed to parse Gemini response:', text)
    return {}
  }
}
