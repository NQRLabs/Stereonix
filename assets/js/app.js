/**
 * Stereonix - Side-by-Side 3D Stereogram Generator
 * MIT License - Copyright (c) 2025 NQR
 *
 * Architecture:
 * - AI-powered depth estimation using Depth Anything V2
 * - Side-by-side stereogram generation for cross-eye viewing
 * - Interactive crop and pan controls
 * - Real-time preview with adjustable depth parameters
 *
 * Main flow: Load Image → Generate Depth Map → Create Side-by-Side Stereogram
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  originalImage: null,
  depthMap: null,
  settings: {
    zoom: 100,
    panX: 0,
    panY: 0,
    depthIntensity: 25,
    depthGamma: 1.0,
    invertDepth: false,
    previewZoom: 50
  }
};

// ============================================================================
// DEPTH ANYTHING V2 - AI DEPTH PREDICTION
// ============================================================================

// Based on "Depth Anything V2" by DepthAnything team
// Model: https://github.com/DepthAnything/Depth-Anything-V2
// ONNX Model: https://huggingface.co/onnx-community/depth-anything-v2-small
// License: Apache 2.0

let depthModel = null;
let depthModelLoading = false;

// ImageNet normalization constants
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

// Load the Depth Anything V2 model
async function loadDepthModel() {
  if (depthModel) return depthModel;
  if (depthModelLoading) {
    while (depthModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return depthModel;
  }

  depthModelLoading = true;
  try {
    const session = await ort.InferenceSession.create(
      'models/depth-anything-v2-small-518.onnx',
      { executionProviders: ['webgpu', 'wasm'] }
    );
    depthModel = session;
    console.log('Depth Anything V2 model loaded successfully');
    return depthModel;
  } catch (error) {
    console.error('Failed to load Depth Anything V2 model:', error);
    throw error;
  } finally {
    depthModelLoading = false;
  }
}

// Resize and letterbox image to 518x518 preserving aspect ratio
function drawToSquare518(img) {
  const targetSize = 518;
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetSize, targetSize);

  const scale = Math.min(targetSize / img.width, targetSize / img.height);
  const scaledWidth = Math.round(img.width * scale);
  const scaledHeight = Math.round(img.height * scale);

  const x = Math.floor((targetSize - scaledWidth) / 2);
  const y = Math.floor((targetSize - scaledHeight) / 2);

  ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

  return { canvas, scaledWidth, scaledHeight, offsetX: x, offsetY: y };
}

// Build NCHW float32 tensor with ImageNet normalization
function makeInputTensor(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const tensorData = new Float32Array(1 * 3 * height * width);
  const pixelCount = height * width;

  const r_scale = 1.0 / (255.0 * IMAGENET_STD[0]);
  const g_scale = 1.0 / (255.0 * IMAGENET_STD[1]);
  const b_scale = 1.0 / (255.0 * IMAGENET_STD[2]);
  const r_mean_norm = IMAGENET_MEAN[0] / IMAGENET_STD[0];
  const g_mean_norm = IMAGENET_MEAN[1] / IMAGENET_STD[1];
  const b_mean_norm = IMAGENET_MEAN[2] / IMAGENET_STD[2];

  const rOffset = 0;
  const gOffset = pixelCount;
  const bOffset = pixelCount * 2;

  for (let i = 0; i < pixelCount; i++) {
    const pixelOffset = i * 4;
    tensorData[rOffset + i] = data[pixelOffset] * r_scale - r_mean_norm;
    tensorData[gOffset + i] = data[pixelOffset + 1] * g_scale - g_mean_norm;
    tensorData[bOffset + i] = data[pixelOffset + 2] * b_scale - b_mean_norm;
  }

  return new ort.Tensor('float32', tensorData, [1, 3, height, width]);
}

// Run the model and return Float32 depth array
async function predictDepthFloat(img) {
  const model = await loadDepthModel();

  const { canvas, scaledWidth, scaledHeight, offsetX, offsetY } = drawToSquare518(img);
  const inputTensor = makeInputTensor(canvas);

  const feeds = { pixel_values: inputTensor };
  const results = await model.run(feeds);

  const depthTensor = results[Object.keys(results)[0]];
  const depthData = depthTensor.data;
  const tensorHeight = depthTensor.dims[1];
  const tensorWidth = depthTensor.dims[2];

  const depthArray = new Float32Array(scaledHeight * scaledWidth);

  for (let y = 0; y < scaledHeight; y++) {
    const srcRowStart = (offsetY + y) * tensorWidth + offsetX;
    const dstRowStart = y * scaledWidth;
    for (let x = 0; x < scaledWidth; x++) {
      depthArray[dstRowStart + x] = depthData[srcRowStart + x];
    }
  }

  return {
    data: depthArray,
    width: scaledWidth,
    height: scaledHeight
  };
}

// Fast histogram-based percentile calculation
function findPercentilesHistogram(data, p2, p98) {
  const len = data.length;

  let min = Infinity, max = -Infinity;
  for (let i = 0; i < len; i++) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const numBuckets = 1024;
  const histogram = new Uint32Array(numBuckets);
  const range = max - min || 1;
  const bucketSize = range / numBuckets;

  for (let i = 0; i < len; i++) {
    const bucketIdx = Math.min(numBuckets - 1, Math.floor((data[i] - min) / bucketSize));
    histogram[bucketIdx]++;
  }

  const p2_target = Math.floor(len * p2);
  const p98_target = Math.floor(len * p98);

  let count = 0;
  let p2_val = min, p98_val = max;
  let foundP2 = false, foundP98 = false;

  for (let i = 0; i < numBuckets; i++) {
    count += histogram[i];

    if (!foundP2 && count >= p2_target) {
      p2_val = min + (i + 0.5) * bucketSize;
      foundP2 = true;
    }

    if (!foundP98 && count >= p98_target) {
      p98_val = min + (i + 0.5) * bucketSize;
      foundP98 = true;
      break;
    }
  }

  return { min: p2_val, max: p98_val };
}

// Convert depth to U8 grayscale (normalized 0-255)
function depthToU8(depthFloat, width, height) {
  const data = depthFloat.data;
  const len = data.length;

  const { min: minVal, max: maxVal } = findPercentilesHistogram(data, 0.02, 0.98);
  const range = maxVal - minVal || 1;
  const invRange = 1.0 / range;

  const u8Data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < len; i++) {
    let normalized = (data[i] - minVal) * invRange;
    normalized = normalized < 0 ? 0 : normalized > 1 ? 1 : normalized;

    // Invert so white = near, black = far
    const value = ((1 - normalized) * 255) | 0;

    const idx = i * 4;
    u8Data[idx] = value;
    u8Data[idx + 1] = value;
    u8Data[idx + 2] = value;
    u8Data[idx + 3] = 255;
  }

  return u8Data;
}

// Generate depth map from image
async function generateDepthMap(img) {
  showLoading('Generating depth map...');

  const depthFloat = await predictDepthFloat(img);
  const u8Data = depthToU8(depthFloat, depthFloat.width, depthFloat.height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = depthFloat.width;
  tempCanvas.height = depthFloat.height;
  const tempCtx = tempCanvas.getContext('2d');
  const tempImageData = new ImageData(u8Data, depthFloat.width, depthFloat.height);
  tempCtx.putImageData(tempImageData, 0, 0);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = img.width;
  outputCanvas.height = img.height;
  const outputCtx = outputCanvas.getContext('2d');
  outputCtx.drawImage(tempCanvas, 0, 0, img.width, img.height);

  hideLoading();
  return outputCtx.getImageData(0, 0, img.width, img.height);
}

// ============================================================================
// SIDE-BY-SIDE STEREOGRAM GENERATION
// ============================================================================

// Generate side-by-side stereogram for cross-eye viewing
// Algorithm: Depth-based horizontal displacement mapping
function generateStereogram(img, depthMap, settings) {
  const { depthIntensity, depthGamma, invertDepth, zoom, panX, panY } = settings;

  // Calculate output dimensions (16:9 landscape, each side 8:9)
  const outputWidth = 1920;
  const outputHeight = 1080;
  const sideWidth = 960; // Each side is 8:9 aspect ratio
  const sideHeight = 1080;

  // Create output canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  // Fill with black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  // Calculate zoom and pan transformations
  const zoomFactor = zoom / 100;
  const imgWidth = img.width;
  const imgHeight = img.height;
  const imgAspect = imgWidth / imgHeight;
  const sideAspect = sideWidth / sideHeight;

  // Determine scaled dimensions to fit side canvas with zoom
  let scaledWidth, scaledHeight;
  if (imgAspect > sideAspect) {
    // Image wider than side - fit to height
    scaledHeight = sideHeight * zoomFactor;
    scaledWidth = scaledHeight * imgAspect;
  } else {
    // Image taller than side - fit to width
    scaledWidth = sideWidth * zoomFactor;
    scaledHeight = scaledWidth / imgAspect;
  }

  // Convert pan values directly to pixel offsets (no guard rails)
  // Larger pan range for more freedom of movement
  const panXOffset = panX * 5; // 5 pixels per pan unit
  const panYOffset = panY * 5;

  // Maximum parallax shift based on depth intensity (pixels)
  const maxShift = (depthIntensity / 100) * 50; // Max 50px at intensity 100

  // Create temporary canvas for processing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imgWidth;
  tempCanvas.height = imgHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0);
  const imgData = tempCtx.getImageData(0, 0, imgWidth, imgHeight);

  // Process depth map with gamma and invert
  const processedDepth = new Float32Array(depthMap.data.length / 4);
  for (let i = 0; i < processedDepth.length; i++) {
    let depth = depthMap.data[i * 4] / 255; // Normalize to 0-1

    // Apply gamma
    if (depthGamma !== 1.0) {
      depth = Math.pow(depth, depthGamma);
    }

    // Apply invert
    if (invertDepth) {
      depth = 1 - depth;
    }

    processedDepth[i] = depth;
  }

  // Generate left eye view (shift based on depth)
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = sideWidth;
  leftCanvas.height = sideHeight;
  const leftCtx = leftCanvas.getContext('2d');
  const leftImageData = leftCtx.createImageData(sideWidth, sideHeight);

  // Generate right eye view (opposite shift)
  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = sideWidth;
  rightCanvas.height = sideHeight;
  const rightCtx = rightCanvas.getContext('2d');
  const rightImageData = rightCtx.createImageData(sideWidth, sideHeight);

  // Render both views with depth-based shifting
  for (let y = 0; y < sideHeight; y++) {
    for (let x = 0; x < sideWidth; x++) {
      // Map output pixel to source image coordinates (with zoom and pan)
      // Center viewport coordinates, apply pan offset, then scale by zoom
      const viewportX = x - sideWidth / 2;
      const viewportY = y - sideHeight / 2;

      // When drag right (panX increases), image moves right, so we sample from left of source
      const srcX = imgWidth / 2 + (viewportX - panXOffset) / zoomFactor;
      const srcY = imgHeight / 2 + (viewportY - panYOffset) / zoomFactor;

      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(imgWidth - 1, Math.floor(srcX)));
      const clampedY = Math.max(0, Math.min(imgHeight - 1, Math.floor(srcY)));

      // Get source pixel
      const srcIdx = (clampedY * imgWidth + clampedX) * 4;
      const r = imgData.data[srcIdx];
      const g = imgData.data[srcIdx + 1];
      const b = imgData.data[srcIdx + 2];
      const a = imgData.data[srcIdx + 3];

      // Get depth value
      const depthIdx = clampedY * imgWidth + clampedX;
      const depth = processedDepth[depthIdx];

      // Calculate shift based on depth (near = more shift, far = less shift)
      const shift = depth * maxShift;

      // Left eye: shift right for near objects
      const leftX = Math.floor(x + shift);
      if (leftX >= 0 && leftX < sideWidth) {
        const leftIdx = (y * sideWidth + leftX) * 4;
        leftImageData.data[leftIdx] = r;
        leftImageData.data[leftIdx + 1] = g;
        leftImageData.data[leftIdx + 2] = b;
        leftImageData.data[leftIdx + 3] = a;
      }

      // Right eye: shift left for near objects
      const rightX = Math.floor(x - shift);
      if (rightX >= 0 && rightX < sideWidth) {
        const rightIdx = (y * sideWidth + rightX) * 4;
        rightImageData.data[rightIdx] = r;
        rightImageData.data[rightIdx + 1] = g;
        rightImageData.data[rightIdx + 2] = b;
        rightImageData.data[rightIdx + 3] = a;
      }
    }
  }

  // Fill holes using nearest neighbor
  fillHoles(leftImageData);
  fillHoles(rightImageData);

  // Put processed images on canvases
  leftCtx.putImageData(leftImageData, 0, 0);
  rightCtx.putImageData(rightImageData, 0, 0);

  // Composite to final output (left on left, right on right)
  ctx.drawImage(leftCanvas, 0, 0);
  ctx.drawImage(rightCanvas, sideWidth, 0);

  return canvas;
}

// Fill holes in depth-shifted image using nearest neighbor
function fillHoles(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Scan for transparent/black holes and fill with nearest neighbor
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Check if pixel is empty (alpha = 0)
      if (data[idx + 3] === 0) {
        // Search for nearest non-empty pixel (simple right-to-left scan)
        let foundX = -1;
        for (let searchX = x + 1; searchX < width; searchX++) {
          const searchIdx = (y * width + searchX) * 4;
          if (data[searchIdx + 3] > 0) {
            foundX = searchX;
            break;
          }
        }

        if (foundX !== -1) {
          const srcIdx = (y * width + foundX) * 4;
          data[idx] = data[srcIdx];
          data[idx + 1] = data[srcIdx + 1];
          data[idx + 2] = data[srcIdx + 2];
          data[idx + 3] = data[srcIdx + 3];
        }
      }
    }
  }
}

// ============================================================================
// IMAGE LOADING AND PROCESSING
// ============================================================================

async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function handleImageLoad(file) {
  try {
    showLoading('Loading image...');

    // Load image
    const img = await loadImage(file);
    state.originalImage = img;

    // Generate depth map
    showLoading('Analyzing depth (this may take a moment)...');
    state.depthMap = await generateDepthMap(img);

    // Show control sections
    document.getElementById('cropSection').style.display = 'block';
    document.getElementById('depthSection').style.display = 'block';
    document.getElementById('exportSection').style.display = 'block';

    // Generate initial preview
    hideLoading();
    await updatePreview();

  } catch (error) {
    console.error('Error processing image:', error);
    alert('Error processing image. Please try another image or check console for details.');
    hideLoading();
  }
}

// ============================================================================
// PREVIEW RENDERING
// ============================================================================

async function updatePreview() {
  if (!state.originalImage || !state.depthMap) return;

  const previewCanvas = document.getElementById('previewCanvas');
  const previewOverlay = document.getElementById('previewOverlay');

  // Hide overlay
  previewOverlay.style.display = 'none';

  // Generate stereogram at full resolution
  const stereogram = generateStereogram(
    state.originalImage,
    state.depthMap,
    state.settings
  );

  // Update canvas at full resolution
  previewCanvas.width = stereogram.width;
  previewCanvas.height = stereogram.height;
  const ctx = previewCanvas.getContext('2d');
  ctx.drawImage(stereogram, 0, 0);

  // Apply preview zoom via CSS transform
  const scale = state.settings.previewZoom / 100;
  previewCanvas.style.transform = `scale(${scale})`;
  previewCanvas.style.transformOrigin = 'center center';
}

// ============================================================================
// UI HELPERS
// ============================================================================

function showLoading(message) {
  const loadingStatus = document.getElementById('loadingStatus');
  const loadingText = document.getElementById('loadingText');
  loadingText.textContent = message;
  loadingStatus.style.display = 'block';
}

function hideLoading() {
  const loadingStatus = document.getElementById('loadingStatus');
  loadingStatus.style.display = 'none';
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

// DOM elements
const loadImageBtn = document.getElementById('loadImageBtn');
const imageInput = document.getElementById('imageInput');
const previewZoomSlider = document.getElementById('previewZoomSlider');
const previewZoomValue = document.getElementById('previewZoomValue');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const panXSlider = document.getElementById('panXSlider');
const panXValue = document.getElementById('panXValue');
const panYSlider = document.getElementById('panYSlider');
const panYValue = document.getElementById('panYValue');
const depthIntensitySlider = document.getElementById('depthIntensitySlider');
const depthIntensityValue = document.getElementById('depthIntensityValue');
const depthGammaSlider = document.getElementById('depthGammaSlider');
const depthGammaValue = document.getElementById('depthGammaValue');
const invertDepthCheckbox = document.getElementById('invertDepthCheckbox');
const saveBtn = document.getElementById('saveBtn');
const previewCanvas = document.getElementById('previewCanvas');

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Load image button
loadImageBtn.addEventListener('click', () => {
  imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    await handleImageLoad(file);
  }
});

// Preview zoom control
previewZoomSlider.addEventListener('input', (e) => {
  state.settings.previewZoom = parseFloat(e.target.value);
  previewZoomValue.textContent = state.settings.previewZoom + '%';
  updatePreview();
});

// Image zoom control
zoomSlider.addEventListener('input', (e) => {
  state.settings.zoom = parseFloat(e.target.value);
  zoomValue.textContent = state.settings.zoom + '%';
  updatePreview();
});

// Pan X control
panXSlider.addEventListener('input', (e) => {
  state.settings.panX = parseFloat(e.target.value);
  panXValue.textContent = state.settings.panX;
  updatePreview();
});

// Pan Y control
panYSlider.addEventListener('input', (e) => {
  state.settings.panY = parseFloat(e.target.value);
  panYValue.textContent = state.settings.panY;
  updatePreview();
});

// Depth intensity control
depthIntensitySlider.addEventListener('input', (e) => {
  state.settings.depthIntensity = parseFloat(e.target.value);
  depthIntensityValue.textContent = state.settings.depthIntensity;
  updatePreview();
});

// Depth gamma control
depthGammaSlider.addEventListener('input', (e) => {
  state.settings.depthGamma = parseFloat(e.target.value);
  depthGammaValue.textContent = state.settings.depthGamma.toFixed(2);
  updatePreview();
});

// Invert depth checkbox
invertDepthCheckbox.addEventListener('change', (e) => {
  state.settings.invertDepth = e.target.checked;
  updatePreview();
});

// Save button
saveBtn.addEventListener('click', () => {
  if (!previewCanvas.width || !previewCanvas.height) {
    alert('No stereogram to save. Please load an image first.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  downloadCanvas(previewCanvas, `stereonix_${timestamp}.png`);
});

// Drag to pan on preview canvas
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

previewCanvas.addEventListener('mousedown', (e) => {
  if (!state.originalImage) return;
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  previewCanvas.style.cursor = 'grabbing';
});

previewCanvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const deltaX = e.clientX - lastMouseX;
  const deltaY = e.clientY - lastMouseY;

  // Update pan based on drag - no limits, full freedom
  state.settings.panX += deltaX * 0.5;
  state.settings.panY += deltaY * 0.5;

  // Update UI
  panXSlider.value = state.settings.panX;
  panXValue.textContent = state.settings.panX.toFixed(0);
  panYSlider.value = state.settings.panY;
  panYValue.textContent = state.settings.panY.toFixed(0);

  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  updatePreview();
});

previewCanvas.addEventListener('mouseup', () => {
  isDragging = false;
  previewCanvas.style.cursor = 'grab';
});

previewCanvas.addEventListener('mouseleave', () => {
  isDragging = false;
  previewCanvas.style.cursor = 'grab';
});

// Touch support for mobile
previewCanvas.addEventListener('touchstart', (e) => {
  if (!state.originalImage) return;
  isDragging = true;
  const touch = e.touches[0];
  lastMouseX = touch.clientX;
  lastMouseY = touch.clientY;
  e.preventDefault();
});

previewCanvas.addEventListener('touchmove', (e) => {
  if (!isDragging) return;

  const touch = e.touches[0];
  const deltaX = touch.clientX - lastMouseX;
  const deltaY = touch.clientY - lastMouseY;

  // Update pan based on drag - no limits, full freedom
  state.settings.panX += deltaX * 0.5;
  state.settings.panY += deltaY * 0.5;

  panXSlider.value = state.settings.panX;
  panXValue.textContent = state.settings.panX.toFixed(0);
  panYSlider.value = state.settings.panY;
  panYValue.textContent = state.settings.panY.toFixed(0);

  lastMouseX = touch.clientX;
  lastMouseY = touch.clientY;

  updatePreview();
  e.preventDefault();
});

previewCanvas.addEventListener('touchend', () => {
  isDragging = false;
});

// License modal
const licenseFooter = document.getElementById('licenseFooter');
const licenseOverlay = document.getElementById('licenseOverlay');
const licenseModal = document.getElementById('licenseModal');
const licenseClose = document.getElementById('licenseClose');

licenseFooter.addEventListener('click', () => {
  licenseModal.style.display = 'block';
  licenseOverlay.style.display = 'block';
});

licenseClose.addEventListener('click', () => {
  licenseModal.style.display = 'none';
  licenseOverlay.style.display = 'none';
});

licenseOverlay.addEventListener('click', () => {
  licenseModal.style.display = 'none';
  licenseOverlay.style.display = 'none';
});

// Set cursor style
previewCanvas.style.cursor = 'grab';

console.log('Stereonix initialized');
