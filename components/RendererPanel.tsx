import React, { useState } from 'react';
import { RenderConfig } from '../types';
import SliderControl from './SliderControl';
import { Layers, Aperture, Settings, Eye, EyeOff } from 'lucide-react';

interface RendererPanelProps {
  config: RenderConfig;
  setConfig: (config: RenderConfig) => void;
}

type Tab = 'Kernel' | 'Imager' | 'Post';

const RendererPanel: React.FC<RendererPanelProps> = ({ config, setConfig }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Imager');

  const update = (key: keyof RenderConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="flex flex-col h-full bg-[#1c1c1c] text-white">
      {/* Enable Toggle */}
      <div className="p-3 bg-[#252525] border-b border-[#333] flex justify-between items-center">
          <span className="text-xs font-bold text-gray-300">实时渲染引擎</span>
          <button 
                onClick={() => update('enablePostProcessing', !config.enablePostProcessing)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${config.enablePostProcessing ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
            >
                {config.enablePostProcessing ? '已启用 (ENABLED)' : '已禁用 (DISABLED)'}
            </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#333] bg-[#222]">
        {[
          { id: 'Kernel', icon: Settings, label: '核心' },
          { id: 'Imager', icon: Aperture, label: '成像' },
          { id: 'Post', icon: Layers, label: '后期' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex-1 flex items-center justify-center py-2 text-[10px] font-medium tracking-wide transition-colors ${
              activeTab === tab.id
                ? 'text-orange-400 bg-[#1c1c1c] border-t-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2a2a]'
            }`}
          >
            <tab.icon className="w-3 h-3 mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        
        {/* === KERNEL (AO & Quality) === */}
        {activeTab === 'Kernel' && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="space-y-3">
                 <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">环境光遮蔽 (AO)</h3>
                    <button onClick={() => update('ao', !config.ao)} className="text-gray-400 hover:text-white">
                         {config.ao ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                    </button>
                 </div>
                 {config.ao && (
                    <>
                        <SliderControl label="AO 强度" value={config.aoIntensity} min={0} max={5} step={0.1} onChange={(v) => update('aoIntensity', v)} />
                        <SliderControl label="采样半径" value={config.aoRadius} min={0.1} max={2} step={0.1} onChange={(v) => update('aoRadius', v)} />
                    </>
                 )}
             </div>
           </div>
        )}

        {/* === IMAGER (Color & Tone) === */}
        {activeTab === 'Imager' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">摄像机成像</h3>
                    
                    <SliderControl label="曝光度" value={config.exposure} min={-2} max={2} step={0.05} onChange={(v) => update('exposure', v)} />
                    <SliderControl label="对比度" value={config.contrast} min={-1} max={1} step={0.05} onChange={(v) => update('contrast', v)} />
                    <SliderControl label="饱和度" value={config.saturation} min={-1} max={1} step={0.05} onChange={(v) => update('saturation', v)} />
                    <SliderControl label="亮度" value={config.brightness} min={-1} max={1} step={0.05} onChange={(v) => update('brightness', v)} />
                    
                    <div className="pt-2 border-t border-[#333] mt-2">
                        <label className="flex items-center justify-between text-[10px] text-gray-400 cursor-pointer">
                           <span>ACES 色调映射 (Tone Mapping)</span>
                           <input type="checkbox" checked={config.toneMapping} onChange={(e) => update('toneMapping', e.target.checked)} className="accent-orange-500" />
                        </label>
                    </div>
                </div>
            </div>
        )}

        {/* === POST (Bloom, Glare, Effects) === */}
        {activeTab === 'Post' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Bloom / Glare */}
                <div>
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">辉光 (Bloom)</h3>
                        <button onClick={() => update('bloom', !config.bloom)} className="text-gray-400 hover:text-white">
                             {config.bloom ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                        </button>
                     </div>
                     {config.bloom && (
                        <div className="space-y-3 pl-2 border-l border-[#333]">
                            <SliderControl label="强度" value={config.bloomIntensity} min={0} max={5} step={0.1} onChange={(v) => update('bloomIntensity', v)} />
                            <SliderControl label="阈值" value={config.bloomThreshold} min={0} max={2} step={0.05} onChange={(v) => update('bloomThreshold', v)} />
                            <SliderControl label="半径" value={config.bloomRadius} min={0} max={1.5} step={0.05} onChange={(v) => update('bloomRadius', v)} />
                        </div>
                     )}
                </div>

                {/* Vignette */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">暗角 (Vignette)</h3>
                        <button onClick={() => update('vignette', !config.vignette)} className="text-gray-400 hover:text-white">
                             {config.vignette ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                        </button>
                    </div>
                    {config.vignette && (
                        <div className="space-y-3 pl-2 border-l border-[#333]">
                            <SliderControl label="浓度" value={config.vignetteDarkness} min={0} max={1} step={0.05} onChange={(v) => update('vignetteDarkness', v)} />
                            <SliderControl label="范围" value={config.vignetteOffset} min={0} max={1} step={0.05} onChange={(v) => update('vignetteOffset', v)} />
                        </div>
                    )}
                </div>

                {/* Chromatic Aberration */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">光谱色散</h3>
                        <button onClick={() => update('chromaticAberration', !config.chromaticAberration)} className="text-gray-400 hover:text-white">
                             {config.chromaticAberration ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                        </button>
                    </div>
                    {config.chromaticAberration && (
                         <div className="space-y-3 pl-2 border-l border-[#333]">
                             <SliderControl label="色散强度" value={config.chromaticAberrationOffset} min={0} max={0.05} step={0.001} onChange={(v) => update('chromaticAberrationOffset', v)} />
                         </div>
                    )}
                </div>

                {/* Noise */}
                 <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">胶片颗粒</h3>
                        <button onClick={() => update('noise', !config.noise)} className="text-gray-400 hover:text-white">
                             {config.noise ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                        </button>
                    </div>
                    {config.noise && (
                        <div className="space-y-3 pl-2 border-l border-[#333]">
                            <SliderControl label="颗粒量" value={config.noiseOpacity} min={0} max={0.5} step={0.01} onChange={(v) => update('noiseOpacity', v)} />
                        </div>
                    )}
                </div>

            </div>
        )}
      </div>
    </div>
  );
};

export default RendererPanel;