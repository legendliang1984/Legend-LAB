import React, { useRef } from 'react';
import { Upload, Box, Image as ImageIcon, Trash2, Github, ChevronRight, Layers, Move, RotateCw, Maximize, Repeat, FlipVertical, Eye, EyeOff, RefreshCcw } from 'lucide-react';
import { ModelData, SceneMesh, TextureTransform, MeshConfig } from '../types';
import SliderControl from './SliderControl';

interface SidebarProps {
  onModelUpload: (file: File) => void;
  onTextureUpload: (file: File) => void;
  modelData: ModelData | null;
  currentConfig?: MeshConfig;
  onClearModel: () => void;
  meshList: SceneMesh[];
  selectedMeshName: string | null;
  onSelectMesh: (name: string | null) => void;
  onUpdateTransform: (transform: TextureTransform) => void;
  onTransformStart: () => void;
  onRemoveTexture: (meshName: string) => void;
  onToggleVisibility: (meshName: string) => void; // New
  onResetMesh: (meshName: string) => void; // New
  meshConfigs: Record<string, MeshConfig>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onModelUpload, 
  onTextureUpload, 
  modelData, 
  currentConfig,
  onClearModel,
  meshList,
  selectedMeshName,
  onSelectMesh,
  onUpdateTransform,
  onTransformStart,
  onRemoveTexture,
  onToggleVisibility,
  onResetMesh,
  meshConfigs
}) => {
  const modelInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onModelUpload(e.target.files[0]);
    }
  };

  const handleTextureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onTextureUpload(e.target.files[0]);
    }
  };

  const updateTransform = (key: keyof TextureTransform, value: any) => {
      if (!currentConfig) return;
      onUpdateTransform({ ...currentConfig.transform, [key]: value });
  };

  return (
    <div className="flex flex-col h-full bg-[#1c1c1c] text-white">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-6">
            
            {/* Model Section */}
            <section>
            <h2 className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-wider flex justify-between items-center">
                <span>对象管理</span>
                {modelData && <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-500 cursor-pointer" onClick={onClearModel} title="清除模型" />}
            </h2>
            
            {!modelData ? (
                <>
                <button 
                    onClick={() => modelInputRef.current?.click()}
                    className="w-full h-20 border border-dashed border-gray-600 rounded bg-[#1e1e1e] hover:border-orange-500 hover:bg-[#2a2a2a] transition-all flex flex-col items-center justify-center group"
                >
                    <Box className="w-5 h-5 text-gray-500 group-hover:text-orange-500 mb-2 transition-colors" />
                    <span className="text-xs text-gray-400 group-hover:text-gray-200">导入模型 (.obj, .glb)</span>
                </button>
                <input 
                    type="file" 
                    ref={modelInputRef} 
                    onChange={handleModelChange} 
                    accept=".obj,.glb" 
                    className="hidden" 
                />
                </>
            ) : (
                <div className="bg-[#1a1a1a] rounded border border-gray-700 overflow-hidden">
                    <div className="bg-[#2a2a2a] px-3 py-2 text-xs font-bold text-gray-300 border-b border-gray-700 flex items-center">
                        <Box className="w-3 h-3 mr-2 text-orange-500" />
                        {modelData.filename}
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                        {meshList.length === 0 && <div className="text-xs text-gray-600 p-2 italic">解析模型结构中...</div>}
                        {meshList.map((mesh) => {
                            const config = meshConfigs[mesh.name];
                            const hasTexture = !!config?.textureUrl;
                            const isVisible = config ? config.visible : true;

                            return (
                                <div 
                                    key={mesh.id}
                                    onClick={() => onSelectMesh(mesh.name)}
                                    className={`px-2 py-1.5 text-xs rounded cursor-pointer flex items-center justify-between group/item ${
                                        selectedMeshName === mesh.name 
                                        ? 'bg-orange-500 text-white' 
                                        : 'text-gray-400 hover:bg-[#333] hover:text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center overflow-hidden flex-1">
                                        <Layers className="w-3 h-3 mr-2 opacity-70 flex-shrink-0" />
                                        <span className={`truncate ${!isVisible && 'text-gray-600 line-through'}`}>{mesh.name}</span>
                                        {hasTexture && <ImageIcon className="w-3 h-3 ml-2 opacity-50 flex-shrink-0" />}
                                    </div>
                                    
                                    <div className="flex items-center space-x-1">
                                        {/* Toggle Visibility */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(mesh.name); }}
                                            className="p-1 text-gray-400 hover:text-white"
                                            title={isVisible ? "隐藏" : "显示"}
                                        >
                                            {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        </button>

                                        {/* Reset */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onResetMesh(mesh.name); }}
                                            className="p-1 text-gray-400 hover:text-white"
                                            title="重置状态"
                                        >
                                            <RefreshCcw className="w-3 h-3" />
                                        </button>

                                        {hasTexture && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRemoveTexture(mesh.name); }}
                                                className="p-1 hover:text-red-400 text-gray-500"
                                                title="移除贴图"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            </section>

            {/* Texture Section */}
            <section>
            <h2 className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-wider">材质与贴图</h2>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <button 
                        onClick={() => textureInputRef.current?.click()}
                        className={`flex-1 h-16 border border-dashed rounded transition-all flex flex-col items-center justify-center group ${
                            selectedMeshName ? 'border-gray-600 bg-[#1e1e1e] hover:border-orange-500 hover:bg-[#2a2a2a] cursor-pointer' : 'border-gray-700 bg-[#151515] opacity-50 cursor-not-allowed'
                        }`}
                        disabled={!selectedMeshName}
                    >
                        <ImageIcon className="w-4 h-4 text-gray-500 group-hover:text-orange-500 mb-1 transition-colors" />
                        <span className="text-[10px] text-gray-400">
                            {selectedMeshName ? (currentConfig?.textureUrl ? '替换当前贴图' : '上传贴图') : '请先选择模型部件'}
                        </span>
                    </button>
                    <input 
                        type="file" 
                        ref={textureInputRef} 
                        onChange={handleTextureChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                </div>

                {currentConfig && currentConfig.textureName && (
                <div className="bg-[#1e1e1e] p-3 rounded border border-gray-700 space-y-4">
                    <div className="flex items-center text-xs text-green-400 pb-2 border-b border-gray-700">
                        <ImageIcon className="w-3 h-3 mr-2" />
                        <span className="truncate">{currentConfig.textureName}</span>
                    </div>

                    {/* Transform Controls with SliderControl */}
                    <div className="space-y-3">
                        {/* Position */}
                        <div>
                            <div className="flex items-center text-[10px] text-gray-500 mb-1">
                                <Move className="w-3 h-3 mr-1" /> 位移 (Offset)
                            </div>
                            <div className="space-y-2">
                                <SliderControl 
                                    label="U (X)" value={currentConfig.transform.offsetX} min={-2} max={2} step={0.01} 
                                    onChange={(v) => updateTransform('offsetX', v)} onFocus={onTransformStart}
                                />
                                <SliderControl 
                                    label="V (Y)" value={currentConfig.transform.offsetY} min={-2} max={2} step={0.01} 
                                    onChange={(v) => updateTransform('offsetY', v)} onFocus={onTransformStart}
                                />
                            </div>
                        </div>

                        {/* Rotation */}
                        <SliderControl 
                            label="旋转 (Rotation)" icon={<RotateCw className="w-3 h-3"/>}
                            value={currentConfig.transform.rotation} min={0} max={360} step={1} 
                            onChange={(v) => updateTransform('rotation', v)} onFocus={onTransformStart}
                            unit="°"
                        />

                        {/* Scale / Repeat */}
                        <div>
                            <div className="flex items-center text-[10px] text-gray-500 mb-1">
                                <Maximize className="w-3 h-3 mr-1" /> 缩放 (Scale)
                            </div>
                            <div className="space-y-2">
                                <SliderControl 
                                    label="X" value={currentConfig.transform.repeatX} min={0.1} max={10} step={0.1} 
                                    onChange={(v) => updateTransform('repeatX', v)} onFocus={onTransformStart}
                                />
                                <SliderControl 
                                    label="Y" value={currentConfig.transform.repeatY} min={0.1} max={10} step={0.1} 
                                    onChange={(v) => updateTransform('repeatY', v)} onFocus={onTransformStart}
                                />
                            </div>
                        </div>

                         {/* Actions */}
                         <div className="grid grid-cols-2 gap-2 pt-2">
                             <button 
                                onClick={() => {
                                    onTransformStart();
                                    updateTransform('flipY', !currentConfig.transform.flipY);
                                }}
                                className={`flex items-center justify-center py-1.5 rounded text-xs border ${currentConfig.transform.flipY ? 'bg-orange-900/30 border-orange-500 text-orange-200' : 'bg-[#151515] border-gray-700 text-gray-400'}`}
                             >
                                 <FlipVertical className="w-3 h-3 mr-1" /> 垂直翻转
                             </button>
                             
                              <button 
                                onClick={() => {
                                    onTransformStart();
                                    onUpdateTransform({
                                        offsetX: 0, offsetY: 0, rotation: 0, repeatX: 1, repeatY: 1, flipY: false, wrapS: 1000, wrapT: 1000
                                    });
                                }}
                                className="flex items-center justify-center py-1.5 rounded text-xs bg-[#151515] border border-gray-700 text-gray-400 hover:bg-[#222]"
                             >
                                 <Repeat className="w-3 h-3 mr-1" /> 重置变换
                             </button>
                         </div>

                    </div>
                </div>
                )}
            </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;