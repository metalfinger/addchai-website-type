import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
// HemisphereLight is part of the THREE core, no separate import needed if THREE is '*'

// Basic Three.js setup
const canvas = document.getElementById("three-canvas");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

const INITIAL_CAMERA_Y = 0;
const TARGET_VISIBLE_WIDTH = 7.0; // Ensure this width is always visible (e.g., keyboard + margin)
const MIN_CAMERA_Z = 3.5; // Minimum distance camera can be
const MAX_CAMERA_Z = 12.0; // Maximum distance camera can be (increased slightly)

function adjustCameraDistance() {
	if (!camera) return;

	const tanHalfFovY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);

	// Calculate the Z distance required to make TARGET_VISIBLE_WIDTH visible
	let newZ = TARGET_VISIBLE_WIDTH / (2 * tanHalfFovY * camera.aspect);

	// Clamp newZ to the defined min/max distances
	newZ = Math.max(MIN_CAMERA_Z, newZ);
	newZ = Math.min(MAX_CAMERA_Z, newZ);

	camera.position.x = 0; // Keep camera centered horizontally
	camera.position.y = INITIAL_CAMERA_Y; // Keep Y position consistent
	camera.position.z = newZ;
	// camera.lookAt is handled by OrbitControls or other logic
}

// Initial camera position setup
camera.position.set(0, INITIAL_CAMERA_Y, 4); // Set initial Y, Z will be adjusted by adjustCameraDistance
camera.lookAt(scene.position); // Initial lookAt

adjustCameraDistance(); // Call once initially to set the correct Z based on initial aspect ratio

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xf0f0f0); // Light gray background instead of pure white
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // Increased exposure for better contrast
renderer.outputColorSpace = THREE.SRGBColorSpace;

// HDR Environment Loading
const rgbeLoader = new RGBELoader();
rgbeLoader.load(
	"https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr",
	function (texture) {
		texture.mapping = THREE.EquirectangularReflectionMapping;
		scene.environment = texture;
		// scene.background = texture; // Uncomment if you want the HDR as the background
		console.log("HDR environment map loaded.");
	},
	undefined,
	function (error) {
		console.error("Error loading HDR environment map:", error);
	}
);

// OrbitControls
let orbitControls;
// No need to check for typeof THREE.OrbitControls if import is successful
// If the import fails, an error would have already been thrown.
orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
orbitControls.dampingFactor = 0.05;
orbitControls.screenSpacePanning = false; // usually true for 2D type controls
orbitControls.minDistance = 1;
orbitControls.maxDistance = 50;
// orbitControls.maxPolarAngle = Math.PI / 2; // Optional: prevent camera from going below ground

// NEW: Text display for typed characters
let typedTextString = "";
const typedTextDisplay = document.createElement("div");
let hiddenInput = null; // NEW: Hidden input for mobile keyboard

function setupTypedTextDisplay() {
	typedTextDisplay.id = "typed-text-display";
	typedTextDisplay.style.position = "absolute";
	typedTextDisplay.style.bottom = "20px"; // Changed from top to bottom
	typedTextDisplay.style.left = "50%";
	typedTextDisplay.style.transform = "translateX(-50%)";
	typedTextDisplay.style.padding = "10px 20px";
	typedTextDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
	typedTextDisplay.style.color = "#00ff88"; // Green text, similar to IK targets
	typedTextDisplay.style.fontFamily = '"Courier New", Courier, monospace';
	typedTextDisplay.style.fontSize = "24px";
	typedTextDisplay.style.border = "2px solid #00ff88";
	typedTextDisplay.style.borderRadius = "5px";
	typedTextDisplay.style.minHeight = "30px"; // Ensure it has some height even when empty
	typedTextDisplay.style.minWidth = "300px";
	typedTextDisplay.style.maxWidth = "80%";
	typedTextDisplay.style.textAlign = "left";
	typedTextDisplay.style.whiteSpace = "pre-wrap"; // To respect newlines and spaces
	typedTextDisplay.style.wordBreak = "break-all"; // To break long words
	// Add CSS to make text non-selectable
	typedTextDisplay.style.userSelect = "none";
	typedTextDisplay.style.webkitUserSelect = "none"; // Safari, Chrome
	typedTextDisplay.style.mozUserSelect = "none"; // Firefox
	typedTextDisplay.style.msUserSelect = "none"; // IE, Edge
	typedTextDisplay.textContent = "Start typing..."; // Initial placeholder
	document.body.appendChild(typedTextDisplay);

	// NEW: Create and setup hidden input field
	hiddenInput = document.createElement("input");
	hiddenInput.type = "text";
	hiddenInput.style.position = "absolute";
	hiddenInput.style.opacity = "0";
	hiddenInput.style.pointerEvents = "none";
	hiddenInput.style.left = "-9999px"; // Move off-screen
	hiddenInput.setAttribute("aria-hidden", "true"); // For accessibility
	hiddenInput.setAttribute("tabindex", "-1"); // Not focusable by tabbing
	document.body.appendChild(hiddenInput);

	// NEW: When typedTextDisplay is clicked/touched, focus the hidden input
	typedTextDisplay.addEventListener("click", () => {
		if (hiddenInput) {
			hiddenInput.focus();
		}
	});
	typedTextDisplay.addEventListener(
		"touchstart",
		() => {
			// Also for touch devices
			if (hiddenInput) {
				hiddenInput.focus();
			}
		},
		{ passive: true }
	); // Make event listener passive for better performance

	// NEW: Listen to input events on the hidden input field
	if (hiddenInput) {
		hiddenInput.addEventListener("input", (event) => {
			const previousText = typedTextString;
			if (typedTextString === "Start typing...") {
				typedTextString = ""; // Clear placeholder on first input
			}
			typedTextString = event.target.value;
			typedTextDisplay.textContent = typedTextString || " "; // Show a space if string is empty

			// NEW: Animate key press for mobile virtual keyboard input
			if (document.activeElement === hiddenInput) {
				let newChar = "";
				if (typedTextString.length > previousText.length) {
					newChar = typedTextString.slice(previousText.length); // Can be multiple chars from autocorrect/swipe
				} else if (
					typedTextString.length < previousText.length &&
					event.inputType === "deleteContentBackward"
				) {
					newChar = "Backspace"; // Special handling for backspace
				}

				const lastChar =
					newChar.length > 0
						? newChar[newChar.length - 1]
						: newChar === "Backspace"
						? "Backspace"
						: null;

				if (lastChar) {
					let keyIdToAnimate = null;
					if (lastChar === "Backspace") {
						keyIdToAnimate = "Backspace";
					} else {
						keyIdToAnimate = characterToKeyIdMap[lastChar];
					}

					if (keyIdToAnimate) {
						// Simulate press
						animateKeyPress(keyIdToAnimate, true);
						if (
							keyPressSound &&
							keyPressSound.buffer &&
							keyIdToAnimate !== "Backspace"
						) {
							keyPressSound.stop();
							keyPressSound.play();
						}

						// Simulate release after a short delay
						setTimeout(() => {
							animateKeyPress(keyIdToAnimate, false);
							if (
								keyReleaseSound &&
								keyReleaseSound.buffer &&
								keyIdToAnimate !== "Backspace"
							) {
								keyReleaseSound.stop();
								keyReleaseSound.play();
							}
						}, KEY_PRESS_DURATION); // Use existing constant

						// Finger animation for virtual keyboard (basic: find nearest available finger to the key)
						// This part needs to be careful not to conflict with physical keyboard logic.
						// For now, we will NOT attempt to move fingers for virtual keyboard input
						// as it's complex and might look unnatural without more sophisticated logic.
						// The primary goal here is visual feedback on the 3D keys.
					}
				}
			}
		});

		// Clear the hidden input if the user explicitly clears the text display (e.g., via backspace in physical kbd)
		// This helps keep them in sync.
		const observer = new MutationObserver(() => {
			if (
				hiddenInput.value !== typedTextDisplay.textContent &&
				typedTextDisplay.textContent !== "Start typing..."
			) {
				if (typedTextDisplay.textContent === " ") {
					// special case for empty display
					hiddenInput.value = "";
				} else {
					hiddenInput.value = typedTextDisplay.textContent;
				}
			}
		});
		observer.observe(typedTextDisplay, {
			childList: true,
			characterData: true,
			subtree: true,
		});
	}
}
setupTypedTextDisplay();

// Lighting
// const ambientLight = new THREE.AmbientLight(0x222222, 0.5); // Dimmer ambient light - REMOVED
// scene.add(ambientLight); // REMOVED

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.8); // Sky, Ground, Intensity
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased intensity
directionalLight.position.set(10, 20, 5); // Adjusted position slightly
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048; // Increased shadow map size for quality
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.bias = -0.0005; // Adjusted bias slightly for better shadow rendering
directionalLight.shadow.normalBias = 0.02; // Added normal bias to prevent shadow acne
scene.add(directionalLight);

// Add point lights for accent lighting
const pointLight1 = new THREE.PointLight(0x3377ff, 0.8, 30); // Blue, adjusted intensity
pointLight1.position.set(3, 2, 3);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x3377ff, 0.8, 30); // Blue, adjusted intensity
pointLight2.position.set(-3, 2, 3);
scene.add(pointLight2);

// Hand Model Parameters
const BONE_BASE_RADIUS = 0.12; // Starting radius for the base of metacarpal bones
const BONE_TAPER_FACTOR = 0.85; // How much each segment tapers (85% of previous radius)
const JOINT_RADIUS_FACTOR = 0.8; // Joint radius will be 80% of the end radius of the bone
const FINGERTIP_RADIUS = 0.06;
const PHALANX_LENGTH = 0.5;
const METACARPAL_LENGTH = 0.95; // Increased to form more of the hand body
const PALM_WIDTH = 1.5;
const PALM_HEIGHT = 0.15; // Slightly reduced palm thickness
const PALM_DEPTH = PALM_HEIGHT; // Palm depth will match height for a cylindrical cross-section

// NEW: Palm Border Parameters
const PALM_BORDER_JOINT_RADIUS = 0.08; // Radius for the corner joints of the palm border
const PALM_BORDER_BONE_RADIUS = 0.06; // Radius for the segments of the palm border
const PALM_BORDER_RECT_DEPTH = 0.7; // Depth of the palm border rectangle (Y-dimension in hand's local space)

// NEW: Global variables for palm-relative IK target resting offsets and state
const palmRelativeRestOffsets = {};
const isFingerReturningToRest = {};

// Define finger key bindings for both hands
const fingerProperties = {
	// Left hand (right side of keyboard)
	thumb: {
		numSegments: 2,
		phalanxLengthFactor: 0.8,
		metacarpalLengthFactor: 0.9,
		baseRotation: { z: Math.PI / 6, y: -Math.PI / 4 },
		ikRestKey: "Space",
		hand: "left",
	},
	index: {
		numSegments: 3,
		phalanxLengthFactor: 1.0,
		metacarpalLengthFactor: 1.0,
		ikRestKey: "KeyJ",
		hand: "left",
	},
	middle: {
		numSegments: 3,
		phalanxLengthFactor: 1.05,
		metacarpalLengthFactor: 1.02,
		ikRestKey: "KeyK",
		hand: "left",
	},
	ring: {
		numSegments: 3,
		phalanxLengthFactor: 1.0,
		metacarpalLengthFactor: 1.0,
		ikRestKey: "KeyL",
		hand: "left",
	},
	pinky: {
		numSegments: 3,
		phalanxLengthFactor: 0.85,
		metacarpalLengthFactor: 0.9,
		ikRestKey: "Semicolon",
		hand: "left",
	},
	// Right hand (left side of keyboard)
	thumb_right: {
		numSegments: 2,
		phalanxLengthFactor: 0.8,
		metacarpalLengthFactor: 0.9,
		baseRotation: { z: Math.PI / 6, y: Math.PI / 4 }, // Mirrored Y rotation
		ikRestKey: "Space", // Changed from KeyV to Space
		hand: "right",
	},
	index_right: {
		numSegments: 3,
		phalanxLengthFactor: 1.0,
		metacarpalLengthFactor: 1.0,
		ikRestKey: "KeyF", // Rest on F
		hand: "right",
	},
	middle_right: {
		numSegments: 3,
		phalanxLengthFactor: 1.05,
		metacarpalLengthFactor: 1.02,
		ikRestKey: "KeyD", // Rest on D
		hand: "right",
	},
	ring_right: {
		numSegments: 3,
		phalanxLengthFactor: 1.0,
		metacarpalLengthFactor: 1.0,
		ikRestKey: "KeyS", // Rest on S
		hand: "right",
	},
	pinky_right: {
		numSegments: 3,
		phalanxLengthFactor: 0.85,
		metacarpalLengthFactor: 0.9,
		ikRestKey: "KeyA", // Rest on A
		hand: "right",
	},
};

// Modern hand materials
// Colorful eye-candy materials for hands

// Define ikTargetMaterial first to avoid the initialization error
const ikTargetMaterial = new THREE.MeshStandardMaterial({
	color: 0x00ff88,
	roughness: 0.3,
	metalness: 0.8,
	emissive: 0x00ff44,
	emissiveIntensity: 0.7,
}); // Green for IK target

// Create a vibrant color palette for the fingers
const fingerColors = [
	{ color: 0xff2288, emissive: 0xff0066 }, // Pink
	{ color: 0x00ffff, emissive: 0x00ccff }, // Cyan
	{ color: 0xffaa00, emissive: 0xff8800 }, // Orange
	{ color: 0x88ff00, emissive: 0x66cc00 }, // Lime
	{ color: 0xff00ff, emissive: 0xcc00ff }, // Magenta
];

// Create divine, translucent glass materials for the hands
const thumbMaterial = new THREE.MeshPhysicalMaterial({
	color: fingerColors[0].color,
	roughness: 0.1, // More polished surface
	metalness: 0.2, // Less metallic, more like glass
	emissive: fingerColors[0].emissive,
	emissiveIntensity: 0.3, // Subtle internal glow
	clearcoat: 1.0, // Full clearcoat for shine
	clearcoatRoughness: 0.1, // Polished clearcoat
	transparent: true, // Enable transparency
	opacity: 0.7, // Translucent, not fully transparent
	transmission: 0.4, // Light passes through material
	ior: 1.5, // Index of refraction (glass-like)
	thickness: 0.5, // Material thickness for refraction
});

const indexMaterial = new THREE.MeshPhysicalMaterial({
	color: fingerColors[1].color,
	roughness: 0.1,
	metalness: 0.2,
	emissive: fingerColors[1].emissive,
	emissiveIntensity: 0.3,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	transparent: true,
	opacity: 0.7,
	transmission: 0.4,
	ior: 1.5,
	thickness: 0.5,
});

const middleMaterial = new THREE.MeshPhysicalMaterial({
	color: fingerColors[2].color,
	roughness: 0.1,
	metalness: 0.2,
	emissive: fingerColors[2].emissive,
	emissiveIntensity: 0.3,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	transparent: true,
	opacity: 0.7,
	transmission: 0.4,
	ior: 1.5,
	thickness: 0.5,
});

const ringMaterial = new THREE.MeshPhysicalMaterial({
	color: fingerColors[3].color,
	roughness: 0.1,
	metalness: 0.2,
	emissive: fingerColors[3].emissive,
	emissiveIntensity: 0.3,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	transparent: true,
	opacity: 0.7,
	transmission: 0.4,
	ior: 1.5,
	thickness: 0.5,
});

const pinkyMaterial = new THREE.MeshPhysicalMaterial({
	color: fingerColors[4].color,
	roughness: 0.1,
	metalness: 0.2,
	emissive: fingerColors[4].emissive,
	emissiveIntensity: 0.3,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	transparent: true,
	opacity: 0.7,
	transmission: 0.4,
	ior: 1.5,
	thickness: 0.5,
});

// Map finger materials for both hands
const fingerMaterialMap = {
	thumb: thumbMaterial,
	index: indexMaterial,
	middle: middleMaterial,
	ring: ringMaterial,
	pinky: pinkyMaterial,
	thumb_right: thumbMaterial.clone(),
	index_right: indexMaterial.clone(),
	middle_right: middleMaterial.clone(),
	ring_right: ringMaterial.clone(),
	pinky_right: pinkyMaterial.clone(),
};

// Default materials (fallback)
const boneMaterial = middleMaterial.clone();
const jointMaterial = middleMaterial.clone();
const fingertipMaterial = middleMaterial.clone();

// Add color cycling animation for the hands
function updateHandColors(time) {
	for (const fingerId in fingerMaterialMap) {
		const material = fingerMaterialMap[fingerId];
		if (material) {
			// Create a color-cycling effect with slightly different phases for each finger
			const fingerIndex = fingerId.includes("_right")
				? Object.keys(fingerMaterialMap).indexOf(fingerId) - 5
				: Object.keys(fingerMaterialMap).indexOf(fingerId);

			const phase = fingerIndex * 0.2;
			const hue = (time * 0.15 + phase) % 1.0;

			// Create colors from HSL
			const mainColor = new THREE.Color().setHSL(hue, 0.8, 0.6); // Reduced saturation
			const emissiveColor = new THREE.Color().setHSL(hue, 0.8, 0.3);

			material.color.copy(mainColor);
			material.emissive.copy(emissiveColor);
			// Keep emissiveIntensity at the lower value set above

			// Subtle opacity pulsing for divine effect
			if (material.transparent) {
				// Make opacity pulse between 0.6 and 0.8
				material.opacity = 0.6 + Math.sin(time * 2 + phase) * 0.1;

				// Subtle transmission variation for light passing through
				material.transmission = 0.3 + Math.sin(time * 3 + phase) * 0.1;
			}
		}
	}
}

// Move these bloom settings to a function that's called after initialization
function setupVibrantScene() {
	// Change renderer settings for more vibrant look
	renderer.setClearColor(0x111122); // Deep blue-purple background
	renderer.toneMappingExposure = 1.3; // Increased exposure

	// Enhanced lighting
	hemisphereLight.intensity = 0.6;
	directionalLight.intensity = 1.2;

	// Adjust the point lights for more color
	pointLight1.color.set(0xff00ff); // Magenta
	pointLight1.intensity = 0.5; // Reduced from 1.0
	pointLight1.position.set(3, 3, 5);

	pointLight2.color.set(0x00ffff); // Cyan
	pointLight2.intensity = 0.5; // Reduced from 1.0
	pointLight2.position.set(-3, 3, 5);

	// Add a third point light
	const pointLight3 = new THREE.PointLight(0xffaa00, 1.0, 30); // Orange
	pointLight3.position.set(0, 3, -5);
	scene.add(pointLight3);
}

// Call this function immediately, and we'll handle bloomPass settings later
setupVibrantScene();

// NEW: Centralized Post-Processing Setup (moved and refined)
let composer = null;
let bloomPass = null;

if (renderer && scene && camera) {
	composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));

	const ssaoPass = new SSAOPass(
		scene,
		camera,
		window.innerWidth,
		window.innerHeight
	);
	ssaoPass.kernelRadius = 12; // Reduced from 16 for less fogginess
	ssaoPass.minDistance = 0.005; // Default 0.005, adjust based on scene scale
	ssaoPass.maxDistance = 0.1; // Default 0.1, adjust based on scene scale
	// ssaoPass.output = SSAOPass.OUTPUT.SSAO; // For debugging AO only
	composer.addPass(ssaoPass);

	bloomPass = new UnrealBloomPass(
		new THREE.Vector2(window.innerWidth, window.innerHeight),
		0.4, // strength reduced from 0.7
		0.3, // radius reduced from 0.4
		0.9 // threshold increased from 0.85 (only brightest parts will glow)
	);
	composer.addPass(bloomPass);

	// Update bloom settings for more eye candy (moved here after initialization)
	bloomPass.strength = 0.3; // Reduced from 0.8
	bloomPass.radius = 0.3; // Reduced from 0.5
	bloomPass.threshold = 0.5; // Increased from 0.2 - fewer objects will glow

	const outputPass = new OutputPass();
	composer.addPass(outputPass);
	console.log("EffectComposer initialized successfully with SSAO and Bloom.");
} else {
	console.error(
		"Renderer, scene, or camera not ready for EffectComposer. Post-processing disabled."
	);
}

// Enhanced ground material
function updateGround() {
	// Find the existing ground
	const ground = scene.children.find(
		(child) =>
			child instanceof THREE.Mesh &&
			child.geometry instanceof THREE.PlaneGeometry &&
			child.position.y < 0
	);

	if (ground) {
		// Create a more interesting ground material
		const groundMaterial = new THREE.MeshStandardMaterial({
			color: 0x222233,
			roughness: 0.7,
			metalness: 0.3,
			emissive: 0x110022,
			emissiveIntensity: 0.2,
		});
		ground.material = groundMaterial;

		// Add a subtle grid pattern
		const textureSize = 2048;
		const gridCanvas = document.createElement("canvas");
		gridCanvas.width = textureSize;
		gridCanvas.height = textureSize;
		const ctx = gridCanvas.getContext("2d");

		// Fill with dark background
		ctx.fillStyle = "#222233";
		ctx.fillRect(0, 0, textureSize, textureSize);

		// Draw grid lines
		ctx.strokeStyle = "#4444aa";
		ctx.lineWidth = 2;
		const gridSize = 64;
		const step = textureSize / gridSize;

		ctx.beginPath();
		for (let i = 0; i <= gridSize; i++) {
			// Vertical lines
			ctx.moveTo(i * step, 0);
			ctx.lineTo(i * step, textureSize);
			// Horizontal lines
			ctx.moveTo(0, i * step);
			ctx.lineTo(textureSize, i * step);
		}
		ctx.stroke();

		// Create glowing intersection points
		ctx.fillStyle = "#6666cc";
		for (let i = 0; i <= gridSize; i++) {
			for (let j = 0; j <= gridSize; j++) {
				ctx.beginPath();
				ctx.arc(i * step, j * step, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		const gridTexture = new THREE.CanvasTexture(gridCanvas);
		gridTexture.wrapS = THREE.RepeatWrapping;
		gridTexture.wrapT = THREE.RepeatWrapping;
		gridTexture.repeat.set(4, 4);

		groundMaterial.map = gridTexture;
		ground.receiveShadow = true;
	}
}
updateGround();

// Neon key materials
const keyMaterial = new THREE.MeshStandardMaterial({
	color: 0x111111, // Darker black plastic for better contrast
	roughness: 0.7, // Adjust for plastic appearance
	metalness: 0.05, // Very low for plastic
	side: THREE.DoubleSide,
	emissive: 0x000000, // No emissive by default
	emissiveIntensity: 0.05,
});
const keyTopMaterial = new THREE.MeshStandardMaterial({
	color: 0x222222, // Slightly lighter black for top
	roughness: 0.6, // Slightly smoother top
	metalness: 0.05, // Very low for plastic
	emissive: 0x000000, // No emissive by default
	emissiveIntensity: 0.05,
});

// Keyboard Parameters
const KEY_UNIT_WIDTH = 0.4; // Base width for a 1x size key
const KEY_UNIT_DEPTH = KEY_UNIT_WIDTH * 0.9; // Depth of a standard key (front to back on keyboard plane)
const KEY_HEIGHT = 0.1; // Thickness of the keys
const KEY_SPACING_X = 0.05; // Horizontal spacing between key edges
const KEY_SPACING_Z = 0.05; // Vertical spacing between key edges (rows)
const KEYBOARD_Z_OFFSET = -0.8;
const KEYBOARD_GLOBAL_Y_SHIFT = 1.3; // Adjusted from -0.3 to move keyboard up

// Texture/Label Parameters
const KEY_TEXTURE_BASE_WIDTH_PX = 256; // Increased from 128 for sharper text
const KEY_TEXTURE_BASE_DEPTH_PX = 256; // Increased from 128 for sharper text
const KEY_FONT_SIZE = 60; // Increased from 48 for sharper text
let KEY_TEXT_COLOR = "#ffffff"; // White text
let KEY_LABEL_BACKGROUND_COLOR = "#222222"; // Dark background for keys

// Key press animation parameters (moved to global scope)
const KEY_PRESS_DISTANCE = 0.05; // How far the key moves down when pressed
const KEY_PRESS_DURATION = 150; // How long the key stays pressed (ms)
let KEY_PRESSED_COLOR = 0x00ffcc; // Bright teal/cyan for pressed keys
let KEY_PRESSED_EMISSIVE = 0x00ffcc; // Matching glow for pressed keys
let KEY_PRESSED_EMISSIVE_INTENSITY = 1.5; // Increased glow intensity when pressed
const activeKeys = {}; // Track currently pressed keys

const qwertyKeyLayout = [
	[
		{ label: "`", id: "Backquote", size: 1 },
		{ label: "1", id: "Digit1", size: 1 },
		{ label: "2", id: "Digit2", size: 1 },
		{ label: "3", id: "Digit3", size: 1 },
		{ label: "4", id: "Digit4", size: 1 },
		{ label: "5", id: "Digit5", size: 1 },
		{ label: "6", id: "Digit6", size: 1 },
		{ label: "7", id: "Digit7", size: 1 },
		{ label: "8", id: "Digit8", size: 1 },
		{ label: "9", id: "Digit9", size: 1 },
		{ label: "0", id: "Digit0", size: 1 },
		{ label: "-", id: "Minus", size: 1 },
		{ label: "=", id: "Equal", size: 1 },
		{ label: "Backspace", id: "Backspace", size: 1 },
	],
	[
		{ label: "Tab", id: "Tab", size: 1 },
		{ label: "Q", id: "KeyQ", size: 1 },
		{ label: "W", id: "KeyW", size: 1 },
		{ label: "E", id: "KeyE", size: 1 },
		{ label: "R", id: "KeyR", size: 1 },
		{ label: "T", id: "KeyT", size: 1 },
		{ label: "Y", id: "KeyY", size: 1 },
		{ label: "U", id: "KeyU", size: 1 },
		{ label: "I", id: "KeyI", size: 1 },
		{ label: "O", id: "KeyO", size: 1 },
		{ label: "P", id: "KeyP", size: 1 },
		{ label: "[", id: "BracketLeft", size: 1 },
		{ label: "]", id: "BracketRight", size: 1 },
		{ label: "\\", id: "Backslash", size: 1 },
	],
	[
		{ label: "CapsLk", id: "CapsLock", size: 1 },
		{ label: "A", id: "KeyA", size: 1 },
		{ label: "S", id: "KeyS", size: 1 },
		{ label: "D", id: "KeyD", size: 1 },
		{ label: "F", id: "KeyF", size: 1 },
		{ label: "G", id: "KeyG", size: 1 },
		{ label: "H", id: "KeyH", size: 1 },
		{ label: "J", id: "KeyJ", size: 1 },
		{ label: "K", id: "KeyK", size: 1 },
		{ label: "L", id: "KeyL", size: 1 },
		{ label: ";", id: "Semicolon", size: 1 },
		{ label: "'", id: "Quote", size: 1 },
		{ label: "Enter", id: "Enter", size: 1 },
	],
	[
		{ label: "Shift", id: "ShiftLeft", size: 1 },
		{ label: "Z", id: "KeyZ", size: 1 },
		{ label: "X", id: "KeyX", size: 1 },
		{ label: "C", id: "KeyC", size: 1 },
		{ label: "V", id: "KeyV", size: 1 },
		{ label: "B", id: "KeyB", size: 1 },
		{ label: "N", id: "KeyN", size: 1 },
		{ label: "M", id: "KeyM", size: 1 },
		{ label: ",", id: "Comma", size: 1 },
		{ label: ".", id: "Period", size: 1 },
		{ label: "/", id: "Slash", size: 1 },
		{ label: "Shift", id: "ShiftRight", size: 1 },
	],
	[{ label: "Space", id: "Space", size: 6.25 }],
];

// NEW: Map for character to keyId
const characterToKeyIdMap = {};

function populateCharacterToKeyIdMap() {
	qwertyKeyLayout.forEach((row) => {
		row.forEach((keyInfo) => {
			// Simple mapping: label to id.
			// This won't handle shift states perfectly (e.g. '!' vs '1')
			// but is a good starting point for direct character keys.
			if (keyInfo.label && keyInfo.id) {
				if (keyInfo.label.length === 1) {
					// Prioritize single characters
					characterToKeyIdMap[keyInfo.label] = keyInfo.id;
					// Add lowercase mapping if label is uppercase
					if (keyInfo.label.match(/^[A-Z]$/)) {
						characterToKeyIdMap[keyInfo.label.toLowerCase()] = keyInfo.id;
					}
				}
				// Special cases for common labels that aren't single chars
				else if (keyInfo.label === "`") characterToKeyIdMap["`"] = keyInfo.id;
				else if (keyInfo.label === "-") characterToKeyIdMap["-"] = keyInfo.id;
				else if (keyInfo.label === "=") characterToKeyIdMap["="] = keyInfo.id;
				else if (keyInfo.label === "[") characterToKeyIdMap["["] = keyInfo.id;
				else if (keyInfo.label === "]") characterToKeyIdMap["]"] = keyInfo.id;
				else if (keyInfo.label === "\\")
					characterToKeyIdMap["\\"] = keyInfo.id; // Note: label is '\'
				else if (keyInfo.label === ";") characterToKeyIdMap[";"] = keyInfo.id;
				else if (keyInfo.label === "'") characterToKeyIdMap["'"] = keyInfo.id;
				else if (keyInfo.label === ",") characterToKeyIdMap[","] = keyInfo.id;
				else if (keyInfo.label === ".") characterToKeyIdMap["."] = keyInfo.id;
				else if (keyInfo.label === "/") characterToKeyIdMap["/"] = keyInfo.id;
				else if (keyInfo.label === "Space" && keyInfo.id === "Space")
					characterToKeyIdMap[" "] = keyInfo.id; // Map space character
			}
		});
	});
	// Manual additions for numbers as their labels are '1' but events might give '1'
	for (let i = 0; i <= 9; i++) {
		characterToKeyIdMap[String(i)] = `Digit${i}`;
	}
	console.log("Character to KeyID Map:", characterToKeyIdMap);
}
populateCharacterToKeyIdMap(); // Call it once to build the map

/**
 * Creates a texture for a key label.
 * @param {string} label The text to display on the key.
 * @param {number} textureDrawWidthPx The width of the texture canvas.
 * @param {number} textureDrawHeightPx The height of the texture canvas.
 * @returns {THREE.CanvasTexture}
 */
function createKeyTexture(label, textureDrawWidthPx, textureDrawHeightPx) {
	const canvas = document.createElement("canvas");
	canvas.width = textureDrawWidthPx;
	canvas.height = textureDrawHeightPx;
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;

	const isCircularKey = label !== "Space"; // Assuming Space is the only rectangular key for now

	// Background - pure white fill for the entire key
	ctx.fillStyle = "#ffffff"; // Pure white for key background
	if (isCircularKey) {
		ctx.beginPath();
		ctx.arc(
			canvas.width / 2,
			canvas.height / 2,
			Math.min(canvas.width, canvas.height) / 2,
			0,
			Math.PI * 2
		);
		ctx.fill();
	} else {
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// Subtle border/edge for depth
	const rimLineWidthBase = Math.max(2, Math.min(8, canvas.width * 0.02));
	ctx.strokeStyle = "#e0e0e0"; // Very light grey for subtle edge
	ctx.lineWidth = rimLineWidthBase;

	if (isCircularKey) {
		ctx.beginPath();
		ctx.arc(
			canvas.width / 2,
			canvas.height / 2,
			Math.min(canvas.width, canvas.height) / 2 - rimLineWidthBase / 2,
			0,
			Math.PI * 2
		);
		ctx.stroke();
	} else {
		// Rectangular rim for spacebar
		ctx.strokeRect(
			rimLineWidthBase / 2,
			rimLineWidthBase / 2,
			canvas.width - rimLineWidthBase,
			canvas.height - rimLineWidthBase
		);
	}

	// Text - pure black
	ctx.fillStyle = "#000000"; // Pure black text
	let fontSize = KEY_FONT_SIZE;
	// Adjust max width/height for text based on circular or rectangular key shape
	const textPadding = rimLineWidthBase * 2; // Padding from the rim
	const maxLabelWidth = isCircularKey
		? (canvas.width - textPadding) * 0.707
		: canvas.width - textPadding; // Approx for circle inscribed square
	const maxLabelHeight = canvas.height - textPadding;

	ctx.font = `bold ${fontSize}px "Arial", sans-serif`; // Added bold for better visibility
	let textMetrics = ctx.measureText(label);
	let textWidth = textMetrics.width;

	while (
		(textWidth > maxLabelWidth || fontSize * 0.8 > maxLabelHeight) && // fontSize * 0.8 to approximate text height
		fontSize > 8
	) {
		fontSize -= 2;
		ctx.font = `bold ${fontSize}px "Arial", sans-serif`; // Keep bold
		textMetrics = ctx.measureText(label);
		textWidth = textMetrics.width;
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, canvas.width / 2, canvas.height / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.generateMipmaps = true;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.anisotropy = 16;

	if (isCircularKey) {
		texture.rotation = Math.PI / 2;
		texture.center.set(0.5, 0.5);
	}

	texture.needsUpdate = true;
	return texture;
}

// NEW: Helper function to create a multi-step gradient map for ToonMaterial
function createToonGradientMap(colors) {
	// Accepts an array of colors
	const canvas = document.createElement("canvas");
	canvas.width = colors.length;
	canvas.height = 1;
	const ctx = canvas.getContext("2d");

	colors.forEach((color, index) => {
		ctx.fillStyle = color;
		ctx.fillRect(index, 0, 1, 1);
	});

	const gradientMap = new THREE.CanvasTexture(canvas);
	gradientMap.minFilter = THREE.NearestFilter;
	gradientMap.magFilter = THREE.NearestFilter;
	gradientMap.needsUpdate = true;
	return gradientMap;
}

const keyRowsLayout = []; // Stub to avoid error with old createKeyboard

function createKey(keyInfo) {
	const keyActualWidth = KEY_UNIT_WIDTH * keyInfo.size;
	const keyActualDepth = KEY_UNIT_DEPTH; // This will now be along the Y-axis of the keyboard group

	let geometry;
	let materials;

	if (keyInfo.id === "Space") {
		geometry = new THREE.BoxGeometry(
			keyActualWidth,
			keyActualDepth, // Swapped with KEY_HEIGHT
			KEY_HEIGHT // Swapped with keyActualDepth - this is now thickness along Z
		);

		const textureCanvasWidth = KEY_TEXTURE_BASE_WIDTH_PX * keyInfo.size;
		const textureCanvasHeight = KEY_TEXTURE_BASE_DEPTH_PX;
		const topTexture = createKeyTexture(
			keyInfo.label,
			textureCanvasWidth,
			textureCanvasHeight
		);

		materials = [
			keyMaterial.clone(), // right face (+X)
			keyMaterial.clone(), // left face (-X)
			keyMaterial.clone(), // top face (+Y) - side of the key row
			keyMaterial.clone(), // bottom face (-Y) - other side of the key row
			new THREE.MeshStandardMaterial({
				// front face (+Z) - NEW TOP FACE WITH TEXTURE
				map: topTexture,
				roughness: 0.4, // Reduced for more glossy appearance
				metalness: 0.7,
				color: 0x777777, // Lighter color for better contrast
				emissive: 0xffffff,
				emissiveIntensity: 0.4,
				emissiveMap: topTexture,
			}),
			keyMaterial.clone(), // back face (-Z) - bottom of the key
		];
	} else {
		// For circular keys, keyActualWidth is the diameter.
		const radius = KEY_UNIT_WIDTH / 2; // All circular keys have the same radius
		geometry = new THREE.CylinderGeometry(radius, radius, KEY_HEIGHT, 32);
		// CylinderGeometry: radiusTop, radiusBottom, height, radialSegments
		// We need to rotate the cylinder so its circular faces are on XY plane, height along Z
		geometry.rotateX(Math.PI / 2);

		const textureCanvasWidth = KEY_TEXTURE_BASE_WIDTH_PX; // Use base size for circular keys
		const textureCanvasHeight = KEY_TEXTURE_BASE_DEPTH_PX;
		const topTexture = createKeyTexture(
			keyInfo.label,
			textureCanvasWidth,
			textureCanvasHeight
		);

		// Materials for CylinderGeometry: [side, top, bottom]
		// We want the texture on the 'top' face (which will be +Z after rotation)
		const topMaterial = new THREE.MeshStandardMaterial({
			map: topTexture,
			roughness: 0.4,
			metalness: 0.7,
			color: 0x777777,
			emissive: 0xffffff,
			emissiveIntensity: 0.4,
			emissiveMap: topTexture,
		});

		materials = [
			keyMaterial.clone(), // Side
			topMaterial, // Top face (which is one of the cylinder caps)
			keyMaterial.clone(), // Bottom face (other cylinder cap)
		];
	}

	const key = new THREE.Mesh(geometry, materials);
	key.name = keyInfo.id;
	key.userData = { ...keyInfo };
	key.castShadow = true;
	key.receiveShadow = true;
	return key;
}

// Create Palm
// const palmGeometry = new THREE.BoxGeometry(PALM_WIDTH, PALM_HEIGHT, PALM_DEPTH); // RE-ENABLED
// const palmRadius = PALM_HEIGHT / 2;
// const palmLength = PALM_WIDTH;
// const palmGeometry = new THREE.CylinderGeometry(
// 	palmRadius,
// 	palmRadius,
// 	palmLength,
// 	16
// );
// palmGeometry.rotateZ(Math.PI / 2); // Rotate to lay flat, length along X-axis

// const leftPalm = new THREE.Mesh(palmGeometry, boneMaterial); // RE-ENABLED
// const rightPalm = new THREE.Mesh(palmGeometry.clone(), boneMaterial.clone()); // RE-ENABLED

// Create Hand Groups
const leftHandGroup = new THREE.Group();
const rightHandGroup = new THREE.Group();

const HAND_X_OFFSET = 0.0; // Define the offset for hand positioning

// Position the left hand (previously was just "handGroup")
leftHandGroup.position.y = -KEYBOARD_GLOBAL_Y_SHIFT / 4;
leftHandGroup.position.x = KEYBOARD_GLOBAL_Y_SHIFT * 0.9 + HAND_X_OFFSET; // Shifted right
leftHandGroup.position.z = -KEYBOARD_GLOBAL_Y_SHIFT / 10.2;

// Position the right hand (mirrored from left hand)
rightHandGroup.position.y = -KEYBOARD_GLOBAL_Y_SHIFT / 4;
rightHandGroup.position.x = -KEYBOARD_GLOBAL_Y_SHIFT * 0.9 - HAND_X_OFFSET; // Shifted left
rightHandGroup.position.z = -KEYBOARD_GLOBAL_Y_SHIFT / 10.2;

// Left Hand Rotation
leftHandGroup.rotation.x = Math.PI / 6;
leftHandGroup.rotation.y = Math.PI / 60;

// Right Hand Rotation (mirrored)
rightHandGroup.rotation.x = Math.PI / 6;
rightHandGroup.rotation.y = -Math.PI / 60; // Mirrored Y rotation

// Store initial hand positions for returning to default
const initialLeftHandPosition = leftHandGroup.position.clone();
const initialRightHandPosition = rightHandGroup.position.clone();
// ADDED: Store initial hand rotations
const initialLeftHandRotation = leftHandGroup.rotation.clone();
const initialRightHandRotation = rightHandGroup.rotation.clone();

scene.add(leftHandGroup);
scene.add(rightHandGroup);
// leftHandGroup.add(leftPalm); // RE-ENABLED // REMOVED OLD PALM
// rightHandGroup.add(rightPalm); // RE-ENABLED // REMOVED OLD PALM

// Apply X-axis rotation to palms for a more natural orientation
// const PALM_X_ROTATION = Math.PI / 12; // 15 degrees tilt // REMOVED OLD PALM ROTATION
// leftPalm.rotation.x = PALM_X_ROTATION; // REMOVED OLD PALM ROTATION
// rightPalm.rotation.x = PALM_X_ROTATION; // REMOVED OLD PALM ROTATION

// NEW: Helper function to create a segment for the palm border
function createPalmSegment(startVec, endVec, radius, material, name) {
	const direction = new THREE.Vector3().subVectors(endVec, startVec);
	const length = direction.length();
	const segmentGeom = new THREE.CylinderGeometry(radius, radius, length, 12);

	const orientation = new THREE.Quaternion();
	const up = new THREE.Vector3(0, 1, 0); // Default cylinder orientation
	orientation.setFromUnitVectors(up, direction.clone().normalize());

	const segmentMesh = new THREE.Mesh(segmentGeom, material);
	segmentMesh.name = name;
	segmentMesh.applyQuaternion(orientation);
	segmentMesh.position
		.copy(startVec)
		.add(direction.clone().multiplyScalar(0.5)); // Position at midpoint

	segmentMesh.castShadow = true;
	segmentMesh.receiveShadow = true;
	return segmentMesh;
}

// NEW: Function to create the palm outline
function createPalmOutline(handGroup, material) {
	const palmRectWidth = PALM_WIDTH;
	// Fingers are attached at y = PALM_HEIGHT / 2.
	// Place the top edge of the new palm outline at y = 0 in handGroup local space.
	const palmTopY = 0;
	const palmBottomY = palmTopY - PALM_BORDER_RECT_DEPTH;

	const c1_TopLeft = new THREE.Vector3(-palmRectWidth / 2, palmTopY, 0);
	const c2_TopRight = new THREE.Vector3(palmRectWidth / 2, palmTopY, 0);
	const c3_BottomRight = new THREE.Vector3(palmRectWidth / 2, palmBottomY, 0);
	const c4_BottomLeft = new THREE.Vector3(-palmRectWidth / 2, palmBottomY, 0);

	const jointGeom = new THREE.SphereGeometry(PALM_BORDER_JOINT_RADIUS, 12, 8);
	const jointMaterial = material.clone(); // Use a clone for joints

	const joint1 = new THREE.Mesh(jointGeom, jointMaterial);
	joint1.position.copy(c1_TopLeft);
	joint1.name = "palmJoint_TL";
	joint1.castShadow = true;
	joint1.receiveShadow = true;
	handGroup.add(joint1);

	const joint2 = new THREE.Mesh(jointGeom, jointMaterial);
	joint2.position.copy(c2_TopRight);
	joint2.name = "palmJoint_TR";
	joint2.castShadow = true;
	joint2.receiveShadow = true;
	handGroup.add(joint2);

	const joint3 = new THREE.Mesh(jointGeom, jointMaterial);
	joint3.position.copy(c3_BottomRight);
	joint3.name = "palmJoint_BR";
	joint3.castShadow = true;
	joint3.receiveShadow = true;
	handGroup.add(joint3);

	const joint4 = new THREE.Mesh(jointGeom, jointMaterial);
	joint4.position.copy(c4_BottomLeft);
	joint4.name = "palmJoint_BL";
	joint4.castShadow = true;
	joint4.receiveShadow = true;
	handGroup.add(joint4);

	const segmentMaterial = material.clone(); // Use a clone for segments

	const segmentTop = createPalmSegment(
		c1_TopLeft,
		c2_TopRight,
		PALM_BORDER_BONE_RADIUS,
		segmentMaterial,
		"palmSegment_Top"
	);
	handGroup.add(segmentTop);

	const segmentRight = createPalmSegment(
		c2_TopRight,
		c3_BottomRight,
		PALM_BORDER_BONE_RADIUS,
		segmentMaterial,
		"palmSegment_Right"
	);
	handGroup.add(segmentRight);

	const segmentBottom = createPalmSegment(
		c3_BottomRight,
		c4_BottomLeft,
		PALM_BORDER_BONE_RADIUS,
		segmentMaterial,
		"palmSegment_Bottom"
	);
	handGroup.add(segmentBottom);

	const segmentLeft = createPalmSegment(
		c4_BottomLeft,
		c1_TopLeft,
		PALM_BORDER_BONE_RADIUS,
		segmentMaterial,
		"palmSegment_Left"
	);
	handGroup.add(segmentLeft);
}

// Create and position fingers for left hand
const leftFingers = [];
const rightFingers = [];
const fingerIds = ["thumb", "index", "middle", "ring", "pinky"];
const numFingers = fingerIds.length;
const fingerSpacing = PALM_WIDTH / (numFingers - 1);

// Create left hand fingers
for (let i = 0; i < numFingers; i++) {
	const fingerId = fingerIds[i];
	const isThumb = fingerId === "thumb";
	const finger = createFinger(fingerId);

	// Position finger on the palm
	// X position: spread across the palm width
	// Y position: at the "top" edge of the palm (relative to palm's local space)
	// Z position: slightly forward for thumb, centered for others
	finger.position.x = -PALM_WIDTH / 2 + i * fingerSpacing * (isThumb ? 0.3 : 1); // Adjust thumb spacing
	finger.position.y = PALM_HEIGHT / 2; // Base of finger at top surface of palm
	finger.position.z = isThumb ? PALM_DEPTH * 0.3 : 0; // Thumb more forward

	// Initial rotation for fingers (e.g., thumb rotation)
	if (isThumb) {
		finger.rotation.z = fingerProperties[fingerId].baseRotation.z;
		finger.rotation.y = fingerProperties[fingerId].baseRotation.y;
	}

	leftHandGroup.add(finger);
	leftFingers.push(finger);
}

// Create right hand fingers
for (let i = 0; i < numFingers; i++) {
	const fingerId = fingerIds[i];
	const rightFingerId = `${fingerId}_right`;
	const isThumb = fingerId === "thumb";
	const finger = createFinger(rightFingerId);

	// Position finger on the palm (mirrored from left hand)
	// For right hand, mirror the X-position
	finger.position.x = PALM_WIDTH / 2 - i * fingerSpacing * (isThumb ? 0.3 : 1); // Mirrored X position
	finger.position.y = PALM_HEIGHT / 2; // Base of finger at top surface of palm
	finger.position.z = isThumb ? PALM_DEPTH * 0.3 : 0; // Thumb more forward

	// Initial rotation for fingers (mirrored from left hand)
	if (isThumb) {
		finger.rotation.z = fingerProperties[rightFingerId].baseRotation.z;
		finger.rotation.y = fingerProperties[rightFingerId].baseRotation.y;
	}

	rightHandGroup.add(finger);
	rightFingers.push(finger);
}

// NEW: Create palm outlines after hand groups are set up and fingers potentially added
// The boneMaterial will be styled by setupProfessionalLook before this is effectively used in rendering loop.
createPalmOutline(leftHandGroup, boneMaterial);
createPalmOutline(rightHandGroup, boneMaterial);

// Global references for IK
const ikTargets = {};
const ikChains = {};
const fingertipVisuals = {};
const fingerJoints = {}; // Stores {mcp, pip, dip} for each controlled finger
const ikTargetRestPositions = {}; // Stores THREE.Vector3 for each finger's IK target resting WCS position
const ikTargetDestinations = {}; // Stores target positions for smooth transitions
const ikControlledFingers = [
	"thumb",
	"index",
	"middle",
	"ring",
	"pinky", // Left hand
	"thumb_right",
	"index_right",
	"middle_right",
	"ring_right",
	"pinky_right", // Right hand
]; // Fingers to set up IK for

// IK Parameters
const CCD_ITERATIONS = 10;
const CCD_THRESHOLD = 0.01; // How close the fingertip should get to the target
const CCD_SMOOTHING_FACTOR = 0.1; // Adjust this value (0.1 to 1.0) to control smoothness. 1.0 is no smoothing.
const TARGET_MOVEMENT_SPEED = 0.35; // Speed factor for IK target movement (0.0 to 1.0)

// NEW: Idle Animation Parameters
const IDLE_IK_TARGET_DESTINATION_MAGNITUDE = 0.008; // Renamed from IDLE_FINGER_MOVEMENT_MAGNITUDE, increased from 0.005. How much IK target destinations for idle fingers twitch
const IDLE_IK_TARGET_DESTINATION_SPEED = 0.02; // Renamed from IDLE_FINGER_MOVEMENT_SPEED. How fast IK target destinations for idle fingers twitch
const IDLE_PALM_MOVEMENT_MAGNITUDE_POS = 0.002; // How much palm moves
const IDLE_PALM_MOVEMENT_MAGNITUDE_ROT = 0.001; // How much palm rotates
const IDLE_PALM_MOVEMENT_SPEED = 0.01; // How fast palm moves/rotates

// NEW: Crowding avoidance parameters
const CROWDING_PENALTY_DISTANCE_SQ = 0.09; // (0.3 units)^2, e.g., if IK targets are closer than 0.3 units
const CROWDING_PENALTY_FACTOR = 2.0; // Effectively doubles the distance if crowded

// Hand Adjustment Parameters
const HAND_ADJUSTMENT_THRESHOLD = 0.15; // If fingertip is further than this from target, hand may move
const HAND_ADJUSTMENT_FACTOR = 0.5; // How much the hand moves towards the target (fraction of remaining distance for the hand itself)
const MAX_HAND_ADJUSTMENT_PER_FRAME = 0.035; // Max distance hand will move in one frame
const HAND_RETURN_TO_DEFAULT_FACTOR = 0.03; // How strongly hand tries to return to default position
const FINGER_REST_CURL_OFFSET = 0.15; // NEW: How much fingers curl inwards/downwards when resting

// Mouse interaction variables
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersectionPlane = new THREE.Plane();
let isDraggingTarget = false;
let draggedIkTargetFingerId = null; // Stores the ID of the finger whose IK target is being dragged

function setupIKTargetAndReferences() {
	const targetGeometry = new THREE.SphereGeometry(0.15, 16, 16); // Common geometry for IK targets
	const keyboardGroup = scene.getObjectByName("keyboard");

	if (keyboardGroup) {
		keyboardGroup.updateMatrixWorld(true); // Ensure world matrices are up to date
	} else {
		console.error(
			"Keyboard group not found during setupIKTargetAndReferences! IK Target positions will be incorrect."
		);
		// Early exit or handle error, as subsequent logic depends on keyboardGroup
	}

	const SPACEBAR_THUMB_X_OFFSET = KEY_UNIT_WIDTH * 1.2; // Offset for each thumb from the center of spacebar

	ikControlledFingers.forEach((fingerId) => {
		// Determine which hand this finger belongs to
		const isRightHand = fingerId.includes("_right");
		const handId = isRightHand ? "right" : "left";
		// const handFingers = isRightHand ? rightFingers : leftFingers; // Not directly used for IK target setup here

		ikTargets[fingerId] = new THREE.Mesh(
			targetGeometry.clone(),
			ikTargetMaterial.clone()
		);

		let targetKeyName = fingerProperties[fingerId].ikRestKey;
		const initialWorldRestingPosition = new THREE.Vector3(); // Renamed from restingPosition for clarity
		if (keyboardGroup && targetKeyName) {
			const keyMesh = keyboardGroup.getObjectByName(targetKeyName);
			if (keyMesh) {
				const localTopCenter = new THREE.Vector3(0, 0, KEY_HEIGHT / 2);
				localTopCenter.applyMatrix4(keyMesh.matrixWorld);
				const keyTopWorld = localTopCenter.clone();
				initialWorldRestingPosition.y = keyTopWorld.y + 0.1;
				initialWorldRestingPosition.x = keyTopWorld.x; // Default to key center, will be overridden for spacebar thumbs if applicable
				initialWorldRestingPosition.z = keyTopWorld.z + 0.15;

				// Special adjustment for thumb on Space bar
				if (targetKeyName === "Space") {
					if (fingerId === "thumb") {
						// Left hand model's thumb (user's right hand)
						initialWorldRestingPosition.x = SPACEBAR_THUMB_X_OFFSET;
					} else if (fingerId === "thumb_right") {
						// Right hand model's thumb (user's left hand)
						initialWorldRestingPosition.x = -SPACEBAR_THUMB_X_OFFSET;
					}
				}
			} else {
				console.warn(
					`Resting key ${targetKeyName} not found for ${fingerId} finger. Using placeholder.`
				);
				// Default placeholder positions for each hand
				if (isRightHand) {
					initialWorldRestingPosition.set(
						fingerId === "thumb_right"
							? 0
							: fingerId === "index_right"
							? -0.3
							: fingerId === "middle_right"
							? -0.7
							: fingerId === "ring_right"
							? -1.1
							: -1.4,
						0.8,
						0.5
					);
				} else {
					initialWorldRestingPosition.set(
						fingerId === "thumb"
							? 0
							: fingerId === "index"
							? 0.3
							: fingerId === "middle"
							? 0.7
							: fingerId === "ring"
							? 1.1
							: 1.4,
						0.8,
						0.5
					);
				}
			}
		} else {
			console.warn(
				`Keyboard group or targetKeyName not available for ${fingerId}. Using placeholder.`
			);
			// Similar default positioning as above
			if (isRightHand) {
				initialWorldRestingPosition.set(
					fingerId === "thumb_right"
						? 0
						: fingerId === "index_right"
						? -0.3
						: fingerId === "middle_right"
						? -0.7
						: fingerId === "ring_right"
						? -1.1
						: -1.4,
					0.8,
					0.5
				);
			} else {
				initialWorldRestingPosition.set(
					fingerId === "thumb"
						? 0
						: fingerId === "index"
						? 0.3
						: fingerId === "middle"
						? 0.7
						: fingerId === "ring"
						? 1.1
						: 1.4,
					0.8,
					0.5
				);
			}
		}

		// NEW: Calculate and store palm-relative offset
		const handGroup = isRightHand ? rightHandGroup : leftHandGroup;
		handGroup.updateMatrixWorld(true); // Ensure matrixWorld is up-to-date for initial calculation
		const inverseHandMatrix = new THREE.Matrix4()
			.copy(handGroup.matrixWorld)
			.invert();
		palmRelativeRestOffsets[fingerId] = initialWorldRestingPosition
			.clone()
			.applyMatrix4(inverseHandMatrix);

		ikTargets[fingerId].position.copy(initialWorldRestingPosition);
		ikTargetRestPositions[fingerId] = initialWorldRestingPosition.clone(); // Stores current world-space rest position
		ikTargetDestinations[fingerId] = initialWorldRestingPosition.clone(); // Initialize destinations
		isFingerReturningToRest[fingerId] = true; // Initialize: finger is at rest

		scene.add(ikTargets[fingerId]);
		ikTargets[fingerId].name = `ikTarget_${fingerId}`;

		// Hide the IK targets (green controllers)
		ikTargets[fingerId].visible = false;

		// Initialize structures for this finger
		fingerJoints[fingerId] = {
			mcp: null,
			pip: null,
			dip: null,
			tipHoldingJoint: null,
		};
		ikChains[fingerId] = [];

		// Look for this finger in the correct hand's fingers array
		const baseFingerId = isRightHand
			? fingerId.replace("_right", "")
			: fingerId;

		// Look in the appropriate hand's fingers
		let fingerGroup = null;
		if (isRightHand) {
			fingerGroup = rightFingers.find(
				(f) => f.name === `finger_base_${fingerId}`
			);
		} else {
			fingerGroup = leftFingers.find(
				(f) => f.name === `finger_base_${fingerId}`
			);
		}

		const props = fingerProperties[fingerId];

		if (fingerGroup && props) {
			// MCP Joint (Base of the finger)
			fingerJoints[fingerId].mcp = fingerGroup;
			if (fingerJoints[fingerId].mcp) {
				const isPinky = baseFingerId === "pinky";
				const isThumb = baseFingerId === "thumb";
				fingerJoints[fingerId].mcp.userData.limits = {
					x: {
						min: isThumb ? -Math.PI / 3 : -Math.PI / 2,
						max: isThumb ? Math.PI / 3 : Math.PI / 6,
					},
					y: {
						// Adduction/Abduction
						min: isThumb
							? -Math.PI / 3
							: isPinky
							? -Math.PI / 3.6
							: -Math.PI / 18,
						max: isThumb ? Math.PI / 3 : isPinky ? Math.PI / 3.6 : Math.PI / 18,
					},
					z: {
						min: isThumb ? -Math.PI / 6 : -Math.PI / 12,
						max: isThumb ? Math.PI / 8 : Math.PI / 12,
					},
				};
			}

			// PIP Joint (phalanx_joint_0)
			fingerJoints[fingerId].pip = fingerGroup.getObjectByName(
				`phalanx_joint_0_${fingerId}`
			);
			if (fingerJoints[fingerId].pip) {
				fingerJoints[fingerId].pip.userData.limits = {
					x: {
						min:
							baseFingerId === "thumb"
								? -Math.PI * (3 / 4)
								: -Math.PI * (2 / 3),
						max: 0,
					}, // Thumb PIP flexes a lot
					y: { min: 0, max: 0 }, // Usually no side-to-side for PIP
					z: { min: 0, max: 0 }, // Or very little rotation
				};
			}

			// DIP Joint (phalanx_joint_1)
			fingerJoints[fingerId].dip = fingerJoints[fingerId].pip?.getObjectByName(
				`phalanx_joint_1_${fingerId}`
			);
			if (fingerJoints[fingerId].dip) {
				fingerJoints[fingerId].dip.userData.limits = {
					x: { min: -Math.PI / 2, max: Math.PI / 18 },
					y: { min: 0, max: 0 },
					z: { min: 0, max: 0 },
				};
			}

			// Tip-Holding Joint and Fingertip Visual
			// props.numSegments is the number of phalanges.
			// Thumb (2 phalanges): phalanx_joint_0 (PIP), phalanx_joint_1 (DIP, holds tip)
			// Others (3 phalanges): phalanx_joint_0 (PIP), phalanx_joint_1 (DIP), phalanx_joint_2 (TipHoldingJoint, holds tip)

			if (props.numSegments === 2) {
				// e.g., Thumb
				fingertipVisuals[fingerId] = fingerJoints[
					fingerId
				].dip?.getObjectByName(`fingertip_visual_${fingerId}`);
			} else if (props.numSegments === 3) {
				// e.g., Index, Middle, Ring, Pinky
				fingerJoints[fingerId].tipHoldingJoint = fingerJoints[
					fingerId
				].dip?.getObjectByName(`phalanx_joint_2_${fingerId}`);
				if (fingerJoints[fingerId].tipHoldingJoint) {
					// Limits for the very last joint if it articulates significantly
					// Often, this joint has similar flexion to DIP or is less mobile.
					fingerJoints[fingerId].tipHoldingJoint.userData.limits = {
						x: { min: -Math.PI / 3, max: Math.PI / 36 },
						y: { min: 0, max: 0 },
						z: { min: 0, max: 0 },
					};
				}
				fingertipVisuals[fingerId] = fingerJoints[
					fingerId
				].tipHoldingJoint?.getObjectByName(`fingertip_visual_${fingerId}`);
			}

			// Populate the IK chain (from fingertip's parent joint, back to MCP)
			// The order matters for the CCD algorithm: outermost rotating joint first.
			if (props.numSegments === 3 && fingerJoints[fingerId].tipHoldingJoint) {
				ikChains[fingerId].push(fingerJoints[fingerId].tipHoldingJoint);
			}
			if (fingerJoints[fingerId].dip) {
				// DIP is phalanx_joint_1
				ikChains[fingerId].push(fingerJoints[fingerId].dip);
			}
			if (fingerJoints[fingerId].pip) {
				// PIP is phalanx_joint_0
				ikChains[fingerId].push(fingerJoints[fingerId].pip);
			}
			if (fingerJoints[fingerId].mcp) {
				ikChains[fingerId].push(fingerJoints[fingerId].mcp);
			}

			// Verify chain and fingertip
			const expectedChainLength = props.numSegments + 1; // MCP + number of phalanx joints

			if (
				!fingertipVisuals[fingerId] ||
				ikChains[fingerId].length < expectedChainLength
			) {
				console.error(
					`Failed to fully initialize IK chain or fingertip for ${fingerId} finger.`,
					{
						FingerProps: props,
						MCP: fingerJoints[fingerId].mcp,
						PIP: fingerJoints[fingerId].pip,
						DIP: fingerJoints[fingerId].dip,
						TipHoldingJoint: fingerJoints[fingerId].tipHoldingJoint,
						TipVisual: fingertipVisuals[fingerId],
						Chain: ikChains[fingerId],
						ExpectedChainLength: expectedChainLength,
					}
				);
			}
		} else {
			console.error(
				`Could not find finger group or properties for ${fingerId} finger for IK setup.`
			);
		}
	});

	// Set up the initial intersection plane
	if (ikTargets["index"]) {
		// Fallback, use index finger target if available
		intersectionPlane.setFromNormalAndCoplanarPoint(
			new THREE.Vector3(0, 0, 1),
			ikTargets["index"].position
		);
	} else if (
		ikControlledFingers.length > 0 &&
		ikTargets[ikControlledFingers[0]]
	) {
		// Or first controllable finger
		intersectionPlane.setFromNormalAndCoplanarPoint(
			new THREE.Vector3(0, 0, 1),
			ikTargets[ikControlledFingers[0]].position
		);
	}
}

// Create Keyboard
const keyboard = createKeyboard();

setupIKTargetAndReferences();

// Mouse Event Listeners
function onMouseDown(event) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera(mouse, camera);

	for (const fingerId of ikControlledFingers) {
		if (ikTargets[fingerId]) {
			const intersects = raycaster.intersectObject(ikTargets[fingerId]);
			if (intersects.length > 0) {
				isDraggingTarget = true;
				draggedIkTargetFingerId = fingerId;
				if (orbitControls) orbitControls.enabled = false;

				const targetWorldPos = new THREE.Vector3();
				ikTargets[fingerId].getWorldPosition(targetWorldPos);
				const cameraDirection = new THREE.Vector3();
				camera.getWorldDirection(cameraDirection);
				intersectionPlane.setFromNormalAndCoplanarPoint(
					cameraDirection.negate(),
					targetWorldPos
				);
				renderer.domElement.style.cursor = "grabbing";

				// Make the target visible while dragging
				ikTargets[fingerId].visible = true;

				break; // Found a target to drag, no need to check others
			}
		}
	}
}

function onMouseUp(event) {
	if (isDraggingTarget) {
		// Hide the target again when finished dragging
		if (draggedIkTargetFingerId && ikTargets[draggedIkTargetFingerId]) {
			ikTargets[draggedIkTargetFingerId].visible = false;
		}

		isDraggingTarget = false;
		draggedIkTargetFingerId = null; // Clear the dragged finger ID
		if (orbitControls) orbitControls.enabled = true;
		// Cursor style will be updated by onMouseMove if still hovering, or reset to default.
		// Check current hover state to set cursor correctly
		raycaster.setFromCamera(mouse, camera); // mouse is already updated by mousemove
		let hoveringOverAnyTarget = false;
		for (const fingerId of ikControlledFingers) {
			if (ikTargets[fingerId]) {
				const intersects = raycaster.intersectObject(ikTargets[fingerId]);

				if (intersects.length > 0) {
					hoveringOverAnyTarget = true;
					break;
				}
			}
		}
		renderer.domElement.style.cursor = hoveringOverAnyTarget
			? "grab"
			: "default";
	}
}

function onMouseMove(event) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	if (
		isDraggingTarget &&
		draggedIkTargetFingerId &&
		ikTargets[draggedIkTargetFingerId]
	) {
		raycaster.setFromCamera(mouse, camera);
		const intersectionPoint = new THREE.Vector3();
		if (raycaster.ray.intersectPlane(intersectionPlane, intersectionPoint)) {
			ikTargets[draggedIkTargetFingerId].position.copy(intersectionPoint);
		}
	} else if (orbitControls && orbitControls.enabled) {
		// Only update cursor if not dragging
		raycaster.setFromCamera(mouse, camera);
		let hoveringOverTarget = false;
		for (const fingerId of ikControlledFingers) {
			if (ikTargets[fingerId]) {
				const intersects = raycaster.intersectObject(ikTargets[fingerId]);
				if (intersects.length > 0) {
					hoveringOverTarget = true;
					// Make target visible when hovering
					ikTargets[fingerId].visible = true;
					break;
				} else {
					// Hide target when not hovering
					ikTargets[fingerId].visible = false;
				}
			}
		}
		renderer.domElement.style.cursor = hoveringOverTarget ? "grab" : "default";
	}
}

window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("mousemove", onMouseMove);

// --- Key Press Animation Logic ---

// NEW: State for dynamic finger assignments
let fingerAssignments = {}; // Stores fingerId: keyId (e.g., "index": "KeyK") or fingerId: null
let keyAssignments = {}; // Stores keyId: fingerId (e.g., "KeyK": "index") or keyId: null

const keyPressDuration = 150; // Milliseconds for the finger to stay on the key
let activeKeyPressTimeouts = {}; // To manage multiple key press animations
// let lastSpaceThumbFingerId = "thumb_right"; // REMOVED

function animateFingerToKey(fingerIdToAnimate, targetKeyIdToPress) {
	const ikTargetKey = fingerIdToAnimate; // fingerIdToAnimate is already specific (e.g., "index" or "index_right")

	if (!ikTargets[ikTargetKey] || !ikTargetRestPositions[ikTargetKey]) {
		console.warn(
			`IK target or resting position not defined for finger: ${ikTargetKey}`
		);
		return;
	}

	const keyboardGroup = scene.getObjectByName("keyboard");
	if (!keyboardGroup) {
		console.warn("Keyboard group not found in scene.");
		return;
	}

	const keyMesh = keyboardGroup.getObjectByName(targetKeyIdToPress);
	if (!keyMesh) {
		console.warn(`Key mesh ${targetKeyIdToPress} not found in keyboard group.`);
		return;
	}

	// Calculate the target position on top of the key
	const targetPositionOnKey = new THREE.Vector3();
	const localKeyTop = new THREE.Vector3(0, 0, KEY_HEIGHT / 2); // Key's local top-center
	localKeyTop.applyMatrix4(keyMesh.matrixWorld); // Transform to world space
	targetPositionOnKey.copy(localKeyTop);

	const FINGER_PRESS_DEPTH = 0.05;
	targetPositionOnKey.z -= FINGER_PRESS_DEPTH;

	ikTargetDestinations[ikTargetKey] = targetPositionOnKey.clone();
	isFingerReturningToRest[ikTargetKey] = false; // Finger is now actively targeting a key
}

// Key press animation parameters
// const KEY_PRESS_DISTANCE = 0.05; // How far the key moves down when pressed
// const KEY_PRESS_DURATION = 150; // How long the key stays pressed (ms)
// const KEY_PRESSED_COLOR = 0x00ffff; // Cyan color for pressed keys
// const KEY_PRESSED_EMISSIVE = 0x00ffff; // Cyan glow for pressed keys
// const KEY_PRESSED_EMISSIVE_INTENSITY = 0.8; // Increased glow intensity when pressed
// Removing Caps Lock specific constants
// const CAPS_LOCK_ACTIVE_COLOR = 0xff5500; // Orange color for active Caps Lock
// const CAPS_LOCK_ACTIVE_EMISSIVE = 0xff5500; // Orange glow for active Caps Lock
// const activeKeys = {}; // Track currently pressed keys - REMOVING
// Removing Caps Lock state
// let isCapsLockActive = false; // Track Caps Lock state

// NEW: Caps Lock state and visuals // This comment can remain or be removed, the declarations below are targeted
// [LINES 1079-1083 will be deleted here]

window.addEventListener("keydown", (event) => {
	if (event.repeat) return; // Ignore repeated events from holding key down

	const pressedKeyId = event.code;

	// If hiddenInput is active, mobile keyboard is up, let its input handler manage text & animations
	if (document.activeElement === hiddenInput) {
		// Allow default behavior for certain keys like backspace if needed, but generally let the input event handle it.
		// For example, to prevent browser back on backspace:
		if (event.key === "Backspace") event.preventDefault();
		if (event.key === "Enter") event.preventDefault();
		// DO NOT return here! Let the rest of the handler run for finger animation.
	}

	// --- Update Typed Text Display --- START
	// This section will now primarily be driven by the hiddenInput's "input" event for mobile.
	// For physical keyboards, this existing logic can remain as a fallback or for desktop.
	// We need to avoid double-processing if hiddenInput is active.
	if (document.activeElement !== hiddenInput) {
		if (typedTextString === "Start typing...") {
			typedTextString = ""; // Clear placeholder on first actual key press relevant to typing
		}

		if (event.key.length === 1) {
			// Most printable characters (letters, numbers, symbols)
			typedTextString += event.key;
		} else if (event.key === "Backspace") {
			typedTextString = typedTextString.slice(0, -1);
			event.preventDefault(); // Prevent browser back navigation
		} else if (event.key === "Enter") {
			typedTextString += "\n"; // Add newline character
			event.preventDefault(); // Prevent form submission if any
		} else if (event.key === " ") {
			// Spacebar (event.code is "Space")
			typedTextString += " ";
			event.preventDefault();
		}
		// More specific key handling can be added here (e.g., Tab)

		typedTextDisplay.textContent = typedTextString || " "; // Show a space if string is empty to maintain height
		// Also update hiddenInput if it's not the source, to keep them synced.
		if (hiddenInput && hiddenInput.value !== typedTextString) {
			hiddenInput.value = typedTextString;
		}
	}
	// --- Update Typed Text Display --- END

	// Add debug message for key press
	console.log(`Key pressed: ${pressedKeyId}, event.key: ${event.key}`);

	// Play key press sound only if not handled by hiddenInput's input event
	if (
		document.activeElement !== hiddenInput &&
		keyPressSound &&
		keyPressSound.buffer
	) {
		// Determine new random parameters
		const newPlaybackRate = 0.9 + Math.random() * 0.2;
		const newDetuneValue = (Math.random() - 0.5) * 100; // Range -50 to 50
		const newVolumeValue = 0.7 + Math.random() * 0.3;

		// Update the audio object's properties for the next play()
		keyPressSound.playbackRate = newPlaybackRate;
		keyPressSound.detune = newDetuneValue;
		// setVolume is generally safe as it affects the GainNode directly
		keyPressSound.setVolume(newVolumeValue);

		if (keyPressSound.isPlaying) {
			keyPressSound.stop(); // Stop current playback if any, to allow retriggering with new variations
		}
		keyPressSound.play(); // play() will use the .playbackRate and .detune properties set above
	}

	const keyboardGroup = scene.getObjectByName("keyboard");
	if (!keyboardGroup) {
		console.warn("Keyboard group not found for key press.");
		return;
	}
	const keyMesh = keyboardGroup.getObjectByName(pressedKeyId);
	if (!keyMesh) {
		// console.warn(`Key ${pressedKeyId} not found on keyboard.`);
		return; // Not a key we manage or it's missing
	}

	// If hiddenInput is active, don't do finger assignments or press animations here
	if (document.activeElement === hiddenInput) {
		return;
	}

	// If this key is already assigned to a finger, do nothing (or handle repeat if desired)
	// UPDATED: Remove special case for CapsLock - treat it like any other key for finger assignment
	if (keyAssignments[pressedKeyId]) {
		// console.log(`Key ${pressedKeyId} is already being pressed by ${keyAssignments[pressedKeyId]}`);
		return;
	}

	// Standard key press animation and finger assignment
	// UPDATED: Remove special case for CapsLock - just find a finger and press the key
	const keyTargetPosition = new THREE.Vector3();
	const localKeyTopCenter = new THREE.Vector3(0, 0, KEY_HEIGHT / 2);
	localKeyTopCenter.applyMatrix4(keyMesh.matrixWorld);
	keyTargetPosition.copy(localTopCenter);

	let bestFingerId = null;
	let minDistanceSq = Infinity;

	// Find the nearest available finger
	ikControlledFingers.forEach((fingerId) => {
		if (!fingerAssignments[fingerId]) {
			const fingertipVisual = fingertipVisuals[fingerId];
			const currentIkTarget = ikTargets[fingerId];

			if (fingertipVisual && currentIkTarget) {
				const fingertipWorldPosition = new THREE.Vector3();
				fingertipVisual.getWorldPosition(fingertipWorldPosition);
				let distanceSq =
					fingertipWorldPosition.distanceToSquared(keyTargetPosition);

				let penaltyFactor = 1.0;
				const currentTargetPos = new THREE.Vector3();
				currentIkTarget.getWorldPosition(currentTargetPos);

				for (const otherFingerId of ikControlledFingers) {
					if (fingerId !== otherFingerId && fingerAssignments[otherFingerId]) {
						const otherAssignedTarget = ikTargets[otherFingerId];
						if (otherAssignedTarget) {
							const otherTargetPos = new THREE.Vector3();
							otherAssignedTarget.getWorldPosition(otherTargetPos);
							if (
								currentTargetPos.distanceToSquared(otherTargetPos) <
								CROWDING_PENALTY_DISTANCE_SQ
							) {
								penaltyFactor = CROWDING_PENALTY_FACTOR;
								break;
							}
						}
					}
				}
				distanceSq *= penaltyFactor;

				if (distanceSq < minDistanceSq) {
					minDistanceSq = distanceSq;
					bestFingerId = fingerId;
				}
			}
		}
	});

	if (bestFingerId) {
		fingerAssignments[bestFingerId] = pressedKeyId;
		keyAssignments[pressedKeyId] = bestFingerId;

		animateFingerToKey(bestFingerId, pressedKeyId);
		animateKeyPress(pressedKeyId, true); // Visual press animation for the key
	} else {
		console.warn(`No available finger found to press key ${pressedKeyId}`);
		// Still visually press the key even if no finger is available
		animateKeyPress(pressedKeyId, true);
	}

	// CapsLock specific logic: toggle state and update visuals
	// This is SEPARATE from finger animation - it just affects the key's visual state
	// if (pressedKeyId === CAPS_LOCK_KEY_ID) { // REMOVED
	// 	isCapsLockActive = !isCapsLockActive; // REMOVED
	// 	console.log( // REMOVED
	// 		`CapsLock state toggled. isCapsLockActive: ${isCapsLockActive}` // REMOVED
	// 	); // REMOVED
	// } // REMOVED
});

window.addEventListener("keyup", (event) => {
	const releasedKeyId = event.code;

	// If hiddenInput is active, mobile keyboard is up, let its input handler manage animations (or ignore for keyup)
	if (document.activeElement === hiddenInput) {
		return;
	}

	// Add debug message for key release
	console.log(`Key released: ${releasedKeyId}`);

	// Play key release sound only if not handled by hiddenInput's input event
	if (
		document.activeElement !== hiddenInput &&
		keyReleaseSound &&
		keyReleaseSound.buffer
	) {
		// Determine new random parameters
		const newPlaybackRate = 0.9 + Math.random() * 0.2;
		const newDetuneValue = (Math.random() - 0.5) * 100; // Range -50 to 50
		const newVolumeValue = 0.7 + Math.random() * 0.3;

		// Update the audio object's properties for the next play()
		keyReleaseSound.playbackRate = newPlaybackRate;
		keyReleaseSound.detune = newDetuneValue;
		keyReleaseSound.setVolume(newVolumeValue); // setVolume is generally safe

		if (keyReleaseSound.isPlaying) {
			keyReleaseSound.stop(); // Stop current playback if any, to allow retriggering with new variations
		}
		keyReleaseSound.play(); // play() will use the .playbackRate and .detune properties set above
	}

	// Always visually release the key
	animateKeyPress(releasedKeyId, false);

	const fingerToReset = keyAssignments[releasedKeyId];

	if (fingerToReset) {
		// If hiddenInput is active, don't mess with finger assignments here.
		// This check is a bit redundant due to the early return, but safe.
		if (document.activeElement === hiddenInput) {
			return;
		}

		console.log(
			`Resetting finger: ${fingerToReset} from key: ${releasedKeyId}`
		);
		if (ikTargets[fingerToReset] && ikTargetRestPositions[fingerToReset]) {
			isFingerReturningToRest[fingerToReset] = true;
			// The animate loop will handle ikTargetDestinations for resting

			// Clear assignments - this happens even for CapsLock
			fingerAssignments[fingerToReset] = null;
			keyAssignments[releasedKeyId] = null;
		} else {
			console.warn(
				`Cannot reset finger ${fingerToReset}: IK target or rest position undefined.`
			);
			// Still clear assignments if finger data is somehow corrupt but was assigned
			fingerAssignments[fingerToReset] = null;
			keyAssignments[releasedKeyId] = null;
		}
	} else {
		console.warn(`No finger assigned to key: ${releasedKeyId}`);
	}

	// This is now handled by releaseKey, so the setTimeout block below is removed.
});

// Add a special handler specifically for Caps Lock to handle OS-level quirks
document.addEventListener("keydown", function (event) {
	// If hiddenInput is active, mobile keyboard is up, let its input handler manage.
	if (document.activeElement === hiddenInput && event.code === "CapsLock") {
		event.preventDefault(); // Prevent default if any, but mostly rely on input handler.
		return;
	}
	// Special handling for Caps Lock to ensure finger always returns to rest
	if (event.code === "CapsLock") {
		console.log("CapsLock keydown detected by special handler");

		// Force release any finger assigned to CapsLock after a short delay
		// This ensures the finger doesn't stay attached to the key due to OS behavior
		setTimeout(() => {
			const capsLockKey = "CapsLock";
			const fingerOnCapsLock = keyAssignments[capsLockKey];

			if (fingerOnCapsLock) {
				console.log(
					`Forcing finger ${fingerOnCapsLock} to release from CapsLock`
				);
				isFingerReturningToRest[fingerOnCapsLock] = true;
				fingerAssignments[fingerOnCapsLock] = null;
				keyAssignments[capsLockKey] = null;
			}

			// Ensure the key itself is visually released
			animateKeyPress(capsLockKey, false);
		}, 150); // Reduced delay to make it feel more responsive while still showing animation
	}
});

// Add an explicit keyup listener specifically for Caps Lock
document.addEventListener("keyup", function (event) {
	// If hiddenInput is active, mobile keyboard is up, let its input handler manage.
	if (document.activeElement === hiddenInput && event.code === "CapsLock") {
		return;
	}
	if (event.code === "CapsLock") {
		console.log(
			"CapsLock keyup detected by special handler - immediate release"
		);
		const capsLockKey = "CapsLock";
		const fingerOnCapsLock = keyAssignments[capsLockKey];

		if (fingerOnCapsLock) {
			console.log(
				`Immediately releasing finger ${fingerOnCapsLock} from CapsLock on keyup`
			);
			isFingerReturningToRest[fingerOnCapsLock] = true;
			fingerAssignments[fingerOnCapsLock] = null;
			keyAssignments[capsLockKey] = null;

			// Ensure the key is visually released
			animateKeyPress(capsLockKey, false);
		}
	}
});

// Add a special reset function that can be called from console if needed
window.resetAllFingers = function () {
	console.log("Manually resetting all fingers");
	// Reset all finger assignments
	for (const fingerId in fingerAssignments) {
		if (fingerAssignments[fingerId]) {
			const keyId = fingerAssignments[fingerId];
			console.log(`Resetting finger ${fingerId} from ${keyId}`);
			isFingerReturningToRest[fingerId] = true;
			fingerAssignments[fingerId] = null;
			if (keyId) keyAssignments[keyId] = null;
		}
	}

	// Reset all key assignments as well
	for (const keyId in keyAssignments) {
		if (keyAssignments[keyId]) {
			const fingerId = keyAssignments[keyId];
			console.log(`Clearing key ${keyId} assignment from ${fingerId}`);
			keyAssignments[keyId] = null;
			if (fingerId) {
				isFingerReturningToRest[fingerId] = true;
				fingerAssignments[fingerId] = null;
			}
		}
	}
};

/**
 * Animates a key being pressed down or released
 * @param {string} keyId - The key code/ID
 * @param {boolean} isPressed - Whether the key is being pressed or released
 */
function animateKeyPress(keyId, isPressed) {
	const keyboardGroup = scene.getObjectByName("keyboard");
	if (!keyboardGroup) return;

	const keyMesh = keyboardGroup.getObjectByName(keyId);
	if (!keyMesh) return;

	// Clear any existing timeout for this key
	if (activeKeys[keyId]) {
		clearTimeout(activeKeys[keyId].timeout);
	}

	if (isPressed) {
		// Store original key position and material colors if not already stored
		if (!activeKeys[keyId]) {
			const originalColors = [];
			const originalEmissive = [];
			const originalEmissiveIntensity = [];
			if (Array.isArray(keyMesh.material)) {
				keyMesh.material.forEach((mat) => {
					originalColors.push(mat.color.clone());
					if (mat.emissive) originalEmissive.push(mat.emissive.clone());
					else originalEmissive.push(null);
					originalEmissiveIntensity.push(mat.emissiveIntensity || 0);
				});
			} else {
				originalColors.push(keyMesh.material.color.clone());
				if (keyMesh.material.emissive)
					originalEmissive.push(keyMesh.material.emissive.clone());
				else originalEmissive.push(null);
				originalEmissiveIntensity.push(keyMesh.material.emissiveIntensity || 0);
			}

			activeKeys[keyId] = {
				originalZ: keyMesh.position.z,
				originalColors: originalColors,
				originalEmissive: originalEmissive,
				originalEmissiveIntensity: originalEmissiveIntensity,
			};
		}

		// Move the key down along the Z-axis
		keyMesh.position.z = activeKeys[keyId].originalZ - KEY_PRESS_DISTANCE;

		// Simple darkening effect for pressed keys - more subtle for professional look
		if (Array.isArray(keyMesh.material)) {
			keyMesh.material.forEach((mat, index) => {
				mat.color.lerp(new THREE.Color(KEY_PRESSED_COLOR), 0.5);
				if (mat.emissive) {
					mat.emissive.setHex(KEY_PRESSED_EMISSIVE);
					mat.emissiveIntensity = KEY_PRESSED_EMISSIVE_INTENSITY;
				}
			});
		} else {
			keyMesh.material.color.lerp(new THREE.Color(KEY_PRESSED_COLOR), 0.5);
			if (keyMesh.material.emissive) {
				keyMesh.material.emissive.setHex(KEY_PRESSED_EMISSIVE);
				keyMesh.material.emissiveIntensity = KEY_PRESSED_EMISSIVE_INTENSITY;
			}
		}
	} else {
		releaseKey(keyId);
	}
}

/**
 * Resets a key to its original position and color
 * @param {string} keyId - The key code/ID
 */
function releaseKey(keyId) {
	const keyboardGroup = scene.getObjectByName("keyboard");
	if (!keyboardGroup) return;

	const keyMesh = keyboardGroup.getObjectByName(keyId);
	if (!keyMesh || !activeKeys[keyId]) return;

	// Restore original position along Z-axis
	keyMesh.position.z = activeKeys[keyId].originalZ;

	// Reset scale
	keyMesh.scale.set(1, 1, 1);

	// Restore original colors and emissive properties
	if (Array.isArray(keyMesh.material)) {
		keyMesh.material.forEach((mat, index) => {
			if (activeKeys[keyId].originalColors[index]) {
				mat.color.copy(activeKeys[keyId].originalColors[index]);
				if (mat.emissive && activeKeys[keyId].originalEmissive[index]) {
					mat.emissive.copy(activeKeys[keyId].originalEmissive[index]);
					mat.emissiveIntensity =
						activeKeys[keyId].originalEmissiveIntensity[index];
				} else if (mat.emissive) {
					// Ensure emissive is reset if no original was stored for it
					mat.emissive.set(0x000000);
					mat.emissiveIntensity = 0;
				}
			}
		});
	} else if (activeKeys[keyId].originalColors[0]) {
		keyMesh.material.color.copy(activeKeys[keyId].originalColors[0]);
		if (keyMesh.material.emissive && activeKeys[keyId].originalEmissive[0]) {
			keyMesh.material.emissive.copy(activeKeys[keyId].originalEmissive[0]);
			keyMesh.material.emissiveIntensity =
				activeKeys[keyId].originalEmissiveIntensity[0];
		} else if (keyMesh.material.emissive) {
			// Ensure emissive is reset
			keyMesh.material.emissive.set(0x000000);
			keyMesh.material.emissiveIntensity = 0;
		}
	}

	// Clean up
	delete activeKeys[keyId];
}

// --- End Key Press Animation Logic ---

// --- Keyboard State Check ---
function isKeyPressed(keyId) {
	return activeKeys.hasOwnProperty(keyId);
}

// Audio Setup
const listener = new THREE.AudioListener();
camera.add(listener); // Attach listener to the camera

const audioLoader = new THREE.AudioLoader();
const keyPressSound = new THREE.Audio(listener);
const keyReleaseSound = new THREE.Audio(listener);

// IMPORTANT: Replace with actual paths to your sound files!
audioLoader.load(
	"/assets/key_pressed.mp3",
	function (buffer) {
		keyPressSound.setBuffer(buffer);
		// keyPressSound.setVolume(0.5); // Optional: adjust volume
		console.log("Key press sound loaded.");
	},
	undefined,
	function (error) {
		console.error("Error loading key press sound:", error);
	}
);

audioLoader.load(
	"/assets/key_released.mp3",
	function (buffer) {
		keyReleaseSound.setBuffer(buffer);
		// keyReleaseSound.setVolume(0.5); // Optional: adjust volume
		console.log("Key release sound loaded.");
	},
	undefined,
	function (error) {
		console.error("Error loading key release sound:", error);
	}
);

// Function to resume AudioContext on user interaction
function resumeAudioContext() {
	if (listener && listener.context && listener.context.state === "suspended") {
		listener.context
			.resume()
			.then(() => {
				console.log(
					"AudioContext resumed successfully after user interaction."
				);
			})
			.catch((e) => {
				console.error("Error resuming AudioContext:", e);
			});
	}
	// Remove these listeners after the first interaction to avoid multiple calls
	window.removeEventListener("click", resumeAudioContext);
	window.removeEventListener("keydown", resumeAudioContext, true); // Use capture for keydown
}

// Add listeners for the first user interaction
window.addEventListener("click", resumeAudioContext);
window.addEventListener("keydown", resumeAudioContext, true); // Use capture for keydown to catch it early

function animate() {
	requestAnimationFrame(animate);

	// Moved declarations to the top of the function scope
	let isLeftHandActive = false;
	let isRightHandActive = false;
	const time = Date.now() * 0.001; // Time for sinusoidal movements

	// Update hand colors with rainbow cycling effect
	updateHandColors(time);

	if (orbitControls) {
		orbitControls.update();
	}

	// --- Hand State Check ---
	ikControlledFingers.forEach((fingerId) => {
		if (!isFingerReturningToRest[fingerId]) {
			if (fingerId.includes("_right")) {
				isRightHandActive = true;
			} else {
				isLeftHandActive = true;
			}
		}
	});

	// --- Hand Adjustment Logic ---
	const handAdjustmentVectors = {
		left: new THREE.Vector3(),
		right: new THREE.Vector3(),
	};
	const handAdjustmentContributors = {
		left: 0,
		right: 0,
	};

	ikControlledFingers.forEach((fingerId) => {
		const target = ikTargets[fingerId];
		const fingertipVisual = fingertipVisuals[fingerId];

		if (target && fingertipVisual) {
			const targetWorldPosition = new THREE.Vector3();
			target.getWorldPosition(targetWorldPosition);

			const fingertipWorldPosition = new THREE.Vector3();
			fingertipVisual.getWorldPosition(fingertipWorldPosition);

			const distanceToTarget =
				fingertipWorldPosition.distanceTo(targetWorldPosition);

			if (distanceToTarget > HAND_ADJUSTMENT_THRESHOLD) {
				const handId = fingerId.includes("_right") ? "right" : "left";
				const requiredFingertipMovement = new THREE.Vector3().subVectors(
					targetWorldPosition,
					fingertipWorldPosition
				);

				let weight = 1.0;
				const isThumb = fingerId.includes("thumb");
				const isDestinationRest = isFingerReturningToRest[fingerId];

				if (!isDestinationRest) {
					weight = 2.0;
				} else if (isThumb && isDestinationRest) {
					weight = 0.25;
				}

				const weightedMovement = requiredFingertipMovement
					.clone()
					.multiplyScalar(weight);

				if (handId === "left") {
					handAdjustmentVectors.left.add(weightedMovement);
					handAdjustmentContributors.left += weight;
				} else {
					handAdjustmentVectors.right.add(weightedMovement);
					handAdjustmentContributors.right += weight;
				}
			}
		}
	});

	if (handAdjustmentContributors.left > 0) {
		const avgAdjustment = handAdjustmentVectors.left.divideScalar(
			handAdjustmentContributors.left
		);
		avgAdjustment.multiplyScalar(HAND_ADJUSTMENT_FACTOR);
		if (avgAdjustment.length() > MAX_HAND_ADJUSTMENT_PER_FRAME) {
			avgAdjustment.normalize().multiplyScalar(MAX_HAND_ADJUSTMENT_PER_FRAME);
		}
		leftHandGroup.position.add(avgAdjustment);
	}

	if (handAdjustmentContributors.right > 0) {
		const avgAdjustment = handAdjustmentVectors.right.divideScalar(
			handAdjustmentContributors.right
		);
		avgAdjustment.multiplyScalar(HAND_ADJUSTMENT_FACTOR);
		if (avgAdjustment.length() > MAX_HAND_ADJUSTMENT_PER_FRAME) {
			avgAdjustment.normalize().multiplyScalar(MAX_HAND_ADJUSTMENT_PER_FRAME);
		}
		rightHandGroup.position.add(avgAdjustment);
	}

	// --- Hand Return to Default Position Logic --- // CORRECT PLACEMENT
	// Left Hand
	if (!isLeftHandActive) {
		// Calculate idle offsets for position
		const palmIdlePosX =
			Math.sin(time * IDLE_PALM_MOVEMENT_SPEED * 0.7) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_POS;
		const palmIdlePosY =
			Math.cos(time * IDLE_PALM_MOVEMENT_SPEED * 1.3) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_POS;
		const palmIdlePosZ =
			Math.sin(time * IDLE_PALM_MOVEMENT_SPEED * 0.9) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_POS;

		// Calculate idle offsets for rotation
		const palmIdleRotX =
			Math.cos(time * IDLE_PALM_MOVEMENT_SPEED * 1.1) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_ROT;
		const palmIdleRotY =
			Math.sin(time * IDLE_PALM_MOVEMENT_SPEED * 0.8) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_ROT;

		// Calculate target position for this frame
		const targetPosition = initialLeftHandPosition.clone();
		targetPosition.x += palmIdlePosX;
		targetPosition.y += palmIdlePosY;
		targetPosition.z += palmIdlePosZ;

		// Calculate target rotation for this frame (Euler angles)
		const targetRotation = initialLeftHandRotation.clone(); // This is a THREE.Euler
		targetRotation.x += palmIdleRotX;
		targetRotation.y += palmIdleRotY;
		// targetRotation.z will use the initial value if not idly changed

		// Smoothly move position towards targetPosition
		const positionDelta = new THREE.Vector3().subVectors(
			targetPosition,
			leftHandGroup.position
		);
		if (positionDelta.lengthSq() > 0.000001) {
			const positionMovement = positionDelta.multiplyScalar(
				HAND_RETURN_TO_DEFAULT_FACTOR
			);
			if (positionMovement.length() > MAX_HAND_ADJUSTMENT_PER_FRAME) {
				positionMovement
					.normalize()
					.multiplyScalar(MAX_HAND_ADJUSTMENT_PER_FRAME);
			}
			leftHandGroup.position.add(positionMovement);
		} else {
			leftHandGroup.position.copy(targetPosition);
		}

		// Smoothly move rotation towards targetRotation (lerping Euler components)
		leftHandGroup.rotation.x = THREE.MathUtils.lerp(
			leftHandGroup.rotation.x,
			targetRotation.x,
			HAND_RETURN_TO_DEFAULT_FACTOR
		);
		leftHandGroup.rotation.y = THREE.MathUtils.lerp(
			leftHandGroup.rotation.y,
			targetRotation.y,
			HAND_RETURN_TO_DEFAULT_FACTOR
		);
		leftHandGroup.rotation.z = THREE.MathUtils.lerp(
			leftHandGroup.rotation.z,
			initialLeftHandRotation.z,
			HAND_RETURN_TO_DEFAULT_FACTOR
		);
	}

	// Right Hand
	if (!isRightHandActive) {
		// Calculate idle offsets for position (using different seeds for variety)
		const palmIdlePosX =
			Math.cos(time * IDLE_PALM_MOVEMENT_SPEED * 0.75) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_POS;
		const palmIdlePosY =
			Math.sin(time * IDLE_PALM_MOVEMENT_SPEED * 1.25) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_POS;
		const palmIdlePosZ =
			Math.cos(time * IDLE_PALM_MOVEMENT_SPEED * 0.95) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_POS;

		// Calculate idle offsets for rotation (using different seeds)
		const palmIdleRotX =
			Math.sin(time * IDLE_PALM_MOVEMENT_SPEED * 1.15) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_ROT;
		const palmIdleRotY =
			Math.cos(time * IDLE_PALM_MOVEMENT_SPEED * 0.85) *
			IDLE_PALM_MOVEMENT_MAGNITUDE_ROT;

		// Calculate target position for this frame
		const targetPosition = initialRightHandPosition.clone();
		targetPosition.x += palmIdlePosX;
		targetPosition.y += palmIdlePosY;
		targetPosition.z += palmIdlePosZ;

		// Calculate target rotation for this frame (Euler angles)
		const targetRotation = initialRightHandRotation.clone(); // This is a THREE.Euler
		targetRotation.x += palmIdleRotX;
		targetRotation.y += palmIdleRotY;
		// targetRotation.z will use the initial value

		// Smoothly move position towards targetPosition
		const positionDelta = new THREE.Vector3().subVectors(
			targetPosition,
			rightHandGroup.position
		);
		if (positionDelta.lengthSq() > 0.000001) {
			const positionMovement = positionDelta.multiplyScalar(
				HAND_RETURN_TO_DEFAULT_FACTOR
			);
			if (positionMovement.length() > MAX_HAND_ADJUSTMENT_PER_FRAME) {
				positionMovement
					.normalize()
					.multiplyScalar(MAX_HAND_ADJUSTMENT_PER_FRAME);
			}
			rightHandGroup.position.add(positionMovement);
		} else {
			rightHandGroup.position.copy(targetPosition);
		}

		// Smoothly move rotation towards targetRotation (lerping Euler components)
		rightHandGroup.rotation.x = THREE.MathUtils.lerp(
			rightHandGroup.rotation.x,
			targetRotation.x,
			HAND_RETURN_TO_DEFAULT_FACTOR
		);
		rightHandGroup.rotation.y = THREE.MathUtils.lerp(
			rightHandGroup.rotation.y,
			targetRotation.y,
			HAND_RETURN_TO_DEFAULT_FACTOR
		);
		rightHandGroup.rotation.z = THREE.MathUtils.lerp(
			rightHandGroup.rotation.z,
			initialRightHandRotation.z,
			HAND_RETURN_TO_DEFAULT_FACTOR
		);
	}

	// Ensure world matrices are updated once after all position adjustments for the frame
	leftHandGroup.updateMatrixWorld(true);
	rightHandGroup.updateMatrixWorld(true);

	// NEW: Update ikTargetRestPositions and destinations for resting fingers
	ikControlledFingers.forEach((fingerId) => {
		const handGroup = fingerId.includes("_right")
			? rightHandGroup
			: leftHandGroup;
		const relativeOffset = palmRelativeRestOffsets[fingerId];

		if (
			relativeOffset &&
			ikTargetRestPositions[fingerId] &&
			ikTargetDestinations[fingerId]
		) {
			const worldRestPosition = new THREE.Vector3()
				.copy(relativeOffset)
				.applyMatrix4(handGroup.matrixWorld);

			ikTargetRestPositions[fingerId].copy(worldRestPosition);

			if (isFingerReturningToRest[fingerId]) {
				const curledDestination = worldRestPosition.clone();
				const curlDirection = new THREE.Vector3(0, -1, 0); // Base curl direction (downwards in finger's local Y)
				// Apply hand's quaternion to get world-space curl direction
				curlDirection.applyQuaternion(handGroup.quaternion);
				curlDirection.normalize().multiplyScalar(FINGER_REST_CURL_OFFSET);
				curledDestination.add(curlDirection);

				// NEW: Add subtle idle movement to resting fingers' IK target destinations
				const idleOffsetX =
					Math.sin(time * IDLE_IK_TARGET_DESTINATION_SPEED + fingerId.length) *
					IDLE_IK_TARGET_DESTINATION_MAGNITUDE;
				const idleOffsetY =
					Math.cos(
						time * IDLE_IK_TARGET_DESTINATION_SPEED * 1.2 +
							fingerId.length * 0.5
					) * IDLE_IK_TARGET_DESTINATION_MAGNITUDE;
				const idleOffsetZ =
					Math.sin(
						time * IDLE_IK_TARGET_DESTINATION_SPEED * 0.8 +
							fingerId.length * 0.2
					) * IDLE_IK_TARGET_DESTINATION_MAGNITUDE;
				curledDestination.x += idleOffsetX;
				curledDestination.y += idleOffsetY;
				curledDestination.z += idleOffsetZ;

				ikTargetDestinations[fingerId].copy(curledDestination);
			}
		}
	});

	// Update IK target positions with smooth transitions (moved after rest position updates)
	ikControlledFingers.forEach((fingerId) => {
		const target = ikTargets[fingerId];
		const destination = ikTargetDestinations[fingerId];

		if (target && destination) {
			target.position.lerp(destination, TARGET_MOVEMENT_SPEED);
		}

		// CCD IK Solver Logic (remains the same)
		const currentIkTarget = ikTargets[fingerId];
		const currentFingertipVisual = fingertipVisuals[fingerId];
		const currentIkChain = ikChains[fingerId];
		const currentFingerJoints = fingerJoints[fingerId];

		if (
			currentIkTarget &&
			currentFingertipVisual &&
			currentIkChain &&
			currentIkChain.length > 0 &&
			currentFingerJoints
		) {
			const targetPosition = new THREE.Vector3();
			currentIkTarget.getWorldPosition(targetPosition);
			const effectorPosition = new THREE.Vector3();

			for (let iteration = 0; iteration < CCD_ITERATIONS; iteration++) {
				currentFingertipVisual.getWorldPosition(effectorPosition);
				const distanceToTarget = effectorPosition.distanceTo(targetPosition);

				if (distanceToTarget < CCD_THRESHOLD) {
					break;
				}

				for (let j = 0; j < currentIkChain.length; j++) {
					const joint = currentIkChain[j];
					joint.updateMatrixWorld(true);

					const jointPosition = new THREE.Vector3();
					joint.getWorldPosition(jointPosition);
					currentFingertipVisual.getWorldPosition(effectorPosition);

					const toEffector = new THREE.Vector3()
						.subVectors(effectorPosition, jointPosition)
						.normalize();
					const toTarget = new THREE.Vector3()
						.subVectors(targetPosition, jointPosition)
						.normalize();

					let rotationAngle = toEffector.angleTo(toTarget);
					const rotationAxis = new THREE.Vector3()
						.crossVectors(toEffector, toTarget)
						.normalize();

					if (rotationAngle > 0.001) {
						const deltaQuaternion = new THREE.Quaternion().setFromAxisAngle(
							rotationAxis,
							rotationAngle
						);
						// joint.quaternion.premultiply(deltaQuaternion); // Old direct application

						// Create a target quaternion for this step
						const targetStepQuaternion = joint.quaternion
							.clone()
							.premultiply(deltaQuaternion);

						// Slerp towards the targetStepQuaternion for smoother movement
						joint.quaternion.slerp(targetStepQuaternion, CCD_SMOOTHING_FACTOR);

						if (joint.userData.limits) {
							const euler = new THREE.Euler().setFromQuaternion(
								joint.quaternion,
								"XYZ"
							);
							if (joint.userData.limits.x) {
								euler.x = THREE.MathUtils.clamp(
									euler.x,
									joint.userData.limits.x.min,
									joint.userData.limits.x.max
								);
							}
							if (joint.userData.limits.y) {
								euler.y = THREE.MathUtils.clamp(
									euler.y,
									joint.userData.limits.y.min,
									joint.userData.limits.y.max
								);
							}
							if (joint.userData.limits.z) {
								euler.z = THREE.MathUtils.clamp(
									euler.z,
									joint.userData.limits.z.min,
									joint.userData.limits.z.max
								);
							}
							joint.quaternion.setFromEuler(euler);
						}
						joint.updateMatrixWorld(true);
					}
				}
			}
		}
	});

	if (composer) {
		composer.render(); // New rendering call with post-processing
	} else {
		// Fallback if composer is not initialized
		console.warn("Composer not initialized, falling back to direct renderer.");
		renderer.render(scene, camera);
	}
}
animate();

// Handle window resize
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);

	adjustCameraDistance(); // Adjust camera Z distance based on new aspect ratio

	if (composer) {
		composer.setSize(window.innerWidth, window.innerHeight);
	}
	// Update SSAOPass resolution on resize if it exists
	const ssaoPassInstance = composer?.passes.find(
		(pass) => pass instanceof SSAOPass
	);
	if (ssaoPassInstance) {
		ssaoPassInstance.setSize(window.innerWidth, window.innerHeight);
	}
});

function createKeyboard() {
	const keyboardGroup = new THREE.Group();
	keyboardGroup.name = "keyboard";

	// Determine the maximum width any row will take up for overall centering (remains the same)
	let maxRowWidth = 0;
	qwertyKeyLayout.forEach((row) => {
		const currentRowWidth =
			row.reduce((acc, keyInfo) => {
				// For Space key, use its actual size, for others, use KEY_UNIT_WIDTH
				const width =
					keyInfo.id === "Space"
						? KEY_UNIT_WIDTH * keyInfo.size
						: KEY_UNIT_WIDTH;
				return acc + width + KEY_SPACING_X;
			}, 0) - KEY_SPACING_X;
		if (currentRowWidth > maxRowWidth) {
			maxRowWidth = currentRowWidth;
		}
	});

	// Calculate total depth of the keyboard layout (along the Y-axis now)
	const totalKeyboardLayoutDepth =
		qwertyKeyLayout.length * KEY_UNIT_DEPTH +
		(qwertyKeyLayout.length - 1) * KEY_SPACING_Z;

	// Start Y from the top edge of the keyboard layout and place rows downwards.
	let currentY_placement_reference = totalKeyboardLayoutDepth / 2;

	qwertyKeyLayout.forEach((row, rowIndex) => {
		const actualRowWidth =
			row.reduce((acc, keyInfo) => {
				const width =
					keyInfo.id === "Space"
						? KEY_UNIT_WIDTH * keyInfo.size
						: KEY_UNIT_WIDTH;
				return acc + width + KEY_SPACING_X;
			}, 0) - KEY_SPACING_X;
		let currentX_local_start = -actualRowWidth / 2; // Center this specific row horizontally

		// Apply staggering (same logic, affects X position)
		let staggerOffset = 0;
		if (rowIndex === 1) staggerOffset = KEY_UNIT_WIDTH * 0.25;
		else if (rowIndex === 2) staggerOffset = KEY_UNIT_WIDTH * 0.5;
		else if (rowIndex === 3) staggerOffset = KEY_UNIT_WIDTH * 0.75;
		else if (rowIndex === 4) {
			// If it's the last row and only contains one key (our spacebar), no stagger.
			if (row.length === 1) {
				staggerOffset = 0;
			} else {
				staggerOffset = KEY_UNIT_WIDTH * 1.2;
			}
		}
		currentX_local_start += staggerOffset;

		// Calculate the Y center for keys in this row, moving from top downwards
		const rowCenterY = currentY_placement_reference - KEY_UNIT_DEPTH / 2;

		row.forEach((keyInfo) => {
			const keyMesh = createKey(keyInfo);
			// For Space key, use its actual size, for others, use KEY_UNIT_WIDTH as diameter
			const keyVisualWidth =
				keyInfo.id === "Space" ? KEY_UNIT_WIDTH * keyInfo.size : KEY_UNIT_WIDTH;

			keyMesh.position.set(
				currentX_local_start + keyVisualWidth / 2, // X: center of the key in the row
				rowCenterY, // Y: center of the key row
				KEY_HEIGHT / 2 // Z: center of the key's thickness (bottom at Z=0, top at Z=KEY_HEIGHT)
			);
			keyboardGroup.add(keyMesh);
			currentX_local_start += keyVisualWidth + KEY_SPACING_X; // Advance X for the next key
		});
		// Move the Y reference downwards for the next row's top edge
		currentY_placement_reference -= KEY_UNIT_DEPTH + KEY_SPACING_Z;
	});

	// The keyboard is now built centered in its local XY plane (bottom of keys at Z=0).
	// Set the final position of the keyboard group using global shifts.
	keyboardGroup.position.set(
		0, // Centered horizontally by default
		KEYBOARD_GLOBAL_Y_SHIFT, // Apply global Y shift
		KEYBOARD_Z_OFFSET // Apply global Z offset (depth into the scene)
	);

	scene.add(keyboardGroup);
	return keyboardGroup;
}

// Hand Model Creation (createBone, createJoint, createFinger - these are defined below now)
/**
 * Creates a bone segment mesh (cylinder) with tapered ends.
 * @param {number} length - The length of the bone.
 * @param {number} startRadius - The radius at the start of the bone.
 * @param {number} endRadius - The radius at the end of the bone.
 * @param {string} name - The name for this bone mesh.
 * @returns {THREE.Mesh}
 */
function createBone(length, startRadius, endRadius, name) {
	const geometry = new THREE.CylinderGeometry(
		endRadius,
		startRadius,
		length,
		16
	);
	const bone = new THREE.Mesh(geometry, boneMaterial);
	bone.geometry.translate(0, length / 2, 0); // Pivot at the base
	bone.name = name;
	bone.castShadow = true;
	bone.receiveShadow = true;
	return bone;
}

/**
 * Creates a joint (a THREE.Group for pivoting) with a visual sphere.
 * @param {string} name - The name for this joint group.
 * @param {number} radius - The radius of the joint sphere.
 * @returns {THREE.Group}
 */
function createJoint(name, radius) {
	const jointGroup = new THREE.Group();
	jointGroup.name = name;
	const jointSphereGeometry = new THREE.SphereGeometry(radius, 16, 12);
	const jointSphere = new THREE.Mesh(jointSphereGeometry, jointMaterial);
	jointSphere.name = name + "_visual";
	jointSphere.castShadow = true;
	jointSphere.receiveShadow = true;
	jointGroup.add(jointSphere);
	return jointGroup;
}

/**
 * Creates a finger with multiple segments and joints.
 * @param {string} fingerId - A unique ID for the finger (e.g., "thumb", "index", "middle").
 * @returns {THREE.Group} - The base joint of the finger.
 */
function createFinger(fingerId) {
	const props = fingerProperties[fingerId];
	if (!props) {
		console.error("Properties not found for fingerId:", fingerId);
		return new THREE.Group(); // Return empty group on error
	}

	// Start with the base radius, scaled by finger type
	let currentRadius = BONE_BASE_RADIUS;
	// Adjust starting radius based on finger type
	const isThumb = fingerId === "thumb" || fingerId === "thumb_right";
	const isPinky = fingerId === "pinky" || fingerId === "pinky_right";

	if (isThumb) currentRadius *= 1.05; // Thumb is slightly thicker
	else if (isPinky) currentRadius *= 0.8; // Pinky is thinner
	else if (fingerId.includes("ring"))
		currentRadius *= 0.85; // Ring finger is thinner
	else if (fingerId.includes("middle")) currentRadius *= 0.95; // Middle finger maintains thickness

	// Get specific material for this finger
	const fingerSpecificMaterial = fingerMaterialMap[fingerId] || boneMaterial;

	// Create the base joint connecting to palm
	const jointRadius = currentRadius * JOINT_RADIUS_FACTOR;
	const fingerBaseJoint = createJoint(
		"finger_base_" + fingerId,
		jointRadius,
		fingerSpecificMaterial
	);
	let currentJoint = fingerBaseJoint;

	// Calculate the actual metacarpal length using the property factor
	const actualMetacarpalLength =
		METACARPAL_LENGTH * (props.metacarpalLengthFactor || 1);

	// Calculate end radius of metacarpal with tapering
	const metacarpalEndRadius = currentRadius * BONE_TAPER_FACTOR;

	// Create the metacarpal bone with tapering from currentRadius to metacarpalEndRadius
	const metacarpalBoneName = "metacarpal_bone_" + fingerId;
	const metacarpalBone = createBone(
		actualMetacarpalLength,
		currentRadius,
		metacarpalEndRadius,
		metacarpalBoneName,
		fingerSpecificMaterial
	);
	currentJoint.add(metacarpalBone);

	// Update current radius for next segment
	currentRadius = metacarpalEndRadius;

	// Calculate the actual phalanx length using the property factor
	const actualPhalanxLength = PHALANX_LENGTH * (props.phalanxLengthFactor || 1);

	// Create each phalanx segment
	for (let i = 0; i < props.numSegments; i++) {
		// Create joint at the end of previous bone with current radius
		const phalanxJointName = "phalanx_joint_" + i + "_" + fingerId;
		const nextJoint = createJoint(
			phalanxJointName,
			currentRadius * JOINT_RADIUS_FACTOR,
			fingerSpecificMaterial
		);
		nextJoint.position.y =
			i === 0 ? actualMetacarpalLength : actualPhalanxLength;
		currentJoint.add(nextJoint);

		// Calculate end radius with tapering for this phalanx
		const phalanxEndRadius = currentRadius * BONE_TAPER_FACTOR;

		// Create the phalanx bone with tapering
		const phalanxBoneName = "phalanx_bone_" + i + "_" + fingerId;
		const phalanxBone = createBone(
			actualPhalanxLength,
			currentRadius,
			phalanxEndRadius,
			phalanxBoneName,
			fingerSpecificMaterial
		);
		nextJoint.add(phalanxBone);

		// Update current radius for next segment
		currentRadius = phalanxEndRadius;
		currentJoint = nextJoint;

		// Add fingertip at the end of the last phalanx
		if (i === props.numSegments - 1) {
			const fingertipVisualName = "fingertip_visual_" + fingerId;
			// Use either the final tapered radius or FINGERTIP_RADIUS, whichever is smaller
			const tipRadius = Math.min(
				currentRadius * BONE_TAPER_FACTOR,
				FINGERTIP_RADIUS
			);
			const fingertipGeometry = new THREE.SphereGeometry(tipRadius, 16, 12);
			const fingertip = new THREE.Mesh(
				fingertipGeometry,
				fingerSpecificMaterial
			);
			fingertip.name = fingertipVisualName;
			fingertip.position.y = actualPhalanxLength;
			fingertip.castShadow = true;
			fingertip.receiveShadow = true;
			currentJoint.add(fingertip);
		}
	}
	return fingerBaseJoint;
}

// --- End Key Press Animation Logic ---

// Add floor/ground for context and shadows
function addGround() {
	const groundGeometry = new THREE.PlaneGeometry(30, 30);
	const groundMaterial = new THREE.MeshStandardMaterial({
		color: 0xdddddd,
		roughness: 0.8,
		metalness: 0.1,
		side: THREE.DoubleSide,
	});
	const ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.rotation.x = Math.PI / 2;
	ground.position.y = -1.5; // Position below the hands and keyboard
	ground.receiveShadow = true;
	scene.add(ground);
}
addGround();

// Change renderer settings for professional look
function setupProfessionalLook() {
	// Black background
	renderer.setClearColor(0x000000);
	renderer.toneMappingExposure = 1.0; // Standard exposure

	// Adjust lighting for professional look
	hemisphereLight.intensity = 0.7;
	hemisphereLight.color.set(0xffffff);
	hemisphereLight.groundColor.set(0x444444);

	directionalLight.intensity = 1.5;
	directionalLight.color.set(0xffffff);

	// Remove any existing colored point lights or reduce their intensity
	pointLight1.intensity = 0.3;
	pointLight1.color.set(0xffffff);
	pointLight2.intensity = 0.3;
	pointLight2.color.set(0xffffff);

	// Find and remove any additional point lights (like pointLight3)
	const pointLight3 = scene.children.find(
		(child) =>
			child instanceof THREE.PointLight &&
			child !== pointLight1 &&
			child !== pointLight2 &&
			child !== directionalLight
	);

	if (pointLight3) {
		scene.remove(pointLight3);
	}

	// Find and remove any ground/floor
	const ground = scene.children.find(
		(child) =>
			child instanceof THREE.Mesh &&
			child.geometry instanceof THREE.PlaneGeometry &&
			child.position.y < 0
	);

	if (ground) {
		scene.remove(ground);
	}

	// Update bloom settings for more subtle effect
	if (bloomPass) {
		bloomPass.strength = 0.2;
		bloomPass.radius = 0.3;
		bloomPass.threshold = 0.7;
	}

	// Update the key materials to be white plastic with black text
	keyMaterial.color.set(0xf0f0f0); // White plastic
	keyMaterial.roughness = 0.7; // Plastic-like roughness
	keyMaterial.metalness = 0.05; // Very low for plastic
	keyMaterial.emissive.set(0x000000); // No emissive
	keyMaterial.emissiveIntensity = 0.0;

	keyTopMaterial.color.set(0xffffff); // Pure white for top
	keyTopMaterial.roughness = 0.6; // Slightly smoother top
	keyTopMaterial.metalness = 0.05; // Very low for plastic
	keyTopMaterial.emissive.set(0x000000); // No emissive
	keyTopMaterial.emissiveIntensity = 0.0;

	// Update texture label parameters
	KEY_TEXT_COLOR = "#000000"; // Black text
	KEY_LABEL_BACKGROUND_COLOR = "#ffffff"; // White background for keys

	// Update key press animation parameters
	KEY_PRESSED_COLOR = 0xdddddd; // Slightly darker white for pressed keys
	KEY_PRESSED_EMISSIVE = 0x222222; // Very subtle glow for pressed keys
	KEY_PRESSED_EMISSIVE_INTENSITY = 0.2; // Minimal glow intensity

	// Update existing finger materials to be more professional
	// Make all fingers a skin tone
	const skinToneColor = new THREE.Color(0xd2b48c); // Tan skin tone

	// Update all finger materials
	for (const fingerId in fingerMaterialMap) {
		const material = fingerMaterialMap[fingerId];
		if (material) {
			material.color.copy(skinToneColor);
			material.roughness = 0.7; // Skin-like roughness
			material.metalness = 0.05; // Skin is not very metallic
			material.emissive.set(0x000000);
			material.emissiveIntensity = 0.0;

			// Ensure material is opaque
			material.transparent = false;

			if (material.transmission) material.transmission = 0; // Remove transmission if it exists
		}
	}

	// Also ensure the base boneMaterial (used for palms) is skin-toned and opaque
	if (boneMaterial) {
		boneMaterial.color.copy(skinToneColor); // Apply skin tone
		boneMaterial.roughness = 0.7;
		boneMaterial.metalness = 0.05;
		boneMaterial.emissive.set(0x000000);
		boneMaterial.emissiveIntensity = 0.0;
		boneMaterial.transparent = false;
		boneMaterial.opacity = 1.0;
		if (boneMaterial.transmission) boneMaterial.transmission = 0;
	}

	// Override the updateHandColors function to do nothing
	updateHandColors = function (time) {
		// No color cycling in professional mode
		// Fingers remain static dark grey
	};

	// Override the animateKeyPress function for more subtle effects
	window.originalAnimateKeyPress = animateKeyPress; // Save the original for possible restoration

	animateKeyPress = function (keyId, isPressed) {
		const keyboardGroup = scene.getObjectByName("keyboard");
		if (!keyboardGroup) return;

		const keyMesh = keyboardGroup.getObjectByName(keyId);
		if (!keyMesh) return;

		// Clear any existing timeout for this key
		if (activeKeys[keyId]) {
			clearTimeout(activeKeys[keyId].timeout);
		}

		if (isPressed) {
			// Store original key position and material colors if not already stored
			if (!activeKeys[keyId]) {
				const originalColors = [];
				const originalEmissive = [];
				const originalEmissiveIntensity = [];
				if (Array.isArray(keyMesh.material)) {
					keyMesh.material.forEach((mat) => {
						originalColors.push(mat.color.clone());
						if (mat.emissive) originalEmissive.push(mat.emissive.clone());
						else originalEmissive.push(null);
						originalEmissiveIntensity.push(mat.emissiveIntensity || 0);
					});
				} else {
					originalColors.push(keyMesh.material.color.clone());
					if (keyMesh.material.emissive)
						originalEmissive.push(keyMesh.material.emissive.clone());
					else originalEmissive.push(null);
					originalEmissiveIntensity.push(
						keyMesh.material.emissiveIntensity || 0
					);
				}

				activeKeys[keyId] = {
					originalZ: keyMesh.position.z,
					originalColors: originalColors,
					originalEmissive: originalEmissive,
					originalEmissiveIntensity: originalEmissiveIntensity,
				};
			}

			// Move the key down along the Z-axis
			keyMesh.position.z = activeKeys[keyId].originalZ - KEY_PRESS_DISTANCE;

			// Simple darkening effect for pressed keys - more subtle for professional look
			if (Array.isArray(keyMesh.material)) {
				keyMesh.material.forEach((mat, index) => {
					mat.color.lerp(new THREE.Color(KEY_PRESSED_COLOR), 0.5);
					if (mat.emissive) {
						mat.emissive.setHex(KEY_PRESSED_EMISSIVE);
						mat.emissiveIntensity = KEY_PRESSED_EMISSIVE_INTENSITY;
					}
				});
			} else {
				keyMesh.material.color.lerp(new THREE.Color(KEY_PRESSED_COLOR), 0.5);
				if (keyMesh.material.emissive) {
					keyMesh.material.emissive.setHex(KEY_PRESSED_EMISSIVE);
					keyMesh.material.emissiveIntensity = KEY_PRESSED_EMISSIVE_INTENSITY;
				}
			}
		} else {
			releaseKey(keyId);
		}
	};
}

// Call this function to set up professional look
setupProfessionalLook();

// Create enhanced visuals with better post-processing
function enhanceVisuals() {
	// Don't call setupProfessionalLook again to avoid double reassignment
	// setupProfessionalLook();

	// Fine-tune the renderer settings
	renderer.toneMappingExposure = 1.2; // Slightly brighter exposure
	renderer.outputColorSpace = THREE.SRGBColorSpace; // Ensure proper color space

	// Pure white keys with black text
	keyMaterial.color.set(0xffffff); // Pure white plastic
	keyMaterial.roughness = 0.7;
	keyMaterial.metalness = 0.1; // Slight metalness for better reflections

	keyTopMaterial.color.set(0xffffff); // Pure white for top
	keyTopMaterial.roughness = 0.6;
	keyTopMaterial.metalness = 0.1;

	// Ensure black text
	KEY_TEXT_COLOR = "#000000"; // Deep black text

	// Enhanced post-processing
	if (bloomPass) {
		// More refined bloom settings
		bloomPass.strength = 0.35; // Increased from 0.2
		bloomPass.radius = 0.4; // Slightly wider bloom radius
		bloomPass.threshold = 0.6; // Lower threshold for more subtle glow
	}

	// Enhanced SSAO settings
	const ssaoPass = composer.passes.find((pass) => pass instanceof SSAOPass);
	if (ssaoPass) {
		ssaoPass.kernelRadius = 14; // Increased radius
		ssaoPass.minDistance = 0.004; // Decreased for finer detail
		ssaoPass.maxDistance = 0.12; // Increased for better depth perception
	}

	// Add a subtle vignette effect
	const renderPass = composer.passes.find((pass) => pass instanceof RenderPass);
	if (renderPass) {
		renderPass.clear = false; // Needed for proper background
	}

	// Create grid pattern for keys
	const keyTextureCanvas = document.createElement("canvas");
	keyTextureCanvas.width = 256;
	keyTextureCanvas.height = 256;
	const ctx = keyTextureCanvas.getContext("2d");

	// Fill with white background
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, 256, 256);

	// Add subtle grid pattern
	ctx.strokeStyle = "#f0f0f0";
	ctx.lineWidth = 1;
	const gridSize = 16;

	ctx.beginPath();
	for (let i = 0; i <= gridSize; i++) {
		// Vertical lines
		ctx.moveTo(i * (256 / gridSize), 0);
		ctx.lineTo(i * (256 / gridSize), 256);
		// Horizontal lines
		ctx.moveTo(0, i * (256 / gridSize));
		ctx.lineTo(256, i * (256 / gridSize));
	}
	ctx.stroke();

	const keyTexture = new THREE.CanvasTexture(keyTextureCanvas);
	keyTexture.wrapS = THREE.RepeatWrapping;
	keyTexture.wrapT = THREE.RepeatWrapping;
	keyTexture.repeat.set(2, 2);

	// Apply subtle grid texture to keys
	keyMaterial.map = keyTexture;

	// Enhance lighting for better key definition
	directionalLight.intensity = 1.8;
	directionalLight.position.set(10, 15, 8);

	// Add a subtle rim light for better key definition
	const rimLight = new THREE.DirectionalLight(0xaaccff, 0.5);
	rimLight.position.set(-5, 8, -10);
	scene.add(rimLight);

	// Update hand materials for minimal style
	for (const fingerId in fingerMaterialMap) {
		const material = fingerMaterialMap[fingerId];
		if (material) {
			material.color.set(0x333333); // Darker grey
			material.roughness = 0.7; // More matte finish
			material.metalness = 0.05; // Less metallic
		}
	}

	// Update key press color for subtle feedback
	KEY_PRESSED_COLOR = 0xeeeeee; // Slightly darker white
	KEY_PRESSED_EMISSIVE = 0x666666; // Subtle grey glow
	KEY_PRESSED_EMISSIVE_INTENSITY = 0.4; // Moderate glow

	console.log("Enhanced visuals applied");
}

// Apply enhanced visuals
enhanceVisuals();

// Make keys all white with black text
function updateKeyAppearance() {
	// Update key label parameters
	KEY_TEXT_COLOR = "#000000"; // Pure black text
	KEY_LABEL_BACKGROUND_COLOR = "#ffffff"; // Pure white background for keys

	// Update key materials
	keyMaterial.color.set(0xffffff); // Pure white plastic
	keyMaterial.roughness = 0.75; // More matte finish for plastic look
	keyMaterial.metalness = 0.05; // Very low for plastic feel
	keyMaterial.emissive.set(0x000000);
	keyMaterial.emissiveIntensity = 0;

	keyTopMaterial.color.set(0xffffff); // Pure white for top
	keyTopMaterial.roughness = 0.7; // Slightly smoother top
	keyTopMaterial.metalness = 0.05;
	keyTopMaterial.emissive.set(0x000000);
	keyTopMaterial.emissiveIntensity = 0;

	// Update key press colors for white keys
	KEY_PRESSED_COLOR = 0xf0f0f0; // Very slight darkening when pressed
	KEY_PRESSED_EMISSIVE = 0x555555; // Subtle grey glow
	KEY_PRESSED_EMISSIVE_INTENSITY = 0.3; // Moderate glow

	// Handle existing keys - update their materials and textures
	const keyboardGroup = scene.getObjectByName("keyboard");
	if (keyboardGroup) {
		keyboardGroup.traverse((child) => {
			if (child.isMesh) {
				// Update materials on all key meshes
				if (Array.isArray(child.material)) {
					child.material.forEach((mat) => {
						if (mat.map) {
							// This is likely a keytop with text - recreate its texture
							// with the new color scheme
							const originalTexture = mat.map;
							const keyLabel = child.userData?.label || "";

							if (keyLabel) {
								// Recreate texture with new colors
								const texWidth =
									originalTexture.image?.width || KEY_TEXTURE_BASE_WIDTH_PX;
								const texHeight =
									originalTexture.image?.height || KEY_TEXTURE_BASE_DEPTH_PX;
								const newTexture = createKeyTexture(
									keyLabel,
									texWidth,
									texHeight
								);

								// Apply to material
								mat.map = newTexture;
								if (mat.emissiveMap) mat.emissiveMap = newTexture;

								// Update colors
								mat.color.set(0xffffff);
								mat.emissive.set(0x000000);
								mat.emissiveIntensity = 0;
								mat.roughness = 0.6;
								mat.metalness = 0.05;
							}
						} else {
							// Non-textured part of the key
							mat.color.set(0xffffff);
							mat.emissive.set(0x000000);
							mat.emissiveIntensity = 0;
						}
					});
				} else if (child.material) {
					// Single material
					if (child.material.map) {
						// This is likely a keytop with text
						const keyLabel = child.userData?.label || "";
						if (keyLabel) {
							// Recreate texture with new colors
							const texWidth =
								child.material.map.image?.width || KEY_TEXTURE_BASE_WIDTH_PX;
							const texHeight =
								child.material.map.image?.height || KEY_TEXTURE_BASE_DEPTH_PX;
							const newTexture = createKeyTexture(
								keyLabel,
								texWidth,
								texHeight
							);

							// Apply to material
							child.material.map = newTexture;
							if (child.material.emissiveMap)
								child.material.emissiveMap = newTexture;
						}
					}

					// Update colors
					child.material.color.set(0xffffff);
					child.material.emissive.set(0x000000);
					child.material.emissiveIntensity = 0;
					child.material.roughness = 0.7;
					child.material.metalness = 0.05;
				}
			}
		});
	}

	console.log("Key appearance updated to white plastic with black text");
}

// Update key appearance after enhanced visuals
updateKeyAppearance();

// Function to reduce bloom effect and adjust lighting
function reducedBloom() {
	console.log("Reducing bloom effect and adjusting lighting");

	// Reduce bloom effect significantly
	if (bloomPass) {
		bloomPass.strength = 0.12; // Much lower bloom strength
		bloomPass.radius = 0.3;
		bloomPass.threshold = 0.8; // Higher threshold means less area will bloom
	}

	// Adjust main directional light
	if (directionalLight) {
		directionalLight.intensity = 1.0; // Lower intensity
		directionalLight.position.set(5, 10, 8);
	}

	// Adjust point lights
	if (pointLight1) pointLight1.intensity = 0.3;
	if (pointLight2) pointLight2.intensity = 0.3;

	// Find and remove the rim light
	const rimLights = scene.children.filter(
		(child) =>
			child instanceof THREE.DirectionalLight &&
			child !== directionalLight &&
			child.position.x < 0
	);

	rimLights.forEach((light) => {
		scene.remove(light);
	});

	// Add a more subtle fill light instead
	const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
	fillLight.position.set(-3, 5, 3);
	scene.add(fillLight);

	// Slightly reduce key brightness
	keyMaterial.color.set(0xf0f0f0);
	keyMaterial.emissiveIntensity = 0;

	keyTopMaterial.color.set(0xf0f0f0);
	keyTopMaterial.emissiveIntensity = 0;

	console.log("Bloom and lighting adjusted");
}

// Apply reduced bloom settings
reducedBloom();

// NEW: Update pressed key appearance for better visual feedback
KEY_PRESSED_COLOR = 0x00aadd; // Medium blue for pressed key
KEY_PRESSED_EMISSIVE = 0x00ffff; // Cyan glow for pressed key
KEY_PRESSED_EMISSIVE_INTENSITY = 0.8; // More visible glow intensity

console.log("Set new pressed key appearance: Blue with Cyan Glow");
