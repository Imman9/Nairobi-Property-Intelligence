const axios = require('axios');

async function testPropertyPro() {
  const urls = [
    'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kilimani',
    'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kileleshwa',
    'https://propertypro.co.ke/for-rent/flat-apartments/nairobi/kilimani'
  ];
  for (const u of urls) {
    try {
      const res = await axios.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
      console.log('OK:', u, 'status:', res.status, 'len:', res.data.length);
    } catch (e) {
      console.log('FAIL:', u, e.message, e.response ? e.response.status : '');
    }
  }
}
testPropertyPro();
