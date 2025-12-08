import React, { useRef } from 'react';
import { Upload, Box, Image as ImageIcon, Trash2, Github, ChevronRight, Layers, Move, RotateCw, Maximize, Repeat, FlipVertical, Undo2, Redo2, Save, FolderOpen, Download } from 'lucide-react';
import { ModelData, SceneMesh, TextureTransform, MeshConfig } from '../types';

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
  // History
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  meshConfigs: Record<string, MeshConfig>;
  // Project
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  meshConfigs,
  onSaveProject,
  onLoadProject
}) => {
  const modelInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

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

  const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadProject(e.target.files[0]);
    }
    // Reset value so same file can be loaded again if needed
    if (e.target) e.target.value = '';
  };

  const updateTransform = (key: keyof TextureTransform, value: any) => {
      if (!currentConfig) return;
      onUpdateTransform({ ...currentConfig.transform, [key]: value });
  };

  // Helper for input events
  const handleRangeMouseDown = () => {
    onTransformStart();
  };

  return (
    <div className="w-72 bg-[#252525] border-r border-[#151515] flex flex-col h-full select-none overflow-hidden">
      {/* Header with Undo/Redo/Save */}
      <div className="h-12 border-b border-[#151515] flex items-center justify-between px-4 bg-[#2b2b2b] flex-shrink-0">
        <div className="flex items-center">
            <Box className="w-5 h-5 text-orange-500 mr-2" />
            <h1 className="font-bold text-gray-200 text-sm tracking-wide">PACKVIZ <span className="text-orange-500">PRO</span></h1>
        </div>
        <div className="flex gap-1">
            {/* Project Controls */}
            <button onClick={onSaveProject} className="p-1.5 rounded text-gray-300 hover:bg-[#333] hover:text-white" title="保存项目 (.json)">
                <Save className="w-4 h-4" />
            </button>
            <button onClick={() => projectInputRef.current?.click()} className="p-1.5 rounded text-gray-300 hover:bg-[#333] hover:text-white" title="打开项目">
                <FolderOpen className="w-4 h-4" />
            </button>
            <input type="file" ref={projectInputRef} onChange={handleProjectLoad} accept=".json,.packviz" className="hidden" />
            
            <div className="w-px h-4 bg-gray-700 mx-1 self-center"></div>

            <button 
                onClick={onUndo} 
                disabled={!canUndo}
                className={`p-1.5 rounded transition-colors ${!canUndo ? 'text-gray-600' : 'text-gray-300 hover:bg-[#333] hover:text-white'}`}
                title="撤销"
            >
                <Undo2 className="w-4 h-4" />
            </button>
            <button 
                onClick={onRedo} 
                disabled={!canRedo}
                className={`p-1.5 rounded transition-colors ${!canRedo ? 'text-gray-600' : 'text-gray-300 hover:bg-[#333] hover:text-white'}`}
                title="重做"
            >
                <Redo2 className="w-4 h-4" />
            </button>
        </div>
      </div>

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
                            const hasTexture = !!meshConfigs[mesh.name]?.textureUrl;
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
                                    <div className="flex items-center overflow-hidden">
                                        <Layers className="w-3 h-3 mr-2 opacity-70 flex-shrink-0" />
                                        <span className="truncate">{mesh.name}</span>
                                        {hasTexture && <ImageIcon className="w-3 h-3 ml-2 opacity-50 flex-shrink-0" />}
                                    </div>
                                    
                                    {hasTexture && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveTexture(mesh.name);
                                            }}
                                            className={`p-1 rounded hover:bg-black/20 ${selectedMeshName === mesh.name ? 'text-white' : 'text-gray-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100'}`}
                                            title="移除贴图"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
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
                            {selectedMeshName ? (currentConfig ? '替换当前贴图' : '上传贴图') : '请先选择模型部件'}
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

                    {/* Transform Controls */}
                    <div className="space-y-3">
                        {/* Position */}
                        <div>
                            <div className="flex items-center text-[10px] text-gray-500 mb-1">
                                <Move className="w-3 h-3 mr-1" /> 位移 (Offset)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] text-gray-600 block">X (U)</label>
                                    <input 
                                        type="number" step="0.01" 
                                        value={currentConfig.transform.offsetX} 
                                        onFocus={onTransformStart}
                                        onChange={(e) => updateTransform('offsetX', parseFloat(e.target.value))}
                                        className="w-full bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-600 block">Y (V)</label>
                                    <input 
                                        type="number" step="0.01" 
                                        value={currentConfig.transform.offsetY} 
                                        onFocus={onTransformStart}
                                        onChange={(e) => updateTransform('offsetY', parseFloat(e.target.value))}
                                        className="w-full bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scale / Repeat */}
                        <div>
                            <div className="flex items-center text-[10px] text-gray-500 mb-1">
                                <Maximize className="w-3 h-3 mr-1" /> 缩放 (Scale/Repeat)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] text-gray-600 block">X</label>
                                    <input 
                                        type="number" step="0.1" 
                                        value={currentConfig.transform.repeatX} 
                                        onFocus={onTransformStart}
                                        onChange={(e) => updateTransform('repeatX', parseFloat(e.target.value))}
                                        className="w-full bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-600 block">Y</label>
                                    <input 
                                        type="number" step="0.1" 
                                        value={currentConfig.transform.repeatY} 
                                        onFocus={onTransformStart}
                                        onChange={(e) => updateTransform('repeatY', parseFloat(e.target.value))}
                                        className="w-full bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rotation with Numeric Input */}
                        <div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                <span className="flex items-center"><RotateCw className="w-3 h-3 mr-1" /> 旋转</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="range" min="0" max="360" 
                                    value={currentConfig.transform.rotation} 
                                    onMouseDown={handleRangeMouseDown}
                                    onChange={(e) => updateTransform('rotation', parseFloat(e.target.value))}
                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                                />
                                <input 
                                    type="number" 
                                    min="0" max="360"
                                    value={currentConfig.transform.rotation}
                                    onFocus={onTransformStart}
                                    onChange={(e) => updateTransform('rotation', parseFloat(e.target.value))}
                                    className="w-12 bg-[#111] border border-gray-700 text-gray-300 text-xs rounded p-1 text-center"
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
                                 <Repeat className="w-3 h-3 mr-1" /> 重置
                             </button>
                         </div>

                    </div>
                </div>
                )}

                 {!currentConfig && selectedMeshName && (
                     <div className="bg-orange-900/20 border border-orange-900/50 p-2 rounded">
                        <p className="text-[10px] text-orange-200/70 leading-tight">
                            提示：已选中部件 "{selectedMeshName}"。请上传贴图开始编辑。
                        </p>
                    </div>
                 )}
            </div>
            </section>
        </div>
      </div>
      
      <div className="p-4 border-t border-[#151515] flex-shrink-0">
         <div className="flex items-center text-xs text-gray-600 gap-2">
            <Github className="w-3 h-3" />
            <span>v1.4.0 Pro</span>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;