import { GoogleGenAI } from "@google/genai";

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
  modelName: string = 'gemini-2.5-flash-image'
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("缺少 API 密钥。请确保设置了 process.env.API_KEY。");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Clean the base64 string
  const cleanBase64 = stripDataUrl(imageBase64);
  const mimeType = getMimeType(imageBase64);

  try {
    // Constructing a prompt that treats the image as a reference for a high quality render.
    const finalPrompt = `
      你是一位专业的3D产品摄影师。
      请使用提供的图片作为严格的构图和几何参考。
      为这个包装设计生成一张逼真、高保真的渲染图。
      
      细节描述：${prompt}
      
      要求：
      - 优化材质表现（让纸板看起来像纸板，塑料看起来像塑料）。
      - 添加专业的摄影棚灯光，包含柔和的阴影和轮廓光。
      - 保持参考图中确切的透视角度和品牌标识可见。
      - 高分辨率，4k 画质。
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
    }

    throw new Error("AI 未生成图片，可能由于提示词违规或服务繁忙，请重试。");

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    throw new Error(error.message || "生成 AI 渲染图失败。");
  }
};
