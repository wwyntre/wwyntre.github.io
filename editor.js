// 1. CONFIGURATION & CONSTANTS
const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const workspace = document.getElementById('workspace');
const settingsModal = document.getElementById('settings-modal');
const exportModal = document.getElementById('export-modal');
const exportOutput = document.getElementById('export-output');

const TILE_SIZE = 40;
const SPRITE_PATHS = {
    0: "Sprites/air.png",    
    1: "Sprites/wall.png",
    2: "Sprites/floor.png",
    3: "Sprites/player.png",
    4: "Sprites/box.png",
    5: "Sprites/goal.png",
    6: "Sprites/player.png", 
    7: "Sprites/box.png"    
};

const TILE_DEFS = [
    { id: 0, name: "Air" },
    { id: 1, name: "Wall" },
    { id: 2, name: "Floor" },
    { id: 3, name: "Player" },
    { id: 4, name: "Box" },
    { id: 5, name: "Goal" },
    { id: 6, name: "Player on Goal" },
    { id: 7, name: "Box on Goal" }
];

// 2. EDITOR STATE
let gridWidth = 10;
let gridHeight = 10;
let editorGrid = [];
let selectedTileId = 1;
let currentTool = 'paint';
let scale = 1.0;
let isDrawing = false;
let lineStart = null; 
const Sprites = {};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const ZOOM_SPEED = 0.1;

// 3. CORE LOGIC & RENDERING

async function loadSprites() {
    const promises = Object.keys(SPRITE_PATHS).map(code => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = SPRITE_PATHS[code];
            img.onload = () => {
                Sprites[code] = img;
                resolve();
            };
        });
    });
    return Promise.all(promises);
}

function createEmptyGrid() {
    editorGrid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));
}

function initCanvas() {
    canvas.width = gridWidth * TILE_SIZE;
    canvas.height = gridHeight * TILE_SIZE;
    createEmptyGrid();
    render();
}

function drawTile(context, tileId, x, y, size) {
    if (tileId !== 0) context.drawImage(Sprites[2], x, y, size, size);
    if (tileId === 5 || tileId === 6 || tileId === 7) context.drawImage(Sprites[5], x, y, size, size);
    if (tileId === 1) context.drawImage(Sprites[1], x, y, size, size);
    if (tileId === 3 || tileId === 6) context.drawImage(Sprites[3], x, y, size, size);
    if (tileId === 4 || tileId === 7) context.drawImage(Sprites[4], x, y, size, size);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            drawTile(ctx, editorGrid[y][x], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

// 4. TOOL ALGORITHMS

function clearExistingPlayer() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (editorGrid[y][x] === 3) editorGrid[y][x] = 2;
            if (editorGrid[y][x] === 6) editorGrid[y][x] = 5;
        }
    }
}

function floodFill(startX, startY, newNode) {
    const targetNode = editorGrid[startY][startX];
    if (targetNode === newNode) return;
    const queue = [[startX, startY]];
    while (queue.length > 0) {
        const [x, y] = queue.shift();
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight && editorGrid[y][x] === targetNode) {
            if (newNode === 3 || newNode === 6) clearExistingPlayer();
            editorGrid[y][x] = newNode;
            queue.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
        }
    }
    render();
}

function getLineCells(x0, y0, x1, y1) {
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
}

// 5. COORDINATE HELPERS

function getGridCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        return { x: gridX, y: gridY };
    }
    return null;
}

// 6. EVENT LISTENERS

canvas.addEventListener('mousedown', (e) => {
    const coords = getGridCoords(e);
    if (!coords) return;

    if (currentTool === 'line') {
        lineStart = coords;
    } else if (currentTool === 'fill') {
        floodFill(coords.x, coords.y, selectedTileId);
    } else {
        isDrawing = true;
        if (selectedTileId === 3 || selectedTileId === 6) clearExistingPlayer();
        editorGrid[coords.y][coords.x] = selectedTileId;
        render();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const coords = getGridCoords(e);
    if (!coords) return;

    if (currentTool === 'line' && lineStart) {
        render(); // Clear for preview
        const cells = getLineCells(lineStart.x, lineStart.y, coords.x, coords.y);
        ctx.globalAlpha = 0.5;
        cells.forEach(c => drawTile(ctx, selectedTileId, c.x * TILE_SIZE, c.y * TILE_SIZE, TILE_SIZE));
        ctx.globalAlpha = 1.0;
    } else if (isDrawing && currentTool === 'paint') {
        if (selectedTileId === 3 || selectedTileId === 6) clearExistingPlayer();
        editorGrid[coords.y][coords.x] = selectedTileId;
        render();
    }
});

window.addEventListener('mouseup', (e) => {
    if (currentTool === 'line' && lineStart) {
        const coords = getGridCoords(e);
        if (coords) {
            const cells = getLineCells(lineStart.x, lineStart.y, coords.x, coords.y);
            cells.forEach(c => {
                if (selectedTileId === 3 || selectedTileId === 6) clearExistingPlayer();
                editorGrid[c.y][c.x] = selectedTileId;
            });
        }
        lineStart = null;
        render();
    }
    isDrawing = false;
});

workspace.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = (e.deltaY < 0) ? Math.min(MAX_SCALE, scale + ZOOM_SPEED) : Math.max(MIN_SCALE, scale - ZOOM_SPEED);
    canvas.style.transform = `scale(${scale})`;
}, { passive: false });

// 7. UI HANDLERS

function createPalette() {
    const container = document.getElementById('tile-palette');
    container.innerHTML = "";
    TILE_DEFS.forEach(tile => {
        const btn = document.createElement('button');
        btn.className = 'palette-btn' + (tile.id === selectedTileId ? ' active' : '');
        btn.setAttribute('data-tile', tile.id);
        
        if (tile.id === 6) btn.style.backgroundImage = `url(${SPRITE_PATHS[3]}), url(${SPRITE_PATHS[5]})`;
        else if (tile.id === 7) btn.style.backgroundImage = `url(${SPRITE_PATHS[4]}), url(${SPRITE_PATHS[5]})`;
        else btn.style.backgroundImage = `url(${SPRITE_PATHS[tile.id]})`;
        
        btn.onclick = () => {
            selectedTileId = tile.id;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        container.appendChild(btn);
    });
}

document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
        currentTool = btn.dataset.tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

document.getElementById('btn-settings').onclick = () => settingsModal.style.display = 'flex';
document.getElementById('close-settings').onclick = () => settingsModal.style.display = 'none';
document.getElementById('apply-settings').onclick = () => {
    gridWidth = parseInt(document.getElementById('input-width').value) || 10;
    gridHeight = parseInt(document.getElementById('input-height').value) || 10;
    initCanvas();
    settingsModal.style.display = 'none';
};

document.getElementById('btn-export').onclick = () => {
    exportOutput.value = editorGrid.map(row => row.join('')).join('-');
    exportModal.style.display = 'flex';
};

document.getElementById('close-export').onclick = () => exportModal.style.display = 'none';
document.getElementById('copy-code').onclick = () => {
    exportOutput.select();
    document.execCommand('copy');
    alert("Copied!");
};

document.getElementById('download-example').onclick = () => {
    const pack = { packName: "My Pack", description: "Sokowyn Pack", difficulty: 3, levels: [{ levelName: "New Level", grid: exportOutput.value }] };
    const blob = new Blob([JSON.stringify(pack, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "pack.json"; a.click();
};

// 8. START
(async () => {
    await loadSprites();
    createPalette();
    initCanvas();
})();