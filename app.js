// Xonadonim.uz — 3D PropTech Procedural World & Interaction Engine
// Inspired by iamtechartist / tech artist high-end WebGL experiences

(function() {
  'use strict';

  // --- 1. WEB AUDIO SYNTHESIZER (No external mp3 assets needed) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = true;
      this.droneNodes = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.init();
      this.isMuted = !this.isMuted;
      if (!this.isMuted) {
        this.startDrone();
        this.playChime(660, 0.2);
      } else {
        this.stopDrone();
      }
      return !this.isMuted;
    }

    startDrone() {
      if (!this.ctx || this.droneNodes) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, now); // A1 note
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110.2, now); // A2 slight detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 3);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      this.droneNodes = { osc1, osc2, gain };
    }

    stopDrone() {
      if (!this.droneNodes) return;
      const now = this.ctx.currentTime;
      this.droneNodes.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        if (this.droneNodes) {
          try {
            this.droneNodes.osc1.stop();
            this.droneNodes.osc2.stop();
          } catch(e) {}
          this.droneNodes = null;
        }
      }, 900);
    }

    playClick() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    playChime(freq = 880, dur = 0.4) {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    playGlide() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.35);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  }

  const sound = new SoundEngine();

  // --- 2. THREE.JS SCENE SETUP ---
  const canvas = document.getElementById('webgl-canvas');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040812, 0.024);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(22, 16, 26);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  // Orbit controls placeholder logic with smooth drag
  let isDragging = false;
  let prevMouseX = 0, prevMouseY = 0;
  let targetRotY = 0.35;
  let targetRotX = 0.1;
  let currentRotY = 0.35;
  let currentRotX = 0.1;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('pointerup', () => { isDragging = false; });

  window.addEventListener('pointermove', (e) => {
    if (isDragging) {
      const deltaX = (e.clientX - prevMouseX) * 0.005;
      const deltaY = (e.clientY - prevMouseY) * 0.003;
      targetRotY += deltaX;
      targetRotX = Math.max(-0.25, Math.min(0.65, targetRotX + deltaY));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }
  });

  // Groups
  const worldGroup = new THREE.Group();
  const towerGroup = new THREE.Group();
  const lowerFloorsGroup = new THREE.Group();
  const upperFloorsGroup = new THREE.Group();
  const floor7Group = new THREE.Group(); // Detailed apartment interior floor
  const surroundingGroup = new THREE.Group();
  const particlesGroup = new THREE.Group();
  let interiorFurnishedGroup = null;

  scene.add(worldGroup);
  worldGroup.add(surroundingGroup);
  worldGroup.add(towerGroup);
  worldGroup.add(particlesGroup);

  towerGroup.add(lowerFloorsGroup);
  towerGroup.add(floor7Group);
  towerGroup.add(upperFloorsGroup);

  // Position tower offset slightly for responsive desktop layout
  worldGroup.position.set(4, -4.5, 0);

  // --- 3. DYNAMIC LIGHTING ---
  const ambientLight = new THREE.AmbientLight(0x182c4d, 1.6);
  scene.add(ambientLight);

  const mainGoldLight = new THREE.PointLight(0xeec866, 4.5, 50);
  mainGoldLight.position.set(8, 20, 10);
  scene.add(mainGoldLight);

  const cyanRimLight = new THREE.PointLight(0x00aef0, 3.2, 45);
  cyanRimLight.position.set(-16, 12, -12);
  scene.add(cyanRimLight);

  const sunsetLight = new THREE.DirectionalLight(0xff7733, 0);
  sunsetLight.position.set(20, 15, -20);
  scene.add(sunsetLight);

  // Grid
  const grid = new THREE.GridHelper(70, 70, 0xd4a034, 0x11213b);
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  worldGroup.add(grid);

  // --- 4. LUXURY PROCEDURAL MATERIALS ---
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1426,
    metalness: 0.88,
    roughness: 0.12,
    transmission: 0.35,
    transparent: true,
    opacity: 0.95
  });

  const goldFrameMat = new THREE.MeshStandardMaterial({
    color: 0xd4a034,
    metalness: 0.9,
    roughness: 0.25,
    emissive: 0x4a340a,
    emissiveIntensity: 0.2
  });

  const warmWindowMat = new THREE.MeshBasicMaterial({
    color: 0xffdf88,
    transparent: true,
    opacity: 0.85
  });

  const interiorFloorMat = new THREE.MeshStandardMaterial({
    color: 0x2b1e15, // luxury dark oak parquet
    roughness: 0.4,
    metalness: 0.2
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e2c45,
    roughness: 0.8
  });

  const blueprintLineMat = new THREE.LineBasicMaterial({
    color: 0x00d2ff,
    transparent: true,
    opacity: 0.85
  });

  // Array to track windows for quality score glow
  const floorLevels = [];

  // --- 5. BUILD PROCEDURAL 12-STOREY TOWER ---
  const totalFloors = 12;

  // Ground Floor Lobby (Lobby Pavilion)
  (function createLobby() {
    const lobbyW = 5.6, lobbyH = 1.4;
    const lobbyGeo = new THREE.BoxGeometry(lobbyW, lobbyH, lobbyW);
    const lobbyMesh = new THREE.Mesh(lobbyGeo, glassMat);
    lobbyMesh.position.y = lobbyH / 2;
    lowerFloorsGroup.add(lobbyMesh);

    // Golden Entrance Canopy
    const canopyGeo = new THREE.BoxGeometry(lobbyW * 1.15, 0.12, lobbyW * 1.15);
    const canopyMesh = new THREE.Mesh(canopyGeo, goldFrameMat);
    canopyMesh.position.y = lobbyH;
    lowerFloorsGroup.add(canopyMesh);

    // Interior Warm Lobby Glow
    const lobbyLightGeo = new THREE.BoxGeometry(lobbyW * 0.9, lobbyH * 0.7, lobbyW * 0.9);
    const lobbyLight = new THREE.Mesh(lobbyLightGeo, new THREE.MeshBasicMaterial({
      color: 0xffe6a3,
      transparent: true,
      opacity: 0.75
    }));
    lobbyLight.position.y = lobbyH / 2;
    lowerFloorsGroup.add(lobbyLight);
  })();

  // Construct each residential floor
  for (let i = 1; i <= totalFloors; i++) {
    const isPenthouse = i >= 10;
    const width = isPenthouse ? 3.8 : (i > 6 ? 4.4 : 4.8);
    const height = 0.92;
    const posY = 1.4 + (i - 1) * 1.02 + height / 2;

    const floorContainer = new THREE.Group();
    floorContainer.position.y = posY;

    // Outer Glass Body
    const floorGeo = new THREE.BoxGeometry(width, height, width);
    const floorMesh = new THREE.Mesh(floorGeo, glassMat.clone());
    floorContainer.add(floorMesh);

    // Architectural Gold Banding
    const wireGeo = new THREE.EdgesGeometry(floorGeo);
    const wireLine = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({
      color: 0xd4a034,
      transparent: true,
      opacity: 0.5
    }));
    floorContainer.add(wireLine);

    // Illuminated Ribbon Windows
    const winGeo = new THREE.BoxGeometry(width * 1.015, height * 0.45, width * 1.015);
    const winMat = warmWindowMat.clone();
    winMat.opacity = i <= 8 ? 0.9 : 0.4;
    const winMesh = new THREE.Mesh(winGeo, winMat);
    floorContainer.add(winMesh);

    // Balcony Projection for front apartments
    const balconyGeo = new THREE.BoxGeometry(width * 0.7, 0.08, 0.7);
    const balcony = new THREE.Mesh(balconyGeo, goldFrameMat);
    balcony.position.set(0, -height / 2 + 0.04, width / 2 + 0.35);
    floorContainer.add(balcony);

    // Balcony Glass Railing
    const railingGeo = new THREE.BoxGeometry(width * 0.7, 0.35, 0.04);
    const railing = new THREE.Mesh(railingGeo, new THREE.MeshPhysicalMaterial({
      color: 0x00d2ff,
      transmission: 0.8,
      transparent: true,
      opacity: 0.6
    }));
    railing.position.set(0, -height / 2 + 0.22, width / 2 + 0.7);
    floorContainer.add(railing);

    // Grouping for Explode Animation
    if (i < 7) {
      lowerFloorsGroup.add(floorContainer);
    } else if (i === 7) {
      floor7Group.add(floorContainer);
      buildApartmentInterior(floor7Group, width, height, posY);
    } else {
      upperFloorsGroup.add(floorContainer);
    }

    floorLevels.push({
      floorNumber: i,
      winMat,
      container: floorContainer,
      originalY: posY,
      width
    });
  }

  // --- 6. DETAILED 3D APARTMENT INTERIOR (Inside Floor 7) ---
  function buildApartmentInterior(targetGroup, w, h, basePosY) {
    interiorFurnishedGroup = new THREE.Group();
    interiorFurnishedGroup.position.y = 0; // Relative to floor 7
    interiorFurnishedGroup.visible = false; // Initially hidden until exploded

    // Floor Parquet
    const floorPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.05, w * 0.96), interiorFloorMat);
    floorPlate.position.y = -h / 2 + 0.03;
    interiorFurnishedGroup.add(floorPlate);

    // Partition Wall: Living Room vs Bedroom
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.85, 0.08), wallMat);
    wall1.position.set(-w * 0.2, 0, 0);
    interiorFurnishedGroup.add(wall1);

    // Partition Wall: Kitchen vs Corridor
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.85, w * 0.4), wallMat);
    wall2.position.set(0, 0, -w * 0.2);
    interiorFurnishedGroup.add(wall2);

    // Luxury Sofa (Living Room)
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.6 }));
    sofa.position.set(w * 0.22, -h / 2 + 0.18, w * 0.2);
    interiorFurnishedGroup.add(sofa);

    // Coffee Table (Glass)
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.4), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9 }));
    table.position.set(w * 0.22, -h / 2 + 0.1, 0);
    interiorFurnishedGroup.add(table);

    // King Size Bed (Master Bedroom)
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.5), new THREE.MeshStandardMaterial({ color: 0x334e68, roughness: 0.5 }));
    bed.position.set(-w * 0.25, -h / 2 + 0.2, -w * 0.2);
    interiorFurnishedGroup.add(bed);

    // Warm Interior Ceiling Spotlights
    const spot = new THREE.PointLight(0xffebaa, 1.8, 6);
    spot.position.set(0, h * 0.4, 0);
    interiorFurnishedGroup.add(spot);

    targetGroup.add(interiorFurnishedGroup);
  }

  // Roof Architectural Spire & Glowing Beacon
  const roofPosY = 1.4 + totalFloors * 1.02 + 0.7;
  const crownGroup = new THREE.Group();
  crownGroup.position.y = roofPosY;
  upperFloorsGroup.add(crownGroup);

  const crownPyramid = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 2.0, 4),
    new THREE.MeshStandardMaterial({
      color: 0xd4a034,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xd4a034,
      emissiveIntensity: 0.35
    })
  );
  crownPyramid.rotation.y = Math.PI / 4;
  crownGroup.add(crownPyramid);

  // Spire Needle
  const needle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.12, 3.2, 8),
    goldFrameMat
  );
  needle.position.y = 2.4;
  crownGroup.add(needle);

  // Beacon Light Orb
  const beaconLight = new THREE.PointLight(0xffe6a3, 3, 20);
  beaconLight.position.y = 4.0;
  crownGroup.add(beaconLight);

  // --- 7. SURROUNDING TASHKENT URBAN BLOCKS ---
  const districtBlocks = [];
  for (let x = -24; x <= 24; x += 5.2) {
    for (let z = -24; z <= 24; z += 5.2) {
      if (Math.abs(x) < 5.5 && Math.abs(z) < 5.5) continue; // Keep center open for Xonadonim Tower
      if (Math.random() > 0.6) continue;

      const bh = Math.random() * 6.5 + 1.2;
      const bw = 2.8 + Math.random() * 0.8;
      const bGeo = new THREE.BoxGeometry(bw, bh, bw);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x060f1e,
        metalness: 0.8,
        roughness: 0.3
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(x + (Math.random() - 0.5) * 1.5, bh / 2, z + (Math.random() - 0.5) * 1.5);

      // Edge glow lines
      const bEdges = new THREE.EdgesGeometry(bGeo);
      const bLine = new THREE.LineSegments(bEdges, new THREE.LineBasicMaterial({
        color: 0x142b4d,
        transparent: true,
        opacity: 0.4
      }));
      bMesh.add(bLine);

      surroundingGroup.add(bMesh);
      districtBlocks.push({ mesh: bMesh, line: bLine, height: bh, baseColor: 0x060f1e });
    }
  }

  // --- 8. GOLDEN PARTICLES (Atmosphere) ---
  const partCount = 220;
  const partGeo = new THREE.BufferGeometry();
  const partPositions = new Float32Array(partCount * 3);
  for (let i = 0; i < partCount * 3; i += 3) {
    partPositions[i] = (Math.random() - 0.5) * 55;
    partPositions[i + 1] = Math.random() * 26;
    partPositions[i + 2] = (Math.random() - 0.5) * 55;
  }
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPositions, 3));
  const partMat = new THREE.PointsMaterial({
    color: 0xeec866,
    size: 0.16,
    transparent: true,
    opacity: 0.75
  });
  const particleSystem = new THREE.Points(partGeo, partMat);
  particlesGroup.add(particleSystem);

  // --- 9. ANIMATION LOOP & SMOOTH DAMPING ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Smooth inertia interpolation
    currentRotY += (targetRotY - currentRotY) * 0.06;
    currentRotX += (targetRotX - currentRotX) * 0.06;

    if (!isDragging) {
      targetRotY += 0.0015; // Slow ambient orbit
    }

    worldGroup.rotation.y = currentRotY;

    // Gentle camera parallax look
    camera.lookAt(worldGroup.position.x, 5.5, worldGroup.position.z);

    // Beacon pulsing
    beaconLight.intensity = 2.5 + Math.sin(elapsed * 4) * 1.5;

    // Particle subtle float
    particleSystem.rotation.y = -elapsed * 0.04;

    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- 10. INTERACTIVE VIEW MODES & EXPLODED VIEW ---
  let isExploded = false;
  let currentMode = 'luxury';

  window.set3DView = function(viewName) {
    sound.playGlide();

    // Reset active buttons in dock
    document.querySelectorAll('.dock-btn[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    if (viewName === 'overview') {
      collapseExploded();
      gsap.to(camera.position, { x: 22, y: 16, z: 26, duration: 1.5, ease: 'power3.inOut' });
      gsap.to(worldGroup.position, { x: 4, y: -4.5, z: 0, duration: 1.5 });
    }
    else if (viewName === 'apartment') {
      collapseExploded();
      // Zoom close to 7th floor balcony
      gsap.to(camera.position, { x: 8, y: 8.5, z: 10, duration: 1.4, ease: 'power2.out' });
      gsap.to(worldGroup.position, { x: 0, y: -5.0, z: 0, duration: 1.4 });
      updateHudForFloor7();
    }
    else if (viewName === 'explode') {
      toggleExplodeView();
    }
    else if (viewName === 'blueprint') {
      toggleBlueprintMode();
    }
    else if (viewName === 'lighting') {
      toggleLightingMode();
    }
  };

  function toggleExplodeView() {
    isExploded = !isExploded;
    sound.playChime(isExploded ? 920 : 440, 0.35);

    const btn = document.querySelector('.dock-btn[data-view="explode"]');
    if (btn) btn.classList.toggle('active', isExploded);

    if (isExploded) {
      // Lift upper floors, lower bottom floors, reveal interior of floor 7
      gsap.to(upperFloorsGroup.position, { y: 9.5, duration: 1.4, ease: 'power3.out' });
      gsap.to(lowerFloorsGroup.position, { y: -3.8, duration: 1.4, ease: 'power3.out' });
      gsap.to(camera.position, { x: 12, y: 12, z: 14, duration: 1.6, ease: 'power3.out' });

      if (interiorFurnishedGroup) {
        interiorFurnishedGroup.visible = true;
        gsap.fromTo(interiorFurnishedGroup.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.5)' });
      }

      showToast("💥 7-qavat planirovkasi ochildi (Exploded 3D View)");
      updateHudForFloor7();
    } else {
      collapseExploded();
    }
  }

  function collapseExploded() {
    isExploded = false;
    const btn = document.querySelector('.dock-btn[data-view="explode"]');
    if (btn) btn.classList.remove('active');

    gsap.to(upperFloorsGroup.position, { y: 0, duration: 1.1, ease: 'power3.inOut' });
    gsap.to(lowerFloorsGroup.position, { y: 0, duration: 1.1, ease: 'power3.inOut' });

    if (interiorFurnishedGroup) {
      gsap.to(interiorFurnishedGroup.scale, {
        x: 0.1, y: 0.1, z: 0.1, duration: 0.4, onComplete: () => {
          interiorFurnishedGroup.visible = false;
        }
      });
    }
  }

  function toggleBlueprintMode() {
    currentMode = (currentMode === 'blueprint') ? 'luxury' : 'blueprint';
    sound.playClick();

    const isBp = (currentMode === 'blueprint');
    const bpBtn = document.querySelector('.dock-btn[data-view="blueprint"]');
    if (bpBtn) bpBtn.classList.toggle('active', isBp);

    // Transform materials
    floorLevels.forEach(fl => {
      fl.container.traverse(obj => {
        if (obj.isMesh) {
          obj.material.wireframe = isBp;
        }
      });
      fl.winMat.color.setHex(isBp ? 0x00d2ff : 0xffdf88);
      fl.winMat.opacity = isBp ? 0.95 : 0.8;
    });

    districtBlocks.forEach(b => {
      b.mesh.material.wireframe = isBp;
      b.line.material.color.setHex(isBp ? 0x00d2ff : 0x142b4d);
    });

    showToast(isBp ? "📐 3D Rentgen Chizma Rejimi Faol" : "🌆 Tungi Premium Rejim Tiklandi");
  }

  let isSunset = false;
  function toggleLightingMode() {
    isSunset = !isSunset;
    sound.playClick();

    if (isSunset) {
      gsap.to(ambientLight, { intensity: 2.2 });
      gsap.to(sunsetLight, { intensity: 3.5, duration: 1.2 });
      gsap.to(mainGoldLight.color, { r: 1.0, g: 0.6, b: 0.2, duration: 1.2 });
      scene.fog.color.setHex(0x1a0f0d);
      showToast("🌅 Oltin Oqshom (Sunset) Yoritilishi");
    } else {
      gsap.to(ambientLight, { intensity: 1.6 });
      gsap.to(sunsetLight, { intensity: 0, duration: 1.2 });
      gsap.to(mainGoldLight.color, { r: 0.93, g: 0.78, b: 0.4, duration: 1.2 });
      scene.fog.color.setHex(0x040812);
      showToast("🌆 Tungi Elita Yoritilishi");
    }
  }

  // --- 11. DISTRICT TELEMETRY FLY-TO ---
  const districtData = {
    all: {
      title: "Toshkent Bosh Markaz",
      sub: "Barcha 12 tuman • Bozor tahlili",
      sale: "$1,280 / m²",
      rent: "$480 / oy",
      score: "98/100",
      targetRot: 0.35
    },
    yunusobod: {
      title: "Yunusobod Tumani",
      sub: "Metro yaqinidagi qulay novostroykalar",
      sale: "$1,360 / m²",
      rent: "$520 / oy",
      score: "96/100",
      targetRot: 1.85
    },
    mirobod: {
      title: "Mirobod Tumani (Premium)",
      sub: "Biznes-klass, Tashkent City yaqini",
      sale: "$1,820 / m²",
      rent: "$850 / oy",
      score: "99/100",
      targetRot: 3.14
    },
    chilonzor: {
      title: "Chilonzor (Talabalar Markazi)",
      sub: "OTMlar va metro atrofidagi qulay ijaralar",
      sale: "$1,140 / m²",
      rent: "$390 / oy",
      score: "95/100",
      targetRot: 4.6
    },
    mirzo: {
      title: "Mirzo Ulug'bek Tumani",
      sub: "Yashil hudud, TTZ va Buyuk Ipak Yo'li",
      sale: "$1,450 / m²",
      rent: "$550 / oy",
      score: "97/100",
      targetRot: 5.7
    },
    yakkasaroy: {
      title: "Yakkasaroy Tumani",
      sub: "Shota Rustaveli va markaziy xiyobonlar",
      sale: "$1,540 / m²",
      rent: "$620 / oy",
      score: "97/100",
      targetRot: 2.3
    }
  };

  window.flyToDistrict = function(key) {
    const d = districtData[key] || districtData.all;
    sound.playGlide();

    targetRotY = d.targetRot;

    document.getElementById('hud-title').textContent = d.title;
    document.getElementById('hud-sub').textContent = d.sub;
    document.getElementById('hud-sale').textContent = d.sale;
    document.getElementById('hud-rent').textContent = d.rent;
    document.getElementById('hud-score').textContent = d.score;

    gsap.fromTo('#hud-card', { scale: 0.96 }, { scale: 1, duration: 0.35 });
  };

  function updateHudForFloor7() {
    document.getElementById('hud-title').textContent = "7-Qavat: 3 xonali Elita";
    document.getElementById('hud-sub').textContent = "Maydon: 88 m² • Planirovka tasdiqlangan";
    document.getElementById('hud-sale').textContent = "$102,000";
    document.getElementById('hud-rent').textContent = "$650 / oy";
    document.getElementById('hud-score').textContent = "100/100";
  }

  // --- 12. INTERACTIVE 100-POINT QUALITY SCORE LOGIC ---
  window.updateQualityScore = function() {
    sound.playClick();
    const checks = document.querySelectorAll('#score-controls input[type="checkbox"]');
    let score = 0;
    checks.forEach(c => {
      if (c.checked) score += parseInt(c.dataset.points, 10);
    });

    // Score numbers and progress bar
    document.getElementById('score-number').textContent = score;
    document.getElementById('score-bar').style.width = score + '%';

    const statusTitle = document.getElementById('score-status-title');
    const badge = document.getElementById('score-badge');
    const hint = document.getElementById('score-hint');

    if (score === 100) {
      statusTitle.textContent = "★ Mukammal Premium E'lon!";
      badge.textContent = "👑 TOP-1 Qidiruv Cho'qqisida";
      badge.className = "px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-xs";
      hint.innerHTML = "🎉 <strong>100/100 Mukammal!</strong> E'loningiz qidiruvning eng tepasida porlaydi va 4x ko'proq xaridor jalb qiladi.";
      sound.playChime(1100, 0.5);
    } else if (score >= 75) {
      statusTitle.textContent = "Yuqori Sifatli E'lon";
      badge.textContent = "★ TOP-12 Qidiruvda (1-sahifa)";
      badge.className = "px-2.5 py-1 rounded-md bg-gold-500/20 text-gold-400 font-bold border border-gold-500/40 text-xs";
      hint.innerHTML = "💡 <strong>Maslahat:</strong> Video-obzor yoki talaba badjini yoqsangiz, <strong>100 ball</strong> bilan 1-o'ringa chiqasiz!";
    } else {
      statusTitle.textContent = "Kam Sifatli (To'ldirilmagan)";
      badge.textContent = "⚠️ Quyi o'rinlarda";
      badge.className = "px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 text-xs";
      hint.innerHTML = "⚠️ <strong>Diqqat:</strong> Planirovka va fotosuratlar yetishmayotgani uchun e'lon pastda ko'rinadi.";
    }

    // Light up 3D tower windows proportionally
    const activeFloors = Math.round((score / 100) * totalFloors);
    floorLevels.forEach((fl, idx) => {
      gsap.to(fl.winMat, {
        opacity: idx < activeFloors ? 0.95 : 0.12,
        duration: 0.4
      });
    });
  };

  // Search tab switcher
  window.switchSearchTab = function(btn, type) {
    sound.playClick();
    document.querySelectorAll('.search-tab').forEach(b => {
      b.className = "search-tab px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/5 transition";
    });
    btn.className = "search-tab px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-gold-400 to-gold-500 text-navy-950 shadow-md transition";

    if (type === 'Talaba') {
      document.getElementById('search-district').value = 'chilonzor';
      window.flyToDistrict('chilonzor');
    }
  };

  // Sound toggle button UI
  window.toggleSound = function() {
    const isUnmuted = sound.toggleMute();
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      btn.classList.toggle('sound-muted', !isUnmuted);
      btn.querySelector('.sound-label').textContent = isUnmuted ? "Ovoz: ON" : "Ovoz: OFF";
    }
    showToast(isUnmuted ? "🔊 Fazoviy Ovoz Yoqildi" : "🔇 Ovoz O'chirildi");
  };

  // Toast notification helper
  function showToast(msg) {
    const toast = document.getElementById('floating-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 12px)';
    }, 2800);
  }

  // Hide loader after assets initialize
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('loader-screen');
      if (loader) loader.classList.add('hidden');
    }, 600);
  });

})();
