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

let queue = [];
const seenImages = new Set();
let currentPic = null;
let score = 0;
let maxScore = parseInt(localStorage.getItem('alien_earth_high_score') || '0', 10);
let timer;
let timeLeft = 7;
let isFetching = false;
let needsImageNow = false;

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

// fetch an image from the nasa api
async function fetchImage() {
  const isEarth = Math.random() > 0.5;
  const terms = isEarth ? queries.earth : queries.alien;
  const q = terms[Math.floor(Math.random() * terms.length)];

  try {
    const res = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image`);
    const data = await res.json();
    const items = data?.collection?.items || [];

    // filter out junk responses
    const validItems = items.filter(item => item.links && item.links.length > 0 && item.data && item.data[0]);
    if (validItems.length === 0) return null;

    const pick = validItems[Math.floor(Math.random() * validItems.length)];
    const meta = pick.data[0];
    const imageUrl = pick.links[0].href.replace(/^http:/i, 'https:');
    const title = meta.title || "";
    const desc = meta.description || title;

    const rawText = (title + " " + desc).toLowerCase();

    // remove rockets, diagrams, and people
    const badWords = ["rocket", "launch", "portrait", "team", "engineer", "diagram", "artwork", "illustration", "facility", "telescope", "model", "concept", "airplane", "aircraft", "aviation", "window", "wing", "drone", "flight", "animation"];
    if (badWords.some(word => rawText.includes(word))) {
      return null;
    }

    if(seenImages.has(imageUrl)) {
        return null;
    }
    seenImages.add(imageUrl);

    // download the image in the background
    await new Promise(resolve => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(imageUrl), 4000);
      img.onload = () => { clearTimeout(timeout); resolve(imageUrl); };
      img.onerror = () => { clearTimeout(timeout); resolve(imageUrl); };
      img.src = imageUrl;
    });

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

// keep a buffer of 4 images so players never wait
async function preloadImages() {
  if (isFetching) return;
  isFetching = true;

  let tries = 0;
  while (queue.length < 4 && tries < 30) {
    tries++;
    const card = await fetchImage();
    if (card) {
      queue.push(card);

      // if the player is stuck staring at the loading screen, save them
      if (needsImageNow) {
        needsImageNow = false;
        playRound();
      }
    }
  }
  isFetching = false;

  if (needsImageNow && queue.length === 0) {
    setTimeout(preloadImages, 1000);
  }
}

// start the next level
function playRound() {
  modal.style.display = 'none';

  // out of images? show the loader and beg the api for more
  if (queue.length === 0) {
    loader.style.display = 'flex';
    needsImageNow = true; 
    preloadImages();
    return;
  }

  needsImageNow = false;
  loader.style.display = 'none';
  currentPic = queue.shift();
  preloadImages();

  image.src = currentPic.imageUrl;
  btnEarth.disabled = false;
  btnAlien.disabled = false;

  runTimer();
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
  btnStart.style.textShadow = "0 0 20px #ffaa00";
  btnStart.style.animation = "none";

  setTimeout(() => {
    btnStart.textContent = "IGNITION!";
    btnStart.style.color = "#ff3300";
    btnStart.style.textShadow = "0 0 30px #ff3300";

    rocket.classList.add('launch');

    setTimeout(() => {
      homeScreen.classList.add('fade-out');

      setTimeout(() => {
        homeScreen.style.display = 'none';
        playRound();
      }, 500);
    }, 1200);
  }, 600);
});

// reset game and go back to start
btnHome.addEventListener('click', () => {
  score = 0;
  scoreText.textContent = score;
  modal.style.display = 'none';

  btnStart.removeAttribute('style');
  btnStart.textContent = "LAUNCH"; 

  rocket.classList.remove('launch');

  homeScreen.classList.remove('fade-out');
  homeScreen.style.display = 'flex';
});

scoreText.textContent = score;
maxScoreText.textContent = maxScore;
preloadImages();