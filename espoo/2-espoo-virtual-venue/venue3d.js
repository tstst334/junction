// Espoo 3D Spatial Virtual Venue & Zoom Hybrid Stage Engine (Three.js r128)

const STORAGE_KEY_EXPORT_EVENT = 'espoo_exported_event';
const PROXIMITY_RADIUS = 4.5;

// ==================== VENUE PRESETS & ROOM DATA ====================

const PRESET_CONFIGS = {
  energy: {
    eventTitle: 'Espoo Energy & CleanTech Summit',
    zoomTopic: 'Keynote: Sub-Second Nordic Grid Stability & Green Hydrogen Co-Optimization',
    zoomSpeakers: 'Main Auditorium · Chief Grid Architect (Fortum) & Principal Scientist (VTT)',
    rooms: {
      atrium: {
        name: 'Central Atrium & Espoo Coffee Hub',
        sponsor: 'City of Espoo Talent Hub',
        access: 'Open to All',
        color: '#38bdf8',
        roles: ['Espoo Relocation Desk', 'Aalto & VTT Ecosystem Map', 'Open Networking']
      },
      auditorium: {
        name: 'Main Keynote Auditorium',
        sponsor: 'Espoo Innovation Stage',
        access: 'Open to All',
        color: '#6366f1',
        roles: ['Live Zoom Keynote Stage', 'Panel Q&A', 'Speaker Backstage']
      },
      cleantech: {
        name: 'CleanTech & Energy Lounge',
        sponsor: 'Fortum & Neste',
        access: 'Open to All',
        color: '#10b981',
        roles: ['Senior Power Systems Modeling Lead (Fortum)', 'Lead Process Simulation Engineer (Neste)', 'Grid Flexibility MSc Thesis']
      },
      quantum: {
        name: 'Hydrogen & Catalysis Lab',
        sponsor: 'VTT Technical Research Centre',
        access: 'Open to All',
        color: '#06b6d4',
        roles: ['Senior Scientist — Power-to-X', 'MSc Thesis — Electrolyzers', 'Cleanroom Photonics Lead']
      },
      embedded: {
        name: 'Smart Grid Edge AI Hub',
        sponsor: 'Kone & Nokia Energy',
        access: 'Open to All',
        color: '#f59e0b',
        roles: ['Senior Edge AI Telemetry Architect', 'Real-Time Embedded Rust Lead', 'Urban Mobility Simulation']
      },
      vip: {
        name: 'VIP 1-on-1 Interview Pods',
        sponsor: 'Pre-Vetted Fast-Track',
        access: 'Verified Match >80% Only',
        color: '#ec4899',
        roles: ['15-min Hiring Manager Syncs', 'Relocation & Visa Fast-Track']
      }
    }
  },
  quantum: {
    eventTitle: 'Otaniemi Quantum & Space DeepTech Expo',
    zoomTopic: 'Keynote: Scaling Fault-Tolerant QPUs & Autonomous Orbital SAR Constellations',
    zoomSpeakers: 'Main Auditorium · QPU Calibration Lead (IQM) & Avionics Lead (ICEYE)',
    rooms: {
      atrium: {
        name: 'Otaniemi DeepTech Atrium',
        sponsor: 'City of Espoo × Aalto',
        access: 'Open to All',
        color: '#38bdf8',
        roles: ['DeepTech Visa Desk', 'Otaniemi Lab Tours Info']
      },
      auditorium: {
        name: 'Main Keynote Auditorium',
        sponsor: 'Otaniemi Plenary Stage',
        access: 'Open to All',
        color: '#8b5cf6',
        roles: ['Live Zoom Colloquium', 'Cryo & Space Architecture Q&A']
      },
      cleantech: {
        name: 'Cryo-Electronics & QPU Lab',
        sponsor: 'IQM Quantum Computers',
        access: 'Open to All',
        color: '#a855f7',
        roles: ['Principal QPU Calibration Physicist', 'Senior Cryo-RF Engineer', 'Quantum Compiler Intern']
      },
      quantum: {
        name: 'Orbital SAR & Space Lab',
        sponsor: 'ICEYE',
        access: 'Open to All',
        color: '#0ea5e9',
        roles: ['Staff SAR Image Formation Engineer', 'Spacecraft Avionics Lead', 'Earth Observation ML Trainee']
      },
      embedded: {
        name: '6G & Embedded Silicon Arena',
        sponsor: 'Nokia & Qt Group',
        access: 'Open to All',
        color: '#14b8a6',
        roles: ['6G AI-RAN Principal Architect', 'Senior Vulkan/C++ Engine Dev']
      },
      vip: {
        name: 'Principal Architect Roundtables',
        sponsor: 'IQM · ICEYE · VTT',
        access: 'Verified Match >80% Only',
        color: '#f43f5e',
        roles: ['Private QPU / Satellite Technical Audits']
      }
    }
  },
  roundtable: {
    eventTitle: 'Espoo Executive Senior Talent Roundtable',
    zoomTopic: 'Keynote: Building Sovereign Nordic Engineering Teams in Espoo',
    zoomSpeakers: 'Main Auditorium · CTO Panel (Nokia, Kone, Fortum, IQM)',
    rooms: {
      atrium: {
        name: 'Executive Welcome Foyer',
        sponsor: 'Espoo TalentConcierge',
        access: 'Open to All',
        color: '#38bdf8',
        roles: ['Executive Relocation & Family Briefing']
      },
      auditorium: {
        name: 'Fireside Keynote Stage',
        sponsor: 'Keilaniemi Executive Forum',
        access: 'Open to All',
        color: '#6366f1',
        roles: ['CTO Fireside Stream', 'Live Strategy Q&A']
      },
      cleantech: {
        name: 'Boardroom A — Clean Energy',
        sponsor: 'Fortum & Neste',
        access: 'Verified Match >80% Only',
        color: '#10b981',
        roles: ['Principal Energy Systems Architect']
      },
      quantum: {
        name: 'Boardroom B — DeepTech R&D',
        sponsor: 'IQM & VTT',
        access: 'Verified Match >80% Only',
        color: '#8b5cf6',
        roles: ['Director of Cryogenic Systems']
      },
      embedded: {
        name: 'Boardroom C — 6G & Urban AI',
        sponsor: 'Nokia & Kone',
        access: 'Verified Match >80% Only',
        color: '#f59e0b',
        roles: ['Distinguished 6G RAN Engineer']
      },
      vip: {
        name: 'Private Offer & Relocation Suite',
        sponsor: 'Espoo Business Advisory',
        access: '1-on-1 Invite',
        color: '#ec4899',
        roles: ['1-on-1 Compensation & Relocation Lounge']
      }
    }
  }
};

// Geometric Room Bounds (aligned with 3D wall generation and minimap)
const ROOM_GEOMETRY = [
  { id: 'atrium', bounds: { minX: -9, maxX: 9, minZ: -7, maxZ: 14 }, center: { x: 0, z: 2 }, doorEntry: { x: 0, z: 2 } },
  { id: 'auditorium', bounds: { minX: -11, maxX: 11, minZ: -25, maxZ: -7.5 }, center: { x: 0, z: -16 }, doorEntry: { x: 0, z: -8 } },
  { id: 'cleantech', bounds: { minX: -25, maxX: -9.5, minZ: -10, maxZ: 6 }, center: { x: -17, z: -2 }, doorEntry: { x: -8.5, z: 0 } },
  { id: 'quantum', bounds: { minX: 9.5, maxX: 25, minZ: -10, maxZ: 6 }, center: { x: 17, z: -2 }, doorEntry: { x: 8.5, z: 0 } },
  { id: 'embedded', bounds: { minX: -25, maxX: -9.5, minZ: 7.5, maxZ: 21 }, center: { x: -17, z: 14 }, doorEntry: { x: -8.5, z: 11 } },
  { id: 'vip', bounds: { minX: 9.5, maxX: 25, minZ: 7.5, maxZ: 21 }, center: { x: 17, z: 14 }, doorEntry: { x: 8.5, z: 11 } }
];

const KEYNOTE_SLIDES = [
  {
    badge: 'SLIDE 1 · ESPOO HIRING DEMAND',
    title: 'Why Espoo Needs Sub-Second Grid & Hydrogen Specialists Now',
    bullets: [
      'Fortum, Neste & VTT currently show +34% hiring velocity across Keilaniemi & Otaniemi.',
      '69 open knowledge-work positions spanning Grid-Forming Inverters, BESS Telemetry, and Power-to-X.',
      'Meet engineering leads directly in the CleanTech & Energy Lounge right after this stream!'
    ]
  },
  {
    badge: 'SLIDE 2 · TECHNICAL DEEP-DIVE',
    title: 'Mitigating Sub-Synchronous Oscillation Under Low Nordic Inertia',
    bullets: [
      'Real-time PMU/EMT phasor streams detect 12–35 Hz phase-margin collapse at weak PCC buses.',
      'Co-designing VSM droop damping + electrolyzer rectifier ramp-rate caps stabilizes 500 MW clusters.',
      'Live architecture teardown & Simulink demos happening inside Room A.'
    ]
  },
  {
    badge: 'SLIDE 3 · CAREER & RELOCATION TRACKS',
    title: 'Dual-Track Hiring: Principal Leads & MSc Thesis Researchers',
    bullets: [
      'Verified Match >80% badge holders have fast-track entry to VIP 1-on-1 Interview Pods.',
      'Minimize this Zoom player to PiP mode anytime and walk your 3D avatar into employer lounges!',
      'Drop your Verified Talent Passport inside any room to start a direct hiring conversation.'
    ]
  }
];

// ==================== GLOBAL 3D & STATE ====================

let scene, camera, renderer;
let wallColliders = [];
let roomMeshes = {};
let roomAccentLights = {};
let floorMesh;
let customPropMeshes = [];
let waypointMarkers = [];

let player = {
  name: 'You (Global Talent)',
  role: 'Global Talent',
  badge: '✓ Verified Match 92% · Grid & AI',
  color: '#38bdf8',
  x: 0,
  z: 4,
  yaw: Math.PI,
  speed: 8.5,
  waypoints: [],
  mesh: null,
  ringMesh: null,
  leftLeg: null,
  rightLeg: null,
  leftArm: null,
  rightArm: null,
  waveTimer: 0
};

let npcs = [];
let activePresetKey = 'energy';
let currentRoomConfigs = JSON.parse(JSON.stringify(PRESET_CONFIGS.energy.rooms));
let currentRoomId = 'atrium';
let nearbyNpcIds = new Set();
let roomChatHistory = {
  atrium: [
    { sender: 'Espoo Host Bot', text: 'Welcome! Walk with WASD or click the floor/minimap to explore rooms.' }
  ],
  auditorium: [
    { sender: 'Antti Koskinen (Fortum)', text: 'Keynote Q&A is live — feel free to open Zoom Stage mode or ask here!' }
  ],
  cleantech: [
    { sender: 'Joonas Rantanen (Neste)', text: 'Looking for process simulation & grid flexibility talent in Keilaniemi!' }
  ],
  quantum: [
    { sender: 'Dr. Aura Mäkelä (IQM)', text: 'Ask us about millikelvin QPU packaging & FPGA control roles in Otaniemi.' }
  ],
  embedded: [
    { sender: 'Sami Nieminen (Nokia)', text: 'Discussing deterministic Rust/C++ for 6G L1 pipelines.' }
  ],
  vip: [
    { sender: 'TalentConcierge', text: 'Pre-vetted 1-on-1 interviews active here.' }
  ]
};

// Camera Orbit State
let cameraState = {
  yaw: 0,
  pitch: 0.58,
  distance: 14,
  isDragging: false,
  dragMoved: false,
  lastX: 0,
  lastY: 0
};

let keysPressed = {};
let clock = new THREE.Clock();
let slideIndex = 0;
let mediaStream = null;
let micEnabled = false;
let camEnabled = false;
let activeBroadcastRoomId = 'cleantech';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadExportedEventIfPresent();
  initThreeScene();
  buildVenueArchitecture();
  buildPlayerAvatar();
  spawnNPCAvatars();
  initKeyboardAndMouseControls();
  initHudControls();
  initZoomControls();
  initDesignerControls();
  initAvatarModal();

  applyRoomMetadataToUI();
  updateRoomDirectoryUI();
  updateSpatialUI(true);
  animate();
});

function loadExportedEventIfPresent() {
  let exported = null;
  try {
    if (window.location.hash.startsWith('#event=')) {
      const encoded = window.location.hash.slice('#event='.length);
      exported = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } else {
      const raw = localStorage.getItem(STORAGE_KEY_EXPORT_EVENT);
      if (raw) exported = JSON.parse(raw);
    }
  } catch (e) {
    exported = null;
  }

  if (exported && exported.eventTitle) {
    const presetKey = PRESET_CONFIGS[exported.preset] ? exported.preset : 'energy';
    activePresetKey = presetKey;
    currentRoomConfigs = JSON.parse(JSON.stringify(PRESET_CONFIGS[presetKey].rooms));
    document.getElementById('hud-event-title').textContent = exported.eventTitle;
    document.getElementById('zoom-session-title').textContent = `Keynote: ${exported.keynoteTopic || exported.eventTitle}`;
    if (exported.speakerArchetype) {
      document.getElementById('zoom-session-speakers').textContent = `Main Auditorium · ${exported.speakerArchetype}`;
    }
    showVenueToast(`Loaded Blueprint from Talent Radar: ${exported.eventTitle}`);
  }
}

// ==================== THREE.JS SCENE & ARCHITECTURE ====================

function initThreeScene() {
  const container = document.getElementById('three-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060b16);
  scene.fog = new THREE.FogExp2(0x060b16, 0.011);

  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 160);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Global Lighting
  const hemi = new THREE.HemisphereLight(0xbbe6ff, 0x0f172a, 0.72);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(22, 34, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 5;
  dirLight.shadow.camera.far = 90;
  dirLight.shadow.camera.left = -35;
  dirLight.shadow.camera.right = 35;
  dirLight.shadow.camera.top = 35;
  dirLight.shadow.camera.bottom = -35;
  scene.add(dirLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function buildVenueArchitecture() {
  // Base Building Floor Slab
  const baseFloorGeo = new THREE.PlaneGeometry(58, 54);
  const baseFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
    metalness: 0.15
  });
  floorMesh = new THREE.Mesh(baseFloorGeo, baseFloorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, -2);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Subtle architectural grid
  const grid = new THREE.GridHelper(56, 56, 0x1e293b, 0x111c33);
  grid.position.set(0, 0.01, -2);
  scene.add(grid);

  // Colored Carpet Pads per Room
  ROOM_GEOMETRY.forEach((rm) => {
    const w = rm.bounds.maxX - rm.bounds.minX;
    const d = rm.bounds.maxZ - rm.bounds.minZ;
    const cx = (rm.bounds.minX + rm.bounds.maxX) / 2;
    const cz = (rm.bounds.minZ + rm.bounds.maxZ) / 2;

    const accentHex = currentRoomConfigs[rm.id]?.color || '#38bdf8';
    const padGeo = new THREE.PlaneGeometry(w - 0.6, d - 0.6);
    const padMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentHex).multiplyScalar(0.28),
      roughness: 0.9,
      metalness: 0.08
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(cx, 0.02, cz);
    pad.receiveShadow = true;
    scene.add(pad);

    // Room Accent Point Light
    const pt = new THREE.PointLight(new THREE.Color(accentHex), 0.75, 22);
    pt.position.set(cx, 5.2, cz);
    scene.add(pt);
    roomAccentLights[rm.id] = pt;
    roomMeshes[rm.id] = { padMat };
  });

  // Architectural Walls with Wide Glass Doorways
  wallColliders = [];
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.3
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    roughness: 0.1,
    metalness: 0.1
  });

  const addWall = (x1, z1, x2, z2, height = 3.6, isGlass = true) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const width = Math.max(0.4, maxX - minX);
    const depth = Math.max(0.4, maxZ - minZ);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    // Solid bottom baseboard
    const baseH = 0.65;
    const baseGeo = new THREE.BoxGeometry(width, baseH, depth);
    const baseMesh = new THREE.Mesh(baseGeo, wallMat);
    baseMesh.position.set(cx, baseH / 2, cz);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Glass or upper wall
    const topGeo = new THREE.BoxGeometry(width, height - baseH, depth);
    const topMesh = new THREE.Mesh(topGeo, isGlass ? glassMat : wallMat);
    topMesh.position.set(cx, baseH + (height - baseH) / 2, cz);
    scene.add(topMesh);

    wallColliders.push({
      minX: cx - width / 2,
      maxX: cx + width / 2,
      minZ: cz - depth / 2,
      maxZ: cz + depth / 2
    });
  };

  // Outer Perimeter Walls
  addWall(-25.5, -25.5, 25.5, -25.1, 4.2, false); // North
  addWall(-25.5, 21.1, 25.5, 21.5, 4.2, false);   // South
  addWall(-25.5, -25.5, -25.1, 21.5, 4.2, false); // West
  addWall(25.1, -25.5, 25.5, 21.5, 4.2, false);   // East

  // North Auditorium Wall (doorway at x in [-3.5, 3.5])
  addWall(-11.2, -7.6, -3.5, -7.2, 3.8, true);
  addWall(3.5, -7.6, 11.2, -7.2, 3.8, true);
  addWall(-11.2, -25.2, -10.8, -7.2, 3.8, true);
  addWall(10.8, -25.2, 11.2, -7.2, 3.8, true);

  // West CleanTech Lounge (doorway at z in [-3.2, 3.2])
  addWall(-9.6, -10.2, -9.2, -3.2, 3.5, true);
  addWall(-9.6, 3.2, -9.2, 6.2, 3.5, true);
  addWall(-25.2, -10.2, -9.2, -9.8, 3.5, true);
  addWall(-25.2, 6.0, -9.2, 6.4, 3.5, true);

  // East Quantum Lab (doorway at z in [-3.2, 3.2])
  addWall(9.2, -10.2, 9.6, -3.2, 3.5, true);
  addWall(9.2, 3.2, 9.6, 6.2, 3.5, true);
  addWall(9.2, -10.2, 25.2, -9.8, 3.5, true);
  addWall(9.2, 6.0, 25.2, 6.4, 3.5, true);

  // South-West 6G Hub (doorway at z in [8.5, 13.5])
  addWall(-9.6, 7.2, -9.2, 8.5, 3.5, true);
  addWall(-9.6, 13.5, -9.2, 21.2, 3.5, true);
  addWall(-25.2, 7.2, -9.2, 7.6, 3.5, true);

  // South-East VIP Pods (doorway at z in [8.5, 13.5])
  addWall(9.2, 7.2, 9.6, 8.5, 3.5, true);
  addWall(9.2, 13.5, 9.6, 21.2, 3.5, true);
  addWall(9.2, 7.2, 25.2, 7.6, 3.5, true);

  // Build Default Architectural Furniture inside Rooms
  buildDefaultFurniture();
}

function buildDefaultFurniture() {
  // 1. Main Auditorium Stage + Giant Glowing Keynote Screen + Chairs
  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.55, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  stage.position.set(0, 0.275, -22.2);
  stage.receiveShadow = true;
  scene.add(stage);

  // Giant Keynote Screen
  const screenFrame = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 4.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x020617 })
  );
  screenFrame.position.set(0, 3.0, -24.2);
  scene.add(screenFrame);

  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(9.8, 3.6),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
  );
  screenGlow.position.set(0, 3.0, -24.05);
  scene.add(screenGlow);

  // Podium
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.2, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
  );
  podium.position.set(0, 1.15, -20.8);
  scene.add(podium);

  // Auditorium Seating Rows
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  for (let row = 0; row < 3; row++) {
    for (let col = -3; col <= 3; col++) {
      if (col === 0) continue; // center aisle
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.8), seatMat);
      seat.position.set(col * 1.45, 0.35, -16.5 + row * 2.2);
      seat.castShadow = true;
      scene.add(seat);
    }
  }

  // 2. Atrium Welcome Coffee Desk & Lounge Sofas
  spawnPropInScene('kiosk', 0, 2.5, 0x38bdf8);
  spawnPropInScene('sofa', -4.5, 6.5, 0x0284c7);
  spawnPropInScene('sofa', 4.5, 6.5, 0x0284c7);

  // 3. CleanTech Lounge Booth & Conference Table
  spawnPropInScene('booth', -21.5, -2, 0x10b981);
  spawnPropInScene('table', -15.5, -2, 0x10b981);

  // 4. Quantum Lab Booth & Conference Table
  spawnPropInScene('booth', 21.5, -2, 0x8b5cf6);
  spawnPropInScene('table', 15.5, -2, 0x8b5cf6);

  // 5. 6G & Embedded Hub Table & Screen
  spawnPropInScene('table', -17, 14, 0xf59e0b);
  spawnPropInScene('screen', -22, 14, 0xf59e0b);

  // 6. VIP Interview Pods (2 intimate 1-on-1 pods)
  spawnPropInScene('table', 14.5, 11.5, 0xec4899);
  spawnPropInScene('table', 19.5, 16.5, 0xec4899);
}

function spawnPropInScene(type, x, z, accentColor = 0x38bdf8) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.25 });

  if (type === 'table') {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.14, 24), woodMat);
    top.position.y = 0.85;
    top.castShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 0.85, 16), accentMat);
    leg.position.y = 0.425;
    group.add(top, leg);
  } else if (type === 'booth') {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.05, 3.6), woodMat);
    desk.position.y = 0.525;
    desk.castShadow = true;
    const backdrop = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.7, 3.8), accentMat);
    backdrop.position.set(-0.9, 1.35, 0);
    backdrop.castShadow = true;
    group.add(desk, backdrop);
  } else if (type === 'screen') {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 3.2), woodMat);
    stand.position.y = 1.3;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.7, 2.8), accentMat);
    panel.position.y = 1.6;
    group.add(stand, panel);
  } else if (type === 'sofa') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1.0), accentMat);
    base.position.y = 0.275;
    base.castShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.28), woodMat);
    back.position.set(0, 0.65, -0.36);
    group.add(base, back);
  } else if (type === 'kiosk') {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.15, 16), woodMat);
    pillar.position.y = 0.575;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.08, 12, 28), accentMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.25;
    group.add(pillar, ring);
  }

  scene.add(group);
  customPropMeshes.push(group);
}

// ==================== AVATARS (PLAYER + AUTONOMOUS NPCs) ====================

function createHumanoidMesh(colorHex) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), bodyMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), skinMat);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);

  // Arms
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), bodyMat);
  leftArm.position.set(-0.43, 1.16, 0);
  leftArm.castShadow = true;
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), bodyMat);
  rightArm.position.set(0.43, 1.16, 0);
  rightArm.castShadow = true;
  group.add(leftArm, rightArm);

  // Legs
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.76, 0.24), darkMat);
  leftLeg.position.set(-0.16, 0.38, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.76, 0.24), darkMat);
  rightLeg.position.set(0.16, 0.38, 0);
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  return { group, leftArm, rightArm, leftLeg, rightLeg, bodyMat };
}

function buildPlayerAvatar() {
  const parts = createHumanoidMesh(player.color);
  player.mesh = parts.group;
  player.leftArm = parts.leftArm;
  player.rightArm = parts.rightArm;
  player.leftLeg = parts.leftLeg;
  player.rightLeg = parts.rightLeg;
  player.bodyMat = parts.bodyMat;

  // Proximity Aura Ring on floor
  const ringGeo = new THREE.RingGeometry(PROXIMITY_RADIUS - 0.08, PROXIMITY_RADIUS, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.22
  });
  player.ringMesh = new THREE.Mesh(ringGeo, ringMat);
  player.ringMesh.rotation.x = -Math.PI / 2;
  player.ringMesh.position.y = 0.05;
  player.mesh.add(player.ringMesh);

  player.mesh.position.set(player.x, 0, player.z);
  scene.add(player.mesh);
}

function spawnNPCAvatars() {
  const npcTemplates = [
    { id: 'npc-1', name: 'Antti Koskinen', role: 'Chief Grid Architect · Fortum', room: 'auditorium', x: 0, z: -19.5, color: '#f59e0b', speech: 'Keynote Q&A open — ask about BESS!' },
    { id: 'npc-2', name: 'Dr. Maria Heiskanen', role: 'Principal Scientist · VTT', room: 'auditorium', x: -3.2, z: -15, color: '#06b6d4', speech: 'Power-to-X electrolyzer pilots in Otaniemi' },
    { id: 'npc-3', name: 'Joonas Rantanen', role: 'Hiring Lead · Neste', room: 'cleantech', x: -19.2, z: -2.2, color: '#10b981', speech: 'Hiring Simulation & Catalysis Leads!' },
    { id: 'npc-4', name: 'Dr. Mikko Väisänen', role: 'Verified Talent (95%) · Zurich', room: 'cleantech', x: -14.2, z: -0.5, color: '#3b82f6', speech: 'Checking Fortum Grid Flexibility roles' },
    { id: 'npc-5', name: 'Sofia Lindqvist', role: 'MSc Energy · KTH Stockholm', room: 'cleantech', x: -16.8, z: -4.4, color: '#22d3ee', speech: 'Looking for MSc Thesis in Keilaniemi' },
    { id: 'npc-6', name: 'Dr. Aura Mäkelä', role: 'QPU Lead · IQM Quantum', room: 'quantum', x: 19.2, z: -2.4, color: '#a855f7', speech: 'Cryo-RF & QEC calibration roles open' },
    { id: 'npc-7', name: 'Timo Virtanen', role: 'SAR Systems Lead · ICEYE', room: 'quantum', x: 14.5, z: -0.6, color: '#6366f1', speech: 'Building orbital X-band edge ML!' },
    { id: 'npc-8', name: 'Dr. Kenji Takahashi', role: 'Verified Talent (84%) · Munich', room: 'quantum', x: 16.5, z: 2.5, color: '#818cf8', speech: 'Excited about Otaniemi quantum labs' },
    { id: 'npc-9', name: 'Sami Nieminen', role: '6G RAN Architect · Nokia', room: 'embedded', x: -18.5, z: 13.5, color: '#f97316', speech: 'Seeking Embedded Rust & L1 DSP engineers' },
    { id: 'npc-10', name: 'Laura Lindholm', role: 'Edge AI Lead · Kone', room: 'embedded', x: -14.2, z: 16.5, color: '#eab308', speech: '2M connected elevators on AWS Edge' },
    { id: 'npc-11', name: 'Ville Tuominen', role: 'Espoo TalentConcierge', room: 'atrium', x: 2.8, z: 1.5, color: '#38bdf8', speech: 'Need directions? Click any room!' },
    { id: 'npc-12', name: 'Elena Petrova', role: 'Relocation Advisor · Espoo', room: 'vip', x: 15.5, z: 12.8, color: '#ec4899', speech: '1-on-1 fast-track interviews ready' }
  ];

  npcTemplates.forEach((tpl, idx) => {
    const parts = createHumanoidMesh(tpl.color);
    parts.group.position.set(tpl.x, 0, tpl.z);
    scene.add(parts.group);

    npcs.push({
      ...tpl,
      homeX: tpl.x,
      homeZ: tpl.z,
      phase: idx * 1.1,
      mesh: parts.group,
      leftArm: parts.leftArm,
      rightArm: parts.rightArm,
      leftLeg: parts.leftLeg,
      rightLeg: parts.rightLeg,
      activeChat: false
    });
  });
}

// ==================== CONTROLS: WASD, FLOOR CLICK, ORBIT ====================

function initKeyboardAndMouseControls() {
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    keysPressed[e.key.toLowerCase()] = true;
    // Cancel auto-walk if player presses manual movement
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
      player.waypoints = [];
    }
  });
  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
  });

  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => {
    cameraState.isDragging = true;
    cameraState.dragMoved = false;
    cameraState.lastX = e.clientX;
    cameraState.lastY = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (!cameraState.isDragging) return;
    const dx = e.clientX - cameraState.lastX;
    const dy = e.clientY - cameraState.lastY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) cameraState.dragMoved = true;
    cameraState.yaw -= dx * 0.006;
    cameraState.pitch = Math.max(0.22, Math.min(1.18, cameraState.pitch + dy * 0.005));
    cameraState.lastX = e.clientX;
    cameraState.lastY = e.clientY;
  });

  window.addEventListener('pointerup', (e) => {
    if (!cameraState.isDragging) return;
    cameraState.isDragging = false;
    if (!cameraState.dragMoved && e.target === canvas) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Check NPC click first
      const npcMeshes = npcs.map((n) => n.mesh);
      const npcHits = raycaster.intersectObjects(npcMeshes, true);
      if (npcHits.length > 0) {
        let obj = npcHits[0].object;
        while (obj.parent && obj.parent !== scene) obj = obj.parent;
        const foundNpc = npcs.find((n) => n.mesh === obj);
        if (foundNpc) {
          walkPlayerTo(foundNpc.x + 1.4, foundNpc.z + 1.4, getRoomIdAt(foundNpc.x, foundNpc.z));
          showVenueToast(`Walking over to talk with ${foundNpc.name}`);
          return;
        }
      }

      // Else click floor to walk
      const floorHits = raycaster.intersectObject(floorMesh);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const targetRoom = getRoomIdAt(pt.x, pt.z);
        walkPlayerTo(pt.x, pt.z, targetRoom);
      }
    }
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      cameraState.distance = Math.max(6, Math.min(28, cameraState.distance + e.deltaY * 0.012));
    },
    { passive: true }
  );
}

function walkPlayerTo(tx, tz, targetRoomId) {
  const startRoomId = getRoomIdAt(player.x, player.z);
  const path = [];

  if (startRoomId !== targetRoomId) {
    const startRoom = ROOM_GEOMETRY.find((r) => r.id === startRoomId);
    const endRoom = ROOM_GEOMETRY.find((r) => r.id === targetRoomId);
    if (startRoom && startRoom.id !== 'atrium') {
      path.push({ x: startRoom.doorEntry.x, z: startRoom.doorEntry.z });
    }
    path.push({ x: 0, z: 2 }); // Atrium hub
    if (endRoom && endRoom.id !== 'atrium') {
      path.push({ x: endRoom.doorEntry.x, z: endRoom.doorEntry.z });
    }
  }
  path.push({ x: tx, z: tz });
  player.waypoints = path;
}

function collidesWithWall(nx, nz, radius = 0.45) {
  for (const w of wallColliders) {
    if (nx + radius > w.minX && nx - radius < w.maxX && nz + radius > w.minZ && nz - radius < w.maxZ) {
      return true;
    }
  }
  return false;
}

function getRoomIdAt(x, z) {
  for (const r of ROOM_GEOMETRY) {
    if (x >= r.bounds.minX && x <= r.bounds.maxX && z >= r.bounds.minZ && z <= r.bounds.maxZ) {
      return r.id;
    }
  }
  return 'atrium';
}

// ==================== MAIN ANIMATION LOOP ====================

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updatePlayerMovement(dt, elapsed);
  updateNPCAnimations(dt, elapsed);
  updateWaypointMarkers(elapsed);
  updateCameraPosition();
  project3DLabels();
  drawMinimap();

  renderer.render(scene, camera);
}

function updatePlayerMovement(dt, elapsed) {
  let moveX = 0;
  let moveZ = 0;

  // Camera-relative WASD/Arrows
  const forwardX = -Math.sin(cameraState.yaw);
  const forwardZ = -Math.cos(cameraState.yaw);
  const rightX = Math.cos(cameraState.yaw);
  const rightZ = -Math.sin(cameraState.yaw);

  if (keysPressed['w'] || keysPressed['arrowup']) {
    moveX += forwardX;
    moveZ += forwardZ;
  }
  if (keysPressed['s'] || keysPressed['arrowdown']) {
    moveX -= forwardX;
    moveZ -= forwardZ;
  }
  if (keysPressed['a'] || keysPressed['arrowleft']) {
    moveX -= rightX;
    moveZ -= rightZ;
  }
  if (keysPressed['d'] || keysPressed['arrowright']) {
    moveX += rightX;
    moveZ += rightZ;
  }

  let isMoving = false;
  if (moveX !== 0 || moveZ !== 0) {
    const len = Math.hypot(moveX, moveZ);
    moveX = (moveX / len) * player.speed * dt;
    moveZ = (moveZ / len) * player.speed * dt;
    isMoving = true;
  } else if (player.waypoints.length > 0) {
    const target = player.waypoints[0];
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.35) {
      player.waypoints.shift();
    } else {
      moveX = (dx / dist) * player.speed * dt;
      moveZ = (dz / dist) * player.speed * dt;
      isMoving = true;
    }
  }

  if (isMoving) {
    const nextX = player.x + moveX;
    const nextZ = player.z + moveZ;
    if (!collidesWithWall(nextX, player.z)) player.x = nextX;
    if (!collidesWithWall(player.x, nextZ)) player.z = nextZ;

    player.yaw = Math.atan2(moveX, moveZ);
    const swing = Math.sin(elapsed * 12) * 0.55;
    player.leftLeg.rotation.x = swing;
    player.rightLeg.rotation.x = -swing;
    player.leftArm.rotation.x = -swing * 0.7;
    if (player.waveTimer <= 0) player.rightArm.rotation.x = swing * 0.7;
  } else {
    player.leftLeg.rotation.x = 0;
    player.rightLeg.rotation.x = 0;
    player.leftArm.rotation.x = 0;
    if (player.waveTimer <= 0) player.rightArm.rotation.x = 0;
  }

  if (player.waveTimer > 0) {
    player.waveTimer -= dt;
    player.rightArm.rotation.z = 2.4 + Math.sin(elapsed * 16) * 0.35;
  } else {
    player.rightArm.rotation.z = 0;
  }

  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.yaw;

  // Check Room Transition & Proximity Changes
  const newRoom = getRoomIdAt(player.x, player.z);
  let roomChanged = false;
  if (newRoom !== currentRoomId) {
    currentRoomId = newRoom;
    roomChanged = true;
    applyRoomMetadataToUI();
  }

  const newNearby = new Set();
  npcs.forEach((npc) => {
    const d = Math.hypot(npc.x - player.x, npc.z - player.z);
    if (d <= PROXIMITY_RADIUS) newNearby.add(npc.id);
  });

  const proxChanged =
    newNearby.size !== nearbyNpcIds.size || [...newNearby].some((id) => !nearbyNpcIds.has(id));
  if (proxChanged || roomChanged) {
    nearbyNpcIds = newNearby;
    updateSpatialUI(roomChanged);
  }
}

function updateNPCAnimations(dt, elapsed) {
  npcs.forEach((npc) => {
    // Gentle idle patrol around home position
    const targetX = npc.homeX + Math.sin(elapsed * 0.45 + npc.phase) * 0.85;
    const targetZ = npc.homeZ + Math.cos(elapsed * 0.4 + npc.phase) * 0.65;
    const dx = targetX - npc.x;
    const dz = targetZ - npc.z;
    npc.x += dx * dt * 1.4;
    npc.z += dz * dt * 1.4;
    npc.mesh.position.set(npc.x, 0, npc.z);

    // Face player when in proximity!
    if (nearbyNpcIds.has(npc.id)) {
      npc.mesh.rotation.y = Math.atan2(player.x - npc.x, player.z - npc.z);
      npc.rightArm.rotation.x = -0.35 + Math.sin(elapsed * 5 + npc.phase) * 0.15;
    } else {
      npc.mesh.rotation.y = Math.atan2(dx, dz);
      npc.rightArm.rotation.x = 0;
    }
  });
}

function updateCameraPosition() {
  const offsetX = Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance;
  const offsetY = Math.sin(cameraState.pitch) * cameraState.distance;
  const offsetZ = Math.cos(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance;

  camera.position.lerp(
    new THREE.Vector3(player.x + offsetX, 1.4 + offsetY, player.z + offsetZ),
    0.15
  );
  camera.lookAt(player.x, 1.35, player.z);
}

// ==================== FLOATING 3D NAMEPLATES & ROOM SIGNS ====================

function project3DLabels() {
  const layer = document.getElementById('labels-layer');
  let html = '';

  const toScreen = (x, y, z) => {
    const v = new THREE.Vector3(x, y, z);
    v.project(camera);
    if (v.z > 1) return null;
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-(v.y * 0.5) + 0.5) * window.innerHeight;
    if (sx < -60 || sx > window.innerWidth + 60 || sy < -40 || sy > window.innerHeight + 40) return null;
    return { x: sx, y: sy };
  };

  // Room floating signs
  ROOM_GEOMETRY.forEach((rm) => {
    const pos = toScreen(rm.center.x, 4.1, rm.center.z);
    if (pos) {
      const cfg = currentRoomConfigs[rm.id];
      html += `<div class="floating-room-sign" style="left:${pos.x.toFixed(1)}px;top:${pos.y.toFixed(1)}px;border-color:${cfg.color}88">${escapeHtml(cfg.name)}</div>`;
    }
  });

  // Player nameplate
  const pPos = toScreen(player.x, 2.35, player.z);
  if (pPos) {
    html += `<div class="floating-nameplate in-proximity" style="left:${pPos.x.toFixed(1)}px;top:${pPos.y.toFixed(1)}px">
      <span class="w-2 h-2 rounded-full" style="background:${player.color}"></span>
      <span>${escapeHtml(player.name)}</span>
    </div>`;
  }

  // NPC nameplates + speech bubbles
  npcs.forEach((npc) => {
    const nPos = toScreen(npc.x, 2.3, npc.z);
    if (nPos) {
      const near = nearbyNpcIds.has(npc.id);
      if (near && npc.speech) {
        html += `<div class="speech-bubble" style="left:${nPos.x.toFixed(1)}px;top:${nPos.y.toFixed(1)}px">${escapeHtml(npc.speech)}</div>`;
      }
      html += `<div class="floating-nameplate ${near ? 'in-proximity' : ''}" style="left:${nPos.x.toFixed(1)}px;top:${nPos.y.toFixed(1)}px">
        <span class="w-2 h-2 rounded-full" style="background:${npc.color}"></span>
        <span>${escapeHtml(npc.name)}</span>
      </div>`;
    }
  });

  layer.innerHTML = html;
}

// ==================== 2D MINIMAP ====================

function drawMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const mapX = (wx) => ((wx + 27) / 54) * W;
  const mapZ = (wz) => ((wz + 27) / 50) * H;

  // Draw rooms
  ROOM_GEOMETRY.forEach((rm) => {
    const cfg = currentRoomConfigs[rm.id];
    const x1 = mapX(rm.bounds.minX);
    const z1 = mapZ(rm.bounds.minZ);
    const x2 = mapX(rm.bounds.maxX);
    const z2 = mapZ(rm.bounds.maxZ);
    ctx.fillStyle = rm.id === currentRoomId ? `${cfg.color}44` : `${cfg.color}1c`;
    ctx.strokeStyle = rm.id === currentRoomId ? cfg.color : 'rgba(148,163,184,0.3)';
    ctx.lineWidth = rm.id === currentRoomId ? 1.5 : 1;
    ctx.fillRect(x1, z1, x2 - x1, z2 - z1);
    ctx.strokeRect(x1, z1, x2 - x1, z2 - z1);
  });

  // Draw NPCs
  npcs.forEach((npc) => {
    ctx.beginPath();
    ctx.arc(mapX(npc.x), mapZ(npc.z), 2.8, 0, Math.PI * 2);
    ctx.fillStyle = nearbyNpcIds.has(npc.id) ? '#34d399' : '#94a3b8';
    ctx.fill();
  });

  // Draw Player
  ctx.beginPath();
  ctx.arc(mapX(player.x), mapZ(player.z), 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ==================== HUD UPDATES: ROOM DIRECTORY, PROXIMITY & CHAT ====================

function applyRoomMetadataToUI() {
  const cfg = currentRoomConfigs[currentRoomId];
  document.getElementById('hud-current-room').textContent = cfg.name;
  updateRoomDirectoryUI();
}

function updateRoomDirectoryUI() {
  const list = document.getElementById('room-directory-list');
  if (!list) return;

  list.innerHTML = ROOM_GEOMETRY.map((rm) => {
    const cfg = currentRoomConfigs[rm.id];
    const count = npcs.filter((n) => n.room === rm.id).length + (currentRoomId === rm.id ? 1 : 0);
    const active = currentRoomId === rm.id;
    return `
      <div class="p-2 rounded-xl border ${active ? 'border-sky-400/60 bg-sky-500/15' : 'border-slate-800 bg-slate-900/60'} flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${cfg.color}"></span>
            <span class="text-[11px] font-bold text-white truncate">${escapeHtml(cfg.name)}</span>
          </div>
          <div class="text-[10px] text-slate-400 truncate">${escapeHtml(cfg.sponsor)} · ${count} inside</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="walkToRoom('${rm.id}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-sky-600 text-[10px] font-semibold text-white transition" title="Auto-walk avatar to room">Walk</button>
          <button onclick="teleportToRoom('${rm.id}')" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-[10px] font-semibold text-slate-200 transition" title="Instant teleport">⚡</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('total-attendees-badge').textContent = `${npcs.length + 1} Online`;
}

function walkToRoom(roomId) {
  const rm = ROOM_GEOMETRY.find((r) => r.id === roomId);
  if (!rm) return;
  walkPlayerTo(rm.center.x, rm.center.z, rm.id);
  showVenueToast(`Walking to ${currentRoomConfigs[roomId].name}...`);
}

function teleportToRoom(roomId) {
  const rm = ROOM_GEOMETRY.find((r) => r.id === roomId);
  if (!rm) return;
  player.waypoints = [];
  player.x = rm.center.x;
  player.z = rm.center.z;
  currentRoomId = rm.id;
  applyRoomMetadataToUI();
  updateSpatialUI(true);
}

function updateSpatialUI(roomChanged) {
  const podsList = document.getElementById('proximity-pods-list');
  const proxBadge = document.getElementById('proximity-count-badge');
  const nearby = npcs.filter((n) => nearbyNpcIds.has(n.id));

  proxBadge.textContent = `${nearby.length} nearby`;
  if (nearby.length === 0) {
    podsList.innerHTML = `<p class="text-[11px] text-slate-400">Walk closer to any person inside a room to open live spatial audio/video proximity pods.</p>`;
  } else {
    podsList.innerHTML = nearby
      .map(
        (npc) => `
        <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/35 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white shrink-0" style="background:${npc.color}">
              ${escapeHtml(npc.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold text-white truncate">${escapeHtml(npc.name)}</div>
              <div class="text-[10px] text-emerald-300 truncate">${escapeHtml(npc.role)}</div>
            </div>
          </div>
          <button onclick="start1on1Talk('${npc.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white shrink-0 transition">
            Talk
          </button>
        </div>
      `
      )
      .join('');
  }

  if (roomChanged) {
    const cfg = currentRoomConfigs[currentRoomId];
    const boothCard = document.getElementById('room-booth-card');
    boothCard.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">${escapeHtml(cfg.access)}</span>
        <button onclick="dropTalentPassport()" class="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition">
          Drop Talent Passport
        </button>
      </div>
      <div class="text-xs font-bold text-white">${escapeHtml(cfg.name)}</div>
      <div class="text-[11px] text-slate-300">Host: <strong>${escapeHtml(cfg.sponsor)}</strong></div>
      <div class="flex flex-wrap gap-1 pt-0.5">
        ${cfg.roles.map((r) => `<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${escapeHtml(r)}</span>`).join('')}
      </div>
    `;
    renderSpatialChat();
  }
}

function start1on1Talk(npcId) {
  const npc = npcs.find((n) => n.id === npcId);
  if (!npc) return;
  const reply = `Hi ${player.name}! Happy to share more about ${npc.role.split('·')[1] || 'our Espoo team'} — feel free to drop your Verified Talent Passport here.`;
  npc.speech = reply;
  if (!roomChatHistory[currentRoomId]) roomChatHistory[currentRoomId] = [];
  roomChatHistory[currentRoomId].push({ sender: npc.name, text: reply });
  renderSpatialChat();
  showVenueToast(`Spatial Audio Pod active with ${npc.name}`);
}

function dropTalentPassport() {
  const cfg = currentRoomConfigs[currentRoomId];
  if (!roomChatHistory[currentRoomId]) roomChatHistory[currentRoomId] = [];
  roomChatHistory[currentRoomId].push({
    sender: 'System',
    text: `✓ ${player.name} (${player.badge}) shared Verified Talent Passport with ${cfg.sponsor}.`
  });
  renderSpatialChat();
  showVenueToast(`Verified Talent Passport shared in ${cfg.name}!`);
}

function renderSpatialChat() {
  const box = document.getElementById('spatial-chat-messages');
  const msgs = roomChatHistory[currentRoomId] || [];
  box.innerHTML = msgs
    .map(
      (m) => `
      <div class="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
        <span class="font-bold text-sky-300">${escapeHtml(m.sender)}:</span>
        <span class="text-slate-200 ml-1">${escapeHtml(m.text)}</span>
      </div>
    `
    )
    .join('');
  box.scrollTop = box.scrollHeight;
}

// ==================== HUD, WEBCAM, MINIMAP CLICK ====================

function initHudControls() {
  // Minimap Click-to-Walk
  const minimap = document.getElementById('minimap-canvas');
  minimap.addEventListener('click', (e) => {
    const rect = minimap.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const nz = (e.clientY - rect.top) / rect.height;
    const wx = nx * 54 - 27;
    const wz = nz * 50 - 27;
    const targetRoom = getRoomIdAt(wx, wz);
    walkPlayerTo(wx, wz, targetRoom);
  });

  // Spatial Chat Submit
  document.getElementById('spatial-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('spatial-chat-input');
    const txt = input.value.trim();
    if (!txt) return;
    if (!roomChatHistory[currentRoomId]) roomChatHistory[currentRoomId] = [];
    roomChatHistory[currentRoomId].push({ sender: player.name, text: txt });
    input.value = '';
    renderSpatialChat();
  });

  // Wave button
  document.getElementById('wave-reaction-btn').addEventListener('click', () => {
    player.waveTimer = 1.6;
    spawnReaction('👋');
  });

  // Mic & Cam toggles (real getUserMedia with safe fallback)
  document.getElementById('toggle-mic-btn').addEventListener('click', async () => {
    micEnabled = !micEnabled;
    const btn = document.getElementById('toggle-mic-btn');
    if (micEnabled) {
      btn.innerHTML = '<i data-lucide="mic" class="w-3.5 h-3.5 text-emerald-400"></i><span class="hidden sm:inline">Mic On</span>';
      showVenueToast('Spatial Microphone enabled');
    } else {
      btn.innerHTML = '<i data-lucide="mic-off" class="w-3.5 h-3.5 text-rose-400"></i><span class="hidden sm:inline">Mic Off</span>';
    }
    lucide.createIcons();
  });

  document.getElementById('toggle-cam-btn').addEventListener('click', async () => {
    const btn = document.getElementById('toggle-cam-btn');
    const vid = document.getElementById('self-webcam-video');
    const fallback = document.getElementById('self-avatar-fallback');

    if (!camEnabled) {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          vid.srcObject = mediaStream;
          vid.classList.remove('hidden');
          fallback.classList.add('hidden');
          camEnabled = true;
          btn.innerHTML = '<i data-lucide="video" class="w-3.5 h-3.5 text-emerald-400"></i><span class="hidden sm:inline">Cam On</span>';
        }
      } catch (err) {
        camEnabled = true;
        btn.innerHTML = '<i data-lucide="video" class="w-3.5 h-3.5 text-amber-300"></i><span class="hidden sm:inline">Avatar Cam</span>';
        showVenueToast('Camera blocked/unavailable — using animated avatar feed');
      }
    } else {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
      vid.classList.add('hidden');
      fallback.classList.remove('hidden');
      camEnabled = false;
      btn.innerHTML = '<i data-lucide="video-off" class="w-3.5 h-3.5 text-slate-400"></i><span class="hidden sm:inline">Cam Off</span>';
    }
    lucide.createIcons();
  });

  // Broadcast Banner Actions
  document.getElementById('broadcast-follow-btn').addEventListener('click', () => {
    walkToRoom(activeBroadcastRoomId);
    document.getElementById('organizer-broadcast-banner').classList.add('hidden');
  });
  document.getElementById('broadcast-dismiss-btn').addEventListener('click', () => {
    document.getElementById('organizer-broadcast-banner').classList.add('hidden');
  });
}

// ==================== ZOOM KEYNOTE STAGE & DRAGGABLE PiP ====================

function initZoomControls() {
  const walkBtn = document.getElementById('mode-walk-btn');
  const zoomBtn = document.getElementById('mode-zoom-btn');
  const designerBtn = document.getElementById('mode-designer-btn');
  const overlay = document.getElementById('zoom-stage-overlay');
  const pipDock = document.getElementById('zoom-pip-dock');

  const setActiveMode = (btn) => {
    [walkBtn, zoomBtn, designerBtn].forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  };

  walkBtn.addEventListener('click', () => {
    setActiveMode(walkBtn);
    overlay.classList.add('hidden');
    document.getElementById('designer-drawer').classList.add('hidden');
  });

  const openZoomStage = () => {
    setActiveMode(zoomBtn);
    overlay.classList.remove('hidden');
    pipDock.classList.add('hidden');
    document.getElementById('designer-drawer').classList.add('hidden');
    renderZoomSlide();
  };

  zoomBtn.addEventListener('click', openZoomStage);
  document.getElementById('open-zoom-from-bar-btn').addEventListener('click', openZoomStage);

  document.getElementById('zoom-close-btn').addEventListener('click', () => {
    overlay.classList.add('hidden');
    setActiveMode(walkBtn);
  });

  document.getElementById('zoom-minimize-pip-btn').addEventListener('click', () => {
    overlay.classList.add('hidden');
    pipDock.classList.remove('hidden');
    setActiveMode(walkBtn);
    showVenueToast('Zoom Livestream minimized to PiP — walk and talk freely!');
  });

  document.getElementById('pip-expand-btn').addEventListener('click', openZoomStage);
  document.getElementById('pip-close-btn').addEventListener('click', () => pipDock.classList.add('hidden'));

  // Slide navigation
  document.getElementById('prev-slide-btn').addEventListener('click', () => {
    slideIndex = (slideIndex - 1 + KEYNOTE_SLIDES.length) % KEYNOTE_SLIDES.length;
    renderZoomSlide();
  });
  document.getElementById('next-slide-btn').addEventListener('click', () => {
    slideIndex = (slideIndex + 1) % KEYNOTE_SLIDES.length;
    renderZoomSlide();
  });

  // Q&A form
  document.getElementById('zoom-qa-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('zoom-qa-input');
    const txt = input.value.trim();
    if (!txt) return;
    const qaList = document.getElementById('zoom-qa-list');
    const div = document.createElement('div');
    div.className = 'p-2.5 rounded-xl bg-sky-900/40 border border-sky-500/30';
    div.innerHTML = `<div class="font-bold text-sky-300">${escapeHtml(player.name)}</div><p class="text-slate-100 mt-0.5">${escapeHtml(txt)}</p>`;
    qaList.appendChild(div);
    qaList.scrollTop = qaList.scrollHeight;
    input.value = '';
  });

  makeElementDraggable(pipDock, document.getElementById('pip-drag-handle'));
  renderZoomSlide();
}

function renderZoomSlide() {
  const slide = KEYNOTE_SLIDES[slideIndex];
  document.getElementById('slide-counter-label').textContent = `Slide ${slideIndex + 1} / ${KEYNOTE_SLIDES.length}`;
  document.getElementById('pip-slide-title').textContent = slide.title;
  document.getElementById('zoom-slide-content').innerHTML = `
    <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">${escapeHtml(slide.badge)}</span>
    <h3 class="text-2xl sm:text-3xl font-extrabold text-white leading-tight">${escapeHtml(slide.title)}</h3>
    <ul class="space-y-2.5 text-sm text-slate-200 pt-2">
      ${slide.bullets.map((b) => `<li class="flex items-start gap-2"><span class="text-sky-400 font-bold">▸</span><span>${escapeHtml(b)}</span></li>`).join('')}
    </ul>
  `;
}

function spawnReaction(emoji) {
  const el = document.createElement('div');
  el.className = 'emoji-float';
  el.textContent = emoji;
  el.style.left = `${35 + Math.random() * 30}%`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function makeElementDraggable(el, handle) {
  let dragging = false;
  let startX, startY, origLeft, origTop;
  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    const rect = el.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    origLeft = rect.left;
    origTop = rect.top;
    el.style.bottom = 'auto';
    el.style.right = 'auto';
    el.style.left = `${origLeft}px`;
    el.style.top = `${origTop}px`;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    el.style.left = `${origLeft + (e.clientX - startX)}px`;
    el.style.top = `${origTop + (e.clientY - startY)}px`;
  });
  window.addEventListener('pointerup', () => (dragging = false));
}

// ==================== ORGANIZER ROOM DESIGNER & 3D WAYPOINTS ====================

function initDesignerControls() {
  const drawer = document.getElementById('designer-drawer');
  const designerBtn = document.getElementById('mode-designer-btn');
  const walkBtn = document.getElementById('mode-walk-btn');
  const roomSelect = document.getElementById('designer-room-select');

  const populateRoomSelect = () => {
    roomSelect.innerHTML = ROOM_GEOMETRY.map(
      (r) => `<option value="${r.id}">${escapeHtml(currentRoomConfigs[r.id].name)}</option>`
    ).join('');
    syncDesignerFields(roomSelect.value);
  };

  const syncDesignerFields = (roomId) => {
    const cfg = currentRoomConfigs[roomId];
    if (!cfg) return;
    document.getElementById('designer-room-name').value = cfg.name;
    document.getElementById('designer-room-sponsor').value = cfg.sponsor;
    document.getElementById('designer-room-access').value = cfg.access;
    document.getElementById('designer-room-color').value = cfg.color;
  };

  designerBtn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    designerBtn.classList.add('active');
    document.getElementById('zoom-stage-overlay').classList.add('hidden');
    drawer.classList.remove('hidden');
    populateRoomSelect();
  });

  document.getElementById('close-designer-btn').addEventListener('click', () => {
    drawer.classList.add('hidden');
    designerBtn.classList.remove('active');
    walkBtn.classList.add('active');
  });

  roomSelect.addEventListener('change', (e) => syncDesignerFields(e.target.value));

  // Venue Presets
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      const preset = PRESET_CONFIGS[key];
      if (!preset) return;
      activePresetKey = key;
      currentRoomConfigs = JSON.parse(JSON.stringify(preset.rooms));
      document.getElementById('hud-event-title').textContent = preset.eventTitle;
      document.getElementById('zoom-session-title').textContent = preset.zoomTopic;
      document.getElementById('zoom-session-speakers').textContent = preset.zoomSpeakers;

      // Recolor 3D Room Pads & Lights
      ROOM_GEOMETRY.forEach((rm) => {
        const c = new THREE.Color(currentRoomConfigs[rm.id].color);
        if (roomMeshes[rm.id]) roomMeshes[rm.id].padMat.color.copy(c).multiplyScalar(0.28);
        if (roomAccentLights[rm.id]) roomAccentLights[rm.id].color.copy(c);
      });

      document.querySelectorAll('.preset-btn').forEach((b) => {
        b.className =
          b === btn
            ? 'preset-btn text-left px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-400/40 text-xs text-white font-semibold transition'
            : 'preset-btn text-left px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 font-semibold transition';
      });

      populateRoomSelect();
      applyRoomMetadataToUI();
      updateSpatialUI(true);
      showVenueToast(`Loaded Preset: ${preset.eventTitle}`);
    });
  });

  // Apply Room Edits
  document.getElementById('apply-room-edits-btn').addEventListener('click', () => {
    const id = roomSelect.value;
    const cfg = currentRoomConfigs[id];
    cfg.name = document.getElementById('designer-room-name').value.trim() || cfg.name;
    cfg.sponsor = document.getElementById('designer-room-sponsor').value.trim() || cfg.sponsor;
    cfg.access = document.getElementById('designer-room-access').value;
    cfg.color = document.getElementById('designer-room-color').value;

    const c = new THREE.Color(cfg.color);
    if (roomMeshes[id]) roomMeshes[id].padMat.color.copy(c).multiplyScalar(0.28);
    if (roomAccentLights[id]) roomAccentLights[id].color.copy(c);

    populateRoomSelect();
    applyRoomMetadataToUI();
    updateSpatialUI(true);
    showVenueToast(`Updated 3D Room "${cfg.name}"`);
  });

  // Add 3D Furniture Prop directly into selected room
  document.querySelectorAll('.add-prop-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const propType = btn.dataset.prop;
      const roomId = roomSelect.value;
      const rm = ROOM_GEOMETRY.find((r) => r.id === roomId);
      if (!rm) return;
      const jitterX = (Math.random() - 0.5) * 6;
      const jitterZ = (Math.random() - 0.5) * 5;
      const colorHex = new THREE.Color(currentRoomConfigs[roomId].color).getHex();
      spawnPropInScene(propType, rm.center.x + jitterX, rm.center.z + jitterZ, colorHex);
      showVenueToast(`Placed 3D ${propType} in ${currentRoomConfigs[roomId].name}`);
    });
  });

  // Broadcast Call-to-Room + Draw 3D Glowing Path
  document.getElementById('trigger-broadcast-btn').addEventListener('click', () => {
    const roomId = roomSelect.value;
    activeBroadcastRoomId = roomId;
    const customMsg = document.getElementById('broadcast-custom-msg').value.trim();
    const roomName = currentRoomConfigs[roomId].name;
    const msg = customMsg || `Session starting now in ${roomName} — follow the glowing floor markers!`;

    document.getElementById('broadcast-message-text').textContent = msg;
    document.getElementById('organizer-broadcast-banner').classList.remove('hidden');
    draw3DWaypointPathToRoom(roomId);
    showVenueToast(`Broadcast sent to all attendees → ${roomName}`);
  });
}

function draw3DWaypointPathToRoom(roomId) {
  waypointMarkers.forEach((m) => scene.remove(m));
  waypointMarkers = [];

  const targetRoom = ROOM_GEOMETRY.find((r) => r.id === roomId);
  if (!targetRoom) return;

  const startRoom = ROOM_GEOMETRY.find((r) => r.id === currentRoomId);
  const pts = [{ x: player.x, z: player.z }];
  if (startRoom && startRoom.id !== targetRoom.id) {
    if (startRoom.id !== 'atrium') pts.push(startRoom.doorEntry);
    pts.push({ x: 0, z: 2 });
    if (targetRoom.id !== 'atrium') pts.push(targetRoom.doorEntry);
  }
  pts.push(targetRoom.center);

  const markerMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(2, Math.floor(dist / 2.2));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), markerMat);
      orb.position.set(a.x + (b.x - a.x) * t, 0.4, a.z + (b.z - a.z) * t);
      scene.add(orb);
      waypointMarkers.push(orb);
    }
  }
}

function updateWaypointMarkers(elapsed) {
  waypointMarkers.forEach((orb, idx) => {
    orb.rotation.y = elapsed * 2.5;
    orb.position.y = 0.38 + Math.sin(elapsed * 4 + idx * 0.6) * 0.14;
  });
}

// ==================== AVATAR CUSTOMIZER MODAL ====================

function initAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  document.getElementById('open-avatar-modal-btn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });
  document.getElementById('close-avatar-modal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
  document.getElementById('save-avatar-btn').addEventListener('click', () => {
    player.name = document.getElementById('avatar-name-input').value.trim() || 'You';
    player.role = document.getElementById('avatar-role-select').value;
    player.badge = document.getElementById('avatar-badge-input').value.trim() || '✓ Verified';
    player.color = document.getElementById('avatar-color-input').value;

    if (player.bodyMat) player.bodyMat.color.set(player.color);
    document.getElementById('self-name-label').textContent = `${player.name}`;
    document.getElementById('self-badge-label').textContent = player.badge;
    document.getElementById('zoom-self-tile-name').textContent = player.name;
    document.getElementById('self-avatar-fallback').textContent = player.name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    showVenueToast('3D Avatar & Badge updated!');
  });
}

// ==================== UTILITIES ====================

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showVenueToast(msg) {
  const t = document.getElementById('venue-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._venueToastTimer);
  window._venueToastTimer = setTimeout(() => t.classList.add('hidden'), 3400);
}

