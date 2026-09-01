const queries = {
  earth: [
    "Landsat false color", "MODIS thermal anomaly", "Sentinel phytoplankton",
    "ISS Earth observation", "aerial mapping", "MODIS land surface temperature",
    "ASTER satellite", "Landsat urban heat island", "MODIS wildfire detection",
    "Sentinel flood mapping", "ASTER volcanic activity"
  ],
  alien: [
    "HiRISE Mars", "Magellan Venus", "JunoCam Jupiter atmosphere",
    "Cassini Titan surface", "Galileo Europa", "Hubble planetary"
  ]
};

const seenImages = new Set();
let currentPic = null;
let nextPic = null;
let score = 0;
let maxScore = parseInt(localStorage.getItem('alien_earth_high_score') || '0', 10);
let timer;
let timeLeft = 7;

const homeScreen = document.getElementById('home-screen');
const btnStart = document.getElementById('btn-start');
const image = document.getElementById('game-image');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const scoreText = document.getElementById('score-val');
const maxScoreText = document.getElementById('high-score-val');
const btnEarth = document.getElementById('btn-earth');
const btnAlien = document.getElementById('btn-alien');
const modal = document.getElementById('reveal-modal');
const revealTitle = document.getElementById('reveal-title');
const revealSensor = document.getElementById('reveal-sensor');
const revealDesc = document.getElementById('reveal-desc');
const revealScore = document.getElementById('reveal-score');
const btnNext = document.getElementById('btn-next');
const btnHome = document.getElementById('btn-home');
const loader = document.getElementById('loading-overlay');
const rocket = document.getElementById('rocket');

// Fetch a single image from the NASA API
async function fetchImage() {
  const isEarth = Math.random() > 0.5;
  const terms = isEarth ? queries.earth : queries.alien;
  const q = terms[Math.floor(Math.random() * terms.length)];

  try {
    const res = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image`);
    const data = await res.json();
    const items = data?.collection?.items || [];

    // Basic loop to filter out junk responses
    let validItems = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].links && items[i].links.length > 0 && items[i].data && items[i].data[0]) {
        validItems.push(items[i]);
      }
    }

    if (validItems.length === 0) return null;

    const pick = validItems[Math.floor(Math.random() * validItems.length)];
    const meta = pick.data[0];
    const imageUrl = pick.links[0].href.replace(/^http:/i, 'https:');
    const title = meta.title || "";
    const desc = meta.description || title;

    const rawText = (title + " " + desc).toLowerCase();

    // Basic loop to check for bad words instead of advanced array methods
    const badWords = [
      "rocket", "launch", "portrait", "team", "engineer", "diagram", 
      "artwork", "illustration", "facility", "telescope", "model", "concept", 
      "airplane", "aircraft", "aviation", "window", "wing", "drone", "flight", "animation"
    ];
    
    let hasBadWord = false;
    for (let i = 0; i < badWords.length; i++) {
      if (rawText.includes(badWords[i])) {
        hasBadWord = true;
        break;
      }
    }

    if (hasBadWord) {
      return null;
    }

    if (seenImages.has(imageUrl)) {
      return null;
    }
    seenImages.add(imageUrl);

    return {
      imageUrl: imageUrl,
      isEarth: isEarth,
      sensor: meta.secondary_creator || meta.center + " Archive",
      title: title,
      desc: desc 
    };
  } catch (err) {
    console.error("api error:", err);
    return null;
  }
}

// Start the next level
async function getValidImage(){
    let card = null;
    while (!card){
        card = await fetchImage();
    }
    return card;
}

async function playRound() {
  modal.style.display = 'none';
  loader.style.display = 'flex'; // Show loading screen
  btnEarth.disabled = true;
  btnAlien.disabled = true;

  // Keep trying to fetch until we get a good image

  if (!nextPic){
    loader.style.display = 'flex';
    nextPic = await getValidImage();
  }

  currentPic = nextPic;
  image.src = currentPic.imageUrl;
  nextPic = null;

  // Wait for the image to actually load on the screen before starting the timer
  image.onload = function() {
    loader.style.display = 'none';
    btnEarth.disabled = false;
    btnAlien.disabled = false;
    runTimer();

   getValidImage().then(function(card) {
        nextPic = card;
    });
  };
}

function runTimer() {
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
      checkAnswer(null);
    }
  }, 100);
}

function checkAnswer(guess) {
  clearInterval(timer);
  btnEarth.disabled = true;
  btnAlien.disabled = true;

  if (guess === currentPic.isEarth) {
    score++;
    if (score > maxScore) {
      maxScore = score;
      localStorage.setItem('alien_earth_high_score', maxScore);
    }
    revealTitle.textContent = "🎯 MISSION SUCCESSFUL!";
    revealTitle.className = "reveal-title text-success";
    revealScore.textContent = "STREAK: " + score;
    revealScore.style.color = "var(--neon-cyan)";
  } else {
    revealTitle.textContent = guess === null ? "⏰ OUT OF TIME" : "❌ MISSION FAILED";
    revealTitle.className = "reveal-title text-danger";
    
    revealScore.textContent = "FINAL STREAK: " + score;
    revealScore.style.color = "var(--neon-red)";
    score = 0; 
  }

  scoreText.textContent = score;
  maxScoreText.textContent = maxScore;
  getValidImage().then(card => nextPic = card);

  revealSensor.textContent = "Camera: " + currentPic.sensor;
  revealDesc.textContent = currentPic.title;
  modal.style.display = 'flex';
}

btnEarth.addEventListener('click', () => checkAnswer(true));
btnAlien.addEventListener('click', () => checkAnswer(false));
btnNext.addEventListener('click', playRound);

btnStart.addEventListener('click', () => {
  btnStart.style.pointerEvents = 'none';
  btnStart.textContent = "FUELING...";
  btnStart.style.color = "#ffaa00";

  setTimeout(() => {
    btnStart.textContent = "IGNITION!";
    btnStart.style.color = "#ff3300";
    rocket.classList.add('launch');

    setTimeout(() => {
      homeScreen.style.display = 'none';
      playRound();
    }, 1200);
  }, 600);
});

// reset game and go back to start
btnHome.addEventListener('click', () => {
  score = 0;
  scoreText.textContent = score;
  modal.style.display = 'none';

  btnStart.removeAttribute('style');
  btnStart.style.pointerEvents = 'auto';
  btnStart.textContent = "LAUNCH"; 

  rocket.classList.remove('launch');
  homeScreen.style.display = 'flex';
});

scoreText.textContent = score;
maxScoreText.textContent = maxScore;