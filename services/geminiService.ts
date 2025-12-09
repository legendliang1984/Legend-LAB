import { GoogleGenAI } from "@google/genai";
import { AIAspectRatio } from "../types";

// Fix for TypeScript build error: process is not defined
declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  };
};

// Helper to remove data URL prefix
const stripDataUrl = (dataUrl: string) => {
  return dataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
};

// Crop and resize image based on aspect ratio
const processImage = (base64Str: string, aspectRatio: AIAspectRatio, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let targetW = img.width;
      let targetH = img.height;

      // 1. Calculate Crop Dimensions based on Aspect Ratio
      if (aspectRatio === '1:1') {
        const min = Math.min(img.width, img.height);
        targetW = min;
        targetH = min;
      } else if (aspectRatio === '4:3') {
         if (img.width / img.height > 4/3) {
             targetH = img.height;
             targetW = targetH * (4/3);
         } else {
             targetW = img.width;
             targetH = targetW / (4/3);
         }
      } else if (aspectRatio === '16:9') {
        if (img.width / img.height > 16/9) {
            targetH = img.height;
            targetW = targetH * (16/9);
        } else {
            targetW = img.width;
            targetH = targetW / (16/9);
        }
      } else if (aspectRatio === '9:16') {
         if (img.width / img.height > 9/16) {
             targetH = img.height;
             targetW = targetH * (9/16);
         } else {
             targetW = img.width;
             targetH = targetW / (9/16);
         }
      }

      // 2. Crop Center
      const srcX = (img.width - targetW) / 2;
      const srcY = (img.height - targetH) / 2;

      // 3. Resize if too big
      let finalW = targetW;
      let finalH = targetH;
      if (finalW > maxWidth || finalH > maxWidth) {
          const ratio = Math.min(maxWidth / finalW, maxWidth / finalH);
          finalW = Math.round(finalW * ratio);
          finalH = Math.round(finalH * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalW, finalH);
        // Draw cropped area to scaled canvas
        ctx.drawImage(img, srcX, srcY, targetW, targetH, 0, 0, finalW, finalH);
      }
      
      // Compress to JPEG 0.8
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      console.warn("Failed to process image, using original.");
      resolve(base64Str);
    };
  });
};

const resizeRefImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
  
        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
  
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

export const generateAIRender = async (
  sceneImageBase64: string,
  referenceImages: string[],
  prompt: string,
  aspectRatio: AIAspectRatio
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("缺少 API 密钥。请确保设置了 process.env.API_KEY。");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    // 1. Process Images
    const optimizedScene = await processImage(sceneImageBase64, aspectRatio);
    const optimizedRefs = await Promise.all(referenceImages.map(img => resizeRefImage(img)));

    const parts: any[] = [];

    // 2. Text Prompt
    const finalPrompt = `
      你是一位专业的3D产品摄影师和包装设计师。
      
      输入包含：
      1. 一张当前3D场景的白模或简单贴图预览（第一张图片）。
      2. (可选) 用户上传的参考风格图片。
      
      任务：
      基于当前3D场景的构图和几何结构，参考上传图片的风格（如果有），生成一张超写实、高分辨率的包装渲染图。
      
      细节描述：${prompt}
      
      要求：
      - 严格保持第一张图片中的物体透视、角度和轮廓。
      - 材质质感要极度真实（纸张纹理、塑料反光、烫金工艺等）。
      - 拥有影棚级的布光效果。
      - 画质清晰，细节丰富。
      - 保持输出比例与第一张图片一致。
    `;
    parts.push({ text: finalPrompt });

    // 3. Main Scene Image
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: stripDataUrl(optimizedScene)
      }
    });

    // 4. Reference Images
    for (const refImg of optimizedRefs) {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: stripDataUrl(refImg)
            }
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      },
      config: {
        temperature: 0.7 
      }
    });

    const resParts = response.candidates?.[0]?.content?.parts;
    
    if (resParts) {
      for (const part of resParts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("AI 未生成图片，请尝试其他提示词或减少参考图数量。");

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    let msg = error.message || "生成失败。";
    if (msg.includes("Rpc failed") || msg.includes("xhr error")) {
        msg = "网络请求过大导致失败。系统已尝试压缩图片，请尝试减少参考图数量或检查网络连接。";
    }
    throw new Error(msg);
  }
};