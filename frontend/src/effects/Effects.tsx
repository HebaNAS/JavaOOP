import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { EffectInstance, useGameStore } from '../state/gameStore'

function FireballEffect({ effect }: { effect: EffectInstance }) {
  const ref = useRef<THREE.Group>(null)
  const startTime = useRef(-1)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startTime.current < 0) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(1, elapsed / effect.duration)

    const from = new THREE.Vector3(...effect.from)
    const to = new THREE.Vector3(...effect.to)
    const pos = from.clone().lerp(to, t)
    pos.y += Math.sin(t * Math.PI) * 1.5

    ref.current.position.copy(pos)
    ref.current.scale.setScalar(1 - t * 0.5)

    if (t >= 1) {
      useGameStore.getState().removeEffect(effect.id)
    }
  })

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#FF6F00" emissive="#FF6F00" emissiveIntensity={2} />
      </mesh>
      <pointLight color="#FF6F00" intensity={2} distance={3} />
      {/* Trail particles - simplified with small spheres */}
      {[0.05, 0.1, 0.15].map((offset, i) => (
        <mesh key={i} position={[0, 0, offset * 2]}>
          <sphereGeometry args={[0.06 - i * 0.015, 6, 4]} />
          <meshBasicMaterial color={i === 0 ? '#FF8F00' : '#E65100'} transparent opacity={0.6 - i * 0.15} />
        </mesh>
      ))}
    </group>
  )
}

function ArrowEffect({ effect }: { effect: EffectInstance }) {
  const ref = useRef<THREE.Group>(null)
  const startTime = useRef(-1)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startTime.current < 0) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(1, elapsed / effect.duration)

    const from = new THREE.Vector3(...effect.from)
    const to = new THREE.Vector3(...effect.to)
    const pos = from.clone().lerp(to, t)
    pos.y += Math.sin(t * Math.PI) * 1.0

    ref.current.position.copy(pos)
    // Point arrow in direction of travel
    const nextT = Math.min(1, t + 0.01)
    const nextPos = from.clone().lerp(to, nextT)
    nextPos.y += Math.sin(nextT * Math.PI) * 1.0
    ref.current.lookAt(nextPos)

    if (t >= 1) {
      useGameStore.getState().removeEffect(effect.id)
    }
  })

  return (
    <group ref={ref}>
      {/* Shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3, 4]} />
        <meshToonMaterial color="#8D6E63" />
      </mesh>
      {/* Tip */}
      <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.025, 0.06, 4]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
    </group>
  )
}

function SlashEffect({ effect }: { effect: EffectInstance }) {
  const ref = useRef<THREE.Mesh>(null)
  const startTime = useRef(-1)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startTime.current < 0) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(1, elapsed / effect.duration)
    const mat = ref.current.material as THREE.MeshBasicMaterial
    mat.opacity = 1 - t
    ref.current.scale.setScalar(0.5 + t * 1.5)
    ref.current.rotation.z += 0.15

    if (t >= 1) {
      useGameStore.getState().removeEffect(effect.id)
    }
  })

  const midPoint: [number, number, number] = [
    (effect.from[0] + effect.to[0]) / 2,
    (effect.from[1] + effect.to[1]) / 2 + 0.5,
    (effect.from[2] + effect.to[2]) / 2,
  ]

  return (
    <mesh ref={ref} position={midPoint}>
      <torusGeometry args={[0.3, 0.02, 4, 16, Math.PI]} />
      <meshBasicMaterial color="white" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function HealEffect({ effect }: { effect: EffectInstance }) {
  const ref = useRef<THREE.Group>(null)
  const startTime = useRef(-1)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startTime.current < 0) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(1, elapsed / effect.duration)

    ref.current.position.y = effect.to[1] + t * 1.5
    ref.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial
        mat.opacity = 1 - t
      }
    })
    ref.current.rotation.y += 0.05

    if (t >= 1) {
      useGameStore.getState().removeEffect(effect.id)
    }
  })

  return (
    <group ref={ref} position={effect.to}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[Math.sin(i * 2.1) * 0.3, i * 0.2, Math.cos(i * 2.1) * 0.3]}>
          {/* Cross */}
          <mesh>
            <boxGeometry args={[0.02, 0.08, 0.02]} />
            <meshBasicMaterial color="#4CAF50" transparent opacity={1} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.06, 0.02, 0.02]} />
            <meshBasicMaterial color="#4CAF50" transparent opacity={1} />
          </mesh>
        </group>
      ))}
      {/* Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[0.3, 0.35, 16]} />
        <meshBasicMaterial color="#66BB6A" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function ShieldEffect({ effect }: { effect: EffectInstance }) {
  const ref = useRef<THREE.Mesh>(null)
  const startTime = useRef(-1)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startTime.current < 0) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(1, elapsed / effect.duration)
    const mat = ref.current.material as THREE.MeshPhysicalMaterial
    mat.opacity = (1 - t) * 0.3
    ref.current.scale.setScalar(0.5 + t * 0.5)

    if (t >= 1) {
      useGameStore.getState().removeEffect(effect.id)
    }
  })

  return (
    <mesh ref={ref} position={effect.to}>
      <sphereGeometry args={[0.6, 16, 12]} />
      <meshPhysicalMaterial
        color="#64B5F6"
        transparent
        opacity={0.3}
        roughness={0}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function DamageNumber({ effect }: { effect: EffectInstance }) {
  const ref = useRef<HTMLDivElement>(null)
  const startTime = useRef(-1)
  const posRef = useRef<[number, number, number]>([...effect.to])

  useFrame(({ clock }) => {
    if (startTime.current < 0) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(1, elapsed / effect.duration)
    posRef.current[1] = effect.to[1] + 0.8 + t * 1.2

    if (ref.current) {
      ref.current.style.opacity = String(1 - t)
      ref.current.style.transform = `scale(${t < 0.1 ? t * 10 : 1})`
    }

    if (t >= 1) {
      useGameStore.getState().removeEffect(effect.id)
    }
  })

  const isHeal = effect.color === '#4CAF50'

  return (
    <Html position={posRef.current} center style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        style={{
          fontSize: 26, fontWeight: 900, fontFamily: 'Orbitron, sans-serif',
          color: effect.color || '#F44336',
          textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        {isHeal ? '+' : '-'}{effect.value}
      </div>
    </Html>
  )
}

// ─── CONFETTI CELEBRATION ───
function ConfettiEffect() {
  const ref = useRef<THREE.Group>(null)
  const show = useGameStore((s) => s.showConfetti)
  const COLORS = ['#F44336', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#00BCD4']

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const seed = i * 1.618
      const cycle = ((t * 0.8 + seed * 0.3) % 4) / 4
      mesh.position.y = 3 - cycle * 5
      mesh.position.x = Math.sin(t * 2 + seed * 3) * (2 + i * 0.15)
      mesh.position.z = Math.cos(t * 1.5 + seed * 2) * (2 + i * 0.12)
      mesh.rotation.x = t * 3 + seed
      mesh.rotation.z = t * 2 + seed * 1.5
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = cycle < 0.9 ? 0.9 : (1 - (cycle - 0.9) / 0.1) * 0.9
    })
  })

  if (!show) return null

  return (
    <group ref={ref} position={[6.5, 0, 5.5]}>
      {Array.from({ length: 60 }, (_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.06, 0.06, 0.01]} />
          <meshBasicMaterial color={COLORS[i % COLORS.length]} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export default function Effects() {
  const effects = useGameStore((s) => s.effects)

  return (
    <group>
      {effects.map((e) => {
        switch (e.type) {
          case 'fireball': return <FireballEffect key={e.id} effect={e} />
          case 'arrow': return <ArrowEffect key={e.id} effect={e} />
          case 'slash': return <SlashEffect key={e.id} effect={e} />
          case 'heal': return <HealEffect key={e.id} effect={e} />
          case 'shield': return <ShieldEffect key={e.id} effect={e} />
          case 'damage': return <DamageNumber key={e.id} effect={e} />
          default: return null
        }
      })}
      <ConfettiEffect />
    </group>
  )
}
