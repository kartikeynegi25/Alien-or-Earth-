const searchTerms = {
    earth: [
        "Landsat false color",
        "MODIS thermal anomaly",
        "Sentinel phytoplankton",
        "ASTER satellite",
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

let queue = [];
let currentCard = null;
let currentScore = 0;
let highScore = parseInt(localStorage.getItem('alien_earth_high_score') || '0', 10);
let timer;
let timeLeft = 7;
let isFetching = false;
let isWaitingForNext = false;

const homeScreen = document.getElementById('home-screen');
const btnStart = document.getElementById('btn-start');
const image = document.getElementById('game-image');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const scoreText = document.getElementById('score-val');
const highScoreText = document.getElementById('high-score-val');
const btnEarth = document.getElementById('btn-earth');
const btnAlien = document.getElementById('btn-alien');
const modal = document.getElementById('reveal-modal');
const revealTitle = document.getElementById('reveal-title');
const revealSensor = document.getElementById('reveal-sensor');
const revealDesc = document.getElementById('reveal-desc');
const btnNext = document.getElementById('btn-next');
const loader = document.getElementById('loading-overlay');
const rocket = document.getElementById('rocket');

async function fetchImage(){
    const isEarth = Math.random() > 0.5;
    const terms = isEarth ? searchTerms.earth : searchTerms.alien;
    const query = terms[Math.floor(Math.random() * terms.length)];
    const randomPage = Math.floor(Math.random() * 5) + 1; 

    try{
        const res = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page=${randomPage}`);
        const data = await res.json();
        const items = data?.collection?.items || [];

        const validItems = items.filter(item => item.links && item.links.length > 0 && item.data && item.data[0]);
        if (validItems.length === 0){
            return null;
        }

        const selected = validItems[Math.floor(Math.random() * validItems.length)];
        const meta = selected.data[0];
        const imageUrl = selected.links[0].href.replace(/^http:/i, 'https:');
        const title = meta.title || "";
        const description = meta.description || title;

        const textToCheck = (title + " " + description).toLowerCase();

        const badWords = ["rocket", "launch", "portrait", "team", "engineer", "diagram", "artwork", "illustration", "facility", "telescope", "model", "concept"];

        if (badWords.some(word => textToCheck.includes(word))) {
            return null;
        }

        await new Promise(resolve => {
            const img = new Image();
            const timeout = setTimeout(() => resolve(imageUrl), 4000);
            img.onload = () => { clearTimeout(timeout); resolve(imageUrl);};
            img.onerror = () => { clearTimeout(timeout); resolve(imageUrl);};
            img.src = imageUrl;
        });

        return {
            imageUrl: imageUrl,
            isEarth: isEarth,
            sensor: meta.secondary_creator || meta.center + " Archive",
            title: title,
            Description: description
        };
    } catch (err){
        console.error("NASA API failed", err);
        return null;
    }
}

async function fillQueue(){
    if (isFetching || queue.length >= 4) return;
    isFetching = true;

    let tries = 0;
    while (queue.length < 4 && tries < 15) {
        tries++;
        const card = await fetchImage();
        if (card) {
            queue.push(card);

            if (isWaitingForNext){
               loadNextRound();
            }
        }
    }
    isFetching = false;
}

function loadNextRound() {
    modal.style.display = 'none';

    if (queue.length === 0){
        loader.style.display = 'flex';
        isWaitngForNext = true;
        fillQueue();
        return;
    }

    isWaitingForNext = false;
    loader.style.display = 'none';
    currentCard = queue.shift();
    fillQueue();   

    image.src = currentCard.imageUrl;
    btnEarth.disabled = false;
    btnAlien.disabled = false;

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 7;
    timerText.textContent = "7s";
    timerBar.style.width = "100%";

    timer = setInterval(() => {
        timeLeft -= 0.1;
        timerText.textContent = Math.ceil(timeLeft) + "s";
        timerBar.style.width = Math.max(0, (timeLeft / 7) * 100) + "%";

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleGuess(null);
        } 
    }, 100);
}

function handleGuess(guessedEarth) {
    clearInterval(timer);
    btnEarth.disabled = true;
    btnAlien.disabled = true;

    if (guessedEarth === currentCard.isEarth){
        currentScore++;
        if (currentScore > highScore){
            highScore = currentScore;
            localStorage.setItem('alien_earth_high_score', highScore);
        }
        revealTitle.textContent = "🎯 CORRECT READ!"
        revealTitle.className = "reveal-title text-success";
    }else {
        currentScore = 0;
        revealTitle.textContent = guessedEarth === null ? "⏰ SENSOR TIMEOUT!" : "❌ TARGET MISIDENTIFIED";
        revealTitle.className = "reveal-title text-danger";
    }

    scoreText.textContent = currentScore;
    highScoreText.textContent = highScore;

    revealSensor.textContent = "Sensor: " + currentCard.sensor;
    revealDesc.textContent = currentCard.title;
    modal.style.display = 'flex';
}


btnEarth.addEventListener('click', () => handleGuess(true));
btnAlien.addEventListener('click', () => handleGuess(false));
btnNext.addEventListener('click', loadNextRound);

btnStart.addEventListener('click', () => {
    btnStart.style.pointerEvents = 'none';
    btnStart.textContent = "FUELING...";
    btnStart.style.color = "#ffaa00";
    btnStart.style.textShadow="0 0 20px #ffaa00";
    btnStart.style.animation = "none";

    setTimeout(() => {
        btnStart.textContent = "IGNITION!";
        btnStart.style.color = "#ff3300";
        btnStart.style.textShadow="0 0 30px #ff3300";

        rocket.classList.add('launch');

        setTimeout(()=>{
            homeScreen.classList.add('fade-out');

            setTimeout(()=>{
                homeScreen.style.display = 'none';
                loadNextRound();
            }, 500);
        }, 1200);
    }, 600);
});

scoreText.textContent = currentScore;
highScoreText.textContent = highScore;
fillQueue();
