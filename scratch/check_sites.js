const axios = require('axios');

async function checkSites() {
  const sites = [
    { name: 'BuyRentKenya with Cloudflare headers', url: 'https://www.buyrentkenya.com/api/listings', headers: { 'User-Agent': 'Mozilla/5.0' } },
    { name: 'Property24 Kenya', url: 'https://www.property24.co.ke/apartments-flats-to-rent-in-kilimani-c1990', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    { name: 'HaoFinder', url: 'https://haofinder.com/properties/for-rent/apartments/kilimani', headers: { 'User-Agent': 'Mozilla/5.0' } },
    { name: 'PigiaMe', url: 'https://www.pigiame.co.ke/flats-apartments-for-rent/kilimani', headers: { 'User-Agent': 'Mozilla/5.0' } },
  ];

  for (const s of sites) {
    try {
      console.log('Testing:', s.name, s.url);
      const res = await axios.get(s.url, { headers: s.headers, timeout: 10000 });
      console.log('  -> OK! Status:', res.status, 'Length:', res.data.length);
    } catch (e) {
      console.log('  -> Failed:', e.message, e.response ? e.response.status : '');
    }
  }
}

checkSites();
