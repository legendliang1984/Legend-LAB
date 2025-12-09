import React from 'react';
import { EffectComposer, N8AO, Bloom, Vignette, Noise, ToneMapping, ChromaticAberration, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';
import { RenderConfig } from '../types';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface RenderEffectsProps {
  config: RenderConfig;
}

const RenderEffects: React.FC<RenderEffectsProps> = ({ config }) => {
  if (!config.enablePostProcessing) return null;

  return (
    <EffectComposer multisampling={4} frameBufferType={THREE.HalfFloatType}>
      {/* 1. Ambient Occlusion (Kernel) */}
      {config.ao && (
        <N8AO 
            halfRes 
            aoRadius={config.aoRadius} 
            intensity={config.aoIntensity} 
            color="black" 
        />
      )}

      {/* 2. Color Grading (Imager) */}
      <BrightnessContrast
        brightness={config.brightness}
        contrast={config.contrast}
      />
      <HueSaturation
        saturation={config.saturation}
        hue={0}
      />

      {/* 3. Bloom (Post) */}
      {config.bloom && (
        <Bloom 
            luminanceThreshold={config.bloomThreshold} 
            mipmapBlur 
            intensity={config.bloomIntensity} 
            radius={config.bloomRadius}
        />
      )}

      {/* 4. Lens Effects (Post) */}
      {config.chromaticAberration && (
          <ChromaticAberration 
            offset={new THREE.Vector2(config.chromaticAberrationOffset, config.chromaticAberrationOffset)} 
            radialModulation={false}
            modulationOffset={0}
          />
      )}

      {config.noise && (
        <Noise opacity={config.noiseOpacity} blendFunction={BlendFunction.OVERLAY} />
      )}

      {config.vignette && (
        <Vignette eskil={false} offset={config.vignetteOffset} darkness={config.vignetteDarkness} />
      )}

      {/* 5. Tone Mapping (Imager) */}
      {config.toneMapping && (
          <ToneMapping
            mode={THREE.ACESFilmicToneMapping} // ACES Filmic is standard for realistic rendering
          />
      )}
    </EffectComposer>
  );
};

export default RenderEffects;