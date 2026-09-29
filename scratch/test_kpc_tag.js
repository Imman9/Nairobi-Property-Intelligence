const axios = require('axios');
const cheerio = require('cheerio');

async function testTag() {
  const url = 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const a = $('a[href="/for-rent/flats-apartments/nairobi/kilimani/68809-3-bedroom-ensuite-apartment"]').first();
  console.log('Parent tag:', a.parent().prop('tagName'), a.parent().attr('class'));
  console.log('Parent HTML:\n', a.parent().html());
  console.log('Grandparent tag:', a.parent().parent().prop('tagName'), a.parent().parent().attr('class'));
  console.log('Grandparent text:\n', a.parent().parent().text().replace(/\s+/g, ' ').trim());
}

testTag();
