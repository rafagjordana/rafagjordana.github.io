/**
 * Bezier Image Reconstruction
 * Ported from Processing to Modern Vanilla JS
 */

class BezierParticle {
    constructor(endPos, color, size, parent) {
        this.parent = parent;
        this.end = { x: endPos.x, y: endPos.y };
        this.color = color; // {r, g, b}
        this.nominalSize = size;
        this.dependentPixels = [];

        // Bezier Control Points
        const start = {
            x: parent.width / 2 + (Math.random() - 0.5) * parent.width * 2.5,
            y: parent.height / 2 + (Math.random() - 0.5) * parent.height * 2.5
        };

        this.v0 = start;
        this.v1 = { x: (Math.random() - 0.5) * parent.width * 2, y: (Math.random() - 0.5) * parent.height * 2 };
        this.v2 = { x: (Math.random() - 0.5) * parent.width * 2, y: (Math.random() - 0.5) * parent.height * 2 };
        this.v3 = this.end;

        this.speed = 2 + Math.random();
        this.state = 0;
        this.completedFirst = false;
        this.isActive = true;
        this.alpha = 255;
    }

    update(mouseX, mouseY, isMouseDown, isOutside) {
        const attractiveForce = (this.speed - this.state) / 400;
        let repulsiveForce = 0;

        if (this.completedFirst && !isOutside) {
            const pos = this.getPosition();
            const dx = (mouseX - this.parent.offsetX) - pos.x;
            const dy = mouseY - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 20;
            repulsiveForce = (isMouseDown ? 5.0 : 1.0) / dist;
        }

        const force = attractiveForce - repulsiveForce;
        this.state = Math.max(0, Math.min(1.03, this.state + force));

        if (this.state >= 1.03) {
            this.isActive = false;
        } else {
            this.isActive = true;
        }

        if (this.state > 1) {
            this.alpha = Math.floor(Math.max(1, Math.min(255, 2550 * (1.03 - this.state))));
            this.completedFirst = true;
        } else {
            this.alpha = 255;
        }
    }

    getPosition() {
        const t = Math.min(1, this.state);
        const cx = 3 * (this.v1.x - this.v0.x);
        const bx = 3 * (this.v2.x - this.v1.x) - cx;
        const ax = this.v3.x - this.v0.x - cx - bx;

        const cy = 3 * (this.v1.y - this.v0.y);
        const by = 3 * (this.v2.y - this.v1.y) - cy;
        const ay = this.v3.y - this.v0.y - cy - by;

        const x = (ax * Math.pow(t, 3)) + (bx * Math.pow(t, 2)) + (cx * t) + this.v0.x;
        const y = (ay * Math.pow(t, 3)) + (by * Math.pow(t, 2)) + (cy * t) + this.v0.y;

        return { x, y };
    }

    draw(ctx) {
        if (!this.isActive) return;

        const pos = this.getPosition();
        const t = Math.min(1, this.state);
        const currentSize = this.nominalSize * (1 + 5 * (1 - t));

        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha / 255})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class BezierAnimation {
    constructor(canvasId, imagePath, numParticles = 500) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.imagePath = imagePath;
        this.numParticles = numParticles;

        this.particles = [];
        this.width = 0;
        this.height = 450;
        this.offsetX = 0;

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
        this.width = window.innerWidth - 100;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.img.width) {
            this.offsetX = (this.width - this.img.width) / 2;
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

        // Map pixels to closest particle (Optimized)
        usefulPixels.forEach(px => {
            let minDist = Infinity;
            let closest = null;

            // For 500 particles, brute force is fast enough in JS
            for (let p of this.particles) {
                const dx = p.end.x - px.x;
                const dy = p.end.y - px.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDist) {
                    minDist = distSq;
                    closest = p;
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
        this.ctx.translate(this.offsetX, 0);

        this.particles.forEach(p => {
            p.update(this.mouseX, this.mouseY, this.isMouseDown, this.isOutside);

            // Update the dependent pixels in the buffer
            const revealAlpha = p.state < 1 ? 0 : (255 - p.alpha);
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
