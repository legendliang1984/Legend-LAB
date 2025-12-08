import React, { useState, useRef } from 'react';
import { 
  Sun, 
  Move, 
  Rotate3D, 
  Maximize, 
  Aperture,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Lightbulb,
  Video,
  Sparkles
} from 'lucide-react';
import { LightingConfig, TransformMode } from '../types';

interface InspectorProps {
  lighting: LightingConfig;
  setLighting: (config: LightingConfig) => void;
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  selectedMeshName: string | null;
  onScreenshot: () => void;
  onHdrUpload: (file: File) => void;
  onInteractStart: () => void; // Trigger history record
  onResetCamera: () => void;
  onOpenAIModal: () => void;
}

const Inspector: React.FC<InspectorProps> = ({
  lighting,
  setLighting,
  transformMode,
  setTransformMode,
  selectedMeshName,
  onScreenshot,
  onHdrUpload,
  onInteractStart,
  onResetCamera,
  onOpenAIModal
}) => {
  const hdrInputRef = useRef<HTMLInputElement>(null);

  const updateLighting = (key: keyof LightingConfig, value: any) => {
    setLighting({ ...lighting, [key]: value });
  };

  const updateDirectionalPos = (axis: 0 | 1 | 2, value: number) => {
      const newPos = [...lighting.directionalPosition];
      newPos[axis] = value;
      setLighting({ ...lighting, directionalPosition: newPos as [number, number, number] });
  };

  const handleHdrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onHdrUpload(e.target.files[0]);
      }
  };

  return (
    <div className="w-80 bg-[#252525] border-l border-[#151515] flex flex-col h-full select-none">
       {/* Header */}
       <div className="h-12 border-b border-[#151515] flex items-center px-4 bg-[#2b2b2b] justify-between flex-shrink-0">
        <h1 className="font-bold text-gray-200 text-sm tracking-wide">属性面板</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* View Controls */}
        <section className="p-4 border-b border-[#151515]">
            <h2 className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-wider">视图控制</h2>
            <div className="space-y-3">
                <button 
                    onClick={onResetCamera}
                    className="w-full flex items-center justify-center py-1.5 rounded bg-[#1e1e1e] border border-gray-700 text-xs text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                >
                    <Video className="w-3 h-3 mr-2" />
                    重置相机角度
                </button>
            </div>
        </section>

        {/* Transform Tools */}
        <section className="p-4 border-b border-[#151515]">
           <h2 className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-wider">模型变换</h2>
           <div className="flex bg-[#1e1e1e] rounded p-1 border border-gray-700">
             {[
               { id: TransformMode.TRANSLATE, icon: Move, label: '移动' },
               { id: TransformMode.ROTATE, icon: Rotate3D, label: '旋转' },
               { id: TransformMode.SCALE, icon: Maximize, label: '缩放' }
             ].map((tool) => (
               <button
                 key={tool.id}
                 onClick={() => setTransformMode(tool.id)}
                 className={`flex-1 flex flex-col items-center py-2 rounded transition-colors ${
                   transformMode === tool.id 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200'
                 }`}
                 title={tool.label}
               >
                 <tool.icon className="w-4 h-4 mb-1" />
                 <span className="text-[10px]">{tool.label}</span>
               </button>
             ))}
           </div>
           {selectedMeshName ? (
             <div className="mt-2 text-[10px] text-orange-400 truncate font-mono">
               >> {selectedMeshName}
             </div>
           ) : (
             <div className="mt-2 text-[10px] text-gray-600">
               未选中对象 (请在左侧列表选择)
             </div>
           )}
        </section>

        {/* Basic Lighting Section */}
        <section className="p-4 border-b border-[#151515]">
            <div className="flex items-center mb-3">
                <Lightbulb className="w-3 h-3 text-gray-500 mr-2" />
                <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">基础光照 (Basic Lights)</h2>
            </div>
            
            <div className="space-y-4">
                 {/* Scene Exposure */}
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>场景曝光度 (Exposure)</span>
                        <span>{lighting.sceneExposure.toFixed(1)}</span>
                    </div>
                    <input 
                        type="range" min="0" max="3" step="0.1" 
                        value={lighting.sceneExposure} 
                        onMouseDown={onInteractStart}
                        onChange={(e) => updateLighting('sceneExposure', parseFloat(e.target.value))} 
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                 </div>

                 {/* Directional Light */}
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>主光源强度 (Main)</span>
                        <span>{lighting.directionalIntensity.toFixed(1)}</span>
                    </div>
                    <input 
                        type="range" min="0" max="5" step="0.1" 
                        value={lighting.directionalIntensity} 
                        onMouseDown={onInteractStart}
                        onChange={(e) => updateLighting('directionalIntensity', parseFloat(e.target.value))} 
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                 </div>

                 <div>
                    <div className="text-xs text-gray-400 mb-1">主光源位置 (Position X/Y/Z)</div>
                    <div className="grid grid-cols-3 gap-2">
                         <input 
                            type="number" step="1"
                            value={lighting.directionalPosition[0]}
                            onFocus={onInteractStart}
                            onChange={(e) => updateDirectionalPos(0, parseFloat(e.target.value))}
                            className="bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1"
                         />
                         <input 
                            type="number" step="1"
                            value={lighting.directionalPosition[1]}
                            onFocus={onInteractStart}
                            onChange={(e) => updateDirectionalPos(1, parseFloat(e.target.value))}
                            className="bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1"
                         />
                         <input 
                            type="number" step="1"
                            value={lighting.directionalPosition[2]}
                            onFocus={onInteractStart}
                            onChange={(e) => updateDirectionalPos(2, parseFloat(e.target.value))}
                            className="bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1"
                         />
                    </div>
                 </div>

                 {/* Ambient Light */}
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>环境光强度 (Ambient)</span>
                        <span>{lighting.ambientIntensity.toFixed(1)}</span>
                    </div>
                    <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={lighting.ambientIntensity} 
                        onMouseDown={onInteractStart}
                        onChange={(e) => updateLighting('ambientIntensity', parseFloat(e.target.value))} 
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                 </div>
            </div>
        </section>

        {/* Global Environment */}
        <section className="p-4 border-b border-[#151515]">
            <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center">
                    <Sun className="w-3 h-3 text-gray-500 mr-2" />
                    <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">环境贴图 (HDR)</h2>
                 </div>
                 <button onClick={() => hdrInputRef.current?.click()} className="text-[10px] text-orange-500 hover:text-orange-400 flex items-center">
                     <ImageIcon className="w-3 h-3 mr-1" /> 上传HDR
                 </button>
                 <input type="file" ref={hdrInputRef} onChange={handleHdrChange} accept=".hdr,.exr,.jpg,.png" className="hidden" />
            </div>

            <div className="space-y-4">
                 <div>
                    <label className="text-[10px] text-gray-400 block mb-1">HDR 预设</label>
                     <select 
                        value={lighting.environmentPreset}
                        onFocus={onInteractStart}
                        onChange={(e) => updateLighting('environmentPreset', e.target.value)}
                        disabled={!!lighting.environmentUrl}
                        className="w-full bg-[#1e1e1e] border border-gray-700 text-gray-300 text-xs rounded p-2 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    >
                        <option value="studio">摄影棚 (Studio)</option>
                        <option value="city">城市 (City)</option>
                        <option value="sunset">日落 (Sunset)</option>
                        <option value="forest">森林 (Forest)</option>
                        <option value="warehouse">仓库 (Warehouse)</option>
                    </select>
                 </div>
                 
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>HDR 旋转</span>
                        <span>{lighting.environmentRotation}°</span>
                    </div>
                    <input 
                        type="range" min="0" max="360" step="1" 
                        value={lighting.environmentRotation} 
                        onMouseDown={onInteractStart}
                        onChange={(e) => updateLighting('environmentRotation', parseFloat(e.target.value))} 
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                 </div>
                 
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>背景模糊</span>
                        <span>{(lighting.backgroundBlur * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={lighting.backgroundBlur} 
                        onMouseDown={onInteractStart}
                        onChange={(e) => updateLighting('backgroundBlur', parseFloat(e.target.value))} 
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                 </div>

                 <div className="flex items-center justify-between">
                     <span className="text-xs text-gray-400">背景可见性</span>
                     <button 
                        onClick={() => {
                            onInteractStart();
                            updateLighting('backgroundVisible', !lighting.backgroundVisible);
                        }}
                        className={`p-1.5 rounded transition-colors ${lighting.backgroundVisible ? 'bg-orange-500 text-white' : 'bg-[#1e1e1e] text-gray-500'}`}
                     >
                         {lighting.backgroundVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                     </button>
                 </div>
            </div>
        </section>
        
        <div className="p-4 pt-0 mt-4 space-y-2">
             <button 
                onClick={onOpenAIModal}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 border border-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded text-xs font-bold transition-all shadow-md flex items-center justify-center"
            >
                <Sparkles className="w-3 h-3 mr-2" /> 
                AI 智能渲染
            </button>

             <button 
                onClick={onScreenshot}
                className="w-full py-2 bg-[#1e1e1e] border border-gray-700 hover:bg-[#2a2a2a] text-gray-300 rounded text-xs font-medium transition-colors flex items-center justify-center"
            >
                <Aperture className="w-3 h-3 mr-2" /> 
                截图下载 (PNG)
            </button>
        </div>

      </div>
    </div>
  );
};

export default Inspector;
