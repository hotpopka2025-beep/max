import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { Water } from 'https://unpkg.com/three@0.159.0/examples/jsm/objects/Water.js';
import { Sky } from 'https://unpkg.com/three@0.159.0/examples/jsm/objects/Sky.js';

const canvas = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1728, 0.00012);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.set(50, 26, 68);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 6, 0);

const hemisphere = new THREE.HemisphereLight(0x9ac5ff, 0x0d2030, 0.55);
scene.add(hemisphere);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
sunLight.position.set(50, 100, -20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
scene.add(sunLight);

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

const waterNormals = new THREE.TextureLoader().load(
  'https://raw.githubusercontent.com/mrdoob/three.js/r159/examples/textures/waternormals.jpg',
  () => {
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
  }
);

const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals,
  sunDirection: new THREE.Vector3(),
  waterColor: new THREE.Color('#0c2846'),
  sunColor: 0xffffff,
  distortionScale: 3.5,
  fog: scene.fog !== undefined,
  alpha: 0.22,
});
water.rotation.x = -Math.PI / 2;
water.position.y = 2.4;
scene.add(water);

const sky = new Sky();
sky.scale.setScalar(15000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

const parameters = {
  elevation: 55,
  azimuth: 170,
};

let renderTarget = pmrem.fromScene(sky);
scene.environment = renderTarget.texture;

const state = {
  waveHeight: 3.5,
  waveLength: 4,
  speed: 1.4,
  foam: 0.22,
  weather: 'calm',
  ship: null,
};

const weatherPresets = {
  calm: {
    sky: { turbidity: 4, rayleigh: 1.4, mieCoefficient: 0.004, mieDirectionalG: 0.6, elevation: 48, azimuth: 145 },
    water: { color: '#0f2e54', distortionScale: 2.6, size: 4.5, alpha: 0.18 },
    fogDensity: 0.00006,
    exposure: 1.0,
  },
  breeze: {
    sky: { turbidity: 7, rayleigh: 1.8, mieCoefficient: 0.006, mieDirectionalG: 0.72, elevation: 52, azimuth: 210 },
    water: { color: '#0b355f', distortionScale: 3.8, size: 3.4, alpha: 0.2 },
    fogDensity: 0.00008,
    exposure: 1.15,
  },
  storm: {
    sky: { turbidity: 14, rayleigh: 0.5, mieCoefficient: 0.03, mieDirectionalG: 0.95, elevation: 12, azimuth: 100 },
    water: { color: '#071c34', distortionScale: 6.5, size: 2.4, alpha: 0.28 },
    fogDensity: 0.00022,
    exposure: 0.85,
  },
  dusk: {
    sky: { turbidity: 16, rayleigh: 0.9, mieCoefficient: 0.018, mieDirectionalG: 0.92, elevation: 6, azimuth: 260 },
    water: { color: '#1a2d46', distortionScale: 4.1, size: 3.6, alpha: 0.32 },
    fogDensity: 0.00018,
    exposure: 1.1,
  },
};

function updateSun(elevation, azimuth) {
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  const sun = new THREE.Vector3();
  sun.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();
  sunLight.position.copy(sun.clone().multiplyScalar(2000));
}

function applyWeather(name) {
  const preset = weatherPresets[name];
  if (!preset) return;
  state.weather = name;

  skyUniforms['turbidity'].value = preset.sky.turbidity;
  skyUniforms['rayleigh'].value = preset.sky.rayleigh;
  skyUniforms['mieCoefficient'].value = preset.sky.mieCoefficient;
  skyUniforms['mieDirectionalG'].value = preset.sky.mieDirectionalG;

  renderer.toneMappingExposure = preset.exposure;
  scene.fog.density = preset.fogDensity;

  water.material.uniforms['waterColor'].value = new THREE.Color(preset.water.color);
  water.material.uniforms['distortionScale'].value = preset.water.distortionScale;
  water.material.uniforms['size'].value = preset.water.size;
  water.material.uniforms['alpha'].value = preset.water.alpha;

  state.waveHeight = preset.water.distortionScale;
  state.waveLength = preset.water.size;
  state.foam = preset.water.alpha;
  syncInputs();

  updateSun(preset.sky.elevation, preset.sky.azimuth);

  if (renderTarget) {
    renderTarget.dispose();
  }
  renderTarget = pmrem.fromScene(sky);
  scene.environment = renderTarget.texture;
}

function syncInputs() {
  const waveHeightInput = document.getElementById('waveHeight');
  const waveLengthInput = document.getElementById('waveLength');
  const speedInput = document.getElementById('speed');
  const foamInput = document.getElementById('foam');

  waveHeightInput.value = state.waveHeight.toFixed(2);
  waveLengthInput.value = state.waveLength.toFixed(2);
  speedInput.value = state.speed.toFixed(2);
  foamInput.value = state.foam.toFixed(2);

  document.getElementById('waveHeightValue').textContent = Number(state.waveHeight).toFixed(2);
  document.getElementById('waveLengthValue').textContent = Number(state.waveLength).toFixed(2);
  document.getElementById('speedValue').textContent = Number(state.speed).toFixed(2);
  document.getElementById('foamValue').textContent = Number(state.foam).toFixed(2);
}

function buildShip() {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(12, 2.6, 5, 1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.05 })
  );
  hull.geometry.translate(0, 1.2, 0);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 3, 4),
    new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.25, metalness: 0.08 })
  );
  bow.rotation.y = Math.PI / 4;
  bow.position.set(5.8, 2.3, 0);
  group.add(bow);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.5, 3.2),
    new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.5, metalness: 0 })
  );
  cabin.position.set(-1.5, 3.4, 0);
  cabin.castShadow = true;
  group.add(cabin);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, 10, 12),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.1, roughness: 0.4 })
  );
  mast.position.set(2.2, 6.2, 0);
  mast.castShadow = true;
  group.add(mast);

  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 4.8);
  sailShape.lineTo(3.6, 2.4);
  sailShape.lineTo(0, 0);

  const sailGeometry = new THREE.ExtrudeGeometry(sailShape, { depth: 0.2, bevelEnabled: false });
  const sailMaterial = new THREE.MeshStandardMaterial({ color: '#f1f5f9', emissive: '#dbeafe', emissiveIntensity: 0.08 });
  const sail = new THREE.Mesh(sailGeometry, sailMaterial);
  sail.rotation.y = Math.PI;
  sail.position.set(2.4, 4, -0.1);
  sail.castShadow = true;
  group.add(sail);

  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.18, 8, 16),
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.35 })
  );
  accent.position.set(-5.4, 2.2, -2.6);
  accent.rotation.x = Math.PI / 2;
  group.add(accent);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  group.scale.setScalar(1);
  group.position.set(0, 4, 0);
  group.userData.phase = Math.random() * Math.PI * 2;
  group.userData.bob = 0;
  return group;
}

function toggleShip() {
  const button = document.getElementById('shipToggle');
  if (state.ship) {
    scene.remove(state.ship);
    state.ship = null;
    button.classList.remove('active');
    button.textContent = 'Добавить';
    return;
  }

  state.ship = buildShip();
  scene.add(state.ship);
  button.classList.add('active');
  button.textContent = 'Убрать';
}

function updateShip(time) {
  if (!state.ship) return;
  const t = time * 0.35 + state.ship.userData.phase;
  const bob = Math.sin(t) * (state.waveHeight * 0.15 + 0.2);
  const roll = Math.sin(t * 1.3) * (state.waveHeight * 0.015 + 0.03);
  const pitch = Math.cos(t * 0.9) * (state.waveHeight * 0.02 + 0.04);

  state.ship.position.y = 3.4 + bob;
  state.ship.rotation.set(pitch, Math.sin(t * 0.2) * 0.15, roll);
}

function updateWaterFromInputs() {
  water.material.uniforms['distortionScale'].value = state.waveHeight;
  water.material.uniforms['size'].value = state.waveLength;
  water.material.uniforms['alpha'].value = state.foam;
}

function attachUI() {
  const weather = document.getElementById('weather');
  weather.addEventListener('change', (event) => applyWeather(event.target.value));

  const waveHeightInput = document.getElementById('waveHeight');
  waveHeightInput.addEventListener('input', (e) => {
    state.waveHeight = Number(e.target.value);
    document.getElementById('waveHeightValue').textContent = Number(state.waveHeight).toFixed(2);
    water.material.uniforms['distortionScale'].value = state.waveHeight;
  });

  const waveLengthInput = document.getElementById('waveLength');
  waveLengthInput.addEventListener('input', (e) => {
    state.waveLength = Number(e.target.value);
    document.getElementById('waveLengthValue').textContent = Number(state.waveLength).toFixed(2);
    water.material.uniforms['size'].value = state.waveLength;
  });

  const speedInput = document.getElementById('speed');
  speedInput.addEventListener('input', (e) => {
    state.speed = Number(e.target.value);
    document.getElementById('speedValue').textContent = state.speed.toFixed(2);
  });

  const foamInput = document.getElementById('foam');
  foamInput.addEventListener('input', (e) => {
    state.foam = Number(e.target.value);
    document.getElementById('foamValue').textContent = state.foam.toFixed(2);
    water.material.uniforms['alpha'].value = state.foam;
  });

  const shipToggle = document.getElementById('shipToggle');
  shipToggle.addEventListener('click', toggleShip);

  const shipScale = document.getElementById('shipScale');
  shipScale.addEventListener('input', (e) => {
    const value = Number(e.target.value);
    document.getElementById('shipScaleValue').textContent = value.toFixed(1);
    if (state.ship) {
      state.ship.scale.setScalar(value);
    }
  });
}

function onResize() {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

attachUI();
applyWeather('calm');
updateWaterFromInputs();
syncInputs();
updateSun(parameters.elevation, parameters.azimuth);

window.addEventListener('resize', onResize);

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  water.material.uniforms['time'].value += delta * state.speed;
  updateShip(water.material.uniforms['time'].value);
  controls.update();
  renderer.render(scene, camera);
});
