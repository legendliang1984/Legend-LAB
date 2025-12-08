import React, { useRef } from 'react';
import { 
  Sun, 
  Move, 
  Rotate3D, 
  Maximize, 
  Download,
  Aperture,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Lightbulb,
  Camera,
  MonitorPlay
} from 'lucide-react';
import { LightingConfig, TransformMode, CameraConfig, RenderConfig } from '../types';
import SliderControl from './SliderControl';

interface InspectorProps {
  lighting: LightingConfig;
  setLighting: (config: LightingConfig) => void;
  cameraConfig: CameraConfig;
  setCameraConfig: (config: CameraConfig) => void;
  renderConfig: RenderConfig;
  setRenderConfig: (config: RenderConfig) => void;
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  selectedMeshName: string | null;
  onScreenshot: () => void;
  onHdrUpload: (file: File) => void;
}

const Inspector: React.FC<InspectorProps> = ({
  lighting,
  setLighting,
  cameraConfig,
  setCameraConfig,
  renderConfig,
  setRenderConfig,
  transformMode,
  setTransformMode,
  selectedMeshName,
  onScreenshot,
  onHdrUpload
}) => {
  const hdrInputRef = useRef<HTMLInputElement>(null);

  const updateLighting = (key: keyof LightingConfig, value: any) => {
    setLighting({ ...lighting, [key]: value });
  };

  const updateCamera = (key: keyof CameraConfig, value: any) => {
      setCameraConfig({ ...cameraConfig, [key]: value });
  };

  const handleHdrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onHdrUpload(e.target.files[0]);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#1c1c1c] text-white">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Transform Tools */}
        <section className="p-4 border-b border-[#333]">
           <h2 className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-wider">变换模式</h2>
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
               &gt;&gt; {selectedMeshName}
             </div>
           ) : (
             <div className="mt-2 text-[10px] text-gray-600">
               未选中对象
             </div>
           )}
        </section>

        {/* Global Environment */}
        <section className="p-4 border-b border-[#333]">
            <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center">
                    <Sun className="w-3 h-3 text-gray-500 mr-2" />
                    <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">光照与环境</h2>
                 </div>
                 <button onClick={() => hdrInputRef.current?.click()} className="text-[10px] text-orange-500 hover:text-orange-400 flex items-center">
                     <ImageIcon className="w-3 h-3 mr-1" /> 上传HDR
                 </button>
                 <input type="file" ref={hdrInputRef} onChange={handleHdrChange} accept=".hdr,.exr,.jpg,.png" className="hidden" />
            </div>

            <div className="space-y-4">
                 <div>
                    <label className="text-[10px] text-gray-400 block mb-1">环境预设</label>
                     <select 
                        value={lighting.environmentPreset}
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

                 {/* Lights */}
                 <SliderControl 
                    label="主光强度" value={lighting.directionalIntensity} min={0} max={10} step={0.1} 
                    onChange={(v) => updateLighting('directionalIntensity', v)} 
                    icon={<Lightbulb className="w-3 h-3 text-yellow-500"/>}
                 />
                 
                 <SliderControl 
                    label="视窗补光" value={lighting.cameraLightIntensity} min={0} max={5} step={0.1} 
                    onChange={(v) => updateLighting('cameraLightIntensity', v)} 
                    icon={<Lightbulb className="w-3 h-3 text-blue-400"/>}
                 />

                 <SliderControl 
                    label="环境亮度" value={lighting.ambientIntensity} min={0} max={5} step={0.1} 
                    onChange={(v) => updateLighting('ambientIntensity', v)} 
                 />

                 <SliderControl 
                    label="环境旋转" value={lighting.environmentRotation} min={0} max={360} step={1} 
                    onChange={(v) => updateLighting('environmentRotation', v)} unit="°"
                 />
                 
                 <SliderControl 
                    label="背景模糊" value={lighting.backgroundBlur} min={0} max={1} step={0.05} 
                    onChange={(v) => updateLighting('backgroundBlur', v)} 
                 />

                 <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">背景可见性</span>
                    <button 
                        onClick={() => updateLighting('backgroundVisible', !lighting.backgroundVisible)}
                        className={`p-1 rounded ${lighting.backgroundVisible ? 'text-orange-500 bg-orange-900/20' : 'text-gray-500 bg-[#1a1a1a]'}`}
                    >
                        {lighting.backgroundVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                 </div>
            </div>
        </section>

        {/* Camera Lens Settings */}
        <section className="p-4 border-b border-[#333]">
           <div className="flex items-center mb-3">
             <Camera className="w-3 h-3 text-gray-500 mr-2" />
             <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">镜头控制</h2>
          </div>
          <div className="space-y-3">
             <SliderControl 
                label="焦距 (Zoom)" value={cameraConfig.focalLength} min={15} max={200} step={1} 
                onChange={(v) => updateCamera('focalLength', v)} unit="mm"
             />
             <SliderControl 
                label="移轴 (Shift X)" value={cameraConfig.filmOffset} min={-10} max={10} step={0.1} 
                onChange={(v) => updateCamera('filmOffset', v)} 
             />
             <button 
                  className="text-[9px] text-gray-500 mt-1 hover:text-white underline w-full text-left"
                  onClick={() => updateCamera('filmOffset', 0)}
                >
                  重置移轴
             </button>
          </div>
        </section>

        {/* Render Actions */}
        <section className="p-4 flex-shrink-0">
           <div className="flex items-center mb-3">
             <Aperture className="w-3 h-3 text-gray-500 mr-2" />
             <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">输出</h2>
          </div>

          <div className="space-y-3">
             <button 
                onClick={onScreenshot}
                className="w-full py-2 bg-[#333] hover:bg-[#444] text-gray-200 text-xs font-medium rounded transition-colors flex items-center justify-center border border-gray-600"
             >
               <Download className="w-3 h-3 mr-2" />
               捕捉 3D 视窗截图
             </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Inspector;