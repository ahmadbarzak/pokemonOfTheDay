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
let cachedName = null;
let lastFetchDate = null;
const PORT = process.env.PORT || 3000;

const fetchPokemonImageUrl = async () => {
  const today = new Date().toDateString();

  if (lastFetchDate === today && cachedPokemonImageUrl) {
    return { "imgUrl": cachedPokemonImageUrl, "name": cachedName }; // Use the cached URL if it's still valid
  }

  // Fetch a new random Pokémon image URL
  const randomPokemonId = Math.floor(Math.random() * 898) + 1;
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomPokemonId}`);
  const imageUrl = response.data.sprites.other['official-artwork'].front_default;
  const name = response.data.name;


  // Update the cache
  cachedPokemonImageUrl = imageUrl;
  cachedName = name;

  lastFetchDate = today;

  return { "imgUrl": imageUrl, "name": name };
};



// // Function to create a GIF
async function createPokemonGif() {

  const today = new Date().toDateString();
  
  if (gifLastGenerated === today && fs.existsSync(cachedGifPath)) {
    return cachedGifPath;
  }


  const pokemonData = await fetchPokemonImageUrl();

  const pokemonImage = await loadImage(pokemonData.imgUrl);
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

  return './public/pokemonGif.gif';
}

app.get('/', async (req, res) => {
  try {
    const pokemonData = await fetchPokemonImageUrl();
    res.send(`
      <h1>Random Pokémon</h1>
      <img src="${pokemonData.imgUrl}" alt="${pokemonData.name}" />
      <p>${pokemonData.name}</p>
      <a href="/gif">View GIF</a>
    `);
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/name', async (req, res) => {
  try {
    const pokemonData = await fetchPokemonImageUrl();
    // res.send(`${pokemonData.name}`);
    res.json({ schemaVersion: 1, label: 'pokemon', message: pokemonData.name, color: 'blue' });
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/gif', async (req, res) => {
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
