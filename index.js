const express = require('express');
const axios = require('axios');
const app = express();

// This will store the Pokémon image URL
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

// Serve the Pokémon image
app.get('/', async (req, res) => {
  try {
    const pokemonImageUrl = await fetchPokemonImageUrl();
    res.redirect(pokemonImageUrl); // Redirect to the image URL or you can embed in HTML
  } catch (error) {
    res.status(500).send('Failed to fetch Pokémon');
  }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});