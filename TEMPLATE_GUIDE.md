# NQR Labs App Template Guide

This template provides the foundation for all NQR Labs browser-based tools. It ensures consistency across the entire platform while making it easy to create new apps.

## Quick Start

```bash
# 1. Copy the template
cp -r template/ MyNewApp/
cd MyNewApp/

# 2. Find and replace all placeholders:
#    [App Name] → Your Actual App Name
#    [appname] → yourappname
#    [Brief Description] → Brief description of what it does

# 3. Choose your layout in index.html
#    - Keep .layout-split for apps with a canvas/preview
#    - Keep .layout-center for apps with just control panels
#    - Comment out the unused one

# 4. Test it works
python -m http.server 8000
# Visit http://localhost:8000
```

## File Structure

```
MyNewApp/
├── index.html                    # Main HTML (two layout options)
├── assets/
│   ├── css/
│   │   └── styles.css           # Complete CSS framework
│   ├── js/
│   │   └── app.js               # Your app logic goes here
│   └── images/
│       ├── logo.png             # App logo (create this)
│       ├── favicon-16x16.png    # Small favicon (create this)
│       ├── favicon-32x32.png    # Standard favicon (create this)
│       ├── apple-touch-icon.png # iOS icon (create this)
│       └── ASSETS_README.md     # Asset creation guide
├── LICENSE                       # MIT License (already configured)
├── README.md                     # Documentation template
└── TEMPLATE_GUIDE.md            # This file (delete when done)
```

## The Two Layouts

### Split Layout (Control Panel + Preview)
**Use for:** Apps with a canvas, live preview, or visual output

```
┌─────────────┬──────────────────────┐
│  Control    │                      │
│  Panel      │    Preview Canvas    │
│  (320px)    │    (flexible)        │
│             │                      │
└─────────────┴──────────────────────┘
```

**Examples:** Image editors, audio visualizers, generators

**In HTML:** Keep `<div class="container layout-split">` and its contents

### Center Layout (Panels Down Middle)
**Use for:** Apps without visual output, form-based tools

```
        ┌─────────────────┐
        │                 │
        │  Control Panel  │
        │   (max 800px)   │
        │                 │
        └─────────────────┘
        ┌─────────────────┐
        │  Another Panel  │
        └─────────────────┘
```

**Examples:** Text processors, calculators, converters

**In HTML:** Keep `<div class="container layout-center">` and its contents

## The CSS Framework

All NQR Labs colors are pre-defined as CSS variables:

```css
--color-bg-primary: #04070a      /* Dark blue-black background */
--color-bg-panel: #0a0f14        /* Panel background */
--color-accent-cyan: #5de1ff     /* Primary accent (cyan) */
--color-accent-teal: #00ffaa     /* Secondary accent (teal) */
--color-text-primary: #d7e8ff    /* Main text color */
--color-text-secondary: #8b9cb7  /* Subdued text */
--color-border: rgba(93, 225, 255, 0.2)
```

**Use these variables instead of hardcoded colors!**

### Available Components

The CSS includes pre-styled:
- ✅ Buttons (normal, hover, disabled, full-width)
- ✅ Text inputs, textareas, selects
- ✅ Range sliders with value display
- ✅ Checkboxes
- ✅ Sections with titles
- ✅ Control groups with labels
- ✅ Info hints
- ✅ License modal
- ✅ Header with logo/title/subtitle
- ✅ Footer with links
- ✅ Canvas preview area
- ✅ Scrollbars (styled)

### Adding Custom Styles

Add app-specific styles at the bottom of `styles.css`:

```css
/* ============================================================================
   APP-SPECIFIC STYLES
   ============================================================================ */

.my-custom-element {
  /* Your styles here */
}
```

## The JavaScript Structure

`app.js` is organized with section headers for easy navigation:

```javascript
// ============================================================================
// STATE MANAGEMENT
// ============================================================================
// Define your app state here

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================
// Get references to all DOM elements

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
// Helper functions

// ============================================================================
// CORE FUNCTIONALITY
// ============================================================================
// Main app logic

// ============================================================================
// EVENT LISTENERS - USER INPUTS
// ============================================================================
// All event handlers

// ============================================================================
// MODAL HANDLERS
// ============================================================================
// License modal is pre-configured

// ============================================================================
// INITIALIZATION
// ============================================================================
// Startup code
```

**Claude Code can easily navigate this structure using Grep!**

## Creating Assets

### Logo (logo.png)
- **Size:** 300x300px minimum (PNG with transparency)
- **Style:** Simple, clean, works on dark backgrounds
- **Colors:** Use NQR cyan (#5de1ff) and teal (#00ffaa)
- **Placement:** Will be displayed at 150px max width in app header

### Favicons
Generate at: https://realfavicongenerator.net/

Required files:
- `favicon-16x16.png` (16x16px)
- `favicon-32x32.png` (32x32px)
- `apple-touch-icon.png` (180x180px)

See `assets/images/ASSETS_README.md` for detailed guidance.

## License Files

### LICENSE
Already configured with MIT License. Just update the year if needed.

### NOTICE & LICENSES-THIRD-PARTY.md
Only create these if you add third-party dependencies:

1. Load library via CDN in `<head>`
2. Create `NOTICE` file listing dependencies
3. Create `LICENSES-THIRD-PARTY.md` with full license texts
4. Update license modal in `index.html`
5. Update `README.md`

**Important:** All dependencies must be MIT-compatible!

## Common Pitfalls

### 1. CORS Errors
**Problem:** "blocked by CORS policy" when loading assets

**Solution:** Always use a local HTTP server:
```bash
python -m http.server 8000
```
Never open `file://` directly in browser!

### 2. Canvas Not Showing
**Problem:** Canvas appears blank

**Solution:** Check:
- Canvas has width/height set in JavaScript
- Context is obtained successfully
- Drawing code is called after canvas setup

### 3. Buttons Not Styled
**Problem:** Buttons look like default browser buttons

**Solution:**
- Check that `styles.css` is loading
- Inspect browser console for CSS errors
- Ensure no typos in class names

### 4. Modal Won't Close
**Problem:** License modal stays open

**Solution:**
- Check that `licenseClose` and `licenseOverlay` IDs exist
- Verify JavaScript event listeners are attached
- Check browser console for errors

## Testing Checklist

Before considering your app complete:

- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on mobile (responsive design)
- [ ] All buttons work as expected
- [ ] License modal opens and closes
- [ ] No console errors
- [ ] Logo displays correctly (or gracefully hidden if missing)
- [ ] Favicons appear in browser tab
- [ ] App works with `python -m http.server`
- [ ] README.md is filled out with real content
- [ ] All `[Placeholder Text]` replaced with actual text

## Deploying to GitHub Pages

Once your app is ready:

1. **Add card image** to root `assets/images/` directory
2. **Update root `index.html`** to add your app card
3. **Git commit and push:**
   ```bash
   git add .
   git commit -m "Add [App Name] tool"
   git push origin main
   ```
4. **Wait ~1 minute** for GitHub Pages to deploy
5. **Visit:** `https://nqrlabs.com/MyNewApp/`

## Getting Help

- **Discord:** https://discord.gg/HT9YE8rvuN
- **GitHub Issues:** https://github.com/nqrlabs/nqrlabs.github.io/issues
- **Documentation:** See other apps in the repo for examples

## Final Steps

When your app is complete:

1. **Delete this file** (`TEMPLATE_GUIDE.md`)
2. **Update README.md** with actual content
3. **Test everything** one more time
4. **Deploy** to GitHub Pages

Happy coding! 🎉
