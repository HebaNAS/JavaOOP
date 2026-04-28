import { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Html, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { CharacterState, useGameStore } from '../state/gameStore'
import { MAP } from '../scene/Terrain'

const TILE_H: Record<number, number> = { 0: 0.3, 1: 0.35, 2: 0.2, 3: 0.5, 4: 0.05, 5: 0.25, 6: 0.08 }

const PALETTES: Record<string, { accent: string }> = {
  Warrior: { accent: '#FFC107' }, Mage: { accent: '#42A5F5' },
  Archer: { accent: '#FDD835' }, Healer: { accent: '#66BB6A' },
  GameCharacter: { accent: '#B0BEC5' },
}

const MODEL_BASE = '/models/KayKit_Adventurers_2.0_FREE'
const CLASS_MODEL: Record<string, string> = {
  Warrior:       `${MODEL_BASE}/Characters/gltf/Knight.glb`,
  Mage:          `${MODEL_BASE}/Characters/gltf/Mage.glb`,
  Archer:        `${MODEL_BASE}/Characters/gltf/Ranger.glb`,
  Healer:        `${MODEL_BASE}/Characters/gltf/Rogue_Hooded.glb`,
  GameCharacter: `${MODEL_BASE}/Characters/gltf/Barbarian.glb`,
}
const ANIM_GENERAL  = `${MODEL_BASE}/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`
const ANIM_MOVEMENT = `${MODEL_BASE}/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`

// KayKit models are ~2.5 units tall, we want ~0.8 in world
const MODEL_SCALE = 0.32

// ─── GLTF CHARACTER WITH SKELETON-CORRECT CLONING ───
function GLTFCharacter({ ch }: { ch: CharacterState }) {
  const modelPath = CLASS_MODEL[ch.className] || CLASS_MODEL.GameCharacter
  const groupRef = useRef<THREE.Group>(null!)

  const charGltf = useGLTF(modelPath)
  const generalGltf = useGLTF(ANIM_GENERAL)
  const moveGltf = useGLTF(ANIM_MOVEMENT)

  // SkeletonUtils.clone preserves skeleton bindings
  const clone = useMemo(() => {
    const c = skeletonClone(charGltf.scene)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return c
  }, [charGltf.scene])

  // Merge all animations
  const allAnims = useMemo(
    () => [...generalGltf.animations, ...moveGltf.animations],
    [generalGltf.animations, moveGltf.animations]
  )

  // useAnimations on the cloned group
  const { actions, mixer } = useAnimations(allAnims, groupRef)

  const prevAnim = useRef('')

  function animName(state: CharacterState['animState']): string {
    switch (state) {
      case 'walk':   return 'Walking_A'
      case 'attack': return 'Hit_A'
      case 'hurt':   return 'Hit_B'
      case 'cast':   return 'Throw'
      case 'defend': return 'Interact'
      case 'dead':   return 'Death_A'
      default:       return 'Idle_A'
    }
  }

  // Transition animations
  useEffect(() => {
    const name = animName(ch.animState)
    if (name === prevAnim.current) return
    const next = actions[name]
    const prev = actions[prevAnim.current]
    if (next) {
      next.reset()
      if (['dead'].includes(ch.animState)) {
        next.setLoop(THREE.LoopOnce, 1)
        next.clampWhenFinished = true
      } else if (['attack', 'cast', 'hurt', 'defend'].includes(ch.animState)) {
        next.setLoop(THREE.LoopOnce, 1)
        next.clampWhenFinished = true
      } else {
        next.setLoop(THREE.LoopRepeat, Infinity)
      }
      if (prev) next.crossFadeFrom(prev, 0.2, true)
      next.play()
    }
    prevAnim.current = name
  }, [ch.animState, actions])

  // Start idle on mount
  useEffect(() => {
    const idle = actions['Idle_A']
    if (idle) { idle.play(); prevAnim.current = 'Idle_A' }
  }, [actions])

  useFrame((_, delta) => { mixer?.update(delta) })

  return (
    <group ref={groupRef}>
      <primitive object={clone} scale={MODEL_SCALE} />
    </group>
  )
}

// ─── FALLBACK ───
function Fallback({ ch }: { ch: CharacterState }) {
  const colors: Record<string, string> = {
    Warrior: '#D32F2F', Mage: '#7B1FA2', Archer: '#2E7D32',
    Healer: '#F9A825', GameCharacter: '#607D8B',
  }
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
        <meshStandardMaterial color={colors[ch.className] || '#607D8B'} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#FFCCBC" />
      </mesh>
    </group>
  )
}

// ─── MAIN COMPONENT ───
export default function CharacterModel({ ch }: { ch: CharacterState }) {
  const outerRef = useRef<THREE.Group>(null)
  const currentPos = useRef(new THREE.Vector3(ch.col, 0, ch.row))
  const pal = PALETTES[ch.className] || PALETTES.GameCharacter
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const setTarget = useGameStore((s) => s.setTarget)
  const selectedId = useGameStore((s) => s.selectedId)
  const targetId = useGameStore((s) => s.targetId)
  const addLog = useGameStore((s) => s.addLog)
  const isSelected = selectedId === ch.id
  const isTarget = targetId === ch.id

  useFrame(() => {
    if (!outerRef.current) return
    const tileType = MAP[Math.round(ch.targetRow)]?.[Math.round(ch.targetCol)] ?? 0
    const tileH = TILE_H[tileType] ?? 0.3
    const target = new THREE.Vector3(ch.targetCol, tileH, ch.targetRow)
    currentPos.current.lerp(target, 0.06)
    outerRef.current.position.copy(currentPos.current)

    const diff = target.clone().sub(currentPos.current)
    if (diff.length() > 0.05) {
      const angle = Math.atan2(diff.x, diff.z)
      outerRef.current.rotation.y = THREE.MathUtils.lerp(outerRef.current.rotation.y, angle, 0.1)
    }
    const walking = diff.length() > 0.05
    if (walking && ch.animState === 'idle')
      useGameStore.getState().updateCharacter(ch.id, { animState: 'walk' })
    if (!walking && ch.animState === 'walk')
      useGameStore.getState().updateCharacter(ch.id, { col: ch.targetCol, row: ch.targetRow, animState: 'idle' })
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (ch.hp <= 0) return
    if (selectedId == null) {
      // Nothing selected → first click picks the hero you control.
      selectCharacter(ch.id)
      addLog(`🎯 Selected ${ch.name}. Click another character to set a target.`, '#FFC107')
      return
    }
    if (selectedId === ch.id) {
      // Click your own hero → deselect (and clear target).
      selectCharacter(null)
      setTarget(null)
      return
    }
    if (targetId === ch.id) {
      // Click your current target → unset target.
      setTarget(null)
      addLog(`🎯 Cleared target.`, '#90A4AE')
      return
    }
    setTarget(ch.id)
    addLog(`🎯 Target: ${ch.name}. Press SPACE / E / R to act on them.`, '#F44336')
  }
  const hpPct = ch.maxHp > 0 ? ch.hp / ch.maxHp : 1
  const hpColor = hpPct > 0.5 ? '#4CAF50' : hpPct > 0.25 ? '#FF9800' : '#F44336'

  return (
    <group ref={outerRef} position={[ch.col, 0, ch.row]} onClick={handleClick}>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.3, 0.42, 32]} />
          <meshBasicMaterial color="#FFC107" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isTarget && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.58, 32]} />
          <meshBasicMaterial color="#F44336" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.25} />
      </mesh>

      <Suspense fallback={<Fallback ch={ch} />}>
        <GLTFCharacter ch={ch} />
      </Suspense>

      <Html position={[0, 1.1, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{
            width: 72, height: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 5,
            border: '1px solid rgba(255,255,255,0.12)', margin: '0 auto 4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              width: `${hpPct * 100}%`, height: '100%', background: hpColor,
              borderRadius: 4, transition: 'width 0.3s',
              boxShadow: `0 0 10px ${hpColor}80`,
            }} />
          </div>
          <div style={{
            fontSize: 11, color: '#fff', fontFamily: 'JetBrains Mono', fontWeight: 700,
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          }}>
            {Math.max(0, ch.hp)}/{ch.maxHp}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: pal.accent,
            fontFamily: 'JetBrains Mono', background: 'rgba(0,0,0,0.75)',
            padding: '3px 10px', borderRadius: 5, marginTop: 3,
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            letterSpacing: '0.5px',
          }}>
            {ch.name}
          </div>
        </div>
      </Html>
    </group>
  )
}

// Preload everything
Object.values(CLASS_MODEL).forEach((p) => useGLTF.preload(p))
useGLTF.preload(ANIM_GENERAL)
useGLTF.preload(ANIM_MOVEMENT)
