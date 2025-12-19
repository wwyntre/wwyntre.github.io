// DOM REFERENCES
const titleScreen = document.getElementById("title-screen");
const packSelectScreen = document.getElementById("pack-select-screen");
const levelListScreen = document.getElementById("level-list-screen");

const packList = document.getElementById("pack-list");
const levelSelectContainer = document.getElementById("level-select-container");
const currentPackTitle = document.getElementById("current-pack-title");
const backToPacksButton = document.getElementById("back-to-packs");
const exitGameButton = document.getElementById("exit-game");


// STATE
let currentLevelIndex = 0;
let usingKeyboard = false;
let loadedPacks = [];

// SPRITES
const TILE_SIZE = 64;
const SPRITE_PATHS = {
    0: "air.png",    
    1: "wall.png",
    2: "floor.png",
    3: "player.png",
    4: "box.png",
    5: "goal.png"
};

const Sprites = {};

function loadSprites() {
    const promises = [];

    for (const code in SPRITE_PATHS) {
        const img = new Image();
        img.src = SPRITE_PATHS[code];

        promises.push(
            new Promise((resolve, reject) => {
                img.onload = () => {
                    Sprites[code] = img;
                    resolve();
                };
                img.onerror = () => reject(`failed to load ${SPRITE_PATHS[code]}`);
            })
        );
    }

    return Promise.all(promises);
}

// HELPERS
function parsePuzzle(code) {
    return code.split("-").map(row =>
        row.split("").map(n => parseInt(n))
    );
}

function createDifficultyStars(count) {
    let out = "";

    const star = "icons/star.png";
    const nostar = "icons/nostar.png";
    
    for (let i = 0; i < 5; i++) {
        const starPath = i < count ? star : nostar; 
        
        out += `<img src="${starPath}" alt="Difficulty Star" class="difficulty-star">`;
    }
    return out;
}

// PREVIEW RENDERING
function renderLevelPreview(canvas, puzzle) {
    const ctx = canvas.getContext("2d");

    const grid = parsePuzzle(puzzle);
    const rows = grid.length;
    const cols = grid[0].length;

    const MAX_TILE_SIZE = 32;
    const tileSize = Math.min(MAX_TILE_SIZE, canvas.width / cols, canvas.height / rows);

    const gridWidth = tileSize * cols;
    const gridHeight = tileSize * rows;

    const offsetX = (canvas.width - gridWidth) / 2;
    const offsetY = (canvas.height - gridHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const t = grid[r][c];
            const x = offsetX + c * tileSize;
            const y = offsetY + r * tileSize;

            if (t === 2 || t === 3 || t === 4) ctx.drawImage(Sprites[2], x, y, tileSize, tileSize);

            if (t === 5 || t === 6 || t === 7) ctx.drawImage(Sprites[5], x, y, tileSize, tileSize);

            if (t === 1) ctx.drawImage(Sprites[1], x, y, tileSize, tileSize);
            if (t === 3 || t === 6) ctx.drawImage(Sprites[3], x, y, tileSize, tileSize);
            if (t === 4 || t === 7) ctx.drawImage(Sprites[4], x, y, tileSize, tileSize);
        }
    }
}

// LEVEL LIST
function renderLevelList(pack) {
    levelSelectContainer.innerHTML = "";

    pack.levels.forEach((level, index) => {
        const item = document.createElement("div");
        item.className = "level-list-item";
        item.dataset.index = index;

        const canvas = document.createElement("canvas");
        canvas.className = "level-preview-canvas";
        canvas.width = 64;
        canvas.height = 64;

        renderLevelPreview(canvas, level.code);

        const info = document.createElement("div");
        info.className = "level-list-info";
        info.innerHTML = `<p class="level-name-text">${level.levelName}</p>`;

        item.appendChild(canvas);
        item.appendChild(info);

item.addEventListener("click", () => {
    usingKeyboard = false;
    document.querySelectorAll(".level-list-item")
        .forEach(i => i.classList.remove("keyboard-selected"));

    if (window.startLevel) {
        console.log("Starting Level:", level.levelName); 
        window.startLevel(pack, index); 
    } else {
        console.error("The startLevel function is not globally available. Check game.js execution.");
    }
});

        levelSelectContainer.appendChild(item);
    });
}

function updateLevelSelection(index) {
    const items = document.querySelectorAll(".level-list-item");
    if (!items.length) return;

    index = Math.max(0, Math.min(items.length - 1, index));

    items.forEach(i => i.classList.remove("keyboard-selected"));
    items[index].classList.add("keyboard-selected");

    items[index].scrollIntoView({ block: "nearest" });
    currentLevelIndex = index;
}

function handleKeyboardNavigation(e) {
    if (!levelListScreen.classList.contains("active")) return;

    if (e.key === "ArrowDown") {
        e.preventDefault();
        updateLevelSelection(currentLevelIndex + 1);
    }

    if (e.key === "ArrowUp") {
        e.preventDefault();
        updateLevelSelection(currentLevelIndex - 1);
    }

    if (e.key === "Enter") {
        const selected = document.querySelector(".keyboard-selected");
        if (selected) selected.click();
    }
}

// SCREEN TRANSITIONS
function goToPackSelect() {
    titleScreen.classList.add("title-screen-out"); 

    packSelectScreen.classList.add("pack-screen-start");
    packSelectScreen.classList.add("active"); 

    const delayDuration = 1000;

    setTimeout(() => {
        
        packSelectScreen.classList.remove("pack-screen-start");

        setTimeout(() => {
            titleScreen.classList.remove("active");
            titleScreen.classList.remove("title-screen-out");
        }, 1500); 

    }, delayDuration); 


    document.removeEventListener("keydown", handleKeyboardNavigation);
}

function goToGameScreen() {
    levelListScreen.classList.remove("active");
    gameScreen.classList.add("active");
}

function goToLevelListFromGame() {
    gameScreen.classList.remove("active");
    levelListScreen.classList.add("active");
}

function goToLevelList(pack) {
    packSelectScreen.classList.remove("active");
    levelListScreen.classList.add("active");

    currentPackTitle.textContent = pack.packName;
    renderLevelList(pack);
}

window.goToGameScreen = goToGameScreen;
window.goToLevelListFromGame = goToLevelListFromGame;


// PACK RENDERING
function renderPackCard(pack) {
    const card = document.createElement("div");
    card.className = "pack-card";

    card.innerHTML = `
        <h3 class="pack-name">${pack.packName}</h3>
        <p class="pack-description">${pack.description}</p>
        <div class="pack-difficulty">${createDifficultyStars(pack.difficulty)}</div>
    `;

    card.addEventListener("click", () => goToLevelList(pack));
    packList.appendChild(card);
}

// PACK LOADING
async function loadPacks() {
    const packFiles = [
        "packs/sim.json",
        "packs/pulse.json",
        "packs/hazard.json",  
        "packs/fathom.json",                
        "packs/galaxy.json"
    ];
    const results = [];

    for (const path of packFiles) {
        const res = await fetch(path);
        if (!res.ok) {
            console.error("failed to load pack:", path);
            continue;
        }

        const packData = await res.json();
        results.push(packData);
    }

    return results;
}

// INIT
let firstClick = true;

titleScreen.addEventListener("click", () => {
    if (firstClick) {
        if (window.playWelcomeTrackAndStartLoop) {
            window.playWelcomeTrackAndStartLoop();
        }
        firstClick = false;
    }
    
    goToPackSelect(); 
});

(async () => {
    try {
        await loadSprites();
    } catch (e) {
        console.warn("sprite loading failed, continuing anyway", e);
    }

    loadedPacks = await loadPacks();
    packList.innerHTML = "";

    loadedPacks.forEach(pack => {
        renderPackCard(pack);
    });
})();

backToPacksButton.addEventListener("click", () => {
    levelListScreen.classList.remove("active");
    
    packSelectScreen.classList.add("active");
});

exitGameButton.addEventListener("click", () => {
    gameScreen.classList.add("slide-exit-right");

    setTimeout(() => {
        gameScreen.classList.remove("active");
        levelListScreen.classList.add("active");
        
        gameScreen.classList.remove("slide-exit-right");
        
    }, 800); 
});