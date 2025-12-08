import React, { useState, useRef, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import LoadingOverlay from './components/LoadingOverlay';
import AIModal from './components/AIModal';
import { LightingConfig, ModelData, TransformMode, SceneMesh, TextureTransform, MeshConfig, MeshPhysicalTransform, ProjectFile, CameraState, AIModelType, GeminiConfig } from './types';
import { generateAIRender } from './services/geminiService';
import { X } from 'lucide-react';
import * as THREE from 'three';

// Initial states
const INITIAL_TRANSFORM: TextureTransform = {
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  repeatX: 1,
  repeatY: 1,
  flipY: false,
  wrapS: THREE.RepeatWrapping,
  wrapT: THREE.RepeatWrapping
};

const INITIAL_LIGHTING: LightingConfig = {
  sceneExposure: 1.0,
  ambientIntensity: 0.5,
  environmentUrl: null,
  environmentPreset: 'studio',
  environmentRotation: 0,
  backgroundVisible: true,
  backgroundBlur: 0,
  directionalIntensity: 1.5,
  directionalPosition: [5, 10, 5]
};

// Interface for History State
interface HistoryState {
  meshConfigs: Record<string, MeshConfig>;
  meshTransforms: Record<string, MeshPhysicalTransform>;
  lighting: LightingConfig;
}

function App() {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [meshList, setMeshList] = useState<SceneMesh[]>([]);
  
  // Selection State
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>(TransformMode.ROTATE);
  
  // Core State (Subject to History)
  const [meshConfigs, setMeshConfigs] = useState<Record<string, MeshConfig>>({});
  const [meshTransforms, setMeshTransforms] = useState<Record<string, MeshPhysicalTransform>>({});
  const [lighting, setLighting] = useState<LightingConfig>(INITIAL_LIGHTING);

  // Camera State
  const [shouldResetCamera, setShouldResetCamera] = useState(false);
  const [targetCameraState, setTargetCameraState] = useState<CameraState | null>(null);
  const cameraStateRef = useRef<CameraState | null>(null); // Live tracking of camera
  
  // History Stacks
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  // AI State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModel, setAiModel] = useState<AIModelType>('gemini-2.5-flash-image');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // --- History Management ---
  
  // Record current state to history before making changes
  const recordHistory = useCallback(() => {
    const currentState: HistoryState = {
      meshConfigs: { ...meshConfigs }, // Shallow copy
      meshTransforms: { ...meshTransforms }, // Shallow copy
      lighting: { ...lighting }
    };
    setPast(prev => [...prev, currentState]);
    setFuture([]); // Clear future on new action
  }, [meshConfigs, meshTransforms, lighting]);

  const undo = () => {
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    // Push current to future
    const current: HistoryState = { meshConfigs, meshTransforms, lighting };
    setFuture(prev => [current, ...prev]);
    
    // Restore state
    setMeshConfigs(previous.meshConfigs);
    setMeshTransforms(previous.meshTransforms);
    setLighting(previous.lighting);
    setPast(newPast);
  };

  const redo = () => {
    if (future.length === 0) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    // Push current to past
    const current: HistoryState = { meshConfigs, meshTransforms, lighting };
    setPast(prev => [...prev, current]);
    
    // Restore state
    setMeshConfigs(next.meshConfigs);
    setMeshTransforms(next.meshTransforms);
    setLighting(next.lighting);
    setFuture(newFuture);
  };

  // --- Handlers ---

  const handleModelUpload = (file: File) => {
    if (modelData?.url) URL.revokeObjectURL(modelData.url);
    const url = URL.createObjectURL(file);
    const type = file.name.toLowerCase().endsWith('.glb') ? 'glb' : 'obj';
    setModelData({ url, filename: file.name, type });
    
    // Reset Everything
    setSelectedMeshName(null);
    setMeshList([]); 
    setMeshConfigs({});
    setMeshTransforms({});
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
        transform: { ...INITIAL_TRANSFORM }
      }
    }));
  };

  const handleRemoveTexture = (meshName: string) => {
    if (!meshConfigs[meshName]) return;
    
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
      [selectedMeshName]: {
        ...prev[selectedMeshName],
        transform: newTransform
      }
    }));
  };

  // Update physical mesh transform (Scene Callback)
  const handleMeshTransformChange = (meshName: string, transform: MeshPhysicalTransform) => {
      setMeshTransforms(prev => ({
          ...prev,
          [meshName]: transform
      }));
  };

  // Called when drag ends in scene or slider release
  const handleInteractStart = () => {
    recordHistory();
  };

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

  const handleClearModel = () => {
    setModelData(null);
    setMeshConfigs({});
    setMeshTransforms({});
    setSelectedMeshName(null);
    setMeshList([]);
    setPast([]);
    setFuture([]);
  };

  const handleResetCamera = () => {
    setShouldResetCamera(true);
  };

  // --- AI Logic ---

  const handleOpenAIModal = () => {
    setShowAIModal(true);
    // Keep previous prompt but clear result
    setAiResult(null); 
  };

  const handleGenerateAI = async (config: GeminiConfig) => {
    setIsGeneratingAI(true);
    setErrorMessage(null);
    setAiResult(null);

    try {
        // 1. Capture Scene as Base64 Reference
        let imageBase64 = '';
        if (glRef.current) {
            // Force a render to ensure latest state
            glRef.current.render(glRef.current.scene, glRef.current.camera);
            imageBase64 = glRef.current.domElement.toDataURL('image/jpeg', 0.9);
        } else {
            throw new Error("无法获取3D场景图像，请刷新后重试");
        }

        // 2. Call Gemini Service
        const resultUrl = await generateAIRender(imageBase64, aiPrompt, config);
        setAiResult(resultUrl);
    } catch (e: any) {
      console.error("AI Generation Error", e);
      setErrorMessage(e.message || "生成失败，请检查密钥或网络");
    } finally {
      setIsGeneratingAI(false);
    }
  };


  // --- Save / Load Project Logic ---

  const fileToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const handleSaveProject = async () => {
      if (!modelData) return;
      setIsProcessing(true); 

      try {
          // 1. Fetch Model Blob
          const modelBlob = await fetch(modelData.url).then(r => r.blob());
          const modelBase64 = await fileToBase64(modelBlob);

          // 2. Fetch all texture Blobs
          const assets: Record<string, string> = {};
          const configsToSave = { ...meshConfigs };
          
          for (const key in configsToSave) {
              const cfg = configsToSave[key];
              if (cfg.textureUrl) {
                  const texBlob = await fetch(cfg.textureUrl).then(r => r.blob());
                  const texBase64 = await fileToBase64(texBlob);
                  assets[cfg.textureName || `tex_${key}`] = texBase64;
                  // Store filename in config to link back
                  cfg.textureUrl = cfg.textureName || `tex_${key}`; 
              }
          }

          const projectFile: ProjectFile = {
              version: 1,
              timestamp: Date.now(),
              lighting,
              meshConfigs: configsToSave,
              meshTransforms,
              camera: cameraStateRef.current ? { ...cameraStateRef.current } : undefined, // Save camera state
              modelData: {
                  filename: modelData.filename,
                  type: modelData.type,
                  base64: modelBase64
              },
              assets
          };

          const jsonString = JSON.stringify(projectFile);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `packviz_project_${Date.now()}.packviz`;
          link.click();
          URL.revokeObjectURL(url);

      } catch (e) {
          console.error("Save failed", e);
          setErrorMessage("保存项目失败");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleLoadProject = async (file: File) => {
      setIsProcessing(true);
      try {
          const text = await file.text();
          const project: ProjectFile = JSON.parse(text);
          
          if (project.version !== 1 || !project.modelData) {
              throw new Error("无效的项目文件版本");
          }

          // 1. Restore Model
          const modelResponse = await fetch(project.modelData.base64);
          const modelBlob = await modelResponse.blob();
          const modelUrl = URL.createObjectURL(modelBlob);
          
          // 2. Restore Textures (Assets) to URLs
          const restoredAssets: Record<string, string> = {};
          for (const [name, base64] of Object.entries(project.assets)) {
              const res = await fetch(base64);
              const blob = await res.blob();
              restoredAssets[name] = URL.createObjectURL(blob);
          }

          // 3. Fix config URLs
          const restoredConfigs = { ...project.meshConfigs };
          for (const key in restoredConfigs) {
             const cfg = restoredConfigs[key];
             // In save, we replaced url with name. Now replace name with blob url
             if (cfg.textureUrl && restoredAssets[cfg.textureUrl]) {
                 cfg.textureUrl = restoredAssets[cfg.textureUrl];
             }
          }

          // Apply States
          setModelData({ 
              url: modelUrl, 
              filename: project.modelData.filename, 
              type: project.modelData.type 
          });
          setLighting(project.lighting);
          setMeshConfigs(restoredConfigs);
          setMeshTransforms(project.meshTransforms || {});
          
          // Restore Camera if exists
          if (project.camera) {
            setTargetCameraState(project.camera);
          }

          // Clear History
          setPast([]);
          setFuture([]);

      } catch (e) {
          console.error("Load failed", e);
          setErrorMessage("加载项目失败：文件损坏或格式不正确");
      } finally {
          setIsProcessing(false);
      }
  };


  // Get current selected config
  const currentConfig = selectedMeshName ? meshConfigs[selectedMeshName] : undefined;

  return (
    <div className="flex h-screen bg-[#1c1c1c] text-white overflow-hidden font-sans">
      <Sidebar 
        onModelUpload={handleModelUpload}
        onTextureUpload={handleTextureUpload}
        modelData={modelData}
        currentConfig={currentConfig}
        onClearModel={handleClearModel}
        meshList={meshList}
        selectedMeshName={selectedMeshName}
        onSelectMesh={setSelectedMeshName}
        onUpdateTransform={handleUpdateTextureTransform}
        onTransformStart={handleInteractStart}
        onRemoveTexture={handleRemoveTexture}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        meshConfigs={meshConfigs}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
      />

      <div className="flex-1 relative bg-[#000]">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
           <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[10px] text-gray-400">
             视窗 [透视视图] {selectedMeshName ? ` - 选中: ${selectedMeshName}` : ''}
           </div>
        </div>

        <Scene 
          modelData={modelData}
          transformMode={transformMode}
          lighting={lighting}
          meshConfigs={meshConfigs}
          meshTransforms={meshTransforms}
          onMeshSelect={setSelectedMeshName}
          selectedMeshName={selectedMeshName}
          setGlRef={(gl) => (glRef.current = gl)}
          onMeshesLoaded={setMeshList}
          onTransformChange={handleMeshTransformChange}
          onTransformEnd={handleInteractStart}
          shouldResetCamera={shouldResetCamera}
          onCameraResetComplete={() => setShouldResetCamera(false)}
          // Camera Saving Props
          cameraStateRef={cameraStateRef}
          targetCameraState={targetCameraState}
          onCameraRestored={() => setTargetCameraState(null)}
        />
        
        {isProcessing && <LoadingOverlay message="处理中..." />}
        
        {errorMessage && (
             <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 text-white px-6 py-4 rounded shadow-lg max-w-md animate-in slide-in-from-top-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold mb-1">操作失败</h4>
                        <p className="text-sm text-red-100">{errorMessage}</p>
                    </div>
                    <button onClick={() => setErrorMessage(null)} className="text-red-200 hover:text-white ml-4"><X className="w-4 h-4" /></button>
                </div>
             </div>
        )}

        <AIModal 
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          model={aiModel}
          setModel={setAiModel}
          onGenerate={handleGenerateAI}
          isGenerating={isGeneratingAI}
          resultImage={aiResult}
        />

      </div>

      <Inspector 
        lighting={lighting}
        setLighting={handleLightingChange}
        transformMode={transformMode}
        setTransformMode={setTransformMode}
        selectedMeshName={selectedMeshName}
        onScreenshot={handleScreenshot}
        onHdrUpload={handleHdrUpload}
        onInteractStart={handleInteractStart}
        onResetCamera={handleResetCamera}
        onOpenAIModal={handleOpenAIModal}
      />
    </div>
  );
}

export default App;
