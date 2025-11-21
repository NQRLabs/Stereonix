# Stereonix

<img alt="Stereonix logo" src="./assets/images/logo.png" style="margin-left:auto; margin-right:auto; display:block; width:200px;"/>

**Create side-by-side 3D stereograms from any image using AI-powered depth estimation for cross-eye viewing.**

Live demo: [https://nqrlabs.com/Stereonix/](https://nqrlabs.com/Stereonix/)

---

## Features

- 🤖 **AI Depth Estimation** - Uses Depth Anything V2 for accurate depth map generation
- 👁️ **Cross-Eye Viewing** - Generates side-by-side stereograms for 3D perception
- 🎯 **Interactive Controls** - Real-time zoom, pan, and depth adjustment
- 📐 **Smart Cropping** - Automatically fits images to 16:9 landscape format (8:9 per side)
- 🎨 **Depth Customization** - Adjust depth intensity and gamma for realistic 3D effects
- 🔒 **Privacy-Focused** - All processing happens locally in your browser
- 📱 **Responsive Design** - Touch-enabled controls for mobile devices
- ⚡ **WebGPU Accelerated** - Fast AI inference using modern GPU APIs

---

## Quick Start

### For End Users

1. Visit [https://nqrlabs.com/Stereonix/](https://nqrlabs.com/Stereonix/)
2. Click "Load Image" and select a photo (works best with portraits, landscapes, or scenes with depth)
3. The AI will automatically generate a depth map and create a side-by-side stereogram
4. Adjust zoom, pan, and depth settings to perfect your 3D image
5. Click "Save Stereogram" to download the result

**How to view the 3D effect:**
- Cross your eyes slightly until the two images merge into one
- Focus on the merged center image - you should see depth pop out!
- Alternatively, use VR or 3D viewing apps that support side-by-side images

### For Developers

```bash
# Clone the repository
git clone https://github.com/nqrlabs/nqrlabs.github.io.git
cd nqrlabs.github.io/Stereonix

# Serve locally (Python 3)
python -m http.server 8000

# Open in browser
open http://localhost:8000
```

**Note:** The first time you load an image, the AI model (~97MB) will download automatically.

---

## How It Works

Stereonix uses AI-powered depth estimation to create side-by-side stereograms:

1. **Depth Map Generation:** The Depth Anything V2 model analyzes your image and predicts the depth of every pixel
2. **Depth Processing:** Apply gamma correction and inversion to fine-tune depth perception
3. **Stereogram Generation:** Create two slightly offset views based on depth:
   - Left eye: Shifts near objects right
   - Right eye: Shifts near objects left
   - The parallax creates 3D perception when viewed cross-eyed
4. **Hole Filling:** Nearest-neighbor interpolation fills gaps created by shifting

### Technical Details

- **Technology Stack:**
  - Pure HTML/CSS/JavaScript (no frameworks)
  - Canvas 2D API for image processing and rendering
  - ONNX Runtime Web for AI inference (WebGPU + WebAssembly fallback)
  - Depth Anything V2 model for depth estimation

- **Processing Pipeline:**
  1. Load user image
  2. Run Depth Anything V2 model (518x518 input, letterboxed)
  3. Normalize depth map using histogram percentiles (2nd-98th)
  4. Apply gamma and inversion transformations
  5. Generate left/right eye views with depth-based horizontal shifts
  6. Composite final 1920x1080 side-by-side image (960x1080 per side)

---

## Browser Compatibility

- ✅ **Chrome/Edge** 113+ (WebGPU support recommended)
- ✅ **Firefox** 115+ (WASM fallback)
- ✅ **Safari** 17+ (WASM fallback)
- ✅ **Mobile browsers** - Full touch support for pan/zoom

**Required Web APIs:**
- Canvas 2D API
- File API
- ONNX Runtime Web (WebGPU or WebAssembly)

**GPU Acceleration:**
- WebGPU provides 5-10x faster depth inference than WASM
- Automatic fallback to WASM if WebGPU unavailable

---

## Privacy

Stereonix runs entirely in your browser. No data is uploaded to any server:
- ✅ All images stay on your device
- ✅ No tracking or analytics
- ✅ AI inference happens locally using your GPU/CPU
- ✅ Model downloads once and caches permanently
- ✅ No cookies or persistent storage

---

## Use Cases

### For ARG Creators
- Hide clues or messages in 3D depth
- Create immersive visual puzzles requiring stereoscopic viewing
- Generate atmospheric 3D scenes from 2D artwork
- Perfect for "hidden in plain sight" puzzles

### For 3D Enthusiasts
- Convert photos to cross-eye stereograms
- Create 3D portraits from single images
- Experiment with depth perception and parallax
- Share 3D images without requiring special equipment

### For Content Creators
- Add depth dimension to 2D artwork
- Create unique visual effects for videos (coming soon!)
- Generate stereoscopic content for VR/AR platforms
- Explore creative applications of AI depth estimation

---

## Tips & Best Practices

- **Best Images:** Photos with clear foreground/background separation work best (portraits, landscapes, architecture)
- **Depth Intensity:** Start at 50 and adjust - higher values create more dramatic 3D but may be harder to view
- **Depth Gamma:** Lower values (0.7-0.9) create smoother depth transitions; higher values (1.1-1.5) create sharper depth layers
- **Zoom & Pan:** Use to focus on the most important subject and ensure it's centered
- **Viewing Distance:** Hold the image at arm's length and slowly bring it closer while crossing your eyes
- **Practice:** If you can't see the 3D effect immediately, try with simpler images first and work your way up

---

## Development

### File Structure

```
Stereonix/
├── index.html              # Main HTML file
├── assets/
│   ├── css/
│   │   └── styles.css      # All styles
│   ├── js/
│   │   └── app.js          # Main application logic
│   └── images/
│       ├── logo.png        # App logo
│       ├── favicon-16x16.png
│       ├── favicon-32x32.png
│       └── apple-touch-icon.png
├── models/
│   └── depth-anything-v2-small-518.onnx  # AI depth model (97MB)
├── LICENSE                 # MIT License
├── LICENSES-THIRD-PARTY.md # Third-party licenses
├── NOTICE                  # Attribution file
└── README.md               # This file
```

### Adding New Features

1. Update `app.js` with new functionality
2. Add UI controls in `index.html`
3. Style new elements in `styles.css`
4. Test with various image types and sizes
5. Update this README with documentation

### Third-Party Dependencies

- **ONNX Runtime Web** (v1.19.2) - AI inference engine
  - License: MIT
  - Repository: https://github.com/microsoft/onnxruntime
  - CDN: https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.webgpu.min.js

- **Depth Anything V2** (Small model, 518x518) - AI depth estimation
  - License: Apache 2.0
  - Repository: https://github.com/DepthAnything/Depth-Anything-V2
  - ONNX conversion: https://huggingface.co/onnx-community/depth-anything-v2-small

---

## Known Issues

- **Large Images:** Images > 4K may cause slow processing on lower-end devices (automatic resizing recommended)
- **Transparent Regions:** Transparent areas in PNGs are treated as background depth
- **Mobile Performance:** Depth estimation may take 10-30 seconds on mobile devices without WebGPU

---

## Roadmap

- [ ] Video support for animated stereograms
- [ ] Adjustable output resolution
- [ ] Red/cyan anaglyph mode as alternative to side-by-side
- [ ] Batch processing for multiple images
- [ ] Depth map editing tools for manual refinement
- [ ] Preset configurations for different viewing methods

---

## Related Tools

Check out other NQR Labs tools:
- **[Apoculus](https://nqrlabs.com/Apoculus/)** - Create Magic Eye style autostereograms
- **[SpectroGhost](https://nqrlabs.com/SpectroGhost/)** - Hide messages in audio spectrograms
- **[Ghostmark](https://nqrlabs.com/Ghostmark/)** - Hide images inside other images using steganography
- **[Inknigma](https://nqrlabs.com/Inknigma/)** - Multi-layer invisible ink and steganography
- [View all tools](https://nqrlabs.com/)

---

## Contributing

This project is open source! Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 NQR

---

## Credits

- **Created by:** NQR Labs
- **Website:** [https://nqrlabs.com](https://nqrlabs.com)
- **Discord:** [Join our community](https://discord.gg/HT9YE8rvuN)

### Third-Party Attributions

- **Depth Anything V2** - AI depth estimation model
  - Authors: DepthAnything team
  - License: Apache 2.0
  - Paper: https://arxiv.org/abs/2406.09414

- **ONNX Runtime Web** - WebGPU/WASM inference engine
  - Authors: Microsoft
  - License: MIT
  - Repository: https://github.com/microsoft/onnxruntime

See [LICENSES-THIRD-PARTY.md](LICENSES-THIRD-PARTY.md) for complete license information.

---

Made with 💙 by [NQR Labs](https://nqrlabs.com)
