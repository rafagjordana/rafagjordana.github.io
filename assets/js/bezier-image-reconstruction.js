/**
 * Bezier Image Reconstruction
 * Ported from Processing to Modern Vanilla JS
 */

class BezierParticle {
    constructor(endPos, color, size, parent) {
        this.parent = parent;
        this.color = color; // {r, g, b}
        this.nominalSize = size;
        this.dependentPixels = [];

        // Bezier Control Points
        // We pre-calculate coefficients to avoid expensive math per frame
        const startX = parent.width / 2 + (Math.random() - 0.5) * parent.width * 2.5;
        const startY = parent.height / 2 + (Math.random() - 0.5) * parent.height * 2.5;

        const v1x = (Math.random() - 0.5) * parent.width * 2;
        const v1y = (Math.random() - 0.5) * parent.height * 2;
        const v2x = (Math.random() - 0.5) * parent.width * 2;
        const v2y = (Math.random() - 0.5) * parent.height * 2;

        const endX = endPos.x;
        const endY = endPos.y;
        this.end = { x: endX, y: endY };

        // Store start position for the formula
        this.x0 = startX;
        this.y0 = startY;
        // Store end position for distance checks
        this.endX = endX;
        this.endY = endY;

        // Calculate Cubic Bezier Coefficients
        // x(t) = ax*t^3 + bx*t^2 + cx*t + x0
        this.cx = 3 * (v1x - startX);
        this.bx = 3 * (v2x - v1x) - this.cx;
        this.ax = endX - startX - this.cx - this.bx;

        this.cy = 3 * (v1y - startY);
        this.by = 3 * (v2y - v1y) - this.cy;
        this.ay = endY - startY - this.cy - this.by;

        this.speed = 2 + Math.random();
        this.state = 0;
        this.completedFirst = false;
        this.isActive = true;
        this.alpha = 255;
    }

    update(mouseX, mouseY, isMouseDown, isOutside) {
        // 1. Calculate next state
        const attractiveForce = (this.speed - this.state) / 400;
        let repulsiveForce = 0;

        if (this.completedFirst && !isOutside) {
            // Inline Position Calculation for Repulsion Check
            const t = Math.min(1, this.state);
            const t2 = t * t;
            const t3 = t2 * t;

            const curX = (this.ax * t3) + (this.bx * t2) + (this.cx * t) + this.x0;
            const curY = (this.ay * t3) + (this.by * t2) + (this.cy * t) + this.y0;

            const dx = (mouseX - this.parent.offsetX) - curX;
            const dy = (mouseY - this.parent.offsetY) - curY;
            // Simplified distance check (avoid expensive sqrt if possible, but 1/dist needs it)
            // We'll keep sqrt for accuracy in force magnitude
            const dist = Math.sqrt(dx * dx + dy * dy) + 20;
            repulsiveForce = (isMouseDown ? 5.0 : 1.0) / dist;
        }

        const force = attractiveForce - repulsiveForce;
        // Allows particles to be pushed indefinitely away
        this.state = Math.min(1.03, this.state + force);

        // 2. Update Active State
        this.isActive = (this.state < 1.03);

        // 3. Update Alpha
        if (this.state > 1) {
            this.alpha = Math.floor(Math.max(1, Math.min(255, 2550 * (1.03 - this.state))));
            this.completedFirst = true;
        } else {
            this.alpha = 255;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        const t = Math.min(1, this.state);
        // Optimization: Unroll Math.pow
        const t2 = t * t;
        const t3 = t2 * t;

        const x = (this.ax * t3) + (this.bx * t2) + (this.cx * t) + this.x0;
        const y = (this.ay * t3) + (this.by * t2) + (this.cy * t) + this.y0;

        // Ensure size doesn't explode if t becomes very negative
        const sizeFactor = Math.max(0, 1 - t);
        const currentSize = this.nominalSize * (1 + 5 * sizeFactor);

        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha / 255})`;
        ctx.beginPath();
        // arc is relatively expensive, could use rect for tiny particles if needed, but arc is nicer
        ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class BezierAnimation {
    constructor(canvasId, imagePath, numParticles = 3000) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.imagePath = imagePath;
        this.numParticles = numParticles;

        this.particles = [];
        this.width = 0;
        this.height = 0;
        this.offsetX = 0;
        this.offsetY = 0;

        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.isOutside = true;

        this.img = new Image();
        this.img.crossOrigin = "Anonymous";
        this.img.onload = () => this.init();
        this.img.src = imagePath;

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.isOutside = false;
        });
        this.canvas.addEventListener('mouseleave', () => this.isOutside = true);
        this.canvas.addEventListener('mousedown', () => this.isMouseDown = true);
        this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.img.width) {
            this.offsetX = (this.width - this.img.width) / 2;
            this.offsetY = (this.height - this.img.height) / 2;
        }
    }

    init() {
        this.resize();

        // Create a temporary canvas to extract image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.img.width;
        tempCanvas.height = this.img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, this.img.width, this.img.height);
        const pixels = imageData.data;

        const usefulPixels = [];
        const threshold = 0.03 * 255;

        // Find non-white/threshold pixels
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // Simple brightness threshold (inverted compared to original for typical pngs)
            const brightness = (r + g + b) / 3;
            if (brightness < 250) { // Keep darker pixels (assuming white background)
                usefulPixels.push({
                    index: i / 4,
                    r, g, b,
                    x: (i / 4) % this.img.width,
                    y: Math.floor((i / 4) / this.img.width)
                });
            }
        }

        // Initialize particles
        const endpoints = [];
        for (let i = 0; i < this.numParticles; i++) {
            const randomPixel = usefulPixels[Math.floor(Math.random() * usefulPixels.size)];
            // In the original, it used a specific probability logic. 
            // Here we'll just pick random representatives.
            const pIdx = Math.floor(Math.random() * usefulPixels.length);
            const target = usefulPixels[pIdx];

            const particle = new BezierParticle(
                { x: target.x, y: target.y },
                { r: target.r, g: target.g, b: target.b },
                5,
                this
            );
            this.particles.push(particle);
            endpoints.push(particle);
        }

        // Efficient Pixel Mapping using Spatial Partitioning (Grid)
        // Complexity: O(N) instead of O(N*P)
        const gridSize = 40;
        const grid = {};

        // 1. Populate Grid with Particles
        this.particles.forEach(p => {
            const key = `${Math.floor(p.end.x / gridSize)},${Math.floor(p.end.y / gridSize)}`;
            if (!grid[key]) grid[key] = [];
            grid[key].push(p);
        });

        // 2. Map Pixels to Closest Particle (checking only neighbors)
        usefulPixels.forEach(px => {
            const gx = Math.floor(px.x / gridSize);
            const gy = Math.floor(px.y / gridSize);

            let minDist = Infinity;
            let closest = null;

            // Search current cell and 8 neighbors
            for (let xx = gx - 1; xx <= gx + 1; xx++) {
                for (let yy = gy - 1; yy <= gy + 1; yy++) {
                    const key = `${xx},${yy}`;
                    if (grid[key]) {
                        for (let p of grid[key]) {
                            const dx = p.end.x - px.x;
                            const dy = p.end.y - px.y;
                            const distSq = dx * dx + dy * dy;
                            if (distSq < minDist) {
                                minDist = distSq;
                                closest = p;
                            }
                        }
                    }
                }
            }

            // Fallback: If no particle found in neighbors (rare, but possible in sparse areas), 
            // search a wider area or just skip (skipping is fine for visual redundancy)
            // But let's do a quick global fallback if nothing found solely to avoid orphaned pixels
            if (!closest) {
                // Expanded search (brute force fallback for orphans)
                for (let p of this.particles) {
                    const dx = p.end.x - px.x;
                    const dy = p.end.y - px.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDist) {
                        minDist = distSq;
                        closest = p;
                    }
                }
            }

            if (closest) closest.dependentPixels.push(px);
        });

        this.targetImageData = tempCtx.createImageData(this.img.width, this.img.height);
        this.animate();
    }

    animate() {
        this.ctx.fillStyle = '#C8C8C8'; // background(200)
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Clear target image data buffer
        const data = this.targetImageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i + 3] = 0; // Set alpha to 0
        }

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);

        this.particles.forEach(p => {
            p.update(this.mouseX, this.mouseY, this.isMouseDown, this.isOutside);

            // Update the dependent pixels in the buffer
            let revealAlpha = p.state < 1 ? 0 : (255 - p.alpha);

            p.dependentPixels.forEach(px => {
                const idx = px.index * 4;
                data[idx] = px.r;
                data[idx + 1] = px.g;
                data[idx + 2] = px.b;
                data[idx + 3] = revealAlpha;
            });

            p.draw(this.ctx);
        });

        // Draw the reconstructed image parts
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.img.width;
        tempCanvas.height = this.img.height;
        tempCanvas.getContext('2d').putImageData(this.targetImageData, 0, 0);
        this.ctx.drawImage(tempCanvas, 0, 0);

        this.ctx.restore();

        requestAnimationFrame(() => this.animate());
    }
}

// Global hook to start animation
window.initBezierAnimation = (canvasId, imagePath) => {
    return new BezierAnimation(canvasId, imagePath);
};
