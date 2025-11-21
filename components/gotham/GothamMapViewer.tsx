'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// Location data interface
interface LocationData {
  name: string;
  pos: [number, number, number];
  color: number;
  type: 'hero' | 'villain' | 'neutral';
  threat: 'low' | 'medium' | 'high' | 'extreme';
  icon: string;
  description: string;
  details: string;
}

export default function GothamMapViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [showLabels, setShowLabels] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [batSignalOn, setBatSignalOn] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Downtown');
  const [currentStreet, setCurrentStreet] = useState('Main St');
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'extreme'>('low');
  const [coordinates, setCoordinates] = useState({ x: 0, y: 50, z: 100 });

  const router = useRouter();

  // Movement state
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const mouseState = useRef({
    x: 0,
    y: 0,
    isDown: false,
  });

  // Refs for Three.js objects
  const buildingsRef = useRef<THREE.Mesh[]>([]);
  const labelsRef = useRef<Array<{ element: HTMLDivElement; position: THREE.Vector3; locationData?: LocationData; isStreet?: boolean }>>([]);
  const cloudSpritesRef = useRef<THREE.Sprite[]>([]);
  const batSignalRef = useRef<{ light: THREE.SpotLight | null; beam: THREE.Mesh | null; sprite: THREE.Sprite | null }>({
    light: null,
    beam: null,
    sprite: null,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    initMap();

    return () => {
      cleanup();
    };
  }, []);

  const initMap = () => {
    if (!containerRef.current) return;

    console.log('[GothamMap] Initializing 3D map...');

    // Create scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0b15, 80, 600);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x05050b);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Build the city
    createCity(scene);
    createSky(scene);
    createStars(scene);
    createMoon(scene);
    createClouds(scene);
    createWaterways(scene);
    setupLighting(scene);
    createBatSignal(scene);

    // Setup controls
    setupControls();

    // Setup minimap
    setupMinimap();

    // Start animation loop
    animate();

    console.log('[GothamMap] Map initialized successfully');
  };

  const createCity = (scene: THREE.Scene) => {
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshLambertMaterial({ color: 0x141428 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    createStreets(scene);
    LOCATIONS.forEach(loc => createLocation(scene, loc));
  };

  const createStreets = (scene: THREE.Scene) => {
    const streetMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2f });

    STREETS.forEach(street => {
      if (street.direction === 'horizontal') {
        const h = new THREE.Mesh(
          new THREE.PlaneGeometry(550, 4),
          streetMat
        );
        h.rotation.x = -Math.PI / 2;
        h.position.set(0, 0.1, street.position);
        scene.add(h);
      } else {
        const v = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 550),
          streetMat
        );
        v.rotation.x = -Math.PI / 2;
        v.position.set(street.position, 0.1, 0);
        scene.add(v);
      }
    });
  };

  const createLocation = (scene: THREE.Scene, location: LocationData) => {
    const [x, y, z] = location.pos;

    // Create buildings around the location
    const buildingCount = 12;

    for (let i = 0; i < buildingCount; i++) {
      const width = Math.random() * 8 + 4;
      const height = Math.random() * 40 + 10;
      const depth = Math.random() * 8 + 4;

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshLambertMaterial({ color: location.color })
      );

      const ox = x + (Math.random() - 0.5) * 60;
      const oz = z + (Math.random() - 0.5) * 60;

      building.position.set(ox, height / 2, oz);
      building.castShadow = true;
      building.receiveShadow = true;

      addWindows(building, width, height, depth, location.type);

      scene.add(building);
      buildingsRef.current.push(building);
    }

    // Add 3D label
    add3DLabel(location);
  };

  const addWindows = (
    building: THREE.Mesh,
    w: number,
    h: number,
    d: number,
    type: 'hero' | 'villain' | 'neutral'
  ) => {
    const group = new THREE.Group();
    const base = type === 'hero' ? 0x88aaff : type === 'villain' ? 0xff4444 : 0x444488;

    for (let Y = 3; Y < h - 2; Y += 4) {
      for (let X = -w / 2 + 1; X < w / 2 - 1; X += 2) {
        if (Math.random() > 0.3) {
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 1.5),
            new THREE.MeshBasicMaterial({
              color: Math.random() > 0.7 ? 0xffff88 : base,
              transparent: true,
              opacity: 0.8,
            })
          );
          win.position.set(X, Y - h / 2, d / 2 + 0.01);
          group.add(win);
        }
      }
    }

    building.add(group);
  };

  const add3DLabel = (locationData: LocationData) => {
    if (!containerRef.current) return;

    const el = document.createElement('div');
    el.className = 'label-3d';
    el.textContent = locationData.name;
    el.style.cssText = `
      position: absolute;
      color: #fff;
      font-size: 12px;
      background: rgba(0,0,0,0.8);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #14b8a6;
      cursor: pointer;
      transform: translate(-50%, -100%);
      white-space: nowrap;
      z-index: 1000;
      transition: 0.2s;
      pointer-events: auto;
    `;

    if (locationData.type === 'villain') {
      el.style.borderColor = '#f00';
      el.style.color = '#f66';
    } else if (locationData.type === 'hero') {
      el.style.borderColor = '#0064ff';
      el.style.color = '#66aaff';
    }

    el.addEventListener('mouseenter', () => {
      el.style.transform = 'translate(-50%, -100%) scale(1.1)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(-50%, -100%) scale(1)';
    });

    containerRef.current.appendChild(el);

    labelsRef.current.push({
      element: el,
      position: new THREE.Vector3(locationData.pos[0], locationData.pos[1] + 40, locationData.pos[2]),
      locationData,
    });
  };

  const createSky = (scene: THREE.Scene) => {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1200, 32, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          topColor: { value: new THREE.Color(0x0a0a19) },
          bottomColor: { value: new THREE.Color(0x151532) },
          offset: { value: 33 },
          exponent: { value: 0.8 },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPosition = wp.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            float t = max(pow(max(h, 0.0), exponent), 0.0);
            gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
          }
        `,
      })
    );
    scene.add(sky);
  };

  const createStars = (scene: THREE.Scene) => {
    const starCount = 2000;
    const radius = 900;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    scene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({ size: 1.1, color: 0xffffff })
      )
    );
  };

  const createMoon = (scene: THREE.Scene) => {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0xeaeaea,
        emissive: 0x222244,
        emissiveIntensity: 0.2,
        shininess: 5,
      })
    );
    moon.position.set(-250, 260, -200);
    scene.add(moon);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0x99aaff,
        transparent: true,
        opacity: 0.2,
      })
    );
    halo.scale.set(120, 120, 1);
    halo.position.copy(moon.position);
    scene.add(halo);
  };

  const createClouds = (scene: THREE.Scene) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 64, 120, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);

    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex,
          depthWrite: false,
          transparent: true,
          opacity: 0.6,
        })
      );

      sp.position.set(
        (Math.random() * 2 - 1) * 400,
        120 + Math.random() * 40,
        (Math.random() * 2 - 1) * 400
      );

      const s = 200 + Math.random() * 150;
      sp.scale.set(s, s * 0.5, 1);
      (sp as any).userData = { speed: 0.02 + Math.random() * 0.03 };

      scene.add(sp);
      cloudSpritesRef.current.push(sp);
    }
  };

  const createWaterways = (scene: THREE.Scene) => {
    const riverColor = 0x1e3a5f;
    const waterY = 0.11;

    const createSegment = (x: number, z: number, len: number, deg: number, width: number) => {
      const geo = new THREE.PlaneGeometry(len, width);
      const mat = new THREE.MeshLambertMaterial({
        color: riverColor,
        transparent: true,
        opacity: 0.95,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = THREE.MathUtils.degToRad(deg);
      m.position.set(x, waterY, z);
      m.receiveShadow = true;
      scene.add(m);
    };

    createSegment(-200, 30, 180, 15, 14);
    createSegment(-110, 20, 160, -10, 16);
    createSegment(-20, 10, 160, -5, 18);
    createSegment(70, -5, 160, -12, 16);
    createSegment(160, -15, 150, -20, 14);
    createSegment(-160, 55, 120, 35, 10);
  };

  const setupLighting = (scene: THREE.Scene) => {
    scene.add(new THREE.AmbientLight(0x404060, 0.45));

    const moonLight = new THREE.DirectionalLight(0x99aaff, 0.7);
    moonLight.position.set(-250, 260, -200);
    moonLight.castShadow = true;
    moonLight.shadow.camera.left = -300;
    moonLight.shadow.camera.right = 300;
    moonLight.shadow.camera.top = 300;
    moonLight.shadow.camera.bottom = -300;
    scene.add(moonLight);

    LOCATIONS.forEach(loc => {
      const pl = new THREE.PointLight(loc.color, 0.45, 100);
      pl.position.set(loc.pos[0], (loc.pos[1] || 10) + 20, loc.pos[2]);
      scene.add(pl);
    });
  };

  const createBatSignal = (scene: THREE.Scene) => {
    const gcpd = LOCATIONS.find(l => l.name === 'GCPD Headquarters');
    if (!gcpd) return;

    const origin = new THREE.Vector3(gcpd.pos[0], 42, gcpd.pos[2]);
    const targetPos = origin.clone().add(new THREE.Vector3(220, 320, -220));

    const batLight = new THREE.SpotLight(0xfff2a8, 2, 900, THREE.MathUtils.degToRad(22), 0.5, 0.9);
    batLight.position.copy(origin);
    batLight.castShadow = true;
    batLight.shadow.mapSize.set(1024, 1024);
    batLight.target = new THREE.Object3D();
    batLight.target.position.copy(targetPos);
    scene.add(batLight);
    scene.add(batLight.target);

    const length = origin.distanceTo(targetPos);
    const beamGeo = new THREE.CylinderGeometry(32, 1.2, length, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff2a8,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const batBeam = new THREE.Mesh(beamGeo, beamMat);

    const dir = new THREE.Vector3().subVectors(targetPos, origin).normalize();
    const mid = origin.clone().add(targetPos).multiplyScalar(0.5);
    batBeam.position.copy(mid);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    batBeam.quaternion.copy(q);
    scene.add(batBeam);

    const tex = makeBatSpriteTexture();
    const batSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.9,
      })
    );
    batSprite.scale.set(90, 90, 1);
    batSprite.position.copy(targetPos);
    scene.add(batSprite);

    batSignalRef.current = { light: batLight, beam: batBeam, sprite: batSprite };
  };

  const makeBatSpriteTexture = (): THREE.CanvasTexture => {
    const s = 256;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,250,200,1)');
    grad.addColorStop(0.8, 'rgba(255,240,150,0.8)');
    grad.addColorStop(1, 'rgba(255,240,150,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 150px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦇', s / 2, s / 2 + 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    return tex;
  };

  const setupControls = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          moveState.current.forward = true;
          break;
        case 'KeyS':
          moveState.current.backward = true;
          break;
        case 'KeyA':
          moveState.current.left = true;
          break;
        case 'KeyD':
          moveState.current.right = true;
          break;
        case 'KeyL':
          setShowLabels(prev => !prev);
          break;
        case 'KeyM':
          setShowMinimap(prev => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          moveState.current.forward = false;
          break;
        case 'KeyS':
          moveState.current.backward = false;
          break;
        case 'KeyA':
          moveState.current.left = false;
          break;
        case 'KeyD':
          moveState.current.right = false;
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  };

  const setupMinimap = () => {
    const minimap = document.getElementById('minimap');
    if (!minimap) return;

    LOCATIONS.forEach(location => {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        width: ${location.type === 'villain' ? '6px' : '8px'};
        height: ${location.type === 'villain' ? '6px' : '8px'};
        background-color: #${location.color.toString(16).padStart(6, '0')};
        ${location.type === 'villain' ? 'border: 1px solid #f00;' : ''}
      `;

      const mapX = ((location.pos[0] + 250) / 500) * 180;
      const mapZ = ((location.pos[2] + 250) / 500) * 180;
      dot.style.left = mapX + 'px';
      dot.style.top = mapZ + 'px';
      dot.title = location.name;

      minimap.appendChild(dot);
    });
  };

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    animationFrameRef.current = requestAnimationFrame(animate);

    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const renderer = rendererRef.current;

    // Handle movement
    const speed = 2;
    const dir = new THREE.Vector3();
    dir.z = Number(moveState.current.forward) - Number(moveState.current.backward);
    dir.x = Number(moveState.current.right) - Number(moveState.current.left);
    dir.normalize();

    if (dir.length() > 0) {
      const e = new THREE.Euler(0, camera.rotation.y, 0);
      dir.applyEuler(e);
      camera.position.add(dir.multiplyScalar(speed));
      camera.position.y = Math.max(5, camera.position.y);
    }

    // Update clouds
    cloudSpritesRef.current.forEach(sp => {
      sp.position.x += (sp as any).userData.speed;
      if (sp.position.x > 420) sp.position.x = -420;
    });

    // Update UI
    updateUI();

    // Render
    renderer.render(scene, camera);
  };

  const updateUI = () => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;

    // Update coordinates
    setCoordinates({
      x: Math.round(camera.position.x),
      y: Math.round(camera.position.y),
      z: Math.round(camera.position.z),
    });

    // Update player dot on minimap
    const playerDot = document.getElementById('player-dot');
    if (playerDot) {
      const mapX = ((camera.position.x + 250) / 500) * 180;
      const mapZ = ((camera.position.z + 250) / 500) * 180;
      playerDot.style.left = mapX + 'px';
      playerDot.style.top = mapZ + 'px';
    }

    // Find nearest location
    let nearest = 'Unknown';
    let minDist = Infinity;
    let currentThreat: 'low' | 'medium' | 'high' | 'extreme' = 'low';

    LOCATIONS.forEach(loc => {
      const d = Math.hypot(camera.position.x - loc.pos[0], camera.position.z - loc.pos[2]);
      if (d < minDist && d < 100) {
        minDist = d;
        nearest = loc.name;
        currentThreat = loc.threat;
      }
    });

    setCurrentLocation(nearest);
    setThreatLevel(currentThreat);

    // Find nearest street
    let nearestStreet = 'Unknown Street';
    let streetDist = Infinity;

    STREETS.forEach(st => {
      const d = st.direction === 'horizontal'
        ? Math.abs(camera.position.z - st.position)
        : Math.abs(camera.position.x - st.position);

      if (d < streetDist && d < 25) {
        streetDist = d;
        nearestStreet = st.name;
      }
    });

    setCurrentStreet(nearestStreet);

    // Update labels
    labelsRef.current.forEach(l => {
      const v = l.position.clone();
      v.project(camera);

      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (v.y * -0.5 + 0.5) * window.innerHeight;
      const dist = camera.position.distanceTo(l.position);
      const visible = v.z < 1 && dist < 280;

      if (visible && showLabels) {
        l.element.style.left = x + 'px';
        l.element.style.top = y + 'px';
        l.element.style.display = 'block';
        const op = Math.max(0.3, 1 - dist / 280);
        l.element.style.opacity = String(op);

        if (l.isStreet) {
          l.element.style.fontSize = '8px';
          l.element.style.opacity = String(op * 0.5);
        }
      } else {
        l.element.style.display = 'none';
      }
    });
  };

  const cleanup = () => {
    console.log('[GothamMap] Cleaning up...');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Cleanup labels
    labelsRef.current.forEach(l => {
      if (l.element.parentNode) {
        l.element.parentNode.removeChild(l.element);
      }
    });

    // Cleanup Three.js
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    if (sceneRef.current) {
      sceneRef.current.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  };

  const toggleBatSignal = () => {
    setBatSignalOn(prev => !prev);

    if (batSignalRef.current.light) {
      batSignalRef.current.light.visible = !batSignalOn;
    }
    if (batSignalRef.current.beam) {
      batSignalRef.current.beam.visible = !batSignalOn;
    }
    if (batSignalRef.current.sprite) {
      batSignalRef.current.sprite.visible = !batSignalOn;
    }
  };

  const threatColors = {
    low: '#00ff00',
    medium: '#ffff00',
    high: '#ff8800',
    extreme: '#ff0000',
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 z-[2000] px-4 py-2 bg-[#14b8a6] text-black font-medium rounded-lg hover:bg-[#14b8a6]/90 transition flex items-center gap-2"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Chat
      </button>

      {/* UI Overlay */}
      <div className="absolute top-20 left-5 text-white z-[1000] max-w-[280px] pointer-events-auto">
        {/* Info Panel */}
        <div className="bg-black/90 p-4 rounded-lg border-2 border-[#14b8a6] mb-3">
          <h3 className="text-lg font-bold mb-2">🦇 GOTHAM CITY MAP</h3>
          <div>Location: {currentLocation}</div>
          <div
            className="text-sm mt-1"
            style={{ color: threatColors[threatLevel], fontWeight: threatLevel === 'extreme' ? 'bold' : 'normal' }}
          >
            Threat Level: {threatLevel.toUpperCase()}
          </div>
        </div>

        {/* Minimap */}
        {showMinimap && (
          <div
            id="minimap"
            className="w-[180px] h-[180px] bg-black/80 border-2 border-[#14b8a6] rounded-lg relative mb-3"
          >
            <div
              id="player-dot"
              className="absolute w-[6px] h-[6px] bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"
            />
          </div>
        )}

        {/* Controls */}
        <div className="bg-black/90 p-3 rounded-lg border border-[#14b8a6]/30 text-xs">
          <div className="font-bold mb-1">CONTROLS:</div>
          <div>WASD: Fly | Mouse: Look | Scroll: Zoom</div>
          <div>L: Labels | M: Minimap</div>
          <button
            onClick={toggleBatSignal}
            className="mt-2 px-3 py-1 text-xs border border-[#14b8a6] rounded bg-[#0b0b15] text-[#14b8a6] hover:brightness-110 transition"
          >
            🔦 Bat-Signal: {batSignalOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Coordinates */}
      <div className="absolute bottom-5 right-5 text-[#14b8a6] text-xs bg-black/80 p-3 rounded font-mono z-[1000] pointer-events-auto">
        <div>X: {coordinates.x}</div>
        <div>Y: {coordinates.y}</div>
        <div>Z: {coordinates.z}</div>
        <div>Street: {currentStreet}</div>
      </div>
    </div>
  );
}

// ===== DATA =====

const LOCATIONS: LocationData[] = [
  { name: 'Financial District', pos: [0, 20, -50], color: 0x4a90e2, type: 'hero', threat: 'low', icon: '🏢', description: 'The economic heart of Gotham City', details: 'Known for corporate offices and banking' },
  { name: 'Wayne Tower', pos: [-30, 60, -30], color: 0xffd700, type: 'hero', threat: 'low', icon: '🏗️', description: 'Wayne Enterprises headquarters', details: 'CEO: Bruce Wayne' },
  { name: 'GCPD Headquarters', pos: [-40, 10, 40], color: 0x0064ff, type: 'hero', threat: 'low', icon: '👮', description: 'Police headquarters with Bat-Signal', details: 'Commissioner: James Gordon' },
  { name: 'City Hall', pos: [0, 5, 0], color: 0xffffff, type: 'neutral', threat: 'low', icon: '🏛️', description: 'Gotham government seat', details: 'Built 1889' },
  { name: 'Park Row', pos: [-60, 15, -80], color: 0x44aa44, type: 'neutral', threat: 'medium', icon: '🏘️', description: 'Residential district in decline', details: 'Contains Crime Alley' },
  { name: 'Industrial Zone', pos: [80, 10, 20], color: 0x888888, type: 'neutral', threat: 'medium', icon: '🏭', description: 'Factories and warehouses', details: 'Often used by criminals' },
  { name: 'Crime Alley', pos: [-25, 2, -70], color: 0x220000, type: 'neutral', threat: 'extreme', icon: '💀', description: 'Wayne family murder site', details: 'Also known as Willis Street' },
  { name: 'Robinson Park', pos: [-90, 5, -90], color: 0x228b22, type: 'neutral', threat: 'low', icon: '🌳', description: "Gotham's largest park", details: '250 acres of greenery' },
  { name: 'Arkham Asylum', pos: [60, 15, 60], color: 0xff4444, type: 'villain', threat: 'high', icon: '🏥', description: 'Psychiatric hospital for criminally insane', details: 'Frequent breakouts' },
  { name: 'ACE Chemicals', pos: [120, 8, -40], color: 0x00ff00, type: 'villain', threat: 'extreme', icon: '🃏', description: "Joker's birthplace", details: 'Highly toxic and unstable' },
  { name: 'Iceberg Lounge', pos: [-120, 12, 80], color: 0x00ffff, type: 'villain', threat: 'high', icon: '🧊', description: "Penguin's nightclub", details: 'Criminal empire front' },
  { name: 'Clock Tower', pos: [-100, 35, -50], color: 0xffa500, type: 'hero', threat: 'low', icon: '🗼', description: "Oracle's headquarters", details: "Barbara Gordon's base" },
  { name: 'Wayne Manor', pos: [-180, 25, -120], color: 0x8b4513, type: 'hero', threat: 'low', icon: '🏰', description: 'Wayne family home', details: 'Built 1855' },
  { name: 'Batcave', pos: [-190, 6, -140], color: 0x222222, type: 'hero', threat: 'low', icon: '🦇', description: "Batman's secret base", details: 'Under Wayne Manor' },
];

const STREETS = [
  { name: 'Wayne Boulevard', direction: 'horizontal' as const, position: -30 },
  { name: 'Gordon Avenue', direction: 'horizontal' as const, position: 0 },
  { name: 'Penguin Street', direction: 'horizontal' as const, position: 60 },
  { name: 'Batman Drive', direction: 'vertical' as const, position: -40 },
  { name: 'Main Street', direction: 'vertical' as const, position: 0 },
  { name: 'Joker Lane', direction: 'vertical' as const, position: 80 },
  { name: 'Arkham Road', direction: 'horizontal' as const, position: 120 },
  { name: 'Harvey Dent Way', direction: 'vertical' as const, position: -100 },
  { name: 'Crime Alley (Willis St)', direction: 'horizontal' as const, position: -65 },
  { name: 'Robinson Park Blvd', direction: 'horizontal' as const, position: -90 },
  { name: 'Kane Street', direction: 'vertical' as const, position: -70 },
];
