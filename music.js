const BACKGROUND_MUSIC_PATHS = [
    "music/pushover.ogg",
    "music/separation.ogg",
    "music/megablast.ogg",
    "music/stardust.mp3", 
    "music/everwonder.ogg",    
];

//AUDIO STATES
let currentAudio = null;
let lastPlayedPath = null;
let isMusicPlaying = false;

// Get the raw value from storage first
const savedMusic = localStorage.getItem('musicVolume');
const savedSFX = localStorage.getItem('sfxVolume');

// Use ?? so that 0 is treated as a valid number, not "falsy"
let musicVolume = (savedMusic !== null) ? parseFloat(savedMusic) : 0.6;
let sfxVolume = (savedSFX !== null) ? parseFloat(savedSFX) : 0.5;


//MUSIC CONTROL

function getRandomSongPath() {
    if (BACKGROUND_MUSIC_PATHS.length <= 1) return BACKGROUND_MUSIC_PATHS[0] || null;
    let newPath;
    do {
        newPath = BACKGROUND_MUSIC_PATHS[Math.floor(Math.random() * BACKGROUND_MUSIC_PATHS.length)];
    } while (newPath === lastPlayedPath);
    return newPath;
}

function startBackgroundLoop() {
    if (isMusicPlaying) return;
    const path = getRandomSongPath();
    if (!path) return;
    
    currentAudio = new Audio(path);
    currentAudio.volume = musicVolume;
    lastPlayedPath = path;
    isMusicPlaying = true;

    currentAudio.onended = () => {
        isMusicPlaying = false;
        startBackgroundLoop();
    };

    currentAudio.play().catch(() => isMusicPlaying = false);
}

//SFX CONTROL

const sfxLibrary = {
    move: new Audio("sfx/move.wav"),
    push: new Audio("sfx/push.wav")
};

function playSFX(name) {
    const sound = sfxLibrary[name];
    if (!sound) return;

    try {
        const soundClone = sound.cloneNode();
        
        const safeVolume = (typeof sfxVolume === 'number' && !isNaN(sfxVolume)) ? sfxVolume : 0.5;
        
        soundClone.volume = Math.max(0, Math.min(1, safeVolume)); // Ensure it's between 0 and 1
        soundClone.play().catch(e => console.warn("Playback blocked by browser"));
    } catch (err) {
        console.error("SFX Error:", err);
    }
}

//VOLUME SETTINGS API

function setMusicVolume(value) {
    // Force the value to be a number immediately
    musicVolume = parseFloat(value);
    if (currentAudio) currentAudio.volume = musicVolume;
    localStorage.setItem('musicVolume', musicVolume);
    console.log("Music Volume set to:", musicVolume);
}

function setSFXVolume(value) {
    // Force the value to be a number immediately
    sfxVolume = parseFloat(value);
    localStorage.setItem('sfxVolume', sfxVolume);
    console.log("SFX Volume set to:", sfxVolume);
}

// Public API
window.playWelcomeTrackAndStartLoop = function() {
    if (isMusicPlaying) return; 
    currentAudio = new Audio("music/welcome.ogg");
    currentAudio.volume = musicVolume;
    isMusicPlaying = true;
    currentAudio.onended = () => { isMusicPlaying = false; startBackgroundLoop(); };
    currentAudio.play().catch(() => isMusicPlaying = false);
};

window.pauseMusic = () => { if (currentAudio) { currentAudio.pause(); isMusicPlaying = false; } };
window.resumeMusic = () => { if (currentAudio) { currentAudio.play(); isMusicPlaying = true; } };
window.setMusicVolume = setMusicVolume;
window.setSFXVolume = setSFXVolume;
window.playSFX = playSFX;