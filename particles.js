const particleSettings = {
    "count": 30,
    "minCount": 18,
    "minSize": 3,
    "maxSize": 8,
    "minSpeed": 0.0005,
    "maxSpeed": 0.003,
    "spawnInterval": 1000,
    "fadeDuration": 1000
};

const sparkleSettings = {
    variations: [
        { id: 1, count: 2, folder: 'Sprites/Sparkles/1', frames: 4 }, 
        { id: 2, count: 2, folder: 'Sprites/Sparkles/2', frames: 2 },
        { id: 3, count: 1, folder: 'Sprites/Sparkles/3', frames: 4 }
    ],
    frameDelay: 120, 
    lifespan: 20000, 
    fadeDuration: 2000,
    size: 32 ,
    maxOpacity: 0.2
};

const bgCanvas = document.getElementById('bg-particles');
const bgCtx = bgCanvas.getContext('2d');
let particles = [];
let sparkles = [];
let sparkleAssets = {};
let assetsReady = false;

function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBg);
resizeBg();

//CLASS DEFINITIONS

class Particle {
    constructor() { this.init(); }
    init() {
        this.centerX = Math.random() * bgCanvas.width;
        this.centerY = Math.random() * bgCanvas.height;
        this.radius = Math.random() * 50 + 20;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * (particleSettings.maxSpeed - particleSettings.minSpeed) + particleSettings.minSpeed;
        this.size = Math.random() * (particleSettings.maxSize - particleSettings.minSize) + particleSettings.minSize;
        this.maxOpacity = Math.random() * 0.3 + 0.1;
        this.currentOpacity = 0;
        this.age = 0;
        this.lifespan = Math.random() * (45000 - 20000) + 20000;
        this.isDead = false;
    }
    update(deltaTime) {
        this.age += deltaTime;
        if (this.age < particleSettings.fadeDuration) {
            this.currentOpacity = (this.age / particleSettings.fadeDuration) * this.maxOpacity;
        } else if (this.age > this.lifespan - particleSettings.fadeDuration) {
            this.currentOpacity = ((this.lifespan - this.age) / particleSettings.fadeDuration) * this.maxOpacity;
        } else { this.currentOpacity = this.maxOpacity; }
        this.angle += this.speed;
        this.x = this.centerX + Math.cos(this.angle) * this.radius;
        this.y = this.centerY + Math.sin(this.angle) * this.radius;
        if (this.age >= this.lifespan) this.isDead = true;
    }
    draw() {
        bgCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, this.currentOpacity)})`;
        bgCtx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Sparkle {
    constructor(variationId) {
        this.vId = variationId;
        this.frames = sparkleAssets[variationId];
        this.currentFrame = 0;
        this.lastFrameUpdate = performance.now();
        this.age = 0;
        this.opacity = 0;
        this.remove = false;
        this.spawn();
    }
    spawn() {
        let valid = false; let attempts = 0;
        while (!valid && attempts < 50) {
            this.x = Math.random() * (bgCanvas.width - sparkleSettings.size);
            this.y = Math.random() * (bgCanvas.height - sparkleSettings.size);
            valid = sparkles.every(other => Math.hypot(this.x - other.x, this.y - other.y) > sparkleSettings.size);
            attempts++;
        }
    }
    update(timestamp, deltaTime) {
        this.age += deltaTime;
        if (timestamp - this.lastFrameUpdate > sparkleSettings.frameDelay) {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            this.lastFrameUpdate = timestamp;
        }
        if (this.age < sparkleSettings.fadeDuration) {
            this.opacity = this.age / sparkleSettings.fadeDuration;
        } else if (this.age > sparkleSettings.lifespan - sparkleSettings.fadeDuration) {
            this.opacity = (sparkleSettings.lifespan - this.age) / sparkleSettings.fadeDuration;
        } else { this.opacity = 1; }
        if (this.age >= sparkleSettings.lifespan) this.remove = true;
    }
    draw() {
    bgCtx.globalAlpha = Math.max(0, this.opacity * sparkleSettings.maxOpacity);
    bgCtx.drawImage(this.frames[this.currentFrame], this.x, this.y, sparkleSettings.size, sparkleSettings.size);
    bgCtx.globalAlpha = 1.0;
    }
}

//INITIALIZATION & LOOPING

for (let i = 0; i < particleSettings.count; i++) { particles.push(new Particle()); }

let lastTime = performance.now();

function animateBg(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    particles = particles.filter(p => !p.isDead);
    if (particles.length < particleSettings.minCount) {
        for (let i = 0; i < 5; i++) {
            if (particles.length < particleSettings.count) particles.push(new Particle());
        }
    }
    particles.forEach(p => { p.update(deltaTime); p.draw(); });

    if (assetsReady) {
        sparkles = sparkles.filter(s => !s.remove);
        sparkleSettings.variations.forEach(v => {
            const currentCount = sparkles.filter(s => s.vId === v.id).length;
            if (currentCount < v.count) sparkles.push(new Sparkle(v.id));
        });
        sparkles.forEach(s => { s.update(timestamp, deltaTime); s.draw(); });
    }
    
    requestAnimationFrame(animateBg);
}

//ASSET LOADING

async function preloadSparkles() {
    try {
        for (const v of sparkleSettings.variations) {
            sparkleAssets[v.id] = [];
            for (let i = 1; i <= v.frames; i++) {
                const img = new Image();
                img.src = `${v.folder}/frame${i}.png`;
                await img.decode();
                sparkleAssets[v.id].push(img);
            }
        }
        assetsReady = true; 
        console.log("Sparkles initialized.");
    } catch (e) {
        console.error("Failed to load sparkles. Check folder paths and frame counts.", e);
    }
}

//START TS
preloadSparkles();
requestAnimationFrame(animateBg);