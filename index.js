const express = require('express');
const axios = require('axios');
const app = express();
const {GifReader} = require('omggif');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');


let pokemonImageUrl = {};
const PORT = process.env.PORT || 3000;

const fetchPokemonImageUrl = async (force = false) => {

  if (!force && pokemonImageUrl) {
    return { "imgUrl": pokemonImageUrl.imgUrl, "name": pokemonImageUrl.name };
  }

  const randomPokemonId = Math.floor(Math.random() * 898) + 1;
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomPokemonId}`);
  const imageUrl = response.data.sprites.other['official-artwork'].front_default;
  const name = response.data.name;

  pokemonImageUrl = { "imgUrl": imageUrl, "name": name };
};


async function createPokemonGif(force = false) {
  const gifPath = `./public/pokemonGif.gif`;

  if (!force && fs.existsSync(gifPath)) {
    console.log("EARLY EXIT")
    return
  }

  const pokemonData = pokemonImageUrl;

  const pokemonImage = await loadImage(pokemonData.imgUrl);
  const gifData = fs.readFileSync('./pokeballopenGif.gif');
  const reader = new GifReader(gifData);

  const encoder = new GIFEncoder(reader.width, reader.height);
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
    ctx.drawImage(pokeballFrame, 0, 0);

    ctx.globalAlpha = pokemonOpacity
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, reader.width, reader.height);

    ctx.globalAlpha = pokemonOpacity;
    ctx.drawImage(pokemonImage, 0, 0, 450, 450, 175, 60, 450, 450);

    encoder.addFrame(ctx);
  }

  encoder.finish();
  const buffer = encoder.out.getData();
  fs.writeFileSync(gifPath, buffer);
}


const pokemonSetup = async () => {
  console.log("pokemonSetup called before")
  await fetchPokemonImageUrl(true);
  await createPokemonGif(true);
  console.log("pokemonSetup finished")
}

pokemonSetup();

console.log('Scheduling GIF generation for Pacific/Auckland')
cron.schedule('0 0 * * *', () => {
  console.log("Job Scheduled Now")
  pokemonSetup();
}, {
    scheduled: true,
    timezone: 'Pacific/Auckland'
});


app.get('/', async (req, res) => {
  try {
    const name = pokemonImageUrl.name;
    const url = pokemonImageUrl.imgUrl;
    console.log("GRABBING NAME: " + name)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(`
      <h1>Random Pokémon</h1>
      <img src="${url}" alt="${name}" />
      <p>${name}</p>
      <a href="/gif">View GIF</a>
    `);
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/name', async (req, res) => {
  try {
    const name = pokemonImageUrl.name;
    console.log("GRABBING NAME: " + name)

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ schemaVersion: 1, label: "", message: name, color: '4F4F4F' });
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/gif', async (req, res) => {
  try {
  let gifPath = `./public/pokemonGif.gif`;
  if (!fs.existsSync(gifPath)) {
    await createPokemonGif();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, gifPath));
  } catch (error) {
    console.log(error);
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/pokemonRedirect', async (req, res) => {
  try {
    const name = pokemonImageUrl.name;
    console.log("GRABBING NAME: " + name)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.redirect(`https://bulbapedia.bulbagarden.net/wiki/${name}`);
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
