import React, { useState, useRef, useEffect } from 'react';
import { Wand2, X, Plus, Image as ImageIcon, Loader2, Download, Move, Ratio } from 'lucide-react';
import { AIAspectRatio } from '../types';

interface AIPanelProps {
  onGenerate: (prompt: string, refImages: string[], aspectRatio: AIAspectRatio) => void;
  isRendering: boolean;
  resultUrl: string | null;
  error: string | null;
  onCloseResult: () => void;
}

const AIPanel: React.FC<AIPanelProps> = ({ 
  onGenerate, 
  isRendering, 
  resultUrl, 
  error, 
  onCloseResult 
}) => {
  const [prompt, setPrompt] = useState("");
  const [refImages, setRefImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AIAspectRatio>('1:1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Viewer State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const remainingSlots = 10 - refImages.length;
      const filesToProcess = files.slice(0, remainingSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setRefImages(prev => [...prev, ev.target!.result as string]);
          }
        };
        reader.readAsDataURL(file as File);
      });
    }
  };

  const removeImage = (index: number) => {
    setRefImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!resultUrl) return;
    const delta = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resultUrl) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && resultUrl) {
      setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
      if (resultUrl) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
      }
  }, [resultUrl]);

  // Resolution Calculator
  const getResolution = (ratio: AIAspectRatio) => {
      const base = 1024;
      switch(ratio) {
          case '1:1': return `${base} x ${base}`;
          case '4:3': return `${base} x 768`;
          case '16:9': return `${base} x 576`;
          case '9:16': return `576 x ${base}`;
          default: return `${base} x ${base}`;
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#1c1c1c] text-white">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Input Section */}
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block">提示词 (Prompt)</label>
                <textarea 
                   placeholder="描述光影、材质、环境氛围 (如: '高级哑光质感，柔和顶光，深色背景')..."
                   className="w-full bg-[#111] border border-gray-700 rounded p-3 text-xs text-gray-300 min-h-[80px] resize-none focus:border-purple-500 focus:outline-none"
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                />
            </div>

            {/* Aspect Ratio Config */}
            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-400 block flex items-center"><Ratio className="w-3 h-3 mr-1"/>生成比例</label>
                    <span className="text-[10px] text-purple-400 font-mono">{getResolution(aspectRatio)} px</span>
                 </div>
                 <div className="grid grid-cols-4 gap-2">
                     {(['1:1', '4:3', '16:9', '9:16'] as AIAspectRatio[]).map((ratio) => (
                         <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`py-1 text-[10px] rounded border ${aspectRatio === ratio ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-[#151515] border-gray-700 text-gray-400 hover:border-gray-500'}`}
                         >
                             {ratio}
                         </button>
                     ))}
                 </div>
            </div>

            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-400">参考图 (可选)</label>
                    <span className="text-[10px] text-gray-600">{refImages.length}/10</span>
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2">
                    {refImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded overflow-hidden border border-gray-700 group">
                            <img src={img} alt={`ref-${idx}`} className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeImage(idx)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    ))}
                    {refImages.length < 10 && (
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded border border-dashed border-gray-600 bg-[#151515] hover:border-purple-500 hover:bg-[#222] transition-all flex flex-col items-center justify-center"
                        >
                            <Plus className="w-4 h-4 text-gray-500" />
                            <span className="text-[8px] text-gray-500 mt-1">添加</span>
                        </button>
                    )}
                 </div>
                 <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                 />
            </div>

            <button 
                onClick={() => onGenerate(prompt, refImages, aspectRatio)}
                disabled={isRendering}
                className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-bold rounded shadow-lg disabled:opacity-50 flex items-center justify-center"
            >
                {isRendering ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        渲染中...
                    </>
                ) : (
                    '开始生成'
                )}
            </button>
            
            {error && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
                    {error}
                </div>
            )}
        </div>

        {/* Result Section */}
        {resultUrl && (
            <div className="border-t border-[#333] pt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-400">渲染结果</label>
                    <div className="flex gap-2">
                        <button onClick={() => { setScale(1); setPosition({x:0,y:0}) }} className="text-gray-500 hover:text-white" title="重置视图"><Move className="w-3 h-3" /></button>
                        <a href={resultUrl} download="ai_render.png" className="text-purple-400 hover:text-purple-300" title="下载"><Download className="w-3 h-3" /></a>
                    </div>
                </div>
                
                <div 
                    className="w-full aspect-square bg-[#0a0a0a] rounded border border-gray-800 overflow-hidden relative cursor-move"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    ref={viewerRef}
                >
                    <div 
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                        }}
                        className="w-full h-full flex items-center justify-center origin-center"
                    >
                        <img src={resultUrl} alt="Result" className="max-w-full max-h-full object-contain pointer-events-none select-none" />
                    </div>
                    
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-gray-300 pointer-events-none">
                        {(scale * 100).toFixed(0)}%
                    </div>
                </div>
                <p className="text-[10px] text-gray-600 mt-2 text-center">滚动缩放 • 拖拽移动</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIPanel;