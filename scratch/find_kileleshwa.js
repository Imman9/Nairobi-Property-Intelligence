const axios = require('axios');
const cheerio = require('cheerio');

async function findKileleshwa() {
  const url = 'https://www.property24.co.ke/to-rent-in-nairobi-p95';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  $('a').each((i, el) => {
    const text = $(el).text().toLowerCase();
    const href = $(el).attr('href') || '';
    if (text.includes('kileleshwa') || href.includes('kileleshwa')) {
      console.log('Found:', $(el).text().trim(), '->', href);
    }
  });
}

findKileleshwa();
