/* packlist engine: trip details in, a grouped packing checklist with quantities out.
   Plain rules, no data sent anywhere. Works in the browser and in Node (for tests). */
(function (root) {
  'use strict';

  var TRIPS = {
    city: 'City break', beach: 'Beach', mountains: 'Hills / trek', business: 'Work trip',
    family: 'Visiting family', wedding: 'Wedding', pilgrimage: 'Pilgrimage'
  };
  var WEATHER = { hot: 'Hot', mild: 'Mild', cold: 'Cold', rainy: 'Rainy' };
  var TRAVEL = { flight: 'Flight', train: 'Train', road: 'Car / bus' };
  var ACTIVITIES = {
    swim: 'Swimming', hike: 'Hiking', gym: 'Gym / running', formal: 'Formal dinner or event',
    work: 'Working on a laptop', photo: 'Photography', snow: 'Snow'
  };
  var GROUPS = [
    ['docs', 'Documents and money'], ['clothes', 'Clothes'], ['toilet', 'Toiletries'], ['health', 'Health'],
    ['tech', 'Phone and gadgets'], ['travel', 'For the journey'], ['baby', 'For the baby'], ['kids', 'For the kids'],
    ['elder', 'For older travellers'], ['extra', 'For this trip']
  ];

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // opts: { trip, days, weather: [..], travel, abroad, adults, kids, babies, elders, activities: [..], laundry }
  function build(opts) {
    var o = normalise(opts);
    var d = o.days;
    var people = o.adults + o.kids + o.elders;
    // With laundry (or a long trip) you pack for about a week and wash.
    var cycle = o.laundry || d > 7 ? Math.min(d, 7) : d;
    var hot = o.weather.indexOf('hot') >= 0, cold = o.weather.indexOf('cold') >= 0;
    var rainy = o.weather.indexOf('rainy') >= 0, mild = o.weather.indexOf('mild') >= 0 || !o.weather.length;
    var act = function (a) { return o.activities.indexOf(a) >= 0; };
    var t = o.trip;
    var list = {};
    GROUPS.forEach(function (g) { list[g[0]] = []; });
    function add(group, name, qty, note) {
      if (list[group].some(function (x) { return x.name === name; })) return;
      list[group].push({ id: group + ':' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: name, qty: qty || 0, note: note || '' });
    }

    // Documents and money
    add('docs', 'Photo ID (Aadhaar, driving licence or similar)', people);
    if (o.abroad) {
      add('docs', 'Passports, valid 6+ months', people);
      add('docs', 'Visas or e-visa printouts', 0, 'check the rules for your passport');
      add('docs', 'Travel insurance details');
      add('docs', 'Some local currency, and a card that works abroad');
      add('docs', 'Hotel address in the local language');
    } else {
      add('docs', 'Cash and cards, and UPI working on your phone');
    }
    if (o.travel === 'flight') add('docs', 'Flight tickets or boarding passes');
    if (o.travel === 'train') add('docs', 'Train tickets (PNR on your phone)');
    if (o.travel === 'road') add('docs', 'Vehicle papers, licence and FASTag balance', 0, 'if you are driving');
    add('docs', 'Hotel or stay booking');
    if (t === 'business') add('docs', 'Business cards and company ID');
    if (t === 'pilgrimage') add('docs', 'Darshan or registration passes', 0, 'some temples need them booked ahead');
    if (o.babies + o.kids > 0 && o.abroad) add('docs', "Children's birth certificates", 0, 'some countries ask for them');

    // Clothes for the grown-ups; kids and babies get their own sections
    var wearers = Math.max(1, o.adults + o.elders);
    add('clothes', 'Underwear', wearers * (cycle + 1), wearers > 1 ? 'for ' + wearers + ' people' : '');
    add('clothes', 'Socks', (cold || t === 'mountains' || t === 'business' || act('hike') ? cycle + 1 : Math.ceil(cycle / 2) + 1) * wearers);
    add('clothes', 'Tops / t-shirts / kurtas', clamp(Math.ceil(cycle * 0.9) + 1, 2, 8) * wearers);
    add('clothes', 'Trousers, jeans or skirts', clamp(Math.ceil(cycle / 3) + 1, 1, 4) * wearers);
    add('clothes', 'Sleepwear', (d > 4 ? 2 : 1) * wearers);
    add('clothes', 'Comfortable walking shoes', wearers);
    if (hot || t === 'beach') { add('clothes', 'Light cotton clothes', 0, 'loose and breathable'); add('clothes', 'Sandals or flip-flops', wearers); add('clothes', 'Sun hat or cap', wearers); }
    if (cold || act('snow')) {
      add('clothes', 'Warm jacket', wearers); add('clothes', 'Thermal inner wear', 2 * wearers);
      add('clothes', 'Woollen cap', wearers); add('clothes', 'Gloves', wearers); add('clothes', 'Muffler or scarf', wearers);
    } else if (mild) {
      add('clothes', 'Light jacket or sweater', wearers);
    }
    if (rainy) { add('clothes', 'Raincoat or umbrella', wearers); add('clothes', 'Shoes that can get wet', wearers); }
    if (t === 'business' || act('formal')) { add('clothes', 'Formal outfits', clamp(t === 'business' ? d : 1, 1, 5)); add('clothes', 'Formal shoes', 1); }
    if (t === 'business') add('clothes', 'Belt, ties or work accessories');
    if (t === 'wedding') {
      add('clothes', 'Outfits for each function', 0, 'count the ceremonies: mehendi, sangeet, wedding, reception');
      add('clothes', 'Matching footwear for the outfits'); add('clothes', 'Jewellery and accessories');
      add('clothes', 'Safety pins and a small sewing kit');
    }
    if (t === 'pilgrimage') { add('clothes', 'Modest clothes that cover shoulders and knees', 0, 'temple dress codes'); add('clothes', 'Shawl or stole', wearers); add('clothes', 'Easy slip-on footwear', wearers, 'you remove shoes often'); }
    if (t === 'family') add('clothes', 'One nice outfit', wearers, 'for visits and photos');
    if (act('swim') || t === 'beach') add('clothes', 'Swimwear', wearers);
    if (act('gym')) add('clothes', 'Workout clothes and trainers', wearers);
    if (act('hike') || t === 'mountains') { add('clothes', 'Hiking shoes, worn in', wearers); add('clothes', 'Quick-dry t-shirts', 2 * wearers); }

    // Toiletries
    add('toilet', 'Toothbrush and toothpaste'); add('toilet', 'Soap or body wash'); add('toilet', 'Shampoo');
    add('toilet', 'Deodorant'); add('toilet', 'Comb or hairbrush'); add('toilet', 'Moisturiser');
    add('toilet', 'Razor and shaving kit'); add('toilet', 'Sanitary pads or menstrual cup', 0, 'if needed');
    if (hot || t === 'beach' || t === 'mountains' || act('snow')) add('toilet', 'Sunscreen (SPF 30+)');
    if (cold) add('toilet', 'Lip balm and cold cream');
    if (d > 3) add('toilet', 'Nail cutter');
    if (o.travel === 'flight') add('toilet', 'Liquids under 100 ml in a clear bag', 0, 'for cabin bags');
    add('toilet', 'Small towel or napkin');
    add('toilet', 'Hand sanitiser and tissues');

    // Health
    add('health', 'Your regular medicines', 0, 'enough for ' + (d + 2) + ' days, plus prescriptions');
    add('health', 'Paracetamol / pain relief'); add('health', 'ORS sachets'); add('health', 'Antacid and something for an upset stomach');
    add('health', 'Band-aids and antiseptic cream');
    if (o.travel === 'road' || t === 'mountains') add('health', 'Motion sickness tablets');
    if (t === 'mountains') add('health', 'Altitude sickness advice from your doctor', 0, 'above 2,500 m');
    if (hot || rainy || t === 'beach') add('health', 'Mosquito repellent');
    if (cold) add('health', 'Cold and cough medicine');

    // Tech
    add('tech', 'Phone and charger'); add('tech', 'Power bank');
    add('tech', 'Earphones');
    if (o.abroad) { add('tech', 'Travel plug adapter', 0, 'check the socket type'); add('tech', 'International roaming or a local SIM / eSIM'); }
    if (act('work') || t === 'business') { add('tech', 'Laptop and charger'); add('tech', 'Mouse and any dongles'); }
    if (act('photo')) { add('tech', 'Camera, batteries and memory cards'); add('tech', 'Camera charger'); }
    if (d > 2 || people > 1) add('tech', 'Extension board or multi-plug', 0, 'hotel sockets run out fast');

    // Journey
    add('travel', 'Water bottle', Math.max(1, people));
    add('travel', 'Snacks for the way');
    if (o.travel === 'train') { add('travel', 'Bedsheet and small pillow', 0, 'if your class does not include bedding'); add('travel', 'Chain and lock for luggage'); add('travel', 'Slippers for the train'); }
    if (o.travel === 'flight') { add('travel', 'Neck pillow', 0, 'for long flights'); add('travel', 'Pen for forms'); }
    if (o.travel === 'road') { add('travel', 'Car phone holder and charger'); add('travel', 'Offline maps downloaded'); add('travel', 'Plastic bags for rubbish'); }
    add('travel', 'Luggage tags with your phone number');
    add('travel', 'A bag for dirty laundry');

    // Babies
    if (o.babies > 0) {
      add('baby', 'Diapers', o.babies * (d * 7 + 6), 'about 7 a day, plus spare for delays');
      add('baby', 'Baby wipes', Math.ceil(o.babies * d / 3) + 1, 'packs');
      add('baby', 'Baby clothes', o.babies * Math.min(cycle * 2 + 2, 14), 'two a day: babies get messy');
      add('baby', 'Formula, food and bottles', 0, 'enough for the journey plus a day');
      add('baby', 'Diaper rash cream'); add('baby', 'Baby blanket or swaddle', o.babies);
      add('baby', 'Stroller or baby carrier'); add('baby', 'Changing mat'); add('baby', 'Baby medicines (fever drops)', 0, 'ask your paediatrician');
      add('baby', 'Favourite toy');
    }
    // Kids
    if (o.kids > 0) {
      add('kids', "Kids' clothes", o.kids * clamp(cycle + 2, 3, 10));
      add('kids', "Kids' underwear", o.kids * (cycle + 2));
      add('kids', "Kids' sleepwear", o.kids * 2);
      add('kids', 'Books, colouring or a tablet with downloads', 0, 'for the journey');
      add('kids', 'Snacks they like');
      add('kids', 'Card with your phone number in their pocket', o.kids);
      if (hot || t === 'beach') add('kids', "Kids' sunscreen and caps");
      if (act('swim') || t === 'beach') add('kids', 'Swim floats or armbands');
    }
    // Elders
    if (o.elders > 0) {
      add('elder', 'Medicines in a daily pill box', o.elders, 'plus a written list of medicines and doses');
      add('elder', 'Spare glasses and hearing-aid batteries');
      add('elder', "Doctor's number and recent prescriptions");
      add('elder', 'Walking stick or support, if used');
      if (o.travel === 'flight') add('elder', 'Wheelchair assistance booked with the airline', 0, 'free, but request it in advance');
      if (o.travel === 'train') add('elder', 'Lower berths requested', 0, 'senior quota');
      add('elder', 'Comfortable, non-slip footwear', o.elders);
      if (cold) add('elder', 'Extra warm layers and a hot water bag');
    }
    // Trip extras
    if (t === 'beach' || act('swim')) { add('extra', 'Beach towel', Math.max(1, people)); add('extra', 'Sunglasses', Math.max(1, people)); add('extra', 'Waterproof phone pouch'); }
    if (t === 'mountains' || act('hike')) { add('extra', 'Daypack'); add('extra', 'Torch or headlamp'); add('extra', 'Trekking pole', 0, 'for steep trails'); add('extra', 'Energy bars and dry fruits'); }
    if (act('snow')) { add('extra', 'Snow boots or rented gear'); add('extra', 'Sunglasses for the snow glare'); }
    if (t === 'city') { add('extra', 'Day bag for sightseeing'); add('extra', 'Metro or transport card'); }
    if (t === 'business') add('extra', 'Notebook and pen');
    if (t === 'wedding') { add('extra', 'Gift and envelope'); add('extra', 'Hair styling things and makeup'); }
    if (t === 'family') add('extra', 'Gifts or sweets for the hosts');
    if (t === 'pilgrimage') { add('extra', 'Offerings, if you plan to make them'); add('extra', 'Small bag for footwear'); }
    if (rainy) add('extra', 'Zip bags to keep things dry');

    var groups = GROUPS.map(function (g) { return { id: g[0], title: g[1], items: list[g[0]] }; })
      .filter(function (g) { return g.items.length; });
    return { opts: o, groups: groups, count: groups.reduce(function (n, g) { return n + g.items.length; }, 0),
      tip: o.laundry || d > 7 ? 'Clothes are counted for about a week; plan one wash.' : '' };
  }

  function normalise(opts) {
    opts = opts || {};
    var arr = function (v, allowed) { return (Array.isArray(v) ? v : []).filter(function (x) { return allowed[x]; }); };
    var num = function (v, lo, hi, def) { var n = parseInt(v, 10); return isNaN(n) ? def : clamp(n, lo, hi); };
    return {
      trip: TRIPS[opts.trip] ? opts.trip : 'city',
      days: num(opts.days, 1, 60, 3),
      weather: arr(opts.weather, WEATHER),
      travel: TRAVEL[opts.travel] ? opts.travel : 'train',
      abroad: !!opts.abroad,
      adults: num(opts.adults, 0, 12, 1),
      kids: num(opts.kids, 0, 12, 0),
      babies: num(opts.babies, 0, 6, 0),
      elders: num(opts.elders, 0, 12, 0),
      activities: arr(opts.activities, ACTIVITIES),
      laundry: !!opts.laundry
    };
  }

  // Plain text for sharing on WhatsApp or notes.
  function toText(result, title, done) {
    done = done || {};
    var lines = [(title || 'Packing list')];
    result.groups.forEach(function (g) {
      lines.push('', g.title.toUpperCase());
      g.items.forEach(function (it) {
        lines.push((done[it.id] ? '[x] ' : '[ ] ') + (it.qty ? it.qty + ' x ' : '') + it.name);
      });
    });
    return lines.join('\n');
  }

  var api = { TRIPS: TRIPS, WEATHER: WEATHER, TRAVEL: TRAVEL, ACTIVITIES: ACTIVITIES, build: build, normalise: normalise, toText: toText };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PackList = api;
})(this);
