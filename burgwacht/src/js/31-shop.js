/*
 * The shop, which only opens after a defeat.
 *
 * The shop is data-driven: SHOP_TABS lists the tabs, SHOP_ITEMS the offers.
 * An offer has
 *   id         unique; the buy button gets the DOM id "buy-<id>"
 *   tab        id of the tab it is listed under
 *   name       title of the card
 *   tierNames  optional names of the tiers, shown as "name: tier"
 *   text       description
 *   prices     gold per tier (one entry = one-time purchase), OR
 *   price(n)   price of tier n for offers without an upper limit (forge)
 *   level()    tiers already bought
 *   buy()      applies the next tier
 *   requires   optional { met(), label } shown on the button while not met
 *   visible()  optional; hides the offer while false
 */

const SHOP_TABS = [
  { id: 'weapons', name: 'Waffen' },
  { id: 'castle', name: 'Burg' },
  { id: 'troops', name: 'Truppen' },
  { id: 'boni', name: 'Boni' },
  { id: 'forge', name: 'Schmiede', visible: lavaUnlocked },   // gold for weapon damage, from the lava world on
];

/* Helpers that build the common kinds of offers. */
const weaponOffer = (id, text) => ({
  id, tab: 'weapons', name: WEAPONS[id].name, text, prices: [WEAPONS[id].price],
  level: () => +S.own[id],
  buy: () => { S.own[id] = true; },
});
const unlockOffer = (id, tab, name, price, text, requires) => ({
  id, tab, name, text, prices: [price], requires,
  level: () => +S.own[id],
  buy: () => { S.own[id] = true; },
});
const needsSoldier = { met: () => S.own.soldier, label: 'Erst Soldat' };

const FORGE_BASE_PRICE = 100, FORGE_PRICE_GROWTH = 1.35;
const forgeOffer = id => ({
  id: 'forge-' + id, tab: 'forge', name: WEAPONS[id].name + ' schmieden',
  text: '+10 % Schaden für diese Waffe. Beliebig oft, wird jedes Mal teurer.',
  price: stage => Math.round(FORGE_BASE_PRICE * Math.pow(FORGE_PRICE_GROWTH, stage)),
  level: () => S.forge[id],
  buy: () => { S.forge[id]++; },
  visible: () => owned(id),
});

const SHOP_ITEMS = [
  weaponOffer('dagger', 'Schnelle Würfe mit Gift und Abprallern.'),
  weaponOffer('star', 'Langsame, wuchtige Flächenschläge.'),
  weaponOffer('bow', 'Schneller Fernschuss, stark gegen einzelne Gegner.'),
  weaponOffer('wand', 'Feuerbälle, die explodieren und Gegner in Brand setzen.'),

  {
    id: 'heal', tab: 'castle', name: 'Heilung', tierNames: ['+2', '+3'], prices: [20, 32],
    text: 'Leben, die die Burg nach jeder geschafften Welle zurückbekommt.',
    level: () => S.heal - 1,
    buy: () => { S.heal++; },
  },
  {
    id: 'wall', tab: 'castle', name: 'Mauer', tierNames: ['3 HP', '5 HP', '10 HP', '25 HP'], prices: [15, 30, 120, 300],
    text: 'Fängt Treffer vor der Burg ab. Wird nur nach einer Niederlage repariert.',
    level: () => S.wall,
    buy: () => { S.wall++; },
  },
  {
    id: 'hp', tab: 'castle', name: 'Burg-Leben', tierNames: ['12 Leben', '15 Leben'], prices: [60, 150],
    text: 'Die Burg hält mehr Treffer aus.',
    level: () => S.hpLv,
    buy: () => { S.hpLv++; },
  },
  unlockOffer('tower', 'castle', 'Turmschütze', 120, 'Schießt von selbst auf den nächsten Gegner.'),

  unlockOffer('soldier', 'troops', 'Soldat', 2, 'Alle 5 Sekunden kommt ein kleiner Soldat aus der Burg und hält Gegner auf.'),
  {
    id: 'soldierSpeed', tab: 'troops', name: 'Soldaten-Tempo', tierNames: ['alle 4 s', 'alle 3 s'], prices: [25, 80],
    text: 'Soldaten kommen schneller aus der Burg.',
    level: () => S.solLv,
    buy: () => { S.solLv++; },
    requires: needsSoldier,
  },
  unlockOffer('armor', 'troops', 'Rüstung', 50, 'Soldaten halten 5 statt 3 Schläge aus.', needsSoldier),
  unlockOffer('squad', 'troops', 'Verstärkung', 90, 'Bis zu 6 statt 4 Soldaten gleichzeitig.', needsSoldier),

  {
    id: 'goldBonus', tab: 'boni', name: 'Goldbonus', tierNames: ['+25 %', '+50 %'], prices: [80, 200],
    text: 'Mehr Gold für jede neu geschaffte Welle.',
    level: () => S.goldLv,
    buy: () => { S.goldLv++; },
  },
  {
    id: 'xpBonus', tab: 'boni', name: 'XP-Bonus', tierNames: ['+25 %', '+50 %'], prices: [60, 160],
    text: 'Waffen leveln schneller.',
    level: () => S.xpLv,
    buy: () => { S.xpLv++; },
  },

  ...WEAPON_IDS.map(forgeOffer),
];

const offerMaxLevel = offer => (offer.prices ? offer.prices.length : Infinity);
const offerPrice = (offer, level) => (offer.prices ? offer.prices[level] : offer.price(level));
const offerVisible = offer => !offer.visible || offer.visible();

let shopTab = 'weapons';

function renderShop() {
  $('shopgold').textContent = S.gold + ' Gold';

  const tabs = $('shoptabs');
  tabs.textContent = '';
  for (const tab of SHOP_TABS) {
    if (tab.visible && !tab.visible()) continue;
    const offers = SHOP_ITEMS.filter(offer => offer.tab === tab.id && offerVisible(offer));
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'tab-' + tab.id;
    button.textContent = tab.name;
    button.setAttribute('aria-pressed', String(tab.id === shopTab));
    // a dot marks tabs with something affordable
    if (offers.some(canBuy)) button.classList.add('hot');
    button.addEventListener('click', () => { shopTab = tab.id; renderShop(); });
    tabs.appendChild(button);
  }

  const list = $('items');
  list.textContent = '';
  for (const offer of SHOP_ITEMS) {
    if (offer.tab === shopTab && offerVisible(offer)) list.appendChild(shopCard(offer));
  }
}

/** True if the next tier of the offer can be bought right now. */
function canBuy(offer) {
  const level = offer.level();
  if (level >= offerMaxLevel(offer)) return false;
  if (offer.requires && !offer.requires.met()) return false;
  return S.gold >= offerPrice(offer, level);
}

function shopCard(offer) {
  const level = offer.level(), maxLevel = offerMaxLevel(offer);
  const soldOut = level >= maxLevel;
  const price = soldOut ? 0 : offerPrice(offer, level);

  const card = document.createElement('div');
  card.className = 'item';
  const label = document.createElement('div');
  const title = document.createElement('b');
  // tiered offers show the tier that is for sale next (or the last one when sold out)
  title.textContent = offer.name + (offer.tierNames ? ': ' + offer.tierNames[Math.min(level, maxLevel - 1)] : '');
  label.appendChild(title);
  label.appendChild(tierPips(level, maxLevel));
  const text = document.createElement('span');
  text.textContent = offer.text;
  label.appendChild(text);

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'buy-' + offer.id;
  if (soldOut) {
    button.textContent = maxLevel > 1 ? 'Maximal' : 'Gekauft';
    button.disabled = true;
    button.className = 'own';
  } else if (offer.requires && !offer.requires.met()) {
    button.textContent = offer.requires.label;
    button.disabled = true;
  } else {
    button.textContent = price + ' Gold';
    button.disabled = S.gold < price;
    button.addEventListener('click', () => {
      if (S.gold < price || offer.level() !== level) return;   // guards against double taps
      sound(900, 0.08, 'triangle', 0.05, 300);
      S.gold -= price;
      offer.buy();
      checkAchievements();
      save();
      renderHud();
      renderShop();
    });
  }
  card.append(label, button);
  return card;
}

/** Row of dots showing bought and open tiers; unlimited offers show their stage as a number instead. */
function tierPips(level, maxLevel) {
  const pips = document.createElement('i');
  pips.className = 'pips';
  if (maxLevel === Infinity) {
    pips.textContent = 'Stufe ' + level;
  } else if (maxLevel > 1) {
    for (let i = 0; i < maxLevel; i++) {
      const pip = document.createElement('u');
      if (i < level) pip.className = 'on';
      pips.appendChild(pip);
    }
  }
  return pips;
}

function openShop() {
  shopTab = 'weapons';
  save();
  renderShop();
  $('shop').hidden = false;
  refreshPause();
}

function closeShop() {
  $('shop').hidden = true;
  continueAfterDefeat();
  refreshPause();
  renderHud();
  save();
  toast('Welle 1');
  showWaveHintOnce();
}
