const axios = require('axios');
const cheerio = require('cheerio');

async function checkP24Classes() {
  const url = 'https://www.property24.co.ke/apartments-flats-to-rent-in-kilimani-c1990';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const a = $('a[href*="-to-rent-in-kilimani-"]').first();
  console.log('A href:', a.attr('href'));
  console.log('A class:', a.attr('class'));
  let p = a;
  for (let i = 0; i < 4; i++) {
    p = p.parent();
    console.log(`Parent level ${i+1}: <${p.prop('tagName')}> class="${p.attr('class')}" id="${p.attr('id')}"`);
  }
}
checkP24Classes();
