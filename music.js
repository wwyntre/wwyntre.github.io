const BACKGROUND_MUSIC_PATHS = [
    "music/pushover.ogg",
    "music/separation.ogg",
    "music/megablast.ogg",
    "music/stardust.mp3",
    "music/everwonder.ogg",    
];

let currentAudio = null;
let lastPlayedPath = null;
let isMusicPlaying = false;

//CORE MUSIC CONTROL

function getRandomSongPath() {
    if (BACKGROUND_MUSIC_PATHS.length === 0) return null;
    if (BACKGROUND_MUSIC_PATHS.length === 1) return BACKGROUND_MUSIC_PATHS[0];

    let newPath;
    do {
        const randomIndex = Math.floor(Math.random() * BACKGROUND_MUSIC_PATHS.length);
        newPath = BACKGROUND_MUSIC_PATHS[randomIndex];
    } while (newPath === lastPlayedPath);
    
    return newPath;
}

function startBackgroundLoop() {
    if (isMusicPlaying) return;

    const path = getRandomSongPath();
    if (!path) {
        console.warn("No background music paths defined.");
        return;
    }
    
    currentAudio = new Audio(path);
    currentAudio.volume = 0.5;
    lastPlayedPath = path;
    isMusicPlaying = true;

    currentAudio.onended = () => {
        isMusicPlaying = false;
        startBackgroundLoop();
    };

    currentAudio.play().catch(error => {
        console.error("Autoplay failed for background loop:", error);
        isMusicPlaying = false;
    });
}

//PUBLIC API FUNCTIONS
function playWelcomeTrackAndStartLoop() {
    if (isMusicPlaying) return; 

    const welcomePath = "music/pushover.ogg";
    
    if (currentAudio) currentAudio.pause();
    
    currentAudio = new Audio(welcomePath);
    currentAudio.volume = 0.5;
    isMusicPlaying = true;
    
    currentAudio.onended = () => {
        isMusicPlaying = false;
        startBackgroundLoop();
    };
    
    currentAudio.play().catch(error => {
        console.error("Welcome track autoplay failed:", error);
        isMusicPlaying = false;
    });
}

function pauseMusic() {
    if (currentAudio) {
        currentAudio.pause();
        isMusicPlaying = false;
    }
}

function resumeMusic() {
    if (currentAudio && !isMusicPlaying) {
        currentAudio.play().then(() => {
            isMusicPlaying = true;
        }).catch(error => {
            console.warn("Could not resume music without user interaction:", error);
        });
    } else if (!currentAudio) {
        startBackgroundLoop(); 
    }
}

window.playWelcomeTrackAndStartLoop = playWelcomeTrackAndStartLoop;
window.pauseMusic = pauseMusic;
window.resumeMusic = resumeMusic;