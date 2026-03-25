import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../state/gameStore'

// Tile types: 0=grass, 1=tallGrass, 2=dirt, 3=stone, 4=water, 5=bridge, 6=lava
export const MAP = [
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1],
  [0,0,0,0,2,2,2,0,0,0,0,0,0,0],
  [1,0,0,2,2,3,3,2,2,0,0,0,1,0],
  [0,0,2,2,3,3,3,3,2,2,0,0,0,0],
  [0,0,2,3,3,3,3,3,3,2,0,0,0,0],
  [4,4,5,2,3,3,3,3,2,2,0,0,0,1],
  [4,4,5,2,2,3,3,2,2,0,0,1,0,0],
  [0,0,0,2,2,2,2,2,0,0,0,0,6,6],
  [0,1,0,0,0,2,0,0,0,1,0,6,6,0],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,0,1,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,0,0,0],
]

export const COLS = 14
export const ROWS = 12

const TILE_COLORS: Record<number, THREE.Color> = {
  0: new THREE.Color('#7CB342'),
  1: new THREE.Color('#66BB6A'),
  2: new THREE.Color('#D7A86E'),
  3: new THREE.Color('#BDBDBD'),
  4: new THREE.Color('#29B6F6'),
  5: new THREE.Color('#A1887F'),
  6: new THREE.Color('#E65100'),
}

export const TILE_HEIGHT: Record<number, number> = {
  0: 0.3, 1: 0.35, 2: 0.2, 3: 0.5, 4: 0.05, 5: 0.25, 6: 0.08,
}

export function isWalkable(col: number, row: number) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false
  const t = MAP[row]?.[col]
  return t !== 4 && t !== 6 // water and lava not walkable
}

export function tileWorldPos(col: number, row: number): [number, number, number] {
  const type = MAP[row]?.[col] ?? 0
  const h = TILE_HEIGHT[type] ?? 0.3
  return [col, h, row]
}

// ─── WATER TILE with animated shader ───
function WaterTile({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = 0.02 + Math.sin(t * 1.5 + position[0] * 2) * 0.015
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.1 + Math.sin(t * 2 + position[2]) * 0.05
  })

  return (
    <mesh ref={ref} position={position} receiveShadow>
      <boxGeometry args={[0.98, 0.06, 0.98]} />
      <meshStandardMaterial
        color="#29B6F6"
        emissive="#0288D1"
        emissiveIntensity={0.1}
        transparent
        opacity={0.8}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  )
}

// ─── LAVA TILE with glow ───
function LavaTile({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 1.5 + Math.sin(t * 3 + position[0] * 4) * 0.5
    if (lightRef.current) {
      lightRef.current.intensity = 1.0 + Math.sin(t * 4 + position[2] * 3) * 0.3
    }
  })

  return (
    <group>
      <mesh ref={ref} position={[position[0], 0.04, position[2]]} receiveShadow>
        <boxGeometry args={[0.98, 0.08, 0.98]} />
        <meshStandardMaterial
          color="#E65100"
          emissive="#FF6F00"
          emissiveIntensity={1.5}
          roughness={0.3}
        />
      </mesh>
      {/* Lava glow light */}
      <pointLight
        ref={lightRef}
        position={[position[0], 0.4, position[2]]}
        color="#FF6F00"
        intensity={1.0}
        distance={3}
        decay={2}
      />
      {/* Lava bubbles — small animated spheres */}
      <LavaBubbles position={[position[0], 0.1, position[2]]} />
    </group>
  )
}

function LavaBubbles({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const phase = t * 2 + i * 1.5
      const cycle = (phase % 2) / 2 // 0 to 1
      mesh.position.y = cycle * 0.15
      mesh.scale.setScalar(Math.sin(cycle * Math.PI) * 0.6)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(cycle * Math.PI) * 0.8
    })
  })

  return (
    <group ref={ref} position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2.5) * 0.2, 0, Math.cos(i * 2.5) * 0.2]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          <meshBasicMaterial color="#FFCA28" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ─── GRASS BLADES on grass tiles ───
function GrassBlades({ col, row }: { col: number; row: number }) {
  const ref = useRef<THREE.Group>(null)
  const h = TILE_HEIGHT[MAP[row][col]] ?? 0.3

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      child.rotation.z = Math.sin(t * 1.5 + col * 2 + i * 1.3) * 0.15
      child.rotation.x = Math.sin(t * 1.2 + row * 2 + i * 0.9) * 0.1
    })
  })

  // Deterministic pseudo-random positions
  const blades = useMemo(() => {
    const result: { x: number; z: number; h: number; color: string }[] = []
    for (let i = 0; i < 6; i++) {
      const seed = col * 37 + row * 59 + i * 13
      result.push({
        x: (Math.sin(seed) * 0.5) * 0.4,
        z: (Math.cos(seed * 1.7) * 0.5) * 0.4,
        h: 0.06 + Math.abs(Math.sin(seed * 2.3)) * 0.06,
        color: i % 3 === 0 ? '#8BC34A' : i % 3 === 1 ? '#7CB342' : '#9CCC65',
      })
    }
    return result
  }, [col, row])

  return (
    <group ref={ref} position={[col, h, row]}>
      {blades.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[0.02, b.h, 0.01]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ─── STONE CRACKS overlay ───
function StoneCracks({ col, row }: { col: number; row: number }) {
  const h = TILE_HEIGHT[3]
  return (
    <group position={[col, h + 0.001, row]} rotation={[-Math.PI / 2, 0, col * 1.3]}>
      <mesh>
        <planeGeometry args={[0.6, 0.01]} />
        <meshBasicMaterial color="#9E9E9E" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0.1, 0.08, 0]} rotation={[0, 0, 0.4]}>
        <planeGeometry args={[0.3, 0.008]} />
        <meshBasicMaterial color="#8a8a8a" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

export default function Terrain() {
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const moveCharacter = useGameStore((s) => s.moveCharacter)
  const selectedId = useGameStore((s) => s.selectedId)

  const handleTerrainClick = (e: any) => {
    e.stopPropagation()
    const col = Math.round(e.point.x)
    const row = Math.round(e.point.z)
    if (selectedId && isWalkable(col, row)) {
      moveCharacter(selectedId, col, row)
    }
  }

  return (
    <group>
      {/* Land tiles */}
      {MAP.flatMap((rowArr, row) =>
        rowArr.map((type, col) => {
          if (type === 4) return <WaterTile key={`${row}-${col}`} position={[col, 0.02, row]} />
          if (type === 6) return <LavaTile key={`${row}-${col}`} position={[col, 0.04, row]} />

          const h = TILE_HEIGHT[type]
          const color = TILE_COLORS[type]
          return (
            <group key={`${row}-${col}`}>
              <mesh
                position={[col, h / 2, row]}
                receiveShadow
                onClick={handleTerrainClick}
              >
                <boxGeometry args={[0.98, h, 0.98]} />
                <meshStandardMaterial
                  color={color}
                  roughness={type === 3 ? 0.4 : 0.8}
                  metalness={type === 3 ? 0.2 : 0}
                />
              </mesh>
              {/* Grass blades on grass tiles */}
              {(type === 0 || type === 1) && <GrassBlades col={col} row={row} />}
              {/* Stone crack details */}
              {type === 3 && <StoneCracks col={col} row={row} />}
            </group>
          )
        })
      )}

      {/* Bridge plank details */}
      {MAP.flatMap((rowArr, row) =>
        rowArr.map((type, col) => {
          if (type !== 5) return null
          const h = TILE_HEIGHT[5]
          return (
            <group key={`bridge-${row}-${col}`} position={[col, h + 0.001, row]}>
              {[-0.3, -0.1, 0.1, 0.3].map((z, i) => (
                <mesh key={i} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.85, 0.12]} />
                  <meshStandardMaterial color="#8D6E63" roughness={0.9} />
                </mesh>
              ))}
            </group>
          )
        })
      )}
    </group>
  )
}
