# Alien or Earth? 🌍🪐

<img width="1917" height="962" alt="image" src="https://github.com/user-attachments/assets/e3600e43-183b-47b2-a283-6475f0739fd0" />

A simple browser game where you have 7 seconds to look at a raw NASA satellite image and guess if it's Earth or an alien planet.

**Play it live:** https://kartikeynegi25.github.io/Alien-or-Earth-/

## Tech Stack & Features
I built this with just HTML, CSS, and Vanilla JS.

* It pulls random images from the NASA public API. 
* Because the API can be slow on mobile, I wrote a background script to fetch and cache the next 4 images while you are playing. This stops the game from freezing between rounds so you can play it forever without stopping.
* The UI is styled with CSS to look like an old CRT aerospace monitor.

## AI Usage
I used Gemini to help me build this. I mainly used it to debug my JavaScript timer, learn few new concept along the way, figure out how to write the image caching logic, and fix some really annoying CSS bugs (like fixing a stretching launch button). 

## Run it locally
1. Clone the repo.
2. Open `index.html` in your browser. That's it nothing more
