import React, { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  Stage, 
  TransformControls, 
  Environment, 
  Grid
} from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { LightingConfig, ModelData, TransformMode, SceneMesh, MeshConfig, MeshPhysicalTransform, CameraState } from '../types';

interface SceneProps {
  modelData: ModelData | null;
  transformMode: TransformMode;
  lighting: LightingConfig;
  meshConfigs: Record<string, MeshConfig>;
  meshTransforms: Record<string, MeshPhysicalTransform>;
  onMeshSelect: (meshName: string | null) => void;
  selectedMeshName: string | null;
  setGlRef: (gl: THREE.WebGLRenderer | null) => void;
  onMeshesLoaded: (meshes: SceneMesh[]) => void;
  onTransformChange: (meshName: string, transform: MeshPhysicalTransform) => void;
  onTransformEnd: () => void;
  // Camera
  cameraStateRef: React.MutableRefObject<CameraState | null>;
  targetCameraState: CameraState | null;
  onCameraRestored: () => void;
  shouldResetCamera: boolean; // Manual reset to default
  onCameraResetComplete: () => void;
}

// Component to handle Model Loading & Texture Application & Physical Transforms
const Model: React.FC<{ 
  modelData: ModelData; 
  meshConfigs: Record<string, MeshConfig>;
  meshTransforms: Record<string, MeshPhysicalTransform>;
  onMeshSelect: (name: string | null) => void; 
  onMeshesLoaded: (meshes: SceneMesh[]) => void;
}> = ({ modelData, meshConfigs, meshTransforms, onMeshSelect, onMeshesLoaded }) => {
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

      // Pre-process model
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (!mesh.name) mesh.name = `Part_${mesh.id}`;
          
          // Ensure standard material with white base
          if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
             mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
          } else {
             // If existing material, ensure it's white to show texture color correctly
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

  // Apply Mesh Physical Transforms (Position/Rotation/Scale) from History State
  useEffect(() => {
    if (!obj) return;
    obj.traverse((child) => {
       if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const transform = meshTransforms[mesh.name];
          if (transform) {
             mesh.position.set(...transform.position);
             mesh.rotation.set(...transform.rotation);
             mesh.scale.set(...transform.scale);
          }
       }
    });
  }, [obj, meshTransforms]);


  // Apply Textures Logic
  useEffect(() => {
    if (!obj) return;

    // We traverse the object to apply or remove textures based on meshConfigs
    obj.traverse((child) => {
       if ((child as THREE.Mesh).isMesh) {
           const mesh = child as THREE.Mesh;
           const config = meshConfigs[mesh.name];
           const material = mesh.material as THREE.MeshStandardMaterial;

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

  // Apply Transforms to Textures (Animation Frame)
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
    onMeshSelect(mesh.name);
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

// Component to track camera changes and update ref
const CameraTracker: React.FC<{ 
  cameraStateRef: React.MutableRefObject<CameraState | null>
}> = ({ cameraStateRef }) => {
  const { camera, controls } = useThree();
  
  useFrame(() => {
    if (controls) {
      const orbit = controls as any;
      cameraStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [orbit.target.x, orbit.target.y, orbit.target.z]
      };
    }
  });
  return null;
};

// Camera Rig to handle reset and restore
const CameraRig: React.FC<{ 
  shouldReset: boolean; 
  onResetComplete: () => void;
  targetState: CameraState | null;
  onRestoreComplete: () => void;
}> = ({ shouldReset, onResetComplete, targetState, onRestoreComplete }) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  
  // Handle default reset
  useEffect(() => {
    if (shouldReset && controlsRef.current) {
      controlsRef.current.reset();
      onResetComplete();
    }
  }, [shouldReset, onResetComplete]);

  // Handle specific state restore (from load)
  useEffect(() => {
    if (targetState && controlsRef.current) {
      camera.position.set(...targetState.position);
      controlsRef.current.target.set(...targetState.target);
      controlsRef.current.update();
      onRestoreComplete();
    }
  }, [targetState, onRestoreComplete, camera]);

  return <OrbitControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />;
};


const SceneContent: React.FC<SceneProps> = ({ 
  modelData, 
  transformMode, 
  lighting,
  meshConfigs,
  meshTransforms,
  onMeshSelect,
  selectedMeshName,
  setGlRef,
  onMeshesLoaded,
  onTransformChange,
  onTransformEnd,
  cameraStateRef,
  targetCameraState,
  onCameraRestored,
  shouldResetCamera,
  onCameraResetComplete
}) => {
  const { gl, scene } = useThree();
  
  useEffect(() => {
    setGlRef(gl);
    return () => setGlRef(null);
  }, [gl, setGlRef]);

  // Apply Tone Mapping Exposure
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = lighting.sceneExposure;
  }, [gl, lighting.sceneExposure]);

  // Handle Environment Rotation
  useEffect(() => {
      scene.environmentRotation.set(0, lighting.environmentRotation * (Math.PI / 180), 0);
      scene.backgroundRotation.set(0, lighting.environmentRotation * (Math.PI / 180), 0);
  }, [lighting.environmentRotation, scene]);

  // Find the actual THREE object that corresponds to the selected name
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | undefined>(undefined);

  useEffect(() => {
    if (!selectedMeshName) {
      setSelectedObject(undefined);
      return;
    }
    const found = scene.getObjectByName(selectedMeshName);
    setSelectedObject(found);
  }, [selectedMeshName, scene, modelData]);

  // Transform Controls Handling
  const handleObjectChange = (e: any) => {
      if (!selectedMeshName || !e.target.object) return;
      const obj = e.target.object;
      
      onTransformChange(selectedMeshName, {
          position: [obj.position.x, obj.position.y, obj.position.z],
          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
          scale: [obj.scale.x, obj.scale.y, obj.scale.z]
      });
  };

  return (
    <>
      <color attach="background" args={['#1c1c1c']} />
      
      {/* Base Lighting */}
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight 
        position={lighting.directionalPosition} 
        intensity={lighting.directionalIntensity} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Environment / HDR */}
      {lighting.environmentUrl ? (
          <Environment 
            files={lighting.environmentUrl} 
            background={lighting.backgroundVisible} 
            blur={lighting.backgroundBlur}
          />
      ) : (
        <Environment 
            preset={lighting.environmentPreset as any} 
            background={lighting.backgroundVisible}
            blur={lighting.backgroundBlur}
        />
      )}

      {/* Grid - Made slightly brighter for visibility */}
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={4} 
        sectionColor="#555" 
        cellColor="#333" 
        position={[0, -0.01, 0]}
      />

      <Suspense fallback={null}>
        <Stage intensity={0.2} environment={null} adjustCamera={false}>
          {modelData && (
            <Model 
              modelData={modelData} 
              meshConfigs={meshConfigs}
              meshTransforms={meshTransforms}
              onMeshSelect={onMeshSelect}
              onMeshesLoaded={onMeshesLoaded}
            />
          )}
        </Stage>
      </Suspense>
      
      {selectedObject && (
        <TransformControls 
          object={selectedObject} 
          mode={transformMode} 
          size={0.8}
          onObjectChange={handleObjectChange}
          onMouseUp={onTransformEnd} 
        />
      )}

      <CameraTracker cameraStateRef={cameraStateRef} />
      <CameraRig 
        shouldReset={shouldResetCamera} 
        onResetComplete={onCameraResetComplete}
        targetState={targetCameraState}
        onRestoreComplete={onCameraRestored}
      />
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 3, 6], fov: 40 }} gl={{ preserveDrawingBuffer: true }}>
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;