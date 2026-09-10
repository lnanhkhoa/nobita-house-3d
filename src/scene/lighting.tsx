/** Warm afternoon key light with one shadow map, cool sky fill. */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#CFE6FF', '#8A7A5A', 0.75]} />
      <directionalLight
        castShadow
        position={[9, 14, 10]}
        intensity={2.2}
        color="#FFF3DF"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={45}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#DCE9FF" />
    </>
  );
}
