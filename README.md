# Interactive 3D Keyboard and Hands Simulation

This project is a dynamic 3D scene built with Three.js, featuring an interactive keyboard, animated human-like hands with Inverse Kinematics (IK), and various visual enhancements.

## Features

*   **3D Keyboard**:
    *   Full QWERTY layout with dynamically generated keys.
    *   Keys animate visually when pressed.
    *   Customizable key textures with labels.
    *   Plastic-like key material appearance.
*   **Animated Hands**:
    *   Two hands with articulated fingers.
    *   Inverse Kinematics (IK) enabling fingers to target and press keys.
    *   Dynamic finger assignment to keys based on proximity.
    *   Automatic hand adjustment and return to resting positions.
    *   Puppeteer look: wooden MeshPhysicalMaterials with clearcoat/sheen.
    *   Visible joint gaps and metallic pins sized slightly larger than each joint.
*   **Scene & Rendering**:
    *   Built with Three.js.
    *   Dynamic camera that adjusts to window size to keep the scene visible.
    *   HDR environment mapping for realistic lighting and reflections.
    *   Hemisphere and Directional lights for scene illumination.
    *   Point lights for neon-like accents.
*   **Post-Processing Effects**:
    *   EffectComposer for managing post-processing passes.
    *   UnrealBloomPass for a glowing effect on bright parts of the scene.
    *   Screen Space Ambient Occlusion (SSAO) for enhanced depth and contact shadows.
*   **Interactivity**:
    *   Type on your physical keyboard; hands mimic typing and keys animate.
    *   OrbitControls for camera manipulation (zoom disabled by default).
    *   Mouse interaction to drag IK targets (targets are hidden by default).
    *   Real-time, on-screen typed text display with auto-scroll.
    *   Audible key press and release sounds with dynamic variations (playback rate, detune, volume).
*   **User Interface**:
    *   Centered typed text display (30vh max height) wraps and auto-scrolls.
    *   Dark mode scene background for better contrast.

## How to Run

1.  Ensure you have a local web server or a development environment that can serve static HTML, CSS, and JavaScript files. (e.g., VS Code Live Server, Python's `http.server`, Node.js `serve` package).
2.  Place the necessary sound files (`key_pressed.mp3`, `key_released.mp3`) in an `assets` folder in the root directory, or update the paths in `main.js` if you place them elsewhere or use different filenames.
3.  Open the `index.html` file (or the main HTML file of your project) in your web browser through the local server.

## Controls

*   **Typing**: Use your keyboard; each key animates and the closest finger moves to press it.
*   **Camera**: Click-drag to orbit. Zoom is disabled intentionally to keep composition.
*   **Audio**: First click/keydown resumes audio context (browser policy).

## Customization

*   Wooden hand look and parameters are in `main.js`:
    *   `createWoodGrainTexture(...)` to tweak grain.
    *   Materials: `boneMaterial`, `jointMaterial`, `fingertipMaterial` (MeshPhysicalMaterial).
    *   Joint spacing: `JOINT_GAP`.
    *   Pin sizing logic tied to joint diameter inside `createFinger(...)`.
*   Typed text display (position, size, colors) is set in `index.js` under `initMainTypedTextDisplay()`.
*   Background color (dark mode) is set via `renderer.setClearColor(0x000000)` in `main.js`.

## What’s New

*   Switched to direct typing mode (hands mimic physical keyboard input).
*   Dark mode background.
*   Puppeteer-style wooden materials with clearcoat/sheen.
*   Visible joint gaps and scaled metallic pins (no edge rings).
*   Centered typed text display now wraps, maxes at 30vh, and auto-scrolls.

## Technologies Used

*   [Three.js](https://threejs.org/) (r120+ or compatible with module imports used)
*   JavaScript (ES6 Modules)
*   HTML
*   CSS (for the typed text display)

---

This README provides a general overview. Specific implementation details can be found within the `main.js` comments and code. 