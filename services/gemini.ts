
import { GoogleGenAI } from "@google/genai";
import { WatchlistToken } from "../types";

// Corrected: Initializing GoogleGenAI exclusively with process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTokenSet = async (tokens: WatchlistToken[]) => {
  if (!tokens.length) return "No tokens to analyze.";

  const prompt = `
    Analyze this list of Solana tokens from a trader's perspective. 
    Focus on market cap growth (Max vs Initial vs Current) and volume trends.
    Identify the top 3 most promising tokens based on these metrics.
    Keep the summary concise and professional.

    Data:
    ${tokens.map(t => `${t.symbol}: Initial MC $${t.initialMcap.toLocaleString()}, Max MC $${t.maxMcap.toLocaleString()}, Current MC $${t.currentMcap.toLocaleString()}, 24h Vol $${t.volume24h.toLocaleString()}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert crypto market analyst specializing in Solana on-chain data.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analysis currently unavailable.";
  }
};
