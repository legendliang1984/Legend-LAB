import React, { useState, useEffect } from 'react';
import { X, Sparkles, Download, Loader2, Wand2, Key, Link as LinkIcon, Settings2, Info } from 'lucide-react';
import { AIModelType, JimengConfig } from '../types';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  setPrompt: (val: string) => void;
  model: AIModelType;
  setModel: (val: AIModelType) => void;
  onGenerate: (config: JimengConfig, refUrl: string | null, scale: number) => void;
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
  // Config State
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  // Params State
  const [refImageUrl, setRefImageUrl] = useState('');
  const [scale, setScale] = useState(0.5);
  const [activeTab, setActiveTab] = useState<'config' | 'generate'>('config');

  // Load saved keys
  useEffect(() => {
    const savedAK = localStorage.getItem('JIMENG_AK');
    const savedSK = localStorage.getItem('JIMENG_SK');
    if (savedAK) setAccessKey(savedAK);
    if (savedSK) setSecretKey(savedSK);
    
    if (savedAK && savedSK) {
        setActiveTab('generate');
    }
  }, []);

  const handleSaveKeys = () => {
      localStorage.setItem('JIMENG_AK', accessKey);
      localStorage.setItem('JIMENG_SK', secretKey);
      setActiveTab('generate');
  };

  const handleGenerateClick = () => {
      if (!accessKey || !secretKey) {
          setActiveTab('config');
          return;
      }
      onGenerate(
          { accessKey, secretKey }, 
          refImageUrl.trim() ? refImageUrl.trim() : null, 
          scale
      );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#252525] w-full max-w-6xl rounded-lg border border-[#333] shadow-2xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center space-x-2 text-white">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-sm tracking-wide">即梦 (Jimeng) AI 渲染器</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Controls - Left Side */}
          <div className="w-full md:w-1/3 border-r border-[#333] bg-[#202020] flex flex-col">
            
            {/* Tabs */}
            <div className="flex border-b border-[#333]">
                <button 
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'config' ? 'bg-[#252525] text-orange-500 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    API 设置
                </button>
                <button 
                    onClick={() => setActiveTab('generate')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'generate' ? 'bg-[#252525] text-orange-500 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    生成参数
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                
                {activeTab === 'config' && (
                    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                         <div className="bg-orange-900/20 border border-orange-500/30 p-3 rounded text-orange-200 text-xs">
                             <Info className="w-4 h-4 inline mr-1 mb-0.5" />
                             请配置火山引擎（即梦）API 访问密钥。密钥将仅存储在您的本地浏览器中。
                         </div>

                         <div>
                            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Access Key ID</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input 
                                    type="text" 
                                    value={accessKey}
                                    onChange={(e) => setAccessKey(e.target.value)}
                                    placeholder="AK..."
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded pl-10 pr-3 py-2 text-sm text-gray-200 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                         </div>

                         <div>
                            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Secret Access Key</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input 
                                    type="password" 
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    placeholder="SK..."
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded pl-10 pr-3 py-2 text-sm text-gray-200 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                         </div>

                         <button
                            onClick={handleSaveKeys}
                            className="w-full py-2 bg-[#333] border border-gray-600 text-gray-200 text-xs font-bold rounded hover:bg-[#444] transition-colors"
                         >
                            保存并继续
                         </button>
                    </div>
                )}

                {activeTab === 'generate' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">参考图链接 (可选)</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={refImageUrl}
                                    onChange={(e) => setRefImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded pl-10 pr-3 py-2 text-xs text-gray-200 focus:border-orange-500 focus:outline-none placeholder-gray-600"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                * 即梦 API 仅支持公网可访问的图片 URL。如不填写，将进行纯文生图。
                            </p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="block text-xs text-gray-400 uppercase font-bold tracking-wider">参考程度 (Scale)</label>
                                <span className="text-xs text-orange-500 font-mono">{scale.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.01"
                                value={scale}
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                                数值越大，文本描述对结果的影响越大；数值越小，参考图的影响越大。
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">提示词 (Prompt)</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="描述你想要的画面，例如：专业的包装摄影，柔和的影棚光，4k高画质..."
                                className="w-full h-32 bg-[#1a1a1a] border border-[#333] rounded p-3 text-sm text-gray-200 focus:border-orange-500 focus:outline-none resize-none placeholder-gray-600 custom-scrollbar"
                            />
                        </div>

                        <div className="pt-4 border-t border-[#333]">
                            <button
                                onClick={handleGenerateClick}
                                disabled={isGenerating || !prompt.trim()}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded shadow-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-[0.98]"
                            >
                                {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    云端渲染中...
                                </>
                                ) : (
                                <>
                                    <Wand2 className="w-5 h-5 mr-2" />
                                    开始生成
                                </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* Result - Right Side */}
          <div className="w-full md:w-2/3 bg-[#151515] relative overflow-hidden group flex items-center justify-center">
            <div className="absolute inset-0 pattern-grid opacity-10 pointer-events-none"></div>
            
            {resultImage ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img src={resultImage} alt="AI Render" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" />
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <a
                    href={resultImage}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-white text-black font-bold rounded-full flex items-center hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    查看原图 (链接有效期24h)
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600 flex flex-col items-center p-8">
                <div className="w-24 h-24 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-6 border border-[#333]">
                    <Settings2 className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-2">等待生成</h3>
                <p className="text-sm opacity-50 max-w-xs">配置 API Key 并输入提示词后，即可调用即梦 (Jimeng) 进行专业级渲染。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModal;