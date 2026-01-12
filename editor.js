/**
 * SOKOWYN EDITOR - INTEGRATED VERSION
 */
const SokowynEditor = {
    canvas: document.getElementById('editor-canvas'),
    ctx: document.getElementById('editor-canvas').getContext('2d'),
    tileSize: 40,
    gridWidth: 10,
    gridHeight: 10,
    grid: [],
    selectedTile: 1,
    tool: 'paint',
    scale: 1.0,
    isDrawing: false,
    lineStart: null,
    sprites: {},
    spritePaths: {
        0: "Sprites/air.png", 1: "Sprites/wall.png", 2: "Sprites/floor.png",
        3: "Sprites/player.png", 4: "Sprites/box.png", 5: "Sprites/goal.png",
        6: "Sprites/player.png", 7: "Sprites/box.png"
    },

    async init() {
        await this.loadEditorSprites();
        this.resetGrid(10, 10);
        this.createPalette();
        this.setupListeners();
        this.render();
    },

    async loadEditorSprites() {
        const promises = Object.entries(this.spritePaths).map(([id, src]) => {
            return new Promise(resolve => {
                const img = new Image();
                img.src = src;
                img.onload = () => { this.sprites[id] = img; resolve(); };
            });
        });
        return Promise.all(promises);
    },

    resetGrid(w, h) {
        this.gridWidth = w;
        this.gridHeight = h;
        this.canvas.width = this.gridWidth * this.tileSize;
        this.canvas.height = this.gridHeight * this.tileSize;
        this.grid = Array.from({ length: h }, () => Array(w).fill(0));
        this.render();
    },

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const id = this.grid[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                if (id !== 0) this.ctx.drawImage(this.sprites[2], px, py, this.tileSize, this.tileSize);
                if ([5, 6, 7].includes(id)) this.ctx.drawImage(this.sprites[5], px, py, this.tileSize, this.tileSize);
                if (id === 1) this.ctx.drawImage(this.sprites[1], px, py, this.tileSize, this.tileSize);
                if (id === 3 || id === 6) this.ctx.drawImage(this.sprites[3], px, py, this.tileSize, this.tileSize);
                if (id === 4 || id === 7) this.ctx.drawImage(this.sprites[4], px, py, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
                this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }
    },

    // TOOLS
    clearPlayer() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 3) this.grid[y][x] = 2;
                if (this.grid[y][x] === 6) this.grid[y][x] = 5;
            }
        }
    },

    floodFill(startX, startY, newNode) {
        const targetNode = this.grid[startY][startX];
        if (targetNode === newNode) return;
        const queue = [[startX, startY]];
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight && this.grid[y][x] === targetNode) {
                if (newNode === 3 || newNode === 6) this.clearPlayer();
                this.grid[y][x] = newNode;
                queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        this.render();
    },

    getLineCells(x0, y0, x1, y1) {
        const cells = [];
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        while (true) {
            cells.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return cells;
    },

    getCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const gx = Math.floor(((e.clientX - rect.left) / this.scale) / this.tileSize);
        const gy = Math.floor(((e.clientY - rect.top) / this.scale) / this.tileSize);
        if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) return { x: gx, y: gy };
        return null;
    },

    setupListeners() {
        this.canvas.onmousedown = (e) => {
            const c = this.getCoords(e);
            if (!c) return;
            if (this.tool === 'fill') this.floodFill(c.x, c.y, this.selectedTile);
            else if (this.tool === 'line') this.lineStart = c;
            else {
                this.isDrawing = true;
                if (this.selectedTile === 3 || this.selectedTile === 6) this.clearPlayer();
                this.grid[c.y][c.x] = this.selectedTile;
                this.render();
            }
        };

        window.onmousemove = (e) => {
            const c = this.getCoords(e);
            if (!c) return;
            if (this.isDrawing) {
                if (this.selectedTile === 3 || this.selectedTile === 6) this.clearPlayer();
                this.grid[c.y][c.x] = this.selectedTile;
                this.render();
            }
        };

        window.onmouseup = (e) => {
            const c = this.getCoords(e);
            if (this.tool === 'line' && this.lineStart && c) {
                const cells = this.getLineCells(this.lineStart.x, this.lineStart.y, c.x, c.y);
                cells.forEach(cell => {
                    if (this.selectedTile === 3 || this.selectedTile === 6) this.clearPlayer();
                    this.grid[cell.y][cell.x] = this.selectedTile;
                });
                this.render();
            }
            this.isDrawing = false;
            this.lineStart = null;
        };

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = () => {
                this.tool = btn.dataset.tool;
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        // Settings
        document.getElementById('apply-settings').onclick = () => {
            const w = parseInt(document.getElementById('input-width').value) || 10;
            const h = parseInt(document.getElementById('input-height').value) || 10;
            this.resetGrid(w, h);
            document.getElementById('settings-modal').style.display = 'none';
        };

        // Playtest Bridge
        document.getElementById('btn-play').onclick = () => {
            const code = this.grid.map(row => row.join('')).join('-');
            if (!code.includes('3') && !code.includes('6')) return alert("Place a player!");
            document.getElementById('playtest-overlay').style.display = 'flex';
            if (window.startLevel) {
                window.startLevel({ packName: "Test", levels: [{ levelName: "Editor Level", code: code }] }, 0);
            }
        };

        document.getElementById('exit-playtest-btn').onclick = () => {
            document.getElementById('playtest-overlay').style.display = 'none';
        };
    },

    createPalette() {
        const pal = document.getElementById('tile-palette');
        pal.innerHTML = '';
        [0, 1, 2, 3, 4, 5, 6, 7].forEach(id => {
            const btn = document.createElement('button');
            btn.className = `palette-btn ${id === this.selectedTile ? 'active' : ''}`;
            btn.style.backgroundImage = `url(${this.spritePaths[id]})`;
            btn.onclick = () => {
                this.selectedTile = id;
                document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            pal.appendChild(btn);
        });
    }
};

SokowynEditor.init();