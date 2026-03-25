import { useRef, useEffect, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import * as THREE from 'three'
import Terrain, { COLS, ROWS } from './Terrain'
import Decorations from './Decorations'
import CharacterModel from '../characters/CharacterModel'
import Effects from '../effects/Effects'
import { useGameStore } from '../state/gameStore'

// ─── SHARED DAY/NIGHT CLOCK (singleton) ───
// Full cycle = 180s. dawn(0-0.12), day(0.12-0.5), dusk(0.5-0.62), night(0.62-1.0)
// Starts at 0.2 = solid morning
const dayNightClock = { phase: 0.2 }

function getDayNight() {
  const p = dayNightClock.phase
  let sunY: number, sunX: number, sunZ: number, intensity: number
  let ambIntensity: number, nightAmount: number

  if (p < 0.12) {
    // Dawn
    const t = p / 0.12
    sunY = THREE.MathUtils.lerp(5, 60, t)
    sunX = THREE.MathUtils.lerp(80, 100, t)
    sunZ = -40
    intensity = THREE.MathUtils.lerp(0.4, 1.1, t)
    ambIntensity = THREE.MathUtils.lerp(0.2, 0.35, t)
    nightAmount = 1 - t
  } else if (p < 0.5) {
    // Day — full bright
    const t = (p - 0.12) / 0.38
    sunY = THREE.MathUtils.lerp(60, 80, Math.sin(t * Math.PI))
    sunX = THREE.MathUtils.lerp(100, -60, t)
    sunZ = THREE.MathUtils.lerp(-40, -50, t)
    intensity = 1.2
    ambIntensity = 0.35
    nightAmount = 0
  } else if (p < 0.62) {
    // Dusk
    const t = (p - 0.5) / 0.12
    sunY = THREE.MathUtils.lerp(60, 5, t)
    sunX = THREE.MathUtils.lerp(-60, -90, t)
    sunZ = -40
    intensity = THREE.MathUtils.lerp(1.1, 0.4, t)
    ambIntensity = THREE.MathUtils.lerp(0.35, 0.2, t)
    nightAmount = t
  } else {
    // Night — still visible, not pitch black
    const t = (p - 0.62) / 0.38
    sunY = -15
    sunX = THREE.MathUtils.lerp(-90, 80, t)
    sunZ = -40
    intensity = 0.25 // moonlight level — never fully dark
    ambIntensity = 0.2
    nightAmount = 1
  }

  return { sunX, sunY, sunZ, intensity, ambIntensity, nightAmount }
}

// ─── DYNAMIC LIGHTING + SKY (single component, one clock) ───
function DynamicEnvironment() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const skyRef = useRef<any>(null)
  const sunPos = useRef(new THREE.Vector3(100, 60, -40))

  useEffect(() => {
    if (dirLightRef.current) {
      dirLightRef.current.shadow.mapSize.set(2048, 2048)
      const cam = dirLightRef.current.shadow.camera
      cam.left = -20; cam.right = 20; cam.top = 20; cam.bottom = -20
      cam.near = 0.5; cam.far = 60
    }
  }, [])

  useFrame((state, delta) => {
    // Advance the single shared clock
    dayNightClock.phase = (dayNightClock.phase + delta / 180) % 1
    const dn = getDayNight()

    // Sun position
    sunPos.current.set(dn.sunX, Math.max(5, dn.sunY), dn.sunZ)

    // Directional light (sun/moon)
    if (dirLightRef.current) {
      dirLightRef.current.position.copy(sunPos.current).normalize().multiplyScalar(20)
      dirLightRef.current.intensity = dn.intensity
      // Warm day, orange dusk/dawn, blue-ish night
      if (dn.nightAmount < 0.3) dirLightRef.current.color.setHex(0xfff5e0)
      else if (dn.nightAmount < 0.7) dirLightRef.current.color.set('#ffb74d')
      else dirLightRef.current.color.set('#6688bb')
    }

    // Hemisphere
    if (hemiRef.current) {
      const skyC = new THREE.Color('#87CEEB').lerp(new THREE.Color('#1a1a3e'), dn.nightAmount)
      const gndC = new THREE.Color('#3a7d3a').lerp(new THREE.Color('#0a1a0a'), dn.nightAmount)
      hemiRef.current.color.copy(skyC)
      hemiRef.current.groundColor.copy(gndC)
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.6, 0.25, dn.nightAmount)
    }

    // Ambient — never let it go totally dark
    if (ambRef.current) {
      const ambC = new THREE.Color('#505070').lerp(new THREE.Color('#1a1a30'), dn.nightAmount)
      ambRef.current.color.copy(ambC)
      ambRef.current.intensity = dn.ambIntensity
    }

    // Fog color
    if (state.scene.fog instanceof THREE.Fog) {
      const fogC = new THREE.Color('#a8d8ea').lerp(new THREE.Color('#0a0a18'), dn.nightAmount * 0.7)
      state.scene.fog.color.copy(fogC)
    }
  })

  return (
    <>
      <hemisphereLight ref={hemiRef} args={[0x87CEEB, 0x3a7d3a, 0.6]} />
      <ambientLight ref={ambRef} args={[0x505070, 0.35]} />
      <directionalLight
        ref={dirLightRef}
        position={[8, 12, -4]}
        intensity={1.2}
        color={0xfff5e0}
        castShadow
      />
    </>
  )
}

function DynamicSky() {
  const sunPosArr = useRef<[number, number, number]>([100, 60, -40])

  useFrame(() => {
    const dn = getDayNight()
    sunPosArr.current = [dn.sunX, Math.max(5, dn.sunY), dn.sunZ]
  })

  // Sky updates via key re-render would be expensive, so we use a large sphere backdrop instead
  return (
    <Sky
      distance={450000}
      sunPosition={sunPosArr.current}
      inclination={0.52}
      azimuth={0.25}
      rayleigh={0.5}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  )
}

// ─── FIRE TORCHES (visible at night) ───
const TORCH_POSITIONS: [number, number, number][] = [
  [2, 0.6, 2], [11, 0.6, 2], [2, 0.6, 9], [11, 0.6, 9],
  [5, 0.8, 4], [8, 0.8, 4], [5, 0.8, 7], [8, 0.8, 7],
  [0, 0.5, 5], [13, 0.5, 5], [7, 0.8, 0], [7, 0.8, 11],
]

function FireParticles({ count, spread, height, basePos }: { count: number; spread: number; height: number; basePos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const seed = i * 1.618 + basePos[0] * 7 + basePos[2] * 13
      const cycle = ((t * 1.2 + seed) % 2.5) / 2.5
      // Rise and expand
      mesh.position.y = cycle * height
      mesh.position.x = Math.sin(t * 3 + seed) * spread * cycle * 0.5
      mesh.position.z = Math.cos(t * 2.5 + seed * 1.3) * spread * cycle * 0.5
      // Fade and shrink as they rise
      const life = 1 - cycle
      mesh.scale.setScalar(life * 0.8 + 0.2)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = life * 0.9
      // Color shift: white->yellow->orange->red as it rises
      if (cycle < 0.2) mat.color.set('#FFFFFF')
      else if (cycle < 0.4) mat.color.set('#FFF176')
      else if (cycle < 0.6) mat.color.set('#FFB74D')
      else if (cycle < 0.8) mat.color.set('#FF8F00')
      else mat.color.set('#E65100')
    })
  })

  return (
    <group ref={ref} position={basePos}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.03, 4, 3]} />
          <meshBasicMaterial color="#FFB74D" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Torch({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const dn = getDayNight()
    const nightFactor = dn.nightAmount
    if (lightRef.current) {
      const flicker = 0.8 + Math.sin(t * 8 + position[0] * 3) * 0.15 + Math.sin(t * 13 + position[2]) * 0.1
      lightRef.current.intensity = (nightFactor * 2.0 + 0.3) * flicker
      lightRef.current.distance = 3 + nightFactor * 5
    }
  })

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      {/* Iron bracket */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.04, 6]} />
        <meshStandardMaterial color="#424242" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Fire particles */}
      <FireParticles count={12} spread={0.08} height={0.35} basePos={[0, 0.2, 0]} />
      {/* Core glow */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshBasicMaterial color="#FFF176" transparent opacity={0.6} />
      </mesh>
      {/* Outer glow */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshBasicMaterial color="#FF8F00" transparent opacity={0.15} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.3, 0]}
        color="#FF8F00"
        intensity={0.5}
        distance={4}
        decay={2}
      />
    </group>
  )
}

function Torches() {
  return (
    <group>
      {TORCH_POSITIONS.map((pos, i) => (
        <Torch key={i} position={pos} />
      ))}
    </group>
  )
}

// ─── EXTENDED TERRAIN (continuous land to horizon) ───
function InfiniteGround() {
  return (
    <group>
      {/* Main grass plane extending far */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COLS / 2 - 0.5, -0.02, ROWS / 2 - 0.5]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshToonMaterial color="#4a8c3f" />
      </mesh>
      {/* Subtle ring of darker grass further out */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COLS / 2 - 0.5, -0.03, ROWS / 2 - 0.5]}>
        <planeGeometry args={[400, 400]} />
        <meshToonMaterial color="#3a7a35" />
      </mesh>
      {/* Distant hills — simple geometry rings */}
      {[40, 55, 70, 90].map((dist, i) => (
        <group key={i}>
          {Array.from({ length: 8 + i * 3 }, (_, j) => {
            const angle = (j / (8 + i * 3)) * Math.PI * 2 + i * 0.5
            const x = COLS / 2 + Math.cos(angle) * dist
            const z = ROWS / 2 + Math.sin(angle) * dist
            const h = 2 + Math.sin(j * 2.7 + i) * 1.5 + i * 0.8
            const w = 8 + Math.sin(j * 1.3) * 4
            return (
              <mesh key={j} position={[x, h * 0.4, z]} castShadow={false}>
                <sphereGeometry args={[w, 6, 4]} />
                <meshToonMaterial color={i % 2 === 0 ? '#3d8b40' : '#2e7d32'} />
              </mesh>
            )
          })}
        </group>
      ))}
      {/* Distant trees scattered */}
      {Array.from({ length: 60 }, (_, i) => {
        const angle = (i / 60) * Math.PI * 2
        const dist = 20 + Math.sin(i * 3.7) * 15 + 10
        const x = COLS / 2 + Math.cos(angle) * dist
        const z = ROWS / 2 + Math.sin(angle) * dist
        return (
          <group key={`dt-${i}`} position={[x, 0, z]}>
            <mesh position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 1.6, 4]} />
              <meshToonMaterial color="#5D4037" />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <sphereGeometry args={[0.8, 5, 4]} />
              <meshToonMaterial color={i % 3 === 0 ? '#2E7D32' : i % 3 === 1 ? '#388E3C' : '#43A047'} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ─── CAMERA ───
function CameraFollower() {
  const selectedId = useGameStore((s) => s.selectedId)
  const characters = useGameStore((s) => s.characters)
  const controlsRef = useRef<any>(null)
  const targetPos = useRef(new THREE.Vector3(COLS / 2, 0, ROWS / 2))

  useFrame(() => {
    const selected = characters.find((c) => c.id === selectedId)
    if (selected) {
      const goal = new THREE.Vector3(selected.targetCol, 0.3, selected.targetRow)
      targetPos.current.lerp(goal, 0.03)
    }
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetPos.current, 0.05)
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[COLS / 2, 0, ROWS / 2]}
      enablePan={false}
      enableRotate={true}
      minPolarAngle={0.4}
      maxPolarAngle={1.15}
      minDistance={6}
      maxDistance={14}
      enableDamping={true}
      dampingFactor={0.08}
      zoomSpeed={0.5}
    />
  )
}

function Characters() {
  const characters = useGameStore((s) => s.characters)
  return (
    <>
      {characters.map((ch) => (
        <CharacterModel key={ch.id} ch={ch} />
      ))}
    </>
  )
}

interface GameSceneProps {
  isSplash?: boolean
}

function GameSceneInner({ isSplash }: GameSceneProps) {
  return (
    <Canvas
      shadows
      camera={{
        position: [7, 7, 14],  // closer, lower angle — more third-person feel
        fov: 50,
        near: 0.1,
        far: 500,
      }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <DynamicSky />
      <DynamicEnvironment />
      <InfiniteGround />
      <Terrain />
      <Decorations />
      <Torches />
      {!isSplash && <Characters />}
      {!isSplash && <Effects />}
      <CameraFollower />
      <fog attach="fog" args={['#a8d8ea', 40, 120]} />
    </Canvas>
  )
}

// Memoize to prevent Canvas remount when parent re-renders (typing in editor)
const GameScene = memo(GameSceneInner)
export default GameScene
