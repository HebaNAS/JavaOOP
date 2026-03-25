import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MAP } from './Terrain'


const TILE_H: Record<number, number> = { 0: 0.3, 1: 0.35, 2: 0.2, 3: 0.5, 4: 0.05, 5: 0.25, 6: 0.08 }

interface DecoProps { col: number; row: number; type: string }

const DECOS: DecoProps[] = [
  {col:0,row:0,type:'tree'},{col:1,row:1,type:'tree'},{col:12,row:0,type:'tree'},
  {col:13,row:1,type:'bush'},{col:0,row:9,type:'tree'},{col:13,row:10,type:'tree'},
  {col:11,row:8,type:'bush'},{col:1,row:10,type:'bush'},{col:8,row:9,type:'tree'},
  {col:2,row:2,type:'rock'},{col:10,row:3,type:'bush'},{col:13,row:0,type:'tree'},
  {col:0,row:4,type:'bush'},{col:9,row:0,type:'rock'},{col:3,row:10,type:'bush'},
  {col:6,row:10,type:'tree'},{col:11,row:1,type:'tree'},{col:12,row:6,type:'bush'},
  {col:0,row:7,type:'tree'},{col:10,row:10,type:'rock'},{col:7,row:0,type:'bush'},
  {col:13,row:4,type:'tree'},
]

function Tree({ col, row }: { col: number; row: number }) {
  const ref = useRef<THREE.Group>(null)
  const tileH = TILE_H[MAP[row]?.[col] ?? 0] ?? 0.3

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.7 + col * 2) * 0.02
    }
  })

  return (
    <group ref={ref} position={[col, tileH, row]}>
      {/* Trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.8, 6]} />
        <meshToonMaterial color="#6D4C41" />
      </mesh>
      {/* Canopy spheres */}
      <mesh position={[-0.15, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshToonMaterial color="#2E7D32" />
      </mesh>
      <mesh position={[0.15, 0.85, 0.1]} castShadow>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshToonMaterial color="#388E3C" />
      </mesh>
      <mesh position={[0, 1.0, -0.05]} castShadow>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshToonMaterial color="#43A047" />
      </mesh>
      {/* Highlight */}
      <mesh position={[-0.05, 1.1, 0]}>
        <sphereGeometry args={[0.18, 6, 4]} />
        <meshToonMaterial color="#66BB6A" />
      </mesh>
    </group>
  )
}

function Bush({ col, row }: { col: number; row: number }) {
  const tileH = TILE_H[MAP[row]?.[col] ?? 0] ?? 0.3
  return (
    <group position={[col, tileH, row]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshToonMaterial color="#388E3C" />
      </mesh>
      <mesh position={[0.08, 0.22, 0.05]} castShadow>
        <sphereGeometry args={[0.16, 6, 4]} />
        <meshToonMaterial color="#4CAF50" />
      </mesh>
    </group>
  )
}

function Rock({ col, row }: { col: number; row: number }) {
  const tileH = TILE_H[MAP[row]?.[col] ?? 0] ?? 0.3
  return (
    <group position={[col, tileH, row]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
    </group>
  )
}

function CampfireFlames() {
  const ref = useRef<THREE.Group>(null)
  const PARTICLE_COUNT = 24

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const seed = i * 2.618
      const cycle = ((t * 1.5 + seed) % 2.0) / 2.0
      // Rise with turbulence
      mesh.position.y = 0.08 + cycle * 0.5
      mesh.position.x = Math.sin(t * 4 + seed) * 0.06 * (1 - cycle * 0.5)
      mesh.position.z = Math.cos(t * 3 + seed * 1.3) * 0.06 * (1 - cycle * 0.5)
      // Size: big at bottom, small at top
      const size = (1 - cycle) * 0.7 + 0.3
      mesh.scale.set(size, size * 1.3, size)
      // Opacity fades as it rises
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - cycle) * 0.85
      // Color gradient
      if (cycle < 0.15) mat.color.set('#FFFFFF')
      else if (cycle < 0.3) mat.color.set('#FFF9C4')
      else if (cycle < 0.5) mat.color.set('#FFCA28')
      else if (cycle < 0.7) mat.color.set('#FF8F00')
      else mat.color.set('#E65100')
    })
  })

  return (
    <group ref={ref}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshBasicMaterial color="#FFCA28" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Campfire({ col, row }: { col: number; row: number }) {
  const tileH = TILE_H[MAP[row]?.[col] ?? 0] ?? 0.3
  const lightRef = useRef<THREE.PointLight>(null)
  const flamesRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (lightRef.current) {
      lightRef.current.intensity = 2.0 + Math.sin(t * 6) * 0.5 + Math.sin(t * 9) * 0.3
    }
    if (flamesRef.current) {
      flamesRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        mesh.scale.y = 0.7 + Math.sin(t * 8 + i * 2) * 0.3
        mesh.scale.x = 0.8 + Math.sin(t * 6 + i * 1.5) * 0.2
        mesh.position.y = 0.15 + i * 0.06 + Math.sin(t * 7 + i) * 0.02
      })
    }
  })

  return (
    <group position={[col, tileH, row]}>
      {/* Log pile */}
      <mesh position={[0.05, 0.03, 0]} rotation={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 5]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[-0.05, 0.03, 0.02]} rotation={[0, -0.4, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 5]} />
        <meshStandardMaterial color="#4E342E" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.06, -0.04]} rotation={[0.3, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.3, 5]} />
        <meshStandardMaterial color="#6D4C41" roughness={0.9} />
      </mesh>
      {/* Stone ring */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.2, 0.03, Math.sin(a) * 0.2]} castShadow>
            <sphereGeometry args={[0.04, 4, 3]} />
            <meshStandardMaterial color="#78909C" roughness={0.8} />
          </mesh>
        )
      })}
      {/* Volumetric fire — many small particles rising */}
      <CampfireFlames />
      {/* Ember particles */}
      <Embers position={[0, 0.3, 0]} />
      {/* Light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.4, 0]}
        color="#FF8F00"
        intensity={2.0}
        distance={5}
        decay={2}
        castShadow
      />
    </group>
  )
}

function Embers({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const phase = (t * 0.8 + i * 0.7) % 3
      mesh.position.y = phase * 0.3
      mesh.position.x = Math.sin(t * 2 + i * 3) * 0.15 * phase
      mesh.position.z = Math.cos(t * 1.5 + i * 2) * 0.15 * phase
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1 - phase / 2.5)
      mesh.scale.setScalar(0.5 + (1 - phase / 3) * 0.5)
    })
  })

  return (
    <group position={position} ref={ref}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.012, 4, 3]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#FFCA28' : '#FF8F00'} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export default function Decorations() {
  return (
    <group>
      {DECOS.map((d, i) => {
        if (d.type === 'tree') return <Tree key={i} col={d.col} row={d.row} />
        if (d.type === 'bush') return <Bush key={i} col={d.col} row={d.row} />
        if (d.type === 'rock') return <Rock key={i} col={d.col} row={d.row} />
        return null
      })}
      {/* Central arena campfire */}
      <Campfire col={6} row={5} />
    </group>
  )
}
