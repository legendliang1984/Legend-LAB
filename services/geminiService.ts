import { GoogleGenAI } from "@google/genai";
import { GeminiConfig } from '../types';

// Helper to remove data URL prefix
const stripDataUrl = (dataUrl: string) => {
  return dataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
};

const getMimeType = (dataUrl: string) => {
    const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,/);
    return match ? `image/${match[1]}` : 'image/png';
};

export const generateAIRender = async (
  imageBase64: string,
  prompt: string,
  config: GeminiConfig,
  modelName: string = 'gemini-2.5-flash-image'
): Promise<string> => {
  const { apiKey } = config;
  if (!apiKey) {
    throw new Error("缺少 API 密钥。请在设置中配置 Gemini API Key。");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Clean the base64 string
  const cleanBase64 = stripDataUrl(imageBase64);
  const mimeType = getMimeType(imageBase64);

  try {
    // Constructing a prompt that treats the image as a reference
    const finalPrompt = `
      你是一位专业的3D产品渲染师。
      请参考提供的图片（构图、几何结构），根据以下描述生成一张高保真的产品渲染图：
      ${prompt}
      
      要求：
      - 保持画面结构与参考图一致。
      - 材质真实，光影自然。
      - 高分辨率，细节丰富。
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            text: finalPrompt
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          }
        ]
      }
    });

    // Check for inlineData (images) in the response parts
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    // If no image part, but text exists, it might be an error or refusal
    const textPart = parts?.find(p => p.text);
    if (textPart) {
        console.warn("AI Response only text:", textPart.text);
        throw new Error(`AI 未生成图片，返回信息: ${textPart.text}`);
    }

    throw new Error("AI 未生成图片，请重试。");

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    throw new Error(error.message || "生成 AI 渲染图失败。");
  }
};
