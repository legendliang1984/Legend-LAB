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

// Physical transform of the mesh itself (Move/Rotate/Scale the geometry)
export interface MeshPhysicalTransform {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles
  scale: [number, number, number];
}

export interface MeshConfig {
    textureUrl: string | null;
    textureName: string | null;
    transform: TextureTransform;
}

export interface LightingConfig {
  sceneExposure: number; // Global exposure
  ambientIntensity: number;
  // Environment / HDR
  environmentUrl: string | null; // Null uses preset, string uses custom upload
  environmentPreset: string;
  environmentRotation: number;
  backgroundVisible: boolean;
  backgroundBlur: number;
  // Directional Light (Main Sun)
  directionalIntensity: number;
  directionalPosition: [number, number, number];
}

export interface SceneMesh {
  id: string;
  name: string;
  type: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

// Structure for saving/loading
export interface ProjectFile {
  version: number;
  timestamp: number;
  lighting: LightingConfig;
  meshConfigs: Record<string, MeshConfig>; 
  meshTransforms: Record<string, MeshPhysicalTransform>;
  camera?: CameraState; 
  modelData: {
    filename: string;
    type: 'obj' | 'glb';
    base64: string; 
  } | null;
  assets: Record<string, string>; 
}

// Gemini API Configuration
export interface GeminiConfig {
  apiKey: string;
}

export type AIModelType = 'gemini-2.5-flash-image';
