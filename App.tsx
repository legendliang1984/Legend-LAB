import React, { useState, useRef, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import AIPanel from './components/AIPanel';
import RendererPanel from './components/RendererPanel'; // New
import FloatingWindow from './components/FloatingWindow';
import { LightingConfig, ModelData, TransformMode, SceneMesh, TextureTransform, MeshConfig, CameraConfig, WindowState, AIAspectRatio, RenderConfig, CameraState } from './types';
import { generateAIRender } from './services/geminiService';
import { Undo2, Redo2, Box, Sliders, Wand2, MonitorPlay } from 'lucide-react';
import * as THREE from 'three';

// Initial states
const INITIAL_TRANSFORM: TextureTransform = {
  offsetX: 0, offsetY: 0, rotation: 0, repeatX: 1, repeatY: 1,
  flipY: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping
};

const INITIAL_LIGHTING: LightingConfig = {
  ambientIntensity: 0.5,
  environmentUrl: null,
  environmentPreset: 'studio',
  environmentRotation: 0,
  backgroundVisible: true,
  backgroundBlur: 0,
  directionalIntensity: 1.5,
  directionalPosition: [5, 10, 5],
  cameraLightIntensity: 0.5
};

const INITIAL_CAMERA: CameraConfig = {
    focalLength: 35,
    filmOffset: 0
};

// Advanced Octane-like defaults
const INITIAL_RENDER: RenderConfig = {
    enablePostProcessing: true,
    
    // Kernel
    ao: true,
    aoIntensity: 1.2,
    aoRadius: 0.5,

    // Imager
    exposure: 0,
    contrast: 0.1,
    saturation: 0,
    brightness: 0,
    toneMapping: true,

    // Post
    bloom: true,
    bloomIntensity: 0.5,
    bloomThreshold: 0.9,
    bloomRadius: 0.8,
    
    chromaticAberration: false,
    chromaticAberrationOffset: 0.002,
    
    noise: true,
    noiseOpacity: 0.05,
    
    vignette: false,
    vignetteOffset: 0.5,
    vignetteDarkness: 0.5
};

// Interface for History State
interface HistoryState {
  meshConfigs: Record<string, MeshConfig>;
  lighting: LightingConfig;
  camera: CameraConfig;
  renderConfig: RenderConfig;
}

function App() {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [meshList, setMeshList] = useState<SceneMesh[]>([]);
  
  // Selection State
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>(TransformMode.ROTATE);
  
  // Core State
  const [meshConfigs, setMeshConfigs] = useState<Record<string, MeshConfig>>({});
  const [lighting, setLighting] = useState<LightingConfig>(INITIAL_LIGHTING);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(INITIAL_CAMERA);
  const [renderConfig, setRenderConfig] = useState<RenderConfig>(INITIAL_RENDER);

  const cameraStateRef = useRef<CameraState | null>(null);
  const [loadedCameraState, setLoadedCameraState] = useState<CameraState | null>(null);

  // History Stacks
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // AI & Export State
  const [isAIRendering, setIsAIRendering] = useState(false);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  // Window Management
  const [windows, setWindows] = useState<WindowState[]>([
      { id: 'sidebar', title: '对象管理', isOpen: true, x: 20, y: 80, width: 300, height: 600, zIndex: 10 },
      { id: 'renderer', title: '实时渲染器', isOpen: true, x: 340, y: 80, width: 300, height: 500, zIndex: 11 },
      { id: 'inspector', title: '属性面板', isOpen: true, x: window.innerWidth - 340, y: 80, width: 320, height: 700, zIndex: 10 },
      { id: 'aipanel', title: 'AI 渲染', isOpen: false, x: window.innerWidth / 2 - 200, y: 100, width: 400, height: 600, zIndex: 10 },
  ]);

  const updateWindow = (id: string, updates: Partial<WindowState>) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const focusWindow = (id: string) => {
      setWindows(prev => {
          const maxZ = Math.max(...prev.map(w => w.zIndex));
          return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
      });
  };

  const toggleWindow = (id: string) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, isOpen: !w.isOpen } : w));
  };

  // --- History Management ---
  const recordHistory = useCallback(() => {
    const currentState: HistoryState = {
      meshConfigs: { ...meshConfigs },
      lighting: { ...lighting },
      camera: { ...cameraConfig },
      renderConfig: { ...renderConfig }
    };
    setPast(prev => [...prev, currentState]);
    setFuture([]);
  }, [meshConfigs, lighting, cameraConfig, renderConfig]);

  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const current: HistoryState = { meshConfigs, lighting, camera: cameraConfig, renderConfig };
    setFuture(prev => [current, ...prev]);
    
    setMeshConfigs(previous.meshConfigs);
    setLighting(previous.lighting);
    setCameraConfig(previous.camera);
    setRenderConfig(previous.renderConfig);
    setPast(newPast);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const current: HistoryState = { meshConfigs, lighting, camera: cameraConfig, renderConfig };
    setPast(prev => [...prev, current]);
    
    setMeshConfigs(next.meshConfigs);
    setLighting(next.lighting);
    setCameraConfig(next.camera);
    setRenderConfig(next.renderConfig);
    setFuture(newFuture);
  };

  // --- Handlers ---
  const handleModelUpload = (file: File) => {
    if (modelData?.url) URL.revokeObjectURL(modelData.url);
    const url = URL.createObjectURL(file);
    const type = file.name.toLowerCase().endsWith('.glb') ? 'glb' : 'obj';
    setModelData({ url, filename: file.name, type });
    setSelectedMeshName(null);
    setMeshList([]); 
    setMeshConfigs({});
    setPast([]);
    setFuture([]);
  };

  const handleTextureUpload = (file: File) => {
    if (!selectedMeshName) return;
    const url = URL.createObjectURL(file);
    recordHistory();
    setMeshConfigs(prev => ({
      ...prev,
      [selectedMeshName]: {
        textureUrl: url,
        textureName: file.name,
        transform: { ...INITIAL_TRANSFORM },
        visible: true
      }
    }));
  };

  const handleRemoveTexture = (meshName: string) => {
    if (!meshConfigs[meshName]) return;
    recordHistory();
    setMeshConfigs(prev => {
      const next = { ...prev };
      if (next[meshName]) next[meshName].textureUrl = null;
      return next;
    });
  };

  const handleToggleVisibility = (meshName: string) => {
      recordHistory();
      setMeshConfigs(prev => {
          const current = prev[meshName];
          if (!current) {
              return { 
                  ...prev, 
                  [meshName]: { 
                      textureUrl: null, textureName: null, 
                      transform: { ...INITIAL_TRANSFORM }, 
                      visible: false 
                    } 
                };
          }
          return {
              ...prev,
              [meshName]: { ...current, visible: !current.visible }
          };
      });
  };

  const handleResetMesh = (meshName: string) => {
      recordHistory();
      setMeshConfigs(prev => {
          const next = { ...prev };
          delete next[meshName]; 
          return next;
      });
  };

  const handleUpdateTextureTransform = (newTransform: TextureTransform) => {
    if (!selectedMeshName || !meshConfigs[selectedMeshName]) return;
    setMeshConfigs(prev => ({
      ...prev,
      [selectedMeshName]: { ...prev[selectedMeshName], transform: newTransform }
    }));
  };

  const onTransformStart = () => recordHistory();

  const handleLightingChange = (newConfig: LightingConfig) => {
      setLighting(newConfig);
  };

  const handleHdrUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    recordHistory();
    setLighting(prev => ({ ...prev, environmentUrl: url }));
  };

  const handleScreenshot = useCallback(() => {
    if (glRef.current) {
      const canvas = glRef.current.domElement;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.setAttribute('download', 'packviz-render.png');
      link.setAttribute('href', dataUrl);
      link.click();
    }
  }, []);

  const handleGenerate = async (prompt: string, refImages: string[], aspectRatio: AIAspectRatio) => {
    if (!glRef.current) return;
    setIsAIRendering(true);
    setAiError(null);
    setAiResultUrl(null);
    try {
      const canvas = glRef.current.domElement;
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      const finalPrompt = prompt.trim() || "该包装设计的高质量摄影棚拍摄效果，背景干净。";
      const resultImageUrl = await generateAIRender(base64Image, refImages, finalPrompt, aspectRatio);
      setAiResultUrl(resultImageUrl);
    } catch (err: any) {
      setAiError(err.message || "发生了意外错误。");
    } finally {
      setIsAIRendering(false);
    }
  };

  const handleClearModel = () => {
    setModelData(null);
    setMeshConfigs({});
    setSelectedMeshName(null);
    setMeshList([]);
    setPast([]);
    setFuture([]);
  };

  return (
    <div className="relative h-screen w-screen bg-[#1c1c1c] text-white overflow-hidden font-sans">
      
      {/* Top Bar / Menu */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#2b2b2b]/90 backdrop-blur border-b border-[#333] z-50 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
               <h1 className="font-bold text-sm tracking-wide mr-4">PACKVIZ <span className="text-orange-500">PRO</span></h1>
               
               <button onClick={() => toggleWindow('sidebar')} className={`p-2 rounded hover:bg-[#444] ${windows.find(w=>w.id==='sidebar')?.isOpen ? 'text-orange-400' : 'text-gray-400'}`} title="对象管理">
                  <Box className="w-4 h-4" />
               </button>
               <button onClick={() => toggleWindow('renderer')} className={`p-2 rounded hover:bg-[#444] ${windows.find(w=>w.id==='renderer')?.isOpen ? 'text-green-400' : 'text-gray-400'}`} title="渲染器">
                  <MonitorPlay className="w-4 h-4" />
               </button>
               <button onClick={() => toggleWindow('inspector')} className={`p-2 rounded hover:bg-[#444] ${windows.find(w=>w.id==='inspector')?.isOpen ? 'text-orange-400' : 'text-gray-400'}`} title="属性">
                  <Sliders className="w-4 h-4" />
               </button>
               <button onClick={() => toggleWindow('aipanel')} className={`p-2 rounded hover:bg-[#444] ${windows.find(w=>w.id==='aipanel')?.isOpen ? 'text-purple-400' : 'text-gray-400'}`} title="AI渲染">
                  <Wand2 className="w-4 h-4" />
               </button>
          </div>

          <div className="flex gap-1">
            <button onClick={undo} disabled={past.length === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} disabled={future.length === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
          </div>
      </div>

      {/* Main 3D Canvas - Full Screen */}
      <div className="absolute inset-0 pt-12">
        <Scene 
            modelData={modelData}
            transformMode={transformMode}
            lighting={lighting}
            cameraConfig={cameraConfig}
            renderConfig={renderConfig}
            meshConfigs={meshConfigs}
            onMeshSelect={setSelectedMeshName}
            selectedMeshName={selectedMeshName}
            setGlRef={(gl) => (glRef.current = gl)}
            onMeshesLoaded={setMeshList}
            cameraStateRef={cameraStateRef}
            initialCameraState={loadedCameraState}
        />
      </div>

      {/* Floating Windows */}
      {windows.map((win) => (
          win.isOpen && (
            <FloatingWindow
                key={win.id}
                {...win}
                onUpdate={(x, y, w, h) => updateWindow(win.id, { x, y, width: w, height: h })}
                onFocus={() => focusWindow(win.id)}
                onClose={() => toggleWindow(win.id)}
            >
                {win.id === 'sidebar' && (
                    <Sidebar 
                        onModelUpload={handleModelUpload}
                        onTextureUpload={handleTextureUpload}
                        modelData={modelData}
                        currentConfig={selectedMeshName ? meshConfigs[selectedMeshName] : undefined}
                        onClearModel={handleClearModel}
                        meshList={meshList}
                        selectedMeshName={selectedMeshName}
                        onSelectMesh={setSelectedMeshName}
                        onUpdateTransform={handleUpdateTextureTransform}
                        onTransformStart={onTransformStart}
                        onRemoveTexture={handleRemoveTexture}
                        onToggleVisibility={handleToggleVisibility}
                        onResetMesh={handleResetMesh}
                        meshConfigs={meshConfigs}
                    />
                )}
                {win.id === 'renderer' && (
                    <RendererPanel 
                        config={renderConfig}
                        setConfig={setRenderConfig}
                    />
                )}
                {win.id === 'inspector' && (
                    <Inspector 
                        lighting={lighting}
                        setLighting={handleLightingChange}
                        cameraConfig={cameraConfig}
                        setCameraConfig={setCameraConfig}
                        renderConfig={renderConfig}
                        setRenderConfig={setRenderConfig}
                        transformMode={transformMode}
                        setTransformMode={setTransformMode}
                        selectedMeshName={selectedMeshName}
                        onScreenshot={handleScreenshot}
                        onHdrUpload={handleHdrUpload}
                    />
                )}
                {win.id === 'aipanel' && (
                    <AIPanel 
                        onGenerate={handleGenerate}
                        isRendering={isAIRendering}
                        resultUrl={aiResultUrl}
                        error={aiError}
                        onCloseResult={() => setAiResultUrl(null)}
                    />
                )}
            </FloatingWindow>
          )
      ))}

    </div>
  );
}

export default App;