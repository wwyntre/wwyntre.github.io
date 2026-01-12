//GLOBAL STATE VARIABLES
currentPack = null; 
currentLevelIndex = 0; 

let grid = [];
let player = { row: 0, col: 0 }; 
let boxes = [];
let goals = [];
let highlightTiles = []; 

let isAnimating = false;
let keysPressed = {};
let keyRepeatInterval = null;
let animationQueue = [];
let animationStartTime = 0;
let moveCount = 0;
const ANIMATION_DURATION = 85;
const MAX_TILE_SIZE = 128;
const moveCountDisplay = document.getElementById("move-count"); 

//HISTORY VARIABLES
let history = [];
let historyIndex = -1;
let initialLevelState = null;

//DOM ELEMENTS
const gameScreen = document.getElementById("game-screen");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

//COMPLETION CARD ELEMENTS
const completionCard = document.getElementById("completion-card");
const backButton = document.getElementById("back-to-levels");

// UI/ACTION ELEMENTS
const levelNameDisplay = document.getElementById("level-name-display"); 
const undoIcon = document.getElementById("undo-icon");
const redoIcon = document.getElementById("redo-icon");
const resetIcon = document.getElementById("reset-icon");


//HELPERS
function parsePuzzle(code) {
    return code.split("-").map(row =>
        row.split("").map(n => parseInt(n))
    );
}

function checkLevelComplete() {
    return goals.every(goal =>
        boxes.some(b => b.row === goal.row && b.col === goal.col)
    );
}

//CORE HISTORY MANAGEMENT FUNCTIONS

function saveState() {
    if (historyIndex < history.length - 1) {
        history.splice(historyIndex + 1);
    }
    
    const state = {
        player: { ...player },
        boxes: boxes.map(b => ({ ...b })),
        moveCount: moveCount
    };

    history.push(state);
    historyIndex++;
    
    updateActionIcons();
}

function loadState(index) {
    if (index < 0 || index >= history.length) return false;

    const state = history[index];
    
    player = { ...state.player };
    boxes = state.boxes.map(b => ({ ...b }));
    moveCount = state.moveCount;

    if (moveCountDisplay) moveCountDisplay.textContent = moveCount;
    
    historyIndex = index;


    isAnimating = false; 
    animationQueue = [];
    animationStartTime = 0;
    
    drawGrid();
    updateActionIcons();
    
    return true;
}

function undo() {
    if (historyIndex > 0) {
        flashIcon(undoIcon);
        loadState(historyIndex - 1); 
        return true;
    }
    return false;
}

function redo() {
    if (historyIndex < history.length - 1) {
        flashIcon(redoIcon);
        loadState(historyIndex + 1);
        return true;
    }
    return false;
}

function resetLevel() {
    if (!initialLevelState) return;
    
    flashIcon(resetIcon);

    loadState(0);
}


//UI FUNCTIONS

const nextButton = document.getElementById("next-level");

nextButton.addEventListener("click", handleNextLevelTransition);


function handleNextLevelTransition() {
    
    if (currentPack && currentLevelIndex + 1 < currentPack.levels.length) {
        
        completionCard.style.display = "none";
        const transitionDuration = 400;


        gameScreen.classList.add("slide-push-left"); 


        setTimeout(() => {
            

            currentLevelIndex++; 
            
            resetState(currentPack.levels[currentLevelIndex]); 
            drawGrid(); 

            gameScreen.classList.remove("slide-push-left");
            gameScreen.classList.add("slide-pull-left");

            setTimeout(() => {
                
                gameScreen.classList.remove("slide-pull-left");

            }, 50);

        }, transitionDuration);

    } else {
        if (window.goToLevelListFromGame) {
             window.goToLevelListFromGame(); 
        }
    }
}

function flashIcon(icon) {
    if (!icon) return;
    icon.classList.add("used");
    setTimeout(() => {
        icon.classList.remove("used");
    }, 200); 
}

function updateActionIcons() {
    if (!undoIcon || !redoIcon || !resetIcon) return;
    
    if (historyIndex > 0) {
        undoIcon.classList.remove("disabled");
    } else {
        undoIcon.classList.add("disabled");
    }

    if (historyIndex < history.length - 1) {
        redoIcon.classList.remove("disabled");
    } else {
        redoIcon.classList.add("disabled");
    }
    
    resetIcon.classList.remove("disabled"); 
}


//DRAWING & ANIMATION

let tileSize = 0;
let offsetX = 0;
let offsetY = 0;

function drawGrid() {
    if (!grid.length) return; 
    
    const rows = grid.length;
    const cols = grid[0].length;
    
    tileSize = Math.min(MAX_TILE_SIZE, canvas.width / cols, canvas.height / rows);
    const gridWidth = tileSize * cols;
    const gridHeight = tileSize * rows;
    offsetX = (canvas.width - gridWidth) / 2;
    offsetY = (canvas.height - gridHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const t = grid[r][c];
            const x = offsetX + c * tileSize;
            const y = offsetY + r * tileSize;

            if (t !== 0) ctx.drawImage(Sprites[2], x, y, tileSize, tileSize);          
            if (t === 1) ctx.drawImage(Sprites[2], x, y, tileSize, tileSize);
            if (t === 1) ctx.drawImage(Sprites[1], x, y, tileSize, tileSize);
            if (t === 5 || t === 6 || t === 7) ctx.drawImage(Sprites[5], x, y, tileSize, tileSize);
        }
    }

    ctx.fillStyle = "rgba(160, 32, 240, 1)";
    highlightTiles.forEach(pos => {
        const x = offsetX + pos.col * tileSize;
        const y = offsetY + pos.row * tileSize;
        ctx.fillRect(x, y, tileSize, tileSize);
    });
    
    boxes.forEach(b => {
        const isQueued = animationQueue.some(q => q.type === 'box' && q.box === b);

        if (!isQueued) {
            const x = offsetX + b.col * tileSize;
            const y = offsetY + b.row * tileSize;
            ctx.drawImage(Sprites[4], x, y, tileSize, tileSize);
        }
    });

    const isPlayerQueued = animationQueue.some(q => q.type === 'player');
    
    if (!isPlayerQueued) {
        const px = offsetX + player.col * tileSize;
        const py = offsetY + player.row * tileSize;
        ctx.drawImage(Sprites[3], px, py, tileSize, tileSize);
    }
}

function interpolate(start, end, progress) {
    return start + (end - start) * progress;
}

function animate(timestamp) {
    // 1. If nothing to do, stop the loop entirely
    if (animationQueue.length === 0) {
        isAnimating = false;
        animationStartTime = 0;
        return; 
    }

    if (animationStartTime === 0) {
        animationStartTime = timestamp;
    }

    const currentAnimation = animationQueue[0];
    const duration = ANIMATION_DURATION; 
    const elapsed = timestamp - animationStartTime;
    let progress = Math.min(1, elapsed / duration);
    
    const isPushSequence = currentAnimation.type === 'player' && 
                           animationQueue.length > 1 && 
                           animationQueue[1].type === 'box';

    drawGrid();

        if (isPushSequence) {
            const playerAnim = currentAnimation;
            const boxAnim = animationQueue[1];

            let startX = offsetX + playerAnim.start.col * tileSize;
            let startY = offsetY + playerAnim.start.row * tileSize;
            let endX = offsetX + playerAnim.end.col * tileSize;
            let endY = offsetY + playerAnim.end.row * tileSize;
            let drawX = interpolate(startX, endX, progress);
            let drawY = interpolate(startY, endY, progress);
            ctx.drawImage(Sprites[3], drawX, drawY, tileSize, tileSize);

            startX = offsetX + boxAnim.start.col * tileSize;
            startY = offsetY + boxAnim.start.row * tileSize;
            endX = offsetX + boxAnim.end.col * tileSize;
            endY = offsetY + boxAnim.end.row * tileSize;
            drawX = interpolate(startX, endX, progress);
            drawY = interpolate(startY, endY, progress);
            ctx.drawImage(Sprites[4], drawX, drawY, tileSize, tileSize);
            
        } else {
            const sprite = currentAnimation.type === 'player' ? Sprites[3] : Sprites[4];
            
            const startX = offsetX + currentAnimation.start.col * tileSize;
            const startY = offsetY + currentAnimation.start.row * tileSize;
            const endX = offsetX + currentAnimation.end.col * tileSize;
            const endY = offsetY + currentAnimation.end.row * tileSize;
            
            const drawX = interpolate(startX, endX, progress);
            const drawY = interpolate(startY, endY, progress);

            ctx.drawImage(sprite, drawX, drawY, tileSize, tileSize);
        }

if (progress >= 1) {
        if (currentAnimation.type === 'player') {
            player.row = currentAnimation.end.row;
            player.col = currentAnimation.end.col;
        } 
        
        animationQueue.shift();
        
        if (isPushSequence) {
            const boxAnim = animationQueue[0];
            boxAnim.box.row = boxAnim.end.row;
            boxAnim.box.col = boxAnim.end.col;
            animationQueue.shift();
        }
        
        animationStartTime = 0; 
        
        if (animationQueue.length === 0) {
            isAnimating = false;
            drawGrid();
            saveState(); 

            if (checkLevelComplete()) {
                const finalMoveDisplay = document.getElementById("final-move-display");
                if (finalMoveDisplay) finalMoveDisplay.textContent = `MOVES: ${moveCount}`;
                completionCard.style.display = "block";
                saveLevelProgress();
            }
            return; // STOP THE LOOP HERE
        }
    }
    
    // 2. ONLY request the next frame if we are still animating
    requestAnimationFrame(animate);
}

//LEVEL SAVING

function saveLevelProgress() {
    if (!currentPack || !initialLevelState) return;

    // Create a unique ID for this level
    const progressKey = `completed_${currentPack.packName}_${initialLevelState.levelName}`;
    localStorage.setItem(progressKey, "true");
}

//MOVEMENT LOGIC

function handleMove(dr, dc) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    const nextR = player.row + dr;
    const nextC = player.col + dc;
    let moveSuccessful = false;

    if (checkLevelComplete()) return false;

    if (nextR < 0 || nextR >= rows || nextC < 0 || nextC >= cols || grid[nextR][nextC] === 1) {
        return false;
    }

    const boxToMove = boxes.find(b => b.row === nextR && b.col === nextC);
        
    if (boxToMove) {
        const boxNextR = nextR + dr;
        const boxNextC = nextC + dc;

        if (
            boxNextR < 0 || boxNextR >= rows || 
            boxNextC < 0 || boxNextC >= cols || 
            grid[boxNextR][boxNextC] === 1 || 
            boxes.some(b => b.row === boxNextR && b.col === boxNextC)
        ) {
            return false;
        }

        playSFX('push');

        animationQueue.push({ 
            type: 'player', 
            start: { ...player }, 
            end: { row: nextR, col: nextC } 
        });

        animationQueue.push({ 
            type: 'box', 
            box: boxToMove, 
            start: { row: nextR, col: nextC }, 
            end: { row: boxNextR, col: boxNextC } 
        });
        moveSuccessful = true;
        
    } else {
        playSFX('move');
        animationQueue.push({ 
            type: 'player', 
            start: { ...player }, 
            end: { row: nextR, col: nextC } 
        });
        moveSuccessful = true;
    }

    if (moveSuccessful) {
        moveCount++; //counter increment (holy shit open hexagon reference)
        if (moveCountDisplay) moveCountDisplay.textContent = moveCount;

    highlightTiles = [];
    if (animationQueue.length > 0) {
        isAnimating = true;
        requestAnimationFrame(animate);
    }
} 
    
    return moveSuccessful;
}


//LEVEL MANAGEMENT

function resetState(level) {
    grid = parsePuzzle(level.code);
    boxes = [];
    goals = [];
    player = { row: 0, col: 0 };
    
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const t = grid[r][c];
            if (t === 3 || t === 6) player = { row: r, col: c };
            if (t === 4 || t === 7) boxes.push({ row: r, col: c });
            if (t === 5 || t === 6 || t === 7) goals.push({ row: r, col: c });
        }
    }

    highlightTiles = [];
    isAnimating = false;
    animationQueue = [];
    animationStartTime = 0; 
    moveCount = 0;

    if (moveCountDisplay) moveCountDisplay.textContent = "0";
    
    if (keyRepeatInterval) {
        clearTimeout(keyRepeatInterval); 
        clearInterval(keyRepeatInterval);
        keyRepeatInterval = null;
    }
    keysPressed = {};
    history = [];
    historyIndex = -1;
    initialLevelState = level;
    saveState();

if (levelNameDisplay) {
    levelNameDisplay.textContent = level.levelName; 
}
    updateActionIcons();
    if (window.updateBackgroundGradient) {
        window.updateBackgroundGradient();
    }
}

function startLevel(pack, levelIndex) {
    currentPack = pack;
    currentLevelIndex = levelIndex;
    
    completionCard.style.display = "none";
    
    resetState(pack.levels[levelIndex]);
    
    if (window.goToGameScreen) {
        window.goToGameScreen();
    } else {
        console.error("goToGameScreen function not found in global scope"); 
        gameScreen.classList.add("active");
    }
    
    drawGrid();
}
window.startLevel = startLevel;


//INPUT LISTENERS

const KEY_MAP = {
    "ArrowUp": { dr: -1, dc: 0 }, "w": { dr: -1, dc: 0 },
    "ArrowDown": { dr: 1, dc: 0 }, "s": { dr: 1, dc: 0 },
    "ArrowLeft": { dr: 0, dc: -1 }, "a": { dr: 0, dc: -1 },
    "ArrowRight": { dr: 0, dc: 1 }, "d": { dr: 0, dc: 1 }
};

window.addEventListener("keydown", e => {

    const isSettingsOpen = document.getElementById('settings-overlay').classList.contains('active');
    if (isSettingsOpen) return;
    const key = e.key;
    
    if (key === 'r' || key === 'R') {
        e.preventDefault();
        resetLevel(); 
        return;
    }

    if (key === 'q' || key === 'Q') {
        e.preventDefault();
        undo();
        return;
    }
    
    if (key === 'e' || key === 'E') {
        e.preventDefault();
        redo();
        return;
    }

    if (KEY_MAP[key]) {
        e.preventDefault();
        
        const { dr: newDr, dc: newDc } = KEY_MAP[key];
        
        keysPressed[key] = true;
        
        if (isAnimating) return;

        if (keyRepeatInterval) return;
        
        handleMove(newDr, newDc);

        const INITIAL_DELAY = ANIMATION_DURATION; 

        keyRepeatInterval = setTimeout(() => {
            
            if (keyRepeatInterval) clearTimeout(keyRepeatInterval);
            
            keyRepeatInterval = setInterval(() => {
                if (isAnimating) return;

                for (const pressedKey in keysPressed) {
                    if (keysPressed[pressedKey] && KEY_MAP[pressedKey]) {
                        handleMove(KEY_MAP[pressedKey].dr, KEY_MAP[pressedKey].dc);
                        return;
                    }
                }
                
                if (Object.keys(keysPressed).every(k => !keysPressed[k])) {
                    clearInterval(keyRepeatInterval);
                    keyRepeatInterval = null;
                }
            }, ANIMATION_DURATION);
            
        }, INITIAL_DELAY);
    }
});

window.addEventListener("keyup", e => {
    const key = e.key;
    
    if (KEY_MAP[key]) {
        keysPressed[key] = false;

        const anyMovementKeyStillPressed = Object.keys(keysPressed).some(k => KEY_MAP[k] && keysPressed[k]);

        if (!anyMovementKeyStillPressed && keyRepeatInterval) {
            clearTimeout(keyRepeatInterval); 
            clearInterval(keyRepeatInterval);
            keyRepeatInterval = null;
        }
    }
});

backButton.addEventListener("click", () => {
    completionCard.style.display = "none";
    if (window.goToLevelListFromGame) {
        window.goToLevelListFromGame();
    }
});

if (undoIcon) undoIcon.addEventListener("click", undo);
if (redoIcon) redoIcon.addEventListener("click", redo);
if (resetIcon) resetIcon.addEventListener("click", resetLevel);