const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function test() {
  try {
    const url = 'https://www.buyrentkenya.com/flats-apartments-for-rent/kilimani';
    console.log('Fetching', url);
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });
    console.log('Status:', res.status, 'Body length:', res.data.length);
    const $ = cheerio.load(res.data);
    console.log('Title:', $('title').text());

    // Check JSON-LD
    const jsonLds = [];
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        jsonLds.push(JSON.parse($(el).html()));
      } catch (e) {}
    });
    console.log('JSON-LD count:', jsonLds.length);
    if (jsonLds.length > 0) {
      console.log('JSON-LD sample keys:', jsonLds.map(j => Array.isArray(j) ? 'Array(' + j.length + ')' : (j['@type'] || Object.keys(j).slice(0, 5))));
    }

    // Inspect listing elements
    const listingCards = $('[data-cy="listing-card"], .listing-card, [data-listing-id], article, .search-result');
    console.log('Listing card candidates found:', listingCards.length);

    // Save a small HTML snippet to scratch/brk_sample.html for inspection
    fs.writeFileSync('scratch/brk_sample.html', res.data.slice(0, 50000));
    console.log('Saved scratch/brk_sample.html');
  } catch (err) {
    console.error('Error:', err.message, err.response ? err.response.status : '');
  }
}

test();
