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
    *   Toon-shaded material for a stylized look, with customizable color and shading steps.
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
    *   OrbitControls for camera manipulation.
    *   Mouse interaction to drag IK targets (currently hidden by default).
    *   Real-time text display of typed characters.
    *   Audible key press and release sounds with dynamic variations (playback rate, detune, volume).
*   **User Interface**:
    *   An on-screen text field displays typed characters.

## How to Run

1.  Ensure you have a local web server or a development environment that can serve static HTML, CSS, and JavaScript files. (e.g., VS Code Live Server, Python's `http.server`, Node.js `serve` package).
2.  Place the necessary sound files (`key_pressed.mp3`, `key_released.mp3`) in an `assets` folder in the root directory, or update the paths in `main.js` if you place them elsewhere or use different filenames.
3.  Open the `index.html` file (or the main HTML file of your project) in your web browser through the local server.

## Technologies Used

*   [Three.js](https://threejs.org/) (r120+ or compatible with module imports used)
*   JavaScript (ES6 Modules)
*   HTML
*   CSS (for the typed text display)

---

This README provides a general overview. Specific implementation details can be found within the `main.js` comments and code. 