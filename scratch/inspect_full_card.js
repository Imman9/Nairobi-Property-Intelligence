const axios = require('axios');
const cheerio = require('cheerio');

async function inspectFullCard() {
  const url = 'https://www.propertypro.co.ke/property-for-rent/flat-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  const cards = $('.property-listing');
  console.log('Cards count:', cards.length);
  const card = cards.first();
  const fullHtml = card.html();
  // Find key parts
  const title = card.find('h2, h3, .listing-header').text().trim();
  const link = card.find('a[href*="/property/"]').first().attr('href');
  const priceEl = card.find('h4, .price, [class*="price"]').first();
  const priceText = priceEl.text().trim();
  const location = card.find('.property-list-img-locat, address, [class*="locat"]').first().text().trim();
  // Beds/baths via spans
  const spans = [];
  card.find('span').each((i, el) => spans.push($(el).text().trim()));
  console.log('Title:', title);
  console.log('Link:', link);
  console.log('PriceText:', priceText);
  console.log('Location:', location);
  console.log('Spans:', spans.slice(0, 15));
  // print all h4/h5 text in card
  const hs = [];
  card.find('h2, h3, h4, h5, h6').each((i, el) => hs.push({ tag: $(el).prop('tagName'), txt: $(el).text().trim() }));
  console.log('Headings:', hs);
}

inspectFullCard();
