// ================================
// 1. CONFIG + CONSTANTS
// ================================
const canvas = document.getElementById("editor-canvas");
const ctx = canvas.getContext("2d");
const workspace = document.getElementById("workspace");

const settingsModal = document.getElementById("settings-modal");
const exportModal = document.getElementById("export-modal");
const exportOutput = document.getElementById("export-output");
let initialSnapshot = null;

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

const Sprites = {};


// ================================
// 2. EDITOR STATE
// ================================
let gridWidth = 10;
let gridHeight = 10;
let editorGrid = [];

let selectedTileId = 1;
let currentTool = "paint";

let scale = 1;
let isDrawing = false;
let lineStart = null;


// ================================
// 3. PLAYTEST STATE
// ================================
let isPlaytesting = false;
let playtestGrid = null;
let playerPos = null;
let reverseMode = false;


// ================================
// 4. GRID / SPRITES
// ================================
async function loadSprites() {
    const jobs = Object.entries(SPRITE_PATHS).map(([id, src]) => {
        return new Promise(resolve => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                Sprites[id] = img;
                resolve();
            };
        });
    });
    await Promise.all(jobs);
}

function createEmptyGrid() {
    editorGrid = Array.from({ length: gridHeight }, () =>
        Array(gridWidth).fill(0)
    );
}

function initCanvas() {
    canvas.width = gridWidth * TILE_SIZE;
    canvas.height = gridHeight * TILE_SIZE;
    createEmptyGrid();
    renderEditor();
}


// ================================
// 5. DRAWING
// ================================
function drawTile(context, tile, x, y) {
    if (tile !== 0) context.drawImage(Sprites[2], x, y, TILE_SIZE, TILE_SIZE);
    if (tile === 5 || tile === 6 || tile === 7) context.drawImage(Sprites[5], x, y, TILE_SIZE, TILE_SIZE);
    if (tile === 1) context.drawImage(Sprites[1], x, y, TILE_SIZE, TILE_SIZE);
    if (tile === 3 || tile === 6) context.drawImage(Sprites[3], x, y, TILE_SIZE, TILE_SIZE);
    if (tile === 4 || tile === 7) context.drawImage(Sprites[4], x, y, TILE_SIZE, TILE_SIZE);
}

function renderEditor() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            drawTile(ctx, editorGrid[y][x], x * TILE_SIZE, y * TILE_SIZE);
            ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function renderPlaytest() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            drawTile(ctx, playtestGrid[y][x], x * TILE_SIZE, y * TILE_SIZE);
            ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}


// ================================
// 6. TOOLS
// ================================
function clearExistingPlayer(grid) {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x] === 3) grid[y][x] = 2;
            if (grid[y][x] === 6) grid[y][x] = 5;
        }
    }
}

function floodFill(x, y, tile) {
    const target = editorGrid[y][x];
    if (target === tile) return;

    const q = [[x, y]];
    while (q.length) {
        const [cx, cy] = q.shift();
        if (
            cx >= 0 && cx < gridWidth &&
            cy >= 0 && cy < gridHeight &&
            editorGrid[cy][cx] === target
        ) {
            if (tile === 3 || tile === 6) clearExistingPlayer(editorGrid);
            editorGrid[cy][cx] = tile;
            q.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
        }
    }
    renderEditor();
}

function getLineCells(x0, y0, x1, y1) {
    const cells = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        cells.push({ x: x0, y: y0 });
        if (x0 === x1 && y0 === y1) break;
        let e2 = err * 2;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return cells;
}


// ================================
// 7. INPUT HELPERS
// ================================
function getGridCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return null;
    return { x: gx, y: gy };
}

function inBounds(x, y) {
    return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
}

function isEmpty(tile) {
    return tile === 2 || tile === 5;
}


// ================================
// 8. EDITOR INPUT
// ================================
canvas.addEventListener("mousedown", e => {
    if (isPlaytesting) return;
    const c = getGridCoords(e);
    if (!c) return;

    if (currentTool === "line") {
        lineStart = c;
    } else if (currentTool === "fill") {
        floodFill(c.x, c.y, selectedTileId);
    } else {
        isDrawing = true;
        if (selectedTileId === 3 || selectedTileId === 6)
            clearExistingPlayer(editorGrid);
        editorGrid[c.y][c.x] = selectedTileId;
        renderEditor();
    }
});

canvas.addEventListener("mousemove", e => {
    if (isPlaytesting) return;
    const c = getGridCoords(e);
    if (!c) return;

    if (currentTool === "line" && lineStart) {
        renderEditor();
        ctx.globalAlpha = 0.5;
        getLineCells(lineStart.x, lineStart.y, c.x, c.y)
            .forEach(p => drawTile(ctx, selectedTileId, p.x*TILE_SIZE, p.y*TILE_SIZE));
        ctx.globalAlpha = 1;
    } else if (isDrawing && currentTool === "paint") {
        if (selectedTileId === 3 || selectedTileId === 6)
            clearExistingPlayer(editorGrid);
        editorGrid[c.y][c.x] = selectedTileId;
        renderEditor();
    }
});

window.addEventListener("mouseup", e => {
    if (isPlaytesting) return;
    if (currentTool === "line" && lineStart) {
        const c = getGridCoords(e);
        if (c) {
            getLineCells(lineStart.x, lineStart.y, c.x, c.y)
                .forEach(p => editorGrid[p.y][p.x] = selectedTileId);
        }
        lineStart = null;
        renderEditor();
    }
    isDrawing = false;
});

workspace.addEventListener("wheel", e => {
    e.preventDefault();
    scale += e.deltaY < 0 ? 0.1 : -0.1;
    scale = Math.max(0.5, Math.min(3, scale));
    canvas.style.transform = `scale(${scale})`;
}, { passive: false });

document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "r") {
        reverseMode = !reverseMode;
        console.log("reverse mode:", reverseMode);
    }
});


// ================================
// 9. PLAYTEST LOGIC
// ================================
function cloneGrid(grid) {
    return grid.map(r => r.slice());
}

function startPlaytest() {
    playtestGrid = cloneGrid(editorGrid);
    playerPos = null;

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (playtestGrid[y][x] === 3 || playtestGrid[y][x] === 6) {
                playerPos = { x, y };
            }
        }
    }

    if (!playerPos) {
        alert("place a player first!");
        return;
    }

    isPlaytesting = true;
    renderPlaytest();
}

function stopPlaytest() {
    isPlaytesting = false;
    playtestGrid = null;
    playerPos = null;
    renderEditor();
}

function isWall(t) { return t === 1; }
function isBox(t) { return t === 4 || t === 7; }
function isGoal(t) { return t === 5 || t === 6 || t === 7; }

let undoStack = [];

function saveState() {
    if (!playtestGrid || !playerPos) return;
    // just store grid + playerPos, we don't need grabbedBox
    undoStack.push({
        grid: playtestGrid.map(r => r.slice()),
        player: { ...playerPos }
    });
    if (undoStack.length > 100) undoStack.shift(); // optional limit
}

function undoMove() {
    if (undoStack.length === 0) return;
    const last = undoStack.pop();
    playtestGrid = last.grid.map(r => r.slice());
    playerPos = { ...last.player };
    renderPlaytest();
}

// helper to get the correct tile under a box/player
function getUnderlyingTile(x, y, movingBox = false) {
    const tile = playtestGrid[y][x];
    if (movingBox) {
        // the box is moving off this tile
        if (tile === 7) return 5; // box on goal -> goal
        if (tile === 4) return 2; // normal box -> floor
    } else {
        // player moving off
        if (tile === 6) return 5; // player on goal -> goal
        if (tile === 3) return 2; // normal player -> floor
    }
    return tile; // default, shouldn't happen
}

function tryMove(dx, dy) {
    if (!playerPos) return;
    const { x, y } = playerPos;
    const nx = x + dx, ny = y + dy; // next player pos
    const bx = x - dx, by = y - dy; // box behind (for reverse)
    const fx = x + dx*2, fy = y + dy*2; // box ahead (for normal)

    if (!inBounds(nx, ny)) return;
    const next = playtestGrid[ny][nx];

// =====================
// REVERSE MODE
// =====================
if (reverseMode) {
    if (isEmpty(next) && inBounds(bx, by) && isBox(playtestGrid[by][bx])) {
        saveState(); 

        const boxTile = playtestGrid[by][bx];  // Origin tile (4 or 7)
        const playerTile = playtestGrid[y][x]; // Target tile for the box (currently player pos)
        const targetTile = playtestGrid[ny][nx]; // Target tile for the player

        // 1. Move box into player's current tile
        // Check if the player's CURRENT tile is a goal (6) or floor (3)
        playtestGrid[y][x] = isGoal(playerTile) ? 7 : 4;

        // 2. Restore what was under the box's original position
        playtestGrid[by][bx] = getUnderlyingTile(bx, by, true);

        // 3. Move player forward to the empty space
        playtestGrid[ny][nx] = isGoal(targetTile) ? 6 : 3;

        playerPos = { x: nx, y: ny };
        renderPlaytest();
        return;
    }
}

    // =====================
    // NORMAL MODE
    // =====================
    if (isWall(next)) return;

    // if box in front
    if (isBox(next)) {
        if (!inBounds(fx, fy)) return;
        const after = playtestGrid[fy][fx];
        if (isWall(after) || isBox(after)) return;

        saveState(); // save state for undo

        // push box forward
        playtestGrid[fy][fx] = isGoal(after) ? 7 : 4;
        playtestGrid[ny][nx] = isGoal(next) ? 6 : 3;

        // restore player tile
        playtestGrid[y][x] = getUnderlyingTile(x, y, false);

        playerPos = { x: nx, y: ny };
        renderPlaytest();
        return;
    }

    // =====================
    // EMPTY TILE
    // =====================
    saveState(); // moving into empty space counts
    playtestGrid[ny][nx] = isGoal(next) ? 6 : 3;
    playtestGrid[y][x] = getUnderlyingTile(x, y, false);
    playerPos = { x: nx, y: ny };
    renderPlaytest();
}

window.addEventListener("keydown", e => {
    if (!isPlaytesting) return;

    if (e.key === "q") {
        undoMove();
    } else if (e.key === "ArrowUp" || e.key === "w") tryMove(0, -1);
    else if (e.key === "ArrowDown" || e.key === "s") tryMove(0, 1);
    else if (e.key === "ArrowLeft" || e.key === "a") tryMove(-1, 0);
    else if (e.key === "ArrowRight" || e.key === "d") tryMove(1, 0);
    else if (e.key === "Escape") stopPlaytest();
});


// ================================
// 10. UI
// ================================
function createPalette() {
    const p = document.getElementById("tile-palette");
    p.innerHTML = "";
    TILE_DEFS.forEach(t => {
        const b = document.createElement("button");
        b.className = "palette-btn" + (t.id === selectedTileId ? " active" : "");
        b.style.backgroundImage =
            t.id === 6 ? `url(${SPRITE_PATHS[3]}),url(${SPRITE_PATHS[5]})` :
            t.id === 7 ? `url(${SPRITE_PATHS[4]}),url(${SPRITE_PATHS[5]})` :
            `url(${SPRITE_PATHS[t.id]})`;
        b.onclick = () => {
            selectedTileId = t.id;
            document.querySelectorAll(".palette-btn").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
        };
        p.appendChild(b);
    });
}

document.getElementById("btn-export").onclick = () => {
    exportOutput.value = editorGrid.map(r => r.join("")).join("-");
    exportModal.style.display = "flex";
};

document.getElementById("close-export").onclick = () => exportModal.style.display = "none";

document.getElementById("btn-settings").onclick = () => settingsModal.style.display = "flex";
document.getElementById("close-settings").onclick = () => settingsModal.style.display = "none";

document.getElementById("apply-settings").onclick = () => {
    gridWidth = +document.getElementById("input-width").value;
    gridHeight = +document.getElementById("input-height").value;
    initCanvas();
    settingsModal.style.display = "none";
};

document.getElementById("btn-playtest").onclick = () => {
    isPlaytesting ? stopPlaytest() : startPlaytest();
};

document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.onclick = () => {
        currentTool = btn.dataset.tool;
        document.querySelectorAll(".tool-btn")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    };
});


// ================================
// 11. STARTUP
// ================================
(async () => {
    await loadSprites();
    createPalette();
    initCanvas();
})();
