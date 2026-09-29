const axios = require('axios');
const cheerio = require('cheerio');

async function testListingCard() {
  const url = 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const links = $('a[href*="/for-rent/flats-apartments/nairobi/kilimani/"]').filter((i, el) => {
    return /\/\d+-/.test($(el).attr('href'));
  });
  console.log('Real listing links count:', links.length);
  if (links.length > 0) {
    const first = links.first();
    console.log('Listing href:', first.attr('href'));
    console.log('Listing title:', first.text().trim());
    // Traverse up to find container
    const card = first.closest('div.flex.flex-col, div.rounded-xl, div.rounded-2xl, div.overflow-hidden, div[class*="property"], div[class*="card"]');
    console.log('Card class:', card.attr('class'));
    console.log('Card inner text:', card.text().replace(/\s+/g, ' ').trim().slice(0, 300));
  }
}

testListingCard();
