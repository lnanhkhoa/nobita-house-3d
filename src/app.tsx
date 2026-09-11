import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import { NoToneMapping, SRGBColorSpace } from 'three';
import { config } from './config';
import { characters } from './data/characters';
import { Scene } from './scene/scene';
import { preflightModels } from './state/store';
import { Credits, Roster, Title, ViewControls } from './ui/chrome';
import { InfoCard } from './ui/info-card';
import { LoadingVeil } from './ui/loading-veil';

const modelUrls = [
  config.models.house,
  config.models.environment,
  config.models.streets,
  config.models.neighbours,
  config.models.tree,
  config.models.hedge,
  config.models.sakura,
  ...characters.map((c) => `${config.models.characterDir}/${c.id}.glb`),
];

export function App() {
  useEffect(() => {
    document.body.setAttribute('aria-busy', 'true');
    preflightModels(modelUrls);
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [...config.camera.position], fov: config.camera.fov, near: 0.1, far: 200 }}
        // Neutral tone mapping keeps Doraemon blue saturated; filmic curves mud the palette.
        gl={{ antialias: true, toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace }}
        role="img"
        aria-label="Nobita's house from Doraemon seen from the street: a two-storey cream house with a blue-grey tile roof behind a concrete block wall, with Doraemon, Nobita, Shizuka, Gian and Suneo standing on the sidewalk."
      >
        <Scene />
      </Canvas>
      <div id="ui-root">
        <Title />
        <ViewControls />
        <Roster />
        <InfoCard />
        <Credits />
      </div>
      <LoadingVeil />
    </>
  );
}
