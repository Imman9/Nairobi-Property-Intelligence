const axios = require('axios');

async function testPortals() {
  const urls = [
    { name: 'Property24 Kilimani', url: 'https://www.property24.co.ke/apartments-flats-to-rent-in-kilimani-c1990' },
    { name: 'Property24 Kileleshwa', url: 'https://www.property24.co.ke/apartments-flats-to-rent-in-kileleshwa-c1989' },
    { name: 'Kenya Property Centre Kilimani', url: 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kilimani' },
    { name: 'Kenya Property Centre Kileleshwa', url: 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kileleshwa' },
    { name: 'Commercial Property Kenya', url: 'https://commercialproperty.co.ke/for-rent/flats-apartments/kilimani' },
    { name: 'Property Boutique', url: 'https://propertyboutique.co.ke/properties/' },
  ];

  for (const item of urls) {
    try {
      const res = await axios.get(item.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000,
        maxRedirects: 5
      });
      console.log(`[OK] ${item.name} -> status: ${res.status}, length: ${res.data.length}`);
    } catch (e) {
      console.log(`[FAIL] ${item.name} -> ${e.message} ${e.response ? e.response.status : ''}`);
    }
  }
}

testPortals();
