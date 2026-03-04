import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. AI features will not work.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiInstance;
};

export const getAIResponse = async (prompt: string, systemInstruction?: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction || "You are a helpful assistant for 'Grama Ruchulu', an online store selling fresh farm products like honey, spices, pulses, and fruits from Guntur and Vijayawada regions. Be polite, helpful, and encourage healthy eating.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm sorry, I'm having trouble connecting to my AI brain right now. Please try again later!";
  }
};

export const generateRecipe = async (productName: string) => {
  const prompt = `Generate a simple, traditional Indian recipe using ${productName}. Include ingredients and step-by-step instructions. Keep it concise and formatted in Markdown.`;
  const systemInstruction = "You are a traditional Indian chef specializing in village-style cooking. You use fresh, organic ingredients.";
  return await getAIResponse(prompt, systemInstruction);
};

export const generateProductDescription = async (productName: string, category: string) => {
  const prompt = `Write a mouth-watering, professional product description for '${productName}' which belongs to the '${category}' category. Focus on its traditional roots, health benefits, and organic nature. Keep it under 100 words.`;
  const systemInstruction = "You are a professional copywriter for an organic food brand. Your tone is warm, authentic, and persuasive.";
  return await getAIResponse(prompt, systemInstruction);
};

export const translateText = async (text: string, targetLanguage: string = "Telugu") => {
  const prompt = `Translate the following text to ${targetLanguage}. Keep the tone natural and appropriate for a food product description or recipe. Text: "${text}"`;
  const systemInstruction = `You are a professional translator specializing in ${targetLanguage} and English. You understand the nuances of food and agriculture terminology.`;
  return await getAIResponse(prompt, systemInstruction);
};

export const summarizeReviews = async (reviews: { rating: number; comment: string }[]) => {
  if (reviews.length === 0) return "No reviews yet to summarize.";
  const reviewsText = reviews.map(r => `[Rating: ${r.rating}/5] ${r.comment}`).join("\n");
  const prompt = `Summarize the following customer reviews for a product. 
  Please provide the summary in the following format:
  1. A brief overall sentiment (1 sentence).
  2. A "Pros" section with bullet points.
  3. A "Cons" section with bullet points.
  
  Keep it concise and formatted in Markdown. Reviews:\n${reviewsText}`;
  const systemInstruction = "You are a data analyst for an e-commerce store. You provide clear, objective, and structured summaries of customer feedback.";
  return await getAIResponse(prompt, systemInstruction);
};

export const getMealPlan = async (cartItems: string[]) => {
  const itemsList = cartItems.join(", ");
  const prompt = `I have the following items in my cart: ${itemsList}. Suggest a healthy, traditional Indian meal I can make with these. Also, suggest 1 or 2 additional items from a farm-to-table store that would complete the meal.`;
  const systemInstruction = "You are a nutritionist and traditional Indian cook. You help people plan healthy meals using fresh, organic ingredients.";
  return await getAIResponse(prompt, systemInstruction);
};

export const generateFarmerStory = async (productName: string, origin: string) => {
  const prompt = `Write a short, heart-warming story about a farmer from ${origin} who grows/collects ${productName}. Focus on their dedication to organic methods and traditional heritage. Keep it under 120 words.`;
  const systemInstruction = "You are a master storyteller who helps connect consumers with the people who grow their food. Your tone is respectful, warm, and authentic.";
  return await getAIResponse(prompt, systemInstruction);
};

export const analyzeAdminData = async (data: any, context: string) => {
  const dataString = JSON.stringify(data);
  const prompt = `Analyze the following admin data related to ${context}: ${dataString}. Provide key insights, identify trends, and suggest actionable business recommendations. Keep it professional and concise.`;
  const systemInstruction = "You are a senior business analyst for 'DDF1'. You provide strategic insights to help the business grow and improve operations.";
  return await getAIResponse(prompt, systemInstruction);
};

export const identifyImage = async (base64Image: string, mimeType: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: "Identify this food item or ingredient. If it's a common Indian spice, pulse, or fruit, name it clearly. Suggest what it might be used for in a sentence." }
        ]
      },
      config: {
        systemInstruction: "You are an expert in Indian agriculture and cuisine. You can identify ingredients from photos accurately.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return "I couldn't identify this image. Please make sure it's a clear photo of a food item.";
  }
};
