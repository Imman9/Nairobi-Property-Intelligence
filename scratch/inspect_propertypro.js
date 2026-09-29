const axios = require('axios');
const cheerio = require('cheerio');

async function inspectPropertyPro() {
  const url = 'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  console.log('Title:', $('title').text());
  
  // Look for cards
  const cards = $('.single-room-text, .single-room-sale, .property-listing, .single-room');
  console.log('Cards found:', cards.length);

  $('.single-room-text, .single-room-sale').slice(0, 2).each((i, el) => {
    console.log(`\nCard ${i}:`);
    const title = $(el).find('h2, h3, .room-title, a[href*="/property/"]').first().text().trim();
    const link = $(el).find('a[href*="/property/"]').first().attr('href');
    const price = $(el).find('.room-price, .naira, h4, span:contains("KSh"), span:contains("/month")').text().trim();
    const text = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 250);
    console.log({ title, link, price, text });
  });
}

inspectPropertyPro();
