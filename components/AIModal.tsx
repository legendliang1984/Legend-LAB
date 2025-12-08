import React from 'react';
import { X, Sparkles, Download, Loader2, Wand2 } from 'lucide-react';
import { AIModelType } from '../types';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  setPrompt: (val: string) => void;
  model: AIModelType;
  setModel: (val: AIModelType) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  resultImage: string | null;
}

const AIModal: React.FC<AIModalProps> = ({
  isOpen,
  onClose,
  prompt,
  setPrompt,
  model,
  setModel,
  onGenerate,
  isGenerating,
  resultImage
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#252525] w-full max-w-6xl rounded-lg border border-[#333] shadow-2xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center space-x-2 text-white">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-sm tracking-wide">AI 智能渲染生成器</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Controls - Left Side (Narrower) */}
          <div className="w-full md:w-1/3 p-6 flex flex-col border-r border-[#333] bg-[#202020] overflow-y-auto">
            <div className="space-y-6 flex-1">
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">提示词 (Prompt)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要的灯光、材质、氛围或背景环境。例如：'专业的摄影棚灯光，柔和的阴影，放在大理石台面上，电影级质感'..."
                  className="w-full h-48 bg-[#1a1a1a] border border-[#333] rounded p-3 text-sm text-gray-200 focus:border-orange-500 focus:outline-none resize-none placeholder-gray-600 transition-colors custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">模型 (Model)</label>
                <div className="p-3 rounded border bg-orange-900/10 border-orange-500/50 text-orange-100 flex items-start">
                   <div className="flex-1">
                      <div className="text-xs font-bold mb-0.5 flex items-center">
                        Gemini 2.5 Flash
                        <span className="ml-2 px-1.5 py-0.5 bg-orange-500 text-black text-[9px] rounded font-bold uppercase">Fast</span>
                      </div>
                      <div className="text-[10px] opacity-70">快速生成，高效验证创意方向</div>
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#333]">
              <button
                onClick={onGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded shadow-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI 正在思考和绘制...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    开始生成渲染图
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result - Right Side (Larger) */}
          <div className="w-full md:w-2/3 bg-[#151515] relative overflow-hidden group flex items-center justify-center">
            <div className="absolute inset-0 pattern-grid opacity-10 pointer-events-none"></div>
            
            {resultImage ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img src={resultImage} alt="AI Render" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" />
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <a
                    href={resultImage}
                    download={`packviz-ai-${Date.now()}.png`}
                    className="px-6 py-3 bg-white text-black font-bold rounded-full flex items-center hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载高清原图
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600 flex flex-col items-center p-8">
                <div className="w-24 h-24 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-6 border border-[#333]">
                    <Sparkles className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-2">准备就绪</h3>
                <p className="text-sm opacity-50 max-w-xs">当前 3D 视口将作为构图参考，AI 将基于您的提示词生成高保真渲染图。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModal;