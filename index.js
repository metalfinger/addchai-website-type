import {
	executeKeyDown,
	executeKeyUp,
	executeCapsLockSpecificKeyDown,
	executeCapsLockSpecificKeyUp,
	resumeAudioContext,
	resetAllFingers,
	characterToKeyIdMap,
} from "./main.js";

const customTextString =
	"Typewriter ASMR for the analogue generation. Don't worry there's no AI over here, just you!";

// --- Text Display ---
const textContainer = document.getElementById("text-container");
let displayedText = "";
let cursorElement = null; // This is for the original top text, now unused

// NEW: Control for the actual debug stats box
const showDebugStats = true;
let actualDebugStatsElement = null;

// Renamed variable for the main large centered text display
let mainTypedTextDisplayElement = null;

// NEW: Scroll instruction element
let scrollInstructionElement = null;

// This function now initializes the LARGE CENTERED TYPED TEXT DISPLAY
// Renamed function
function initMainTypedTextDisplay() {
	const styleSheet = document.createElement("style");
	styleSheet.type = "text/css";
	// Using more unique names for animation and class
	styleSheet.innerText = `
    @keyframes mainTextCursorBlinkAnimation {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .main-text-blinking-cursor {
      animation: mainTextCursorBlinkAnimation 1s step-end infinite;
    }
    @keyframes fadeInOut {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    .scroll-instruction {
      animation: fadeInOut 2s ease-in-out infinite;
      font-family: "Courier New", Courier, monospace;
      color: rgb(0, 255, 136);
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    }
  `;
	document.head.appendChild(styleSheet);

	// Create scroll instruction element
	scrollInstructionElement = document.createElement("div");
	scrollInstructionElement.className = "scroll-instruction";
	Object.assign(scrollInstructionElement.style, {
		position: "fixed",
		top: "3%",
		left: "50%",
		transform: "translate(-50%, 0)",
		fontSize: "2em",
		zIndex: "10000",
		pointerEvents: "none", // Make sure it doesn't interfere with scrolling
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		padding: "10px 20px",
		borderRadius: "4px",
	});
	scrollInstructionElement.textContent = "Scroll";
	document.body.appendChild(scrollInstructionElement);

	mainTypedTextDisplayElement = document.createElement("div");
	mainTypedTextDisplayElement.id = "main-typed-text-display";
	Object.assign(mainTypedTextDisplayElement.style, {
		position: "fixed",
		top: "10%", // Changed from 25%
		left: "10%", // Changed from 50% and removed transform
		right: "10%",
		// maxWidth: "80%",
		padding: "15px",
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		color: "rgb(0, 255, 136)", // User specified format
		fontFamily: '"Courier New", Courier, monospace',
		fontSize: "2.5em",
		border: "1px solid rgb(0, 255, 136)", // User specified format
		borderRadius: "4px",
		zIndex: "9999",
		whiteSpace: "pre-wrap",
		textAlign: "center",
		//set things in center
	});
	document.body.appendChild(mainTypedTextDisplayElement);
	// Use the new class name for the initial cursor
	mainTypedTextDisplayElement.innerHTML =
		'<span class="main-text-blinking-cursor">|</span>';
}
initMainTypedTextDisplay(); // Call renamed function

// NEW: Function to initialize the separate debug statistics display
function initActualDebugStatsDisplay() {
	if (!showDebugStats) return;

	actualDebugStatsElement = document.createElement("div");
	actualDebugStatsElement.id = "actual-debug-stats-display";
	Object.assign(actualDebugStatsElement.style, {
		position: "fixed",
		top: "10px",
		left: "10px",
		padding: "8px",
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		color: "#00ff88",
		fontFamily: '"Courier New", Courier, monospace',
		fontSize: "14px",
		border: "1px solid #00ff88",
		borderRadius: "4px",
		zIndex: "10000", // Ensure it's on top
		minWidth: "250px",
		whiteSpace: "pre-wrap",
	});
	document.body.appendChild(actualDebugStatsElement);
	actualDebugStatsElement.textContent = "Debug Stats Initializing...";
}
initActualDebugStatsDisplay(); // Call to initialize the actual debug stats display

// --- End Debug Display (Restored) ---

function initTextDisplay() {
	textContainer.textContent = "";
	cursorElement = document.createElement("span");
	cursorElement.textContent = "|";
	cursorElement.classList.add("blinking-cursor");
	textContainer.parentNode.insertBefore(
		cursorElement,
		textContainer.nextSibling
	);
	textContainer.style.display = "inline";
	updateCursor();
}

function updateCursor() {
	if (cursorElement && textContainer.parentNode) {
		textContainer.parentNode.insertBefore(
			cursorElement,
			textContainer.nextSibling
		);
	}
}

// --- Scroll-driven Typing & Progress with Gentle Inertia ---
let currentProgress = 0;
let accumulatedScrollDelta = 0;

const SCROLL_DELTA_SENSITIVITY = 4.2;
const MAX_ACCUMULATED_SCROLL_DELTA = 1080;
const ACCUMULATED_SCROLL_DECAY_FACTOR = 0.98;
const SCROLL_UNITS_PER_CHAR_ATTEMPT = 30;
const MOMENTUM_THRESHOLD_FOR_ACCUM_DELTA = 0.1;

// Dynamic typing speed constants
const BASE_MIN_KEY_PRESS_DURATION = 30;
const BASE_MAX_KEY_PRESS_DURATION = 120;
const BASE_MIN_INTER_KEY_DELAY = 15;
const BASE_MAX_INTER_KEY_DELAY = 90;
const SCROLL_SPEED_MULTIPLIER = 2.5; // How much scroll speed affects typing speed  //!Controller

const MAX_PROGRESS = 100;
let PROGRESS_PER_CHARACTER = Infinity;
if (customTextString.length > 0) {
	PROGRESS_PER_CHARACTER = MAX_PROGRESS / customTextString.length;
}

let lastTypedCharacterIndex = -1;
let isCurrentlySimulatingChar = false;

function handlePageScroll(event) {
	event.preventDefault();

	// Hide scroll instruction when scrolling starts
	if (scrollInstructionElement) {
		scrollInstructionElement.style.display = "none";
	}

	if (event.deltaY < 0) {
		accumulatedScrollDelta = 0;
		return;
	}

	if (event.deltaY > 0) {
		accumulatedScrollDelta += event.deltaY * SCROLL_DELTA_SENSITIVITY;
		if (accumulatedScrollDelta > MAX_ACCUMULATED_SCROLL_DELTA) {
			accumulatedScrollDelta = MAX_ACCUMULATED_SCROLL_DELTA;
		}
	}
}

window.addEventListener("wheel", handlePageScroll, { passive: false });

function getDynamicTypingSpeed(scrollSpeed) {
	const MIN_DURATION_CLAMP = 5; // Minimum 5ms for any duration //!Controller

	// Normalize scroll speed to a 0-1 range
	const normalizedSpeed = Math.min(
		scrollSpeed / MAX_ACCUMULATED_SCROLL_DELTA,
		1
	);

	// typingSpeedFactor: 0 for slowest typing (results in MAX duration), 1 for fastest typing (results in MIN duration)
	let typingSpeedFactor = normalizedSpeed * SCROLL_SPEED_MULTIPLIER;
	// Clamp factor between 0 (triggers max duration) and 1 (triggers min duration)
	typingSpeedFactor = Math.max(0, Math.min(typingSpeedFactor, 1));

	// Interpolate between MAX and MIN durations based on typingSpeedFactor
	// factor = 0 (slow scroll) => duration = BASE_MAX_...
	// factor = 1 (fast scroll) => duration = BASE_MIN_...
	const keyPressDuration = Math.floor(
		BASE_MAX_KEY_PRESS_DURATION -
			(BASE_MAX_KEY_PRESS_DURATION - BASE_MIN_KEY_PRESS_DURATION) *
				typingSpeedFactor
	);

	const interKeyDelay = Math.floor(
		BASE_MAX_INTER_KEY_DELAY -
			(BASE_MAX_INTER_KEY_DELAY - BASE_MIN_INTER_KEY_DELAY) * typingSpeedFactor
	);

	return {
		keyPressDuration: Math.max(MIN_DURATION_CLAMP, keyPressDuration),
		interKeyDelay: Math.max(MIN_DURATION_CLAMP, interKeyDelay),
	};
}

function animationLoop() {
	accumulatedScrollDelta *= ACCUMULATED_SCROLL_DECAY_FACTOR;
	if (Math.abs(accumulatedScrollDelta) < MOMENTUM_THRESHOLD_FOR_ACCUM_DELTA) {
		accumulatedScrollDelta = 0;
	}

	if (
		accumulatedScrollDelta >= SCROLL_UNITS_PER_CHAR_ATTEMPT &&
		!isCurrentlySimulatingChar &&
		lastTypedCharacterIndex < customTextString.length - 1
	) {
		isCurrentlySimulatingChar = true;
		accumulatedScrollDelta -= SCROLL_UNITS_PER_CHAR_ATTEMPT;

		const charIndexToType = lastTypedCharacterIndex + 1;
		const charToType = customTextString[charIndexToType];
		const keyCode =
			characterToKeyIdMap[charToType.toLowerCase()] ||
			characterToKeyIdMap[charToType];
		const finalKeyCode =
			charToType === " " ? characterToKeyIdMap[" "] : keyCode;

		const { keyPressDuration, interKeyDelay } = getDynamicTypingSpeed(
			accumulatedScrollDelta
		);

		if (finalKeyCode) {
			setTimeout(() => {
				simulateKeyPress(finalKeyCode, charToType);
				displayedText += charToType;
				// textContainer.textContent = displayedText; // Original top text display logic - commented out
				// updateCursor(); // Original top text display logic - commented out

				setTimeout(() => {
					simulateKeyRelease(finalKeyCode);
					lastTypedCharacterIndex = charIndexToType;
					currentProgress = Math.min(
						MAX_PROGRESS,
						currentProgress + PROGRESS_PER_CHARACTER
					);
					isCurrentlySimulatingChar = false;
				}, keyPressDuration);
			}, interKeyDelay);
		} else {
			lastTypedCharacterIndex = charIndexToType;
			displayedText += charToType;
			// textContainer.textContent = displayedText; // Original top text display logic - commented out
			// updateCursor(); // Original top text display logic - commented out
			currentProgress = Math.min(
				MAX_PROGRESS,
				currentProgress + PROGRESS_PER_CHARACTER
			);
			isCurrentlySimulatingChar = false;
		}
	}

	// Update the LARGE CENTERED TYPED TEXT display (using new variable name)
	if (mainTypedTextDisplayElement) {
		mainTypedTextDisplayElement.innerHTML =
			displayedText + '<span class="main-text-blinking-cursor">|</span>';
	}

	// NEW: Update the actual debug stats display
	if (showDebugStats && actualDebugStatsElement) {
		actualDebugStatsElement.textContent =
			`Current Progress: ${currentProgress.toFixed(3)}\n` +
			`Accumulated Scroll Delta: ${accumulatedScrollDelta.toFixed(3)}\n` +
			`Last Typed Index: ${lastTypedCharacterIndex}`;
	}

	requestAnimationFrame(animationLoop);
}
// initTextDisplay(); // Original top text display logic - commented out
animationLoop();

function simulateKeyPress(keyCode, key) {
	executeKeyDown(keyCode, key);
	if (keyCode === "CapsLock") {
		executeCapsLockSpecificKeyDown(keyCode);
	}
}

function simulateKeyRelease(keyCode) {
	executeKeyUp(keyCode);
	if (keyCode === "CapsLock") {
		executeCapsLockSpecificKeyUp(keyCode);
	}
}

window.simulateKeyPress = simulateKeyPress;
window.simulateKeyRelease = simulateKeyRelease;
window.resetAllFingers = resetAllFingers;

console.log("index.js loaded, scroll-to-type with gentle inertia active.");
