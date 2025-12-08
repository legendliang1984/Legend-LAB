import React, { Suspense, useEffect, useState, useRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  Stage, 
  TransformControls, 
  Environment, 
  Grid,
  ContactShadows
} from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { LightingConfig, ModelData, TransformMode, SceneMesh, MeshConfig, CameraConfig, CameraState, RenderConfig } from '../types';
import RenderEffects from './RenderEffects';

interface SceneProps {
  modelData: ModelData | null;
  transformMode: TransformMode;
  lighting: LightingConfig;
  cameraConfig: CameraConfig;
  renderConfig: RenderConfig;
  meshConfigs: Record<string, MeshConfig>;
  onMeshSelect: (meshName: string | null) => void;
  selectedMeshName: string | null;
  setGlRef: (gl: THREE.WebGLRenderer | null) => void;
  onMeshesLoaded: (meshes: SceneMesh[]) => void;
  cameraStateRef: React.MutableRefObject<CameraState | null>;
  initialCameraState?: CameraState | null;
}

// Track camera state for saving
const CameraTracker: React.FC<{ stateRef: React.MutableRefObject<CameraState | null> }> = ({ stateRef }) => {
    const { camera, controls } = useThree();
    useFrame(() => {
        if (controls) {
            const orbit = controls as any;
            stateRef.current = {
                position: camera.position.toArray() as [number, number, number],
                target: orbit.target.toArray() as [number, number, number]
            };
        }
    });
    return null;
};

// Rig to handle Camera Lens Effects, Viewport Light, and Restore State
const CameraRig: React.FC<{ 
    config: CameraConfig, 
    lightIntensity: number,
    initialState?: CameraState | null
}> = ({ config, lightIntensity, initialState }) => {
    const { camera, controls } = useThree();
    const lightRef = useRef<THREE.PointLight>(null);
    const initialized = useRef(false);

    // Restore Camera Position on Load
    useEffect(() => {
        if (initialState && !initialized.current && controls) {
            camera.position.set(...initialState.position);
            (controls as any).target.set(...initialState.target);
            camera.updateProjectionMatrix();
            (controls as any).update();
            initialized.current = true;
        }
    }, [initialState, camera, controls]);

    useFrame(() => {
        if (camera instanceof THREE.PerspectiveCamera) {
            // Apply Lens settings
            camera.setFocalLength(config.focalLength);
            
            // Film Offset (Lens Shift)
            if (config.filmOffset !== 0) {
                 camera.setViewOffset(
                    window.innerWidth, 
                    window.innerHeight, 
                    config.filmOffset * -1, 
                    0, 
                    window.innerWidth, 
                    window.innerHeight
                );
            } else {
                camera.clearViewOffset();
            }
            camera.updateProjectionMatrix();
        }

        // Camera Light Follow
        if (lightRef.current) {
            lightRef.current.position.copy(camera.position);
        }
    });

    return <pointLight ref={lightRef} intensity={lightIntensity} decay={0} distance={0} color="#ffffff" />;
};

const Model: React.FC<{ 
  modelData: ModelData; 
  meshConfigs: Record<string, MeshConfig>;
  onMeshSelect: (name: string | null) => void; 
  onMeshesLoaded: (meshes: SceneMesh[]) => void;
}> = ({ modelData, meshConfigs, onMeshSelect, onMeshesLoaded }) => {
  const [obj, setObj] = useState<THREE.Group | null>(null);

  // Load Model
  useEffect(() => {
    const loader = modelData.type === 'glb' ? new GLTFLoader() : new OBJLoader();
    
    loader.load(modelData.url, (loaded) => {
      let group: THREE.Group;
      if (modelData.type === 'glb') {
        group = (loaded as any).scene;
      } else {
        group = loaded as THREE.Group;
      }

      const foundMeshes: SceneMesh[] = [];

      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (!mesh.name) mesh.name = `Part_${mesh.id}`;
          
          if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
             mesh.material = new THREE.MeshStandardMaterial({ 
                 color: 0xffffff, 
                 side: THREE.DoubleSide,
                 roughness: 0.5,
                 metalness: 0.1
            });
          } else {
             (mesh.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
          }

          foundMeshes.push({
            id: mesh.uuid,
            name: mesh.name,
            type: 'Mesh'
          });
        }
      });
      
      onMeshesLoaded(foundMeshes);
      setObj(group);
    }, undefined, (err) => console.error("Error loading model", err));
  }, [modelData]);

  // Apply Textures & Visibility Logic
  useEffect(() => {
    if (!obj) return;

    obj.traverse((child) => {
       if ((child as THREE.Mesh).isMesh) {
           const mesh = child as THREE.Mesh;
           const config = meshConfigs[mesh.name];
           const material = mesh.material as THREE.MeshStandardMaterial;

           // Visibility
           if (config) {
               mesh.visible = config.visible;
           } else {
               mesh.visible = true; // Default visible
           }

           // Texture
           if (config && config.textureUrl) {
                if (material.userData.currentTextureUrl !== config.textureUrl) {
                    const loader = new THREE.TextureLoader();
                    loader.load(config.textureUrl, (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        material.map = tex;
                        material.needsUpdate = true;
                        material.userData.currentTextureUrl = config.textureUrl;
                    });
                }
           } else {
               if (material.map) {
                   material.map = null;
                   material.needsUpdate = true;
                   material.userData.currentTextureUrl = null;
               }
           }
       }
    });
  }, [meshConfigs, obj]);

  // Apply Transforms (Animation Frame)
  useFrame(() => {
      if (!obj) return;
      obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const config = meshConfigs[mesh.name];
              const mat = mesh.material as THREE.MeshStandardMaterial;
              
              if (mat.map && config) {
                  const tex = mat.map;
                  const t = config.transform;
                  tex.offset.set(t.offsetX, t.offsetY);
                  tex.repeat.set(t.repeatX, t.repeatY);
                  tex.rotation = t.rotation * (Math.PI / 180);
                  tex.center.set(0.5, 0.5);
                  tex.flipY = t.flipY;
                  tex.wrapS = t.wrapS;
                  tex.wrapT = t.wrapT;
              }
          }
      });
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    if (mesh.visible) {
        onMeshSelect(mesh.name);
    }
  };

  const handlePointerMissed = () => {
    onMeshSelect(null);
  };

  if (!obj) return null;

  return (
    <primitive 
      object={obj} 
      onPointerDown={handlePointerDown}
      onPointerMissed={handlePointerMissed}
    />
  );
};

const SceneContent: React.FC<SceneProps> = ({ 
  modelData, 
  transformMode, 
  lighting,
  cameraConfig,
  renderConfig,
  meshConfigs,
  onMeshSelect,
  selectedMeshName,
  setGlRef,
  onMeshesLoaded,
  cameraStateRef,
  initialCameraState
}) => {
  const { gl, scene } = useThree();
  
  useEffect(() => {
    setGlRef(gl);
    return () => setGlRef(null);
  }, [gl, setGlRef]);

  useEffect(() => {
      scene.environmentRotation.set(0, lighting.environmentRotation * (Math.PI / 180), 0);
      scene.backgroundRotation.set(0, lighting.environmentRotation * (Math.PI / 180), 0);
  }, [lighting.environmentRotation, scene]);

  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | undefined>(undefined);

  useEffect(() => {
    if (!selectedMeshName) {
      setSelectedObject(undefined);
      return;
    }
    const found = scene.getObjectByName(selectedMeshName);
    setSelectedObject(found);
  }, [selectedMeshName, scene, modelData]);

  return (
    <>
      <color attach="background" args={['#1c1c1c']} />
      
      <CameraTracker stateRef={cameraStateRef} />
      <CameraRig config={cameraConfig} lightIntensity={lighting.cameraLightIntensity} initialState={initialCameraState} />

      {/* Base Lighting */}
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight 
        position={lighting.directionalPosition} 
        intensity={lighting.directionalIntensity} 
        castShadow 
        shadow-bias={-0.001}
      />
      
      {/* Environment */}
      {lighting.environmentUrl ? (
          <Environment files={lighting.environmentUrl} background={lighting.backgroundVisible} blur={lighting.backgroundBlur} />
      ) : (
        <Environment preset={lighting.environmentPreset as any} background={lighting.backgroundVisible} blur={lighting.backgroundBlur} />
      )}

      {/* High Quality Render Effects (Post Processing) */}
      <RenderEffects config={renderConfig} />

      {/* Ground Contact Shadows (Blender-like grounding) */}
      <ContactShadows 
        opacity={0.6} 
        scale={20} 
        blur={2} 
        far={4.5} 
        resolution={1024} 
        color="#000000" 
      />

      {/* Helper Grid (Only visible when no render mode, but keeping it for now) */}
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={2}
        sectionColor="#444" 
        sectionThickness={1}
        cellColor="#2a2a2a" 
        cellThickness={0.5}
        position={[0, -0.01, 0]}
        args={[20, 20]}
      />

      <Suspense fallback={null}>
        <Stage intensity={0} environment={null} adjustCamera={false} shadows={false}>
          {modelData && (
            <Model 
              modelData={modelData} 
              meshConfigs={meshConfigs}
              onMeshSelect={onMeshSelect}
              onMeshesLoaded={onMeshesLoaded}
            />
          )}
        </Stage>
      </Suspense>
      
      {selectedObject && selectedObject.visible && (
        <TransformControls 
          object={selectedObject} 
          mode={transformMode} 
          size={0.8}
        />
      )}

      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [0, 3, 6], fov: 40 }} 
        gl={{ preserveDrawingBuffer: true }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;