const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function check() {
  const url = 'https://kenyapropertycentre.com/for-rent/flats-apartments/nairobi/kilimani';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  
  // Find listing links like /for-rent/flats-apartments/...
  const listingLinks = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.match(/\/\d+-/)) { // e.g. /12345-title
      listingLinks.push(href);
    }
  });
  console.log('Listing links matched:', listingLinks.slice(0, 5));

  // Find parent card of the first listing link
  if (listingLinks.length > 0) {
    const firstA = $(`a[href="${listingLinks[0]}"]`).first();
    let parent = firstA.closest('div[class]');
    console.log('Parent classes:', parent.attr('class'));
    let grandParent = parent.parent();
    console.log('Grandparent classes:', grandParent.attr('class'));
    console.log('Card text:', grandParent.text().replace(/\s+/g, ' ').trim().slice(0, 200));
  }
}

check();
