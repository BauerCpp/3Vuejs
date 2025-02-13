<template>
  <div class="container">
    <form @submit.prevent="setGeometryWidth">
      <div class="form-group">
        <label for="doorWidth">Door Width (0.6 - 1.5):</label>
        <input
          type="number"
          id="doorWidth"
          v-model.number="doorWidth"
          min="0.6"
          max="1.5"
          step="0.1"
        />

      <!-- <div class="form-group">
        <label for="doorHeight">Door Height (1.0 - 2.5):</label>
        <input
          type="number"
          id="doorHeight"
          v-model.number="doorHeight"
          min="1.0"
          max="2.5"
          step="0.01"
        /> -->
      </div>

      <button type="submit">Update Door</button>
    </form>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { ref, onMounted, computed, watch, shallowRef } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import doorModel from '/Door/frontDoor2.obj?url';
import doorMaterial from '/Door/frontDoor2.mtl?url';

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Reactive State
const { width, height } = useWindowSize();
const aspectRatio = computed(() => width.value / height.value);
// Door Dimensions (reactive for updates)
const doorWidth = ref(1.0); // Initial smaller width
const doorHeight = ref(1.6); // Initial smaller height
const previousDoorWidth = ref(doorWidth.value);
const previousDoorHeight = ref(doorHeight.value);
// Three.js variables
const scene = shallowRef<THREE.Scene>(new THREE.Scene());
const camera = shallowRef<THREE.PerspectiveCamera>(
  new THREE.PerspectiveCamera(45, 1, 0.1, 200)
);
const renderer = shallowRef<THREE.WebGLRenderer>();
const controls = shallowRef<OrbitControls>();
const door = shallowRef<THREE.Object3D | null>(null); // Initialize as null
const doorBox = new THREE.Box3();
let textureCube: THREE.CubeTexture;
let sphere: THREE.Mesh;
let knot: THREE.Mesh;
let plane: THREE.Mesh;
let directLight: THREE.DirectionalLight;

// Constants
const SHADOW_MAP_SIZE = 2048;
const path = '/3Vuejs/SkyBox/Daylight Box_'; // Replace with the correct path to your skybox images
const format = '.bmp';
const urls = [
  path + 'Right' + format,
  path + 'Left' + format,
  path + 'Top' + format,
  path + 'Bottom' + format,
  path + 'Front' + format,
  path + 'Back' + format,
];

// --- Initialization Functions ---

function initScene() {
  scene.value.background = new THREE.Color(0x333333); // Darker, more modern background
}

function initCamera() {
  camera.value.aspect = aspectRatio.value;
  camera.value.position.set(0, 10, 50);
  camera.value.lookAt(0, 0, 0);
  camera.value.updateProjectionMatrix();
}

function initRenderer() {
  if (!canvasRef.value) {
    console.error('Canvas element not found!');
    return;
  }

  renderer.value = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
  });
  renderer.value.setSize(width.value, height.value);
  renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.value.shadowMap.enabled = true;
  renderer.value.shadowMap.type = THREE.PCFSoftShadowMap;
}

function initControls() {
  if (!renderer.value) return;
  controls.value = new OrbitControls(camera.value, renderer.value.domElement);
  controls.value.enableDamping = true;
  controls.value.dampingFactor = 0.2;
}

// --- Object Creation Functions ---

function createBox() {
  const shader = THREE.ShaderLib.cube;

  const loader = new THREE.CubeTextureLoader();
  loader.load(urls, (texture) => {
    console.log(urls, texture);
    textureCube = texture;
    shader.uniforms.tCube.value = texture;
    const material = new THREE.ShaderMaterial({
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: shader.uniforms,
      depthWrite: false,
      side: THREE.BackSide,
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), material);
    createSphere(texture);
    scene.value.add(sphere);
    scene.value.add(mesh);
  });
}

function createSphere(texureCube: THREE.CubeTexture) {
  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32), // Increase segments for smoother sphere
    new THREE.MeshBasicMaterial({ color: 0xffffff, envMap: texureCube })
  );
  sphere.position.set(10, 5, 0);
  sphere.castShadow = true;
  scene.value.add(sphere);
}

function createKnot() {
  knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(2, 0.5, 100, 16), // More detailed knot
    new THREE.MeshStandardMaterial({
      color: 0x008088,
      roughness: 0.5,
      metalness: 0.1,
    })
  );
  knot.position.set(0, 5, 15);
  knot.castShadow = true;
  scene.value.add(knot);
}

function createPlane() {
  const planeGeometry = new THREE.PlaneGeometry(100, 100);
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x999999,
    side: THREE.DoubleSide,
    roughness: 0.8,
  }); // Gray plane
  plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.value.add(plane);
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.value.add(ambientLight);

  // directLight = new THREE.DirectionalLight(0xffffff, 2);
  // directLight.position.set(0, 5, 20);
  // directLight.castShadow = true;
  // directLight.shadow.mapSize.width = SHADOW_MAP_SIZE;
  // directLight.shadow.mapSize.height = SHADOW_MAP_SIZE;
  // directLight.shadow.camera.near = 0.5;
  // directLight.shadow.camera.far = 40;
  // scene.value.add(directLight);
  const pointLight = new THREE.PointLight(0xffffff, 2000);
  pointLight.position.set(0, 20, 40);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = SHADOW_MAP_SIZE;
  pointLight.shadow.mapSize.height = SHADOW_MAP_SIZE;
  pointLight.shadow.camera.near = 0.1;
  pointLight.shadow.camera.far = 200;
  scene.value.add(pointLight);
}

function loadSkybox() {
  console.log(urls);
  const loader = new THREE.CubeTextureLoader();
  loader.load(urls, (texture) => {
    console.log(urls, texture);
    scene.value.background = texture;
  });
}

// --- Door Loading and Update ---
function loadDoor() {
  const mtlLoader = new MTLLoader();
  mtlLoader.load(
    doorMaterial,
    (materials) => {
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(
        doorModel,
        (object) => {
          door.value = object;
          scene.value.add(door.value); // Add door to scene here

          // Set shadow
          door.value.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          const sizes = new THREE.Vector3();

          doorBox
            .setFromObject(door.value)
            .getSize(sizes);

          updateDoorScale(sizes); // Call update after loading
          centerDoor();
        },
        (xhr) => {
          console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
        },
        (error) => {
          console.error('An error happened loading the door OBJ:', error);
        }
      );
    },
    (xhr) => {
      console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    (error) => {
      console.error('An error happened loading the door MTL:', error);
    }
  );
}

function setGeometryWidth() {
  const widthChange = (doorWidth.value - previousDoorWidth.value) * 25; // Divided by 2 because modify two sides
  door.value?.traverse(
    (child: any) =>
    {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const position = child.geometry.getAttribute("position");
        const vertex = new THREE.Vector3();

        for (let i = 0; i < position.count; i++) {
          vertex.fromBufferAttribute(position, i);

          if (vertex.x < 0) {
            vertex.x -= widthChange;
          }
          else {
            vertex.x += widthChange;
          }

          position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        position.needsUpdate = true;
      }
    });

  centerDoor();
  previousDoorWidth.value = doorWidth.value;
}

function centerDoor() {
  if (!door.value) return;

  // Update the bounding box
  doorBox.setFromObject(door.value);

  const center = new THREE.Vector3();
  doorBox.getCenter(center);

  // Set the door's X position to be the negative of the center's X.
  // This effectively centers the door at X = 0.
  door.value.position.x -= center.x;
}

function updateDoorScale(sizes) {
  if (!door.value) {
    console.warn('Door OBJ not loaded yet.');
    return;
  }
  const scaleX = (doorWidth.value / sizes.x) * 50;
  const scaleY = (doorHeight.value / sizes.y) * 50;
  const scaleZ = 0.25; // Keep Z scale constant

  door.value.traverse((child: any) => {
    child.scale.set(scaleX, scaleY, scaleZ);
  })
  // Scaling factors based on the input values.  Adjust as needed.
}

function updateDoor() {
  if (door.value) {
    scene.value.remove(door.value); // Remove old door
    door.value = null; // Clear the reference
  }
  loadDoor();
}

// --- Update & Animation ---

function updateCameraAspect() {
  if (!camera.value) return;
  camera.value.aspect = aspectRatio.value;
  camera.value.updateProjectionMatrix();
}

function updateRendererSize() {
  if (!renderer.value) return;
  renderer.value.setSize(width.value, height.value);
}

function animate() {
  if (controls.value) controls.value.update();
  knot.rotation.x += 0.01; // Rotate the knot around the X axis
  knot.rotation.z += 0.01; // Rotate the knot around the Z axis

  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value);
  }
}
// --- Lifecycle Hooks ---
onMounted(() => {
  initScene();
  initCamera();
  initRenderer();
  initControls();
  createBox();
  // createSphere();
  createKnot();
  createPlane();
  createLights();
  // loadSkybox();
  loadDoor(); // Load the door initially
  updateRendererSize();
  renderer.value?.setAnimationLoop(animate);
});

// --- Watchers ---
watch(aspectRatio, updateCameraAspect);
watch(width, updateRendererSize);
watch(height, updateRendererSize);
</script>

<style scoped>
.container {
  width: 100%;
  height: 100vh; /* Full viewport height */
  overflow: hidden; /* Prevent scrollbars */
  position: relative; /* For absolute positioning of the form */
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

form {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(255, 255, 255, 0.8); /* Slightly less transparent */
  padding: 20px; /* More padding */
  border-radius: 8px; /* Softer corners */
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
}

.form-group {
  margin-bottom: 15px; /* More spacing between form elements */
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500; /* Slightly bolder label text */
}

input[type="number"] {
  width: 80px; /* Slightly wider input */
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px; /* Slightly larger font size */
}

button {
  padding: 10px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease; /* Smooth hover transition */
}

button:hover {
  background-color: #3e8e41;
}
</style>