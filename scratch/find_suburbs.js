const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const res = await axios.get('https://www.property24.co.ke/apartments-flats-to-rent-in-kilimani-c1990', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);
    // Breadcrumbs or nearby areas
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (href.includes('kileleshwa') || text.toLowerCase().includes('kileleshwa') || href.includes('flats-to-rent-in-')) {
        console.log('Nearby/suburb:', text, '->', href);
      }
    });
  } catch (e) {
    console.error(e.message);
  }
}
test();
