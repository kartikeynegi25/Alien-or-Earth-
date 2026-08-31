# Alien or Earth? 🌍🪐


<img width="1917" height="962" alt="image" src="https://github.com/user-attachments/assets/e3600e43-183b-47b2-a283-6475f0739fd0" />
 


A fast browser game where you get 7 seconds to look at a raw NASA satellite pic and guess if it's Earth or an alien planet.

**🎮 Play it live:** https://kartikeynegi25.github.io/Alien-or-Earth-/

## How I built it :
Pure HTML, CSS, and Vanilla JS.

- **The Data:** Pulls random, unclassified images straight from the real NASA API. 
- **The Trick:** The NASA API lags on cellular networks, so I wrote a script that secretly preloads the next 4 images in the background while you play. Zero loading screens.
- **The Look:** Custom CSS gradients for the static starfield and a retro CRT monitor effect.

## AI Usage :
I built this with help from AI (Gemini). I used it specifically to debug the JavaScript timer logic, learn few new concept, engineer the background image caching system, and fix my CSS layout (the launch button alone took me 30 minutes just to remove its class name). 

## Run it locally
No `npm install` or build steps needed. 
1. Just clone the repo.
2. Open `index.html` in your browser.
