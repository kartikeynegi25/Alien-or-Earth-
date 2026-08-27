const QUERY_MATRIX = {
    earth: [
        "Landsat false color satellite",
        "MODIS thermal anomaly",
        "Sentinel phytoplankton bloom",
        "ASTER satellite imagery",
        "Landsat urban heat island",
        "MODIS wildfire detection",
        "Sentinel flood mapping",
        "ASTER volcanic activity"
    ],
    alien: [
        "HiRISE Mars surface dunes",
        "Magellan Venus surface radar",
        "JunoCam Jupiter atmosphere",
        "Cassini Titan surface"
    ]
};

const cardQueue = [];
let currentCard = null;
let currentScore = 0;
let highScore = parseInt(localStorage.getItem('alien_earth_high_score') || '0', 10);
let timerInterval = null;
let timeLeft = 7;
const QUEUE_TARGET_SIZE = 4;
let isFetching = false;

const ui = {
    image: document.getElementById('game-image'),
    timerBar: document.getElementById('timer-bar'),
    timerText: document.getElementById('timer-text'),
    scoreText: document.getElementById('score-val'),
    highScoreText: document.getElementById('high-score-val'),
    clueText: document.getElementById('clue-text'),
    btnEarth: document.getElementById('btn-earth'),
    btnAlien: document.getElementById('btn-alien'),
    btnRestart: document.getElementById('btn-restart'),
    revealModal: document.getElementById('reveal-modal'),
    revealTitle: document.getElementById('reveal-title'),
    revealSensor: document.getElementById('reveal-sensor'),
    revealDesc: document.getElementById('reveal-desc'),
    btnNext: document.getElementById('btn-next'),
    loader: document.getElementById('loading-overlay')
};

async function fetchSingleNASACard(){
    const isEarth = Math.random() > 0.5;
    const pool = isEarth ? QUERY_MATRIX.earth : QUERY_MATRIX.alien;
    const term = pool[Math.floor(Math.random() * pool.length)];

    console.log(`📡 Ping NASA API for: "${term}"...`);

    try{
        const res = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(term)}&media_type=image`);
        const data = await res.json();
        const items = data?.collection?.items || [];
        const validItems = items.filter(item => item.links && item.links.length > 0 && item.data && item.data[0]);

        if (!validItems.length){
            console.warn(`⚠️ No items found for "${term}". Skipping.`);
            return null;
        }

        const selected = validItems[Math.floor(Math.random() * validItems.length)];
        const rawData = selected.data[0];
        const imageUrl = selected.links[0].href.replace(/^http:/i, 'https:');
        const title = rawData.title || "";
        const description = rawData.description || title;
        const lowerDesc = description.toLowerCase();
        if (lowerDesc.includes("portrait") || lowerDesc.includes("personnel") ||  lowerDesc.includes("engineer")) {
            console.warn("⚠️ Filtered out a photo of a human. Skipping.") ;
            return null;
        }

        if(!description || description.length < 20) return null;

        const redactionRegex = /(earth|mars|venus|jupiter|saturn|titan|mercury|landsat|modis|sentinel|hirise|magellan|juno|cassini|sahara|atlantic|pacific|nasa|esa|isro)/gi;
        const redactedClue = (title + " - " + description.slice(0, 180) + "...")
            .replace(redactionRegex, "[REDACTED]");
 
        console.log(`🖼️ Downloading image: ${imageUrl}`);
        await preloadImage(imageUrl);
        console.log(`✅ Image preloaded successfully.`);

        return {
            imageUrl,
            isEarth,
            sensor: rawData.secondary_creator || rawData.center + " Archive",
            title,
            fullDescription: description
        };
    } catch (err){
        console.error("Fetch failed, retrying background slot...", err);
        return null;
    }
}

function preloadImage(url){
    return new Promise((resolve, reject) => {
        const img = new Image();

        const timeout = setTimeout(() => {
            console.warn("⏱️ Image took too long to load, skipping...");
            reject(url);
        }, 5000); // 5 seconds timeout

        img.onload = () => {
            clearTimeout(timeout);
            resolve(url);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            console.warn("⚠️ Image failed to load pixels, skipping...");
            reject(url);
        };
        img.src = url;
    });
}

async function fillCardQueue(){
    if (isFetching || cardQueue.length >= QUEUE_TARGET_SIZE) return;
    isFetching = true;

    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (cardQueue.length < QUEUE_TARGET_SIZE && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`🔄 Queue Attempt ${attempts}/${MAX_ATTEMPTS}`);
        const card = await fetchSingleNASACard();
        if (card) {
            cardQueue.push(card);
            console.log(`📥 Card added to queue. Current queue size: ${cardQueue.length}`);
            if (ui.loader && !ui.loader.classList.contains('hidden')){
                console.log("🚀 Starting game loop!")
                ui.loader.style.display = 'none';
                if (!currentCard) loadNextRound();
            }
        }
    }

    if(attempts >= MAX_ATTEMPTS && cardQueue.length === 0){
        console.error("💀 Hit max attempts and queue is empty.");
        ui.loader.innerHTML = "<div class='loader-text' style='color: var(--neon-red);'>NASA API CONNECTION FAILED. <br>Check console for details.</div>";
    }
    isFetching = false;
}

function loadNextRound() {
    if (cardQueue.length === 0){
        ui.loader.classList.remove('hidden');
        ui.loader.style.display = 'flex';
        fillCardQueue();
        return;
    }

    currentCard = cardQueue.shift();
    fillCardQueue();

    const TACTICAL_PROMPTS = [
        "METADATA ENCRYPTED. Visual analysis required.",
        "WARNING: Unknown spectral signature detected.",
        "ANALYZING: Surface reflectance and thermal anomalies.",
        "TELEMETRY SCRAMBLED. Awaiting manual classification."
    ];

    ui.image.src = currentCard.imageUrl;
    ui.clueText.textContent = TACTICAL_PROMPTS[Math.floor(Math.random() * TACTICAL_PROMPTS.length)];
    ui.revealModal.style.display = 'none';
    ui.btnEarth.disabled = false;
    ui.btnAlien.disabled = false;

    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 7;
    updateTimerUI();

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        } else {
            updateTimerUI();
        }
    }, 100);
}

function updateTimerUI() {
    ui.timerText.textContent = `${Math.ceil(timeLeft)}s`;
    const pct = (timeLeft / 7) *100;
    ui.timerBar.style.width = `${Math.max(0, pct)}%`;
}

function submitAnswer(guessedEarth) {
    clearInterval(timerInterval);
    ui.btnEarth.disabled = true;
    ui.btnAlien.disabled = true;

    const isCorrect = guessedEarth === currentCard.isEarth;

    if (isCorrect) {
        currentScore++;
        if (currentScore > highScore) {
            highScore = currentScore;
            localStorage.setItem('alien_earth_high_score', highScore.toString());
        }
        ui.revealTitle.textContent = "🎯 CORRECT READ!";
        ui.revealTitle.className = "reveal-title text-success";
    } else {
        currentScore = 0;
        ui.revealTitle.textContent = "❌ TARGET MISIDENTIFIED";
        ui.revealTitle.className = "reveal-title text-danger";
    }

    updateScoreUI();
    showReveal();
}

function handleTimeout() {
    ui.btnEarth.disabled = true;
    ui.btnAlien.disabled = true;
    currentScore = 0;
    updateScoreUI();

    ui.revealTitle.textContent = "⏰ SENSOR TIMEOUT!";
    ui.revealTitle.className = "reveal-title text-danger";
    showReveal();
}

function showReveal() {
    ui.revealSensor.textContent = `Sensor / Platform: ${currentCard.sensor}`;
    ui.revealDesc.textContent = `${currentCard.title}: ${currentCard.fullDescription}`;
    ui.revealModal.style.display = 'flex';
}

function updateScoreUI(){
    ui.scoreText.textContent = currentScore;
    ui.highScoreText.textContent = highScore;
}

ui.btnEarth.addEventListener('click', () => submitAnswer(true));
ui.btnAlien.addEventListener('click', () => submitAnswer(false));
ui.btnNext.addEventListener('click', () => loadNextRound());

updateScoreUI();
fillCardQueue();
