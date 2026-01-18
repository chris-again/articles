import { mediaLinks } from './media_data.js';

// --- State Management ---
const state = {
    currentIndex: 0,
    currentCues: [],
    isLoaded: false,
    currentTitle: ""
};

// --- DOM Elements ---
const dom = {
    video: document.getElementById('main-video'),
    subOverlay: document.getElementById('subtitle-text'),
    lessonTitle: document.getElementById('lesson-title'),
    progressBar: document.getElementById('progress-bar'),
    progressFilled: document.getElementById('progress-filled'),
    btnPlay: document.getElementById('btn-play'),
    btnRewind: document.getElementById('btn-rewind'),
    btnForward: document.getElementById('btn-forward'),
    btnVideoPrev: document.getElementById('btn-video-prev'),
    btnVideoNext: document.getElementById('btn-video-next'),
};

// --- Initialization ---
init();

function init() {
    prepareMedia(0); // Setup Lesson 1 in standby

    dom.btnPlay.addEventListener('click', handlePlayClick);
    dom.btnRewind.addEventListener('click', () => skip(-5));
    dom.btnForward.addEventListener('click', () => skip(5));
    dom.btnVideoPrev.addEventListener('click', () => navigateMedia(-1));
    dom.btnVideoNext.addEventListener('click', () => navigateMedia(1));
    dom.video.addEventListener('timeupdate', handleTimeUpdate);
    dom.progressBar.addEventListener('click', handleProgressClick);
    window.addEventListener('keydown', handleKeydown);
}

function prepareMedia(index) {
    state.currentIndex = index;
    state.isLoaded = false;
    state.currentCues = [];

    const item = mediaLinks[state.currentIndex];

    // Reset Player UI
    dom.video.pause();
    dom.video.src = "";
    dom.btnPlay.textContent = "▶";
    dom.subOverlay.textContent = "";

    // 1. Get title from the titleMap using the ID from mediaLinks
    // 2. Fallback to a default string if the ID isn't in the map
    const mappedTitle = window.titleMap[item.id];
    state.currentTitle = mappedTitle ? mappedTitle : `Lesson ${item.id}`;

    // Update the UI
    dom.lessonTitle.textContent = state.currentTitle;

    updateNavigationButtons();
}

/**
 * Triggered by the Play button.
 * Only loads resources if the 'isLoaded' flag is false.
 */
async function handlePlayClick() {
    if (!state.isLoaded) {
        await startLoadingResources();
    } else {
        togglePlay();
    }
}

async function startLoadingResources() {
    const item = mediaLinks[state.currentIndex];

    try {
        dom.video.src = item.mp4Url;
        dom.video.load();

        const res = await fetch(item.vttUrl);
        const text = await res.text();

        state.currentCues = parseVTT(text);
        state.isLoaded = true;

        dom.video.play();
        dom.btnPlay.textContent = "❚❚";
    } catch (e) {
        console.error('Error loading resources:', e);
    }
}

// --- Logic Helpers ---

function togglePlay() {
    if (dom.video.paused) {
        dom.video.play();
        dom.btnPlay.textContent = "❚❚";
    } else {
        dom.video.pause();
        dom.btnPlay.textContent = "▶";
    }
}

function handleTimeUpdate() {
    if (!state.isLoaded) return;

    const time = dom.video.currentTime;
    const activeCue = state.currentCues.find(c => time >= c.start && time <= c.end);

    dom.subOverlay.textContent = activeCue ? activeCue.text : "";

    // Update progress bar with percentage
    const percent = (dom.video.currentTime / dom.video.duration) * 100;
    dom.progressFilled.style.width = `${percent}%`;
    dom.progressFilled.textContent = `${Math.round(percent)}%`;
}

function handleProgressClick(e) {
    if (!state.isLoaded) return;

    const rect = dom.progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const newTime = percent * dom.video.duration;

    dom.video.currentTime = newTime;
}

function parseVTT(text) {
    const lines = text.split(/\r?\n/);
    const cues = [];
    let currentCue = null;
    const timeRegex = /(\d{2}:\d{2}:\d{2}.\d{3}) --> (\d{2}:\d{2}:\d{2}.\d{3})/;

    lines.forEach(line => {
        const match = line.match(timeRegex);
        if (match) {
            currentCue = { start: timeToSeconds(match[1]), end: timeToSeconds(match[2]), text: "" };
            cues.push(currentCue);
        } else if (currentCue && line.trim() !== "" && !line.includes("WEBVTT")) {
            currentCue.text += line.trim() + " ";
        }
    });
    return cues;
}

function navigateMedia(direction) {
    const newIndex = state.currentIndex + direction;
    if (newIndex >= 0 && newIndex < mediaLinks.length) {
        prepareMedia(newIndex);
    }
}

function updateNavigationButtons() {
    dom.btnVideoPrev.disabled = state.currentIndex === 0;
    dom.btnVideoNext.disabled = state.currentIndex === mediaLinks.length - 1;
}

function skip(seconds) {
    if (state.isLoaded) dom.video.currentTime += seconds;
}

function timeToSeconds(t) {
    const a = t.split(':');
    return (+a[0]) * 3600 + (+a[1]) * 60 + (+a[2]);
}

function handleKeydown(e) {
    if (e.key === " ") {
        e.preventDefault();
        handlePlayClick();
    }
    if (state.isLoaded) {
        if (e.key === "ArrowLeft") skip(-5);
        if (e.key === "ArrowRight") skip(5);
    }
}