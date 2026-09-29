const axios = require('axios');
const cheerio = require('cheerio');

async function inspectKPC() {
  const url = 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kilimani';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  console.log('Status:', res.status, 'HTML len:', res.data.length);
  const $ = cheerio.load(res.data);
  console.log('Title:', $('title').text());
  
  // Find listing containers
  const items = $('div[itemtype="https://schema.org/Product"], div.property-list-item, div.row.property');
  console.log('Items by selector:', items.length);

  $('.property-list, .property-item, div[itemprop="itemListElement"], div.item').each((i, el) => {
    if (i < 3) {
      console.log('Item ' + i + ':', $(el).text().replace(/\s+/g, ' ').trim().slice(0, 150));
    }
  });

  // Let's also check all links to see listing link patterns
  $('a[href*="/for-rent/"]').slice(0, 10).each((i, el) => {
    console.log('Link:', $(el).attr('href'));
  });
}

inspectKPC();
