const axios = require('axios');
const cheerio = require('cheerio');

async function findP24() {
  try {
    const res = await axios.get('https://www.property24.co.ke/apartments-flats-to-rent-in-nairobi-p95', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    $('a[href*="kileleshwa"]').each((i, el) => {
      console.log('Kileleshwa link:', $(el).attr('href'), $(el).text().trim());
    });
    $('a[href*="kilimani"]').each((i, el) => {
      console.log('Kilimani link:', $(el).attr('href'), $(el).text().trim());
    });
  } catch (e) {
    console.log('Err:', e.message);
  }
}

findP24();
