const axios = require('axios');
const cheerio = require('cheerio');

async function testSelectors() {
  const url = 'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  for (const sel of ['.single-room-text', '.single-room-sale', '.property-listing', '.single-room']) {
    console.log(sel, ':', $(sel).length);
  }
  const first = $('.single-room').first();
  console.log('first .single-room HTML:', first.html() ? first.html().slice(0, 1000) : 'none');
}

testSelectors();
