const express = require('express');
const axios = require('axios');
const app = express();

const {GifReader} = require('omggif');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const path = require('path');

// This will store the Pokémon image URL

let cachedGifPath = `./public/pokemonGif.gif`;
let gifLastGenerated = null;


let cachedPokemonImageUrl = null;
let lastFetchDate = null;
const PORT = process.env.PORT || 3000;

const fetchPokemonImageUrl = async () => {
  const today = new Date().toDateString();
  if (lastFetchDate === today && cachedPokemonImageUrl) {
    return cachedPokemonImageUrl; // Use the cached URL if it's still valid
  }

  // Fetch a new random Pokémon image URL
  const randomPokemonId = Math.floor(Math.random() * 898) + 1;
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomPokemonId}`);
  const imageUrl = response.data.sprites.other['official-artwork'].front_default;

  // Update the cache
  cachedPokemonImageUrl = imageUrl;
  lastFetchDate = today;

  return imageUrl;
};



// // Function to create a GIF
async function createPokemonGif() {

  const today = new Date().toDateString();

  console.log(gifLastGenerated)

  console.log(today)
  
  if (gifLastGenerated === today && fs.existsSync(cachedGifPath)) {
    console.log('cached')
    return cachedGifPath; // Use the cached URL if it's still valid
  }


  const imageUrl = await fetchPokemonImageUrl();
  const pokemonImage = await loadImage(imageUrl);
  const gifData = fs.readFileSync('./pokeballopenGif.gif');
  const reader = new GifReader(gifData);

  const encoder = new GIFEncoder(reader.width, reader.height); // Set to your desired size
  encoder.start();
  encoder.setRepeat(0);
  encoder.setQuality(10);

  const canvas = createCanvas(reader.width, reader.height);
  const ctx = canvas.getContext('2d');

  let imageData = null

  for (let i = 0; i < 47; i++) {
    console.log(i)
    // const frameInfo = reader.frameInfo(i);
    imageData = ctx.createImageData(reader.width, reader.height);
    reader.decodeAndBlitFrameRGBA(i, imageData.data);
    ctx.putImageData(imageData, 0, 0);
    encoder.addFrame(ctx);
  }

  for (let i = 0; i < 20; i++) {
    ctx.clearRect(0, 0, reader.width, reader.height); 
    let pokeballOpacity = 1 - (i / 20);
    let pokemonOpacity = i / 20;

    let pokeballFrame = await loadImage(path.join(__dirname, `./public/pokeballFrame${i+1}.png`));

    ctx.globalAlpha = pokeballOpacity;
    ctx.drawImage(pokeballFrame, 0, 0); // Adjust as necessary

    ctx.globalAlpha = pokemonOpacity
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, reader.width, reader.height);

    ctx.globalAlpha = pokemonOpacity;
    ctx.drawImage(pokemonImage, 0, 0, 450, 450, 175, 60, 450, 450); // Adjust as necessary

    encoder.addFrame(ctx);
  }

  encoder.finish();
  const buffer = encoder.out.getData();
  fs.writeFileSync('./public/pokemonGif.gif', buffer);
  gifLastGenerated = today;
  return cachedGifPath;
}

app.get('/', async (req, res) => {
  try {
  const gifPath = await createPokemonGif();
  res.sendFile(path.join(__dirname, gifPath));
  } catch (error) {
    console.log(error)
  res.status(500).send('Failed to fetch Pokémon');
  }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
