const axios = require('axios');
const cheerio = require('cheerio');

async function inspectFirstCard() {
  const url = 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const link = $('a[href*="/for-rent/flats-apartments/nairobi/kilimani/"]').first();
  const card = link.closest('.property, article, [itemtype], div.border, div.shadow, div.rounded-lg');
  console.log('Found card HTML:');
  console.log(card.html() ? card.html().slice(0, 1500) : link.parent().parent().html().slice(0, 1500));
}

inspectFirstCard();
