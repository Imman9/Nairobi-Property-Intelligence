const axios = require('axios');
const cheerio = require('cheerio');

async function testCard() {
  const url = 'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const card = $('.single-room-sale').first();
  console.log('Card HTML:\n', card.html() ? card.html().slice(0, 1500) : 'none');
}

testCard();
