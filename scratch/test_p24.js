const axios = require('axios');
const cheerio = require('cheerio');

async function testP24() {
  const url = 'https://www.property24.co.ke/apartments-flats-to-rent-in-kilimani-c1990';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  const $ = cheerio.load(res.data);
  const cards = $('.p24_regularTile, .p24_featuredResult, .p24_content, .js_resultTile');
  console.log('Cards found:', cards.length);

  $('.js_resultTile').slice(0, 3).each((i, el) => {
    const card = $(el);
    const link = card.find('a[href*="-to-rent-"]').first().attr('href');
    const priceText = card.find('.p24_price').text().trim();
    const title = card.find('.p24_title').text().trim();
    const address = card.find('.p24_address').text().trim();
    const beds = card.find('.p24_featureDetails[title*="Bedroom"], [title*="Bed"]').text().trim();
    const size = card.find('.p24_size').text().trim();
    console.log(`P24 Card ${i}:`, { link, priceText, title, address, beds, size });
  });
}

testP24();
