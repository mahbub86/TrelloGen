import { GoogleGenAI, Type } from "@google/genai";

// We rely on the env variable for the key.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  async generateDescription(taskTitle: string, currentDesc: string): Promise<string> {
    if (!apiKey) throw new Error("API Key missing");
    
    const prompt = `
      You are an expert project manager. 
      Write a concise but professional description for a task titled "${taskTitle}".
      
      Context provided: "${currentDesc}".
      
      If the context is empty, invent a realistic description suitable for a software development task.
      Keep it under 3 sentences.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Could not generate description.";
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  },

  async generateSubtasks(taskTitle: string): Promise<{title: string, completed: boolean}[]> {
     if (!apiKey) throw new Error("API Key missing");

     const prompt = `Break down the task "${taskTitle}" into 3-5 actionable subtasks.`;

     try {
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: prompt,
         config: {
           responseMimeType: "application/json",
           responseSchema: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 title: { type: Type.STRING },
                 completed: { type: Type.BOOLEAN },
               },
               required: ["title", "completed"],
             }
           }
         }
       });

       const jsonText = response.text;
       if (!jsonText) return [];
       return JSON.parse(jsonText);
     } catch (error) {
       console.error("Gemini Error:", error);
       return [];
     }
  }
};
