import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const chatWithGemini = async (message: string, history: any[], pgs: any[]) => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    You are the "StayFinder Assistant", a smart concierge for the StayFinder PG platform in India.
    Your goal is to help students and professionals find the perfect accommodation.

    PLATFORM CONTEXT:
    - We offer zero-brokerage, verified PG listings.
    - Features: WiFi, Food, AC, Gym, Laundry, CCTV, Roommate matching.
    - Locations: Pune, Mumbai, Bangalore, Nagpur, Manipal, Hyderabad, Chennai.

    CURRENT AVAILABLE PGs:
    ${JSON.stringify(pgs.map(p => ({
      name: p.name,
      address: p.address,
      rent: p.rent,
      room_type: p.room_type,
      facilities: p.facilities,
      distance: p.distance,
      rating: p.rating,
      gender: p.gender
    })), null, 2)}

    GUIDELINES:
    1. Suggest specific PGs from the list based on the user's budget, city, or preference.
    2. If a user asks for something we don't have, offer the closest alternative or general advice.
    3. Be friendly, professional, and concise.
    4. You can also give advice on roommate matching and what to look for in a PG.
    5. Use search grounding for real-time area insights (e.g., safety, nearby tech parks, commute tips).
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having a bit of trouble connecting right now. Please try again in a moment!";
  }
};

export const getNearByInsights = async (pgName: string, address: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `Provide a set of nearby essential facilities and insights for a PG called "${pgName}" at "${address}". 
  Include hospitals, cafes, and safety info around this Alandi, Pune area. 
  Format the response as a JSON array of objects with 'title', 'type', and 'description'.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "type", "description"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Grounding Error:", error);
    return [];
  }
};
