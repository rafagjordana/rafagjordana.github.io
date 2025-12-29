/**
 * Bezier Morph Animation
 * Transitions particles between two images automatically.
 */

class BezierMorphParticle {
    constructor(startPixel, endPixel, width, height) {
        this.start = startPixel; // {x, y, r, g, b}
        this.end = endPixel;     // {x, y, r, g, b}

        this.dependentPixelsA = [];
        this.dependentPixelsB = [];

        // Timing Randomness
        // Delay: 0 to 500ms
        this.delay = Math.random() * 500;
        // Speed: 0.8x to 1.2x (duration multiplier)
        this.speedMult = 0.8 + Math.random() * 0.4;

        // Random Control Points for the curve
        const v1x = (Math.random() - 0.5) * width * 1.0;
        const v1y = (Math.random() - 0.5) * height * 1.0;
        const v2x = (Math.random() - 0.5) * width * 1.0;
        const v2y = (Math.random() - 0.5) * height * 1.0;

        // Start (P0) and End (P3)
        const x0 = startPixel.x;
        const y0 = startPixel.y;
        const x3 = endPixel.x;
        const y3 = endPixel.y;

        // Pre-calculate Cubic Bezier Coefficients
        const p1x = width / 2 + v1x;
        const p1y = height / 2 + v1y;
        const p2x = width / 2 + v2x;
        const p2y = height / 2 + v2y;

        this.cx = 3 * (p1x - x0);
        this.bx = 3 * (p2x - p1x) - this.cx;
        this.ax = x3 - x0 - this.cx - this.bx;

        this.cy = 3 * (p1y - y0);
        this.by = 3 * (p2y - p1y) - this.cy;
        this.ay = y3 - y0 - this.cy - this.by;

        this.x0 = x0;
        this.y0 = y0;
    }

    // Final implementation of draw with embedded logic
    updateAndDraw(ctx, phase, phaseTime, transitionDuration) {
        let t = 0;

        if (phase === 'REST_A') {
            t = 0;
        } else if (phase === 'REST_B') {
            t = 1;
        } else if (phase === 'TO_B') {
            // A -> B
            // t goes 0 -> 1
            const duration = transitionDuration * this.speedMult;
            const effectiveTime = Math.max(0, phaseTime - this.delay);
            t = Math.min(1, effectiveTime / duration);

            // Ease in/out
            // t = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            // Actually linear is fine for the path, the speed var covers the variety.
        } else if (phase === 'TO_A') {
            // B -> A
            // t goes 1 -> 0
            const duration = transitionDuration * this.speedMult;
            const effectiveTime = Math.max(0, phaseTime - this.delay);
            const progress = Math.min(1, effectiveTime / duration);
            t = 1 - progress;
        }

        // Clamp
        t = Math.max(0, Math.min(1, t));

        // Render
        const t2 = t * t;
        const t3 = t2 * t;

        const x = (this.ax * t3) + (this.bx * t2) + (this.cx * t) + this.x0;
        const y = (this.ay * t3) + (this.by * t2) + (this.cy * t) + this.y0;

        const r = Math.floor(this.start.r + (this.end.r - this.start.r) * t);
        const g = Math.floor(this.start.g + (this.end.g - this.start.g) * t);
        const b = Math.floor(this.start.b + (this.end.b - this.start.b) * t);

        // Dynamic Radius: 1px at rest, up to 10px in middle
        const radius = 1 + (5 * Math.sin(t * Math.PI));

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        return t; // Return t so manager knows for pixel fading
    }
}

class MorphAnimation {
    constructor(canvasId, imagePathA, imagePathB, numParticles = 1500) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.imagePathA = imagePathA;
        this.imagePathB = imagePathB;
        this.numParticles = numParticles;
        this.particles = [];

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // State Machine
        this.phase = 'REST_A'; // REST_A, TO_B, REST_B, TO_A
        this.phaseStartTime = 0;

        // Durations (ms) - Randomized ranges
        this.durations = {
            REST_A: { min: 3000, max: 5000 },
            TO_B: { val: 2500 }, // Base duration, particles have own mod
            REST_B: { min: 3000, max: 5000 },
            TO_A: { val: 2500 }
        };
        this.currentPhaseDuration = this.getRandomDuration('REST_A');

        // Buffers
        this.bufferCanvasA = null;
        this.bufferCanvasB = null;

        this.loadImages();
    }

    getRandomDuration(phase) {
        const d = this.durations[phase];
        if (d.val) return d.val;
        return d.min + Math.random() * (d.max - d.min);
    }

    loadImages() {
        let loadedCount = 0;
        const onImageLoad = () => {
            loadedCount++;
            if (loadedCount === 2) {
                this.init();
            }
        };

        this.imgA = new Image();
        this.imgA.crossOrigin = "Anonymous";
        this.imgA.onload = onImageLoad;
        this.imgA.src = this.imagePathA;

        this.imgB = new Image();
        this.imgB.crossOrigin = "Anonymous";
        this.imgB.onload = onImageLoad;
        this.imgB.src = this.imagePathB;
    }

    getPixels(img) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        const data = tempCtx.getImageData(0, 0, img.width, img.height).data;

        const pixels = [];
        const offX = (window.innerWidth - img.width) / 2;
        const offY = (window.innerHeight - img.height) / 2;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Filter white
            const isWhite = r > 240 && g > 240 && b > 240;
            if (!isWhite && data[i + 3] > 0) {
                pixels.push({
                    x: (i / 4) % img.width + offX,
                    y: Math.floor((i / 4) / img.width) + offY,
                    r, g, b,
                    index: i / 4
                });
            }
        }
        return pixels;
    }

    init() {
        const pixelsA = this.getPixels(this.imgA);
        const pixelsB = this.getPixels(this.imgB);

        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            const start = pixelsA[Math.floor(Math.random() * pixelsA.length)];
            const end = pixelsB[Math.floor(Math.random() * pixelsB.length)];

            if (start && end) {
                this.particles.push(
                    new BezierMorphParticle(start, end, this.width, this.height)
                );
            }
        }

        // Map Dependent Pixels
        this.mapPixelsToParticles(pixelsA, this.particles, 'start', 'dependentPixelsA');
        this.mapPixelsToParticles(pixelsB, this.particles, 'end', 'dependentPixelsB');

        // Create buffers
        this.bufferCanvasA = document.createElement('canvas');
        this.bufferCanvasA.width = this.width;
        this.bufferCanvasA.height = this.height;
        this.bufferCtxA = this.bufferCanvasA.getContext('2d');
        this.imgDataA = this.bufferCtxA.createImageData(this.width, this.height);

        this.bufferCanvasB = document.createElement('canvas');
        this.bufferCanvasB.width = this.width;
        this.bufferCanvasB.height = this.height;
        this.bufferCtxB = this.bufferCanvasB.getContext('2d');
        this.imgDataB = this.bufferCtxB.createImageData(this.width, this.height);

        // Click / Touch Interaction
        // Attaching to document.body to ensure we catch everything
        document.body.addEventListener('click', () => {
            console.log("Body clicked");
            this.triggerTransition()
        });
        document.body.addEventListener('touchstart', (e) => {
            console.log("Body touched");
            e.preventDefault();
            this.triggerTransition();
        }, { passive: false });

        this.canvas.style.cursor = 'pointer';

        console.log("Init Complete & Listeners Active");

        // Start Loop
        this.phaseStartTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));

        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        });
    }

    mapPixelsToParticles(pixels, particles, posKey, targetKey) {
        const gridSize = 40;
        const grid = {};
        particles.forEach(p => {
            const key = `${Math.floor(p[posKey].x / gridSize)},${Math.floor(p[posKey].y / gridSize)}`;
            if (!grid[key]) grid[key] = [];
            grid[key].push(p);
        });

        pixels.forEach(px => {
            const gx = Math.floor(px.x / gridSize);
            const gy = Math.floor(px.y / gridSize);
            let minDist = Infinity;
            let closest = null;

            for (let xx = gx - 1; xx <= gx + 1; xx++) {
                for (let yy = gy - 1; yy <= gy + 1; yy++) {
                    const key = `${xx},${yy}`;
                    if (grid[key]) {
                        for (let p of grid[key]) {
                            const dx = p[posKey].x - px.x;
                            const dy = p[posKey].y - px.y;
                            const distSq = dx * dx + dy * dy;
                            if (distSq < minDist) {
                                minDist = distSq;
                                closest = p;
                            }
                        }
                    }
                }
            }
            if (!closest) {
                for (let p of particles) {
                    const dx = p[posKey].x - px.x;
                    const dy = p[posKey].y - px.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDist) {
                        minDist = distSq;
                        closest = p;
                    }
                }
            }
            if (closest) closest[targetKey].push(px);
        });
    }

    triggerTransition() {
        console.log("Triggering transition from phase:", this.phase);
        const now = performance.now();
        if (this.phase === 'REST_A') {
            this.phase = 'TO_B';
            this.phaseStartTime = now;
            this.currentPhaseDuration = this.durations.TO_B.val;
        } else if (this.phase === 'REST_B') {
            this.phase = 'TO_A';
            this.phaseStartTime = now;
            this.currentPhaseDuration = this.durations.TO_A.val;
        }
    }

    loop(timestamp) {
        // State Machine Update
        const elapsed = timestamp - this.phaseStartTime;

        // Check for Phase Transition (Only for active transitions)
        // Transitions (TO_B, TO_A) complete automatically. 
        // REST phases wait for user interaction.

        let actualDuration = this.currentPhaseDuration;
        if (this.phase === 'TO_B' || this.phase === 'TO_A') {
            actualDuration = 4000; // Safe buffer for particle delays

            if (elapsed > actualDuration) {
                this.phaseStartTime = timestamp;
                // Transition Complete -> Go to Rest
                switch (this.phase) {
                    case 'TO_B':
                        this.phase = 'REST_B';
                        this.currentPhaseDuration = this.getRandomDuration('REST_B'); // Set new duration for REST_B
                        break;
                    case 'TO_A':
                        this.phase = 'REST_A';
                        this.currentPhaseDuration = this.getRandomDuration('REST_A'); // Set new duration for REST_A
                        break;
                }
            }
        }

        // Draw
        this.draw(elapsed, this.currentPhaseDuration);

        requestAnimationFrame((t) => this.loop(t));
    }

    draw(phaseTime, phaseDuration) {
        this.ctx.fillStyle = '#C8C8C8';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Prepare pixel buffers
        const dataA = this.imgDataA.data;
        const dataB = this.imgDataB.data;

        // Clear buffers
        dataA.fill(0);
        dataB.fill(0);

        let hasPixelsA = false;
        let hasPixelsB = false;

        // Update and Draw Particles
        for (const p of this.particles) {
            // Get local t for this particle
            const t = p.updateAndDraw(this.ctx, this.phase, phaseTime, 2500);

            // --- Image A Reconstruction (Visible when particle is near start, t < 0.3) ---
            if (t < 0.3) {
                const alpha = Math.floor(255 * (1 - t / 0.3));
                if (alpha > 0) {
                    hasPixelsA = true;
                    for (const px of p.dependentPixelsA) {
                        const idx = (Math.floor(px.y) * this.width + Math.floor(px.x)) * 4;
                        if (idx >= 0 && idx < dataA.length) {
                            dataA[idx] = px.r;
                            dataA[idx + 1] = px.g;
                            dataA[idx + 2] = px.b;
                            dataA[idx + 3] = alpha;
                        }
                    }
                }
            }

            // --- Image B Reconstruction (Visible when particle is near end, t > 0.7) ---
            if (t > 0.7) {
                const alpha = Math.floor(255 * ((t - 0.7) / 0.3));
                if (alpha > 0) {
                    hasPixelsB = true;
                    for (const px of p.dependentPixelsB) {
                        const idx = (Math.floor(px.y) * this.width + Math.floor(px.x)) * 4;
                        if (idx >= 0 && idx < dataB.length) {
                            dataB[idx] = px.r;
                            dataB[idx + 1] = px.g;
                            dataB[idx + 2] = px.b;
                            dataB[idx + 3] = alpha;
                        }
                    }
                }
            }
        }

        // Blit buffers
        if (hasPixelsA) {
            this.bufferCtxA.putImageData(this.imgDataA, 0, 0);
            this.ctx.drawImage(this.bufferCanvasA, 0, 0);
        }
        if (hasPixelsB) {
            this.bufferCtxB.putImageData(this.imgDataB, 0, 0);
            this.ctx.drawImage(this.bufferCanvasB, 0, 0);
        }
    }
}

// Global Init
window.initMorphAnimation = (canvasId, imgA, imgB) => {
    return new MorphAnimation(canvasId, imgA, imgB);
};
