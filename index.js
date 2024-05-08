const express = require('express');
const axios = require('axios');
const app = express();
const {GifReader} = require('omggif');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const path = require('path');
const geoip = require('geoip-lite')
const cron = require('node-cron');


app.enable('trust proxy');


let pokemonImageUrls = {};
const PORT = process.env.PORT || 3000;
const timezones = ['UTC'];


const getTimeZone = (req) => {
  const ip = req.ip;
  console.log("ip is " + ip)
  const geo = geoip.lookup(ip);
  let timezone = geo && geo.timezone ? geo.timezone : 'UTC';
  if (!timezones.includes(timezone)) {
    console.log(`Timezone ${timezone} not supported. Falling back to default.`);
    timezone = 'UTC';
  }
  return timezone;
}


const fetchPokemonImageUrl = async (timeZone, force = false) => {

  console.log(timeZone)

  if (!force && pokemonImageUrls[timeZone]) {
    return { "imgUrl": pokemonImageUrls[timeZone].imgUrl, "name": pokemonImageUrls[timeZone].name };
  }

  const randomPokemonId = Math.floor(Math.random() * 898) + 1;
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomPokemonId}`);
  const imageUrl = response.data.sprites.other['official-artwork'].front_default;
  const name = response.data.name;

  pokemonImageUrls[timeZone] = { "imgUrl": imageUrl, "name": name };
};


async function createPokemonGif(timezone, force = false) {
  const tzPathParam = timezone.replace('/', '_');
  const gifPath = `./public/pokemonGif_${tzPathParam}.gif`;

  if (!force && fs.existsSync(gifPath)) {
    console.log("EARLY EXIT")
    return
  }

  const pokemonData = pokemonImageUrls[timezone];

  console.log(timezone)

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


const initialSetup = async () => {
  console.log("initialSetup called before")
  await Promise.all(timezones.map(tz =>
    fetchPokemonImageUrl(tz, true)
  ));
  console.log(pokemonImageUrls['UTC'].name)
  await Promise.all(timezones.map(tz =>
    createPokemonGif(tz, true)
  ));
  console.log(pokemonImageUrls['UTC'].name)
  console.log("initialSetup finished")
}

initialSetup();


// const timezones = ['UTC', 'Pacific/Auckland', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];

timezones.forEach(tz => {
    console.log(`Scheduling GIF generation for timezone ${tz}`)
    cron.schedule('0 0 * * *', () => {
      fetchPokemonImageUrl(tz, true)
      createPokemonGif(tz, true)
    }, {
        scheduled: true,
        timezone: tz
    });
});


app.get('/', async (req, res) => {
  try {
    const timezone = getTimeZone(req);
    const name = pokemonImageUrls[timezone].name;
    const url = pokemonImageUrls[timezone].imgUrl;
    console.log("GRABBING NAME: " + name)
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
    const timezone = getTimeZone(req);
    const name = pokemonImageUrls[timezone].name;
    console.log("GRABBING NAME: " + name)
    res.json({ schemaVersion: 1, label: "", message: name, color: '4F4F4F' });
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/gif', async (req, res) => {
  try {

  const timezone = getTimeZone(req);
  const tzPathParam = timezone.replace('/', '_');
  let gifPath = `./public/pokemonGif_${tzPathParam}.gif`;
  if (!fs.existsSync(gifPath)) {
    await createPokemonGif(timezone);
  }
  res.sendFile(path.join(__dirname, gifPath));
  } catch (error) {
    console.log(error);
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.get('/pokemonRedirect', async (req, res) => {
  try {
    const timezone = getTimeZone(req);
    const name = pokemonImageUrls[timezone].name;
    console.log("GRABBING NAME: " + name)
    res.redirect(`https://bulbapedia.bulbagarden.net/wiki/${name}`);
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
