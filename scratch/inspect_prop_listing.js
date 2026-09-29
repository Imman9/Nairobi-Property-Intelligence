const axios = require('axios');
const cheerio = require('cheerio');

async function testPropertyListing() {
  const url = 'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const card = $('.property-listing').first();
  console.log('Card HTML:\n', card.html().slice(0, 1500));
}

testPropertyListing();
