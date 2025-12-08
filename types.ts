import { Vector3, Euler } from 'three';

export enum TransformMode {
  TRANSLATE = 'translate',
  ROTATE = 'rotate',
  SCALE = 'scale'
}

export interface ModelData {
  url: string;
  filename: string;
  type: 'obj' | 'glb';
}

export interface SceneMesh {
  id: string;
  name: string;
  type: string;
}

export interface TextureTransform {
  offsetX: number;
  offsetY: number;
  rotation: number;
  repeatX: number;
  repeatY: number;
  flipY: boolean;
  wrapS: number; // THREE.Wrapping
  wrapT: number;
}

export interface MeshConfig {
    textureUrl: string | null;
    textureName: string | null;
    transform: TextureTransform;
    visible: boolean;
}

export interface LightingConfig {
  ambientIntensity: number;
  // Environment / HDR
  environmentUrl: string | null;
  environmentPreset: string;
  environmentRotation: number;
  backgroundVisible: boolean;
  backgroundBlur: number;
  // Directional Light (Main Sun)
  directionalIntensity: number;
  directionalPosition: [number, number, number];
  // Camera Light (Viewport Light)
  cameraLightIntensity: number;
}

export interface CameraConfig {
  focalLength: number; // 15mm - 200mm
  filmOffset: number; // Lens Shift X
}

// Blender/Octane-like Render Settings
export interface RenderConfig {
    enablePostProcessing: boolean;
    
    // Kernel / Core
    ao: boolean; // Ambient Occlusion
    aoIntensity: number;
    aoRadius: number;

    // Imager (Color Management)
    exposure: number;
    contrast: number;
    saturation: number;
    brightness: number;

    // Post Processing
    bloom: boolean; 
    bloomIntensity: number;
    bloomThreshold: number;
    bloomRadius: number;
    
    chromaticAberration: boolean;
    chromaticAberrationOffset: number;
    
    noise: boolean;
    noiseOpacity: number;
    
    vignette: boolean;
    vignetteOffset: number;
    vignetteDarkness: number;
    
    toneMapping: boolean; // Always ACES Filmic
}

export interface JimengConfig {
  accessKey: string;
  secretKey: string;
}

export type AIAspectRatio = '1:1' | '4:3' | '16:9' | '9:16';

export type AIModelType = 'jimeng-v4';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ProjectFile {
    version: string;
    modelData: { filename: string, type: 'obj'|'glb', base64: string } | null;
    meshConfigs: Record<string, MeshConfig>;
    lighting: LightingConfig;
    camera: CameraConfig;
    renderConfig: RenderConfig; // Save render settings
}

export interface CameraState {
    position: [number, number, number];
    target: [number, number, number];
}