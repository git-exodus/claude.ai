/*
 * The shop, which only opens after a defeat.
 *
 * SHOP_ITEMS is data: every entry describes one row.
 *   name      title of the row
 *   tierNames optional names of the tiers, shown as "name: tier"
 *   text      description
 *   prices    gold per tier; one entry = one-time purchase
 *   level()   tiers already bought
 *   buy()     applies the next tier
 *   requires  optional { met(), label } shown on the button while not met
 */

const weaponItem = (id, text) => ({
  name: WEAPONS[id].name, text, prices: [WEAPONS[id].price],
  level: () => +S.own[id],
  buy: () => { S.own[id] = true; },
});

const SHOP_ITEMS = [
  {
    name: 'Soldat', prices: [2],
    text: 'Alle 5 Sekunden kommt ein kleiner Soldat aus der Burg. Er hält 3 Schläge aus und bremst Gegner.',
    level: () => +S.own.soldier,
    buy: () => { S.own.soldier = true; },
  },
  {
    name: 'Soldaten-Tempo', tierNames: ['alle 4 s', 'alle 3 s'], prices: [25, 80],
    text: 'Soldaten kommen schneller aus der Burg.',
    level: () => S.solLv,
    buy: () => { S.solLv++; },
    requires: { met: () => S.own.soldier, label: 'Erst Soldat' },
  },
  weaponItem('dagger', 'Schaltet die Dolche als Waffe frei.'),
  weaponItem('star', 'Schaltet den Morgenstern als Waffe frei.'),
  weaponItem('bow', 'Schneller Fernschuss, stark gegen einzelne Gegner.'),
  weaponItem('wand', 'Feuerbälle, die explodieren und Gegner in Brand setzen.'),
  {
    name: 'Heilung', tierNames: ['+2', '+3'], prices: [20, 32],
    text: 'Leben, die die Burg nach jeder geschafften Welle zurückbekommt.',
    level: () => S.heal - 1,
    buy: () => { S.heal++; },
  },
  {
    name: 'Mauer', tierNames: ['3 HP', '5 HP', '10 HP', '25 HP'], prices: [15, 30, 120, 300],
    text: 'Fängt Treffer ab, bevor die Burg Leben verliert. Wird nur nach einer Niederlage repariert.',
    level: () => S.wall,
    buy: () => { S.wall++; },
  },
];

function renderShop() {
  $('shopgold').textContent = S.gold + ' Gold';
  const list = $('items');
  list.textContent = '';
  SHOP_ITEMS.forEach((item, index) => list.appendChild(shopRow(item, index)));
}

function shopRow(item, index) {
  const level = item.level();
  const soldOut = level >= item.prices.length;
  const price = item.prices[level];

  const row = document.createElement('div');
  row.className = 'item';
  const label = document.createElement('div');
  const title = document.createElement('b');
  const text = document.createElement('span');
  // tiered items show the tier that is for sale next (or the last one when sold out)
  title.textContent = item.name + (item.tierNames ? ': ' + item.tierNames[Math.min(level, item.prices.length - 1)] : '');
  text.textContent = item.text;
  label.append(title, text);

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'buy-' + index;
  if (soldOut) {
    button.textContent = item.prices.length > 1 ? 'Maximal' : 'Gekauft';
    button.disabled = true;
    button.className = 'own';
  } else if (item.requires && !item.requires.met()) {
    button.textContent = item.requires.label;
    button.disabled = true;
  } else {
    button.textContent = price + ' Gold';
    button.disabled = S.gold < price;
    button.addEventListener('click', () => {
      if (S.gold < price || item.level() !== level) return;   // guards against double taps
      sound(900, 0.08, 'triangle', 0.05, 300);
      S.gold -= price;
      item.buy();
      save();
      renderHud();
      renderShop();
    });
  }
  row.append(label, button);
  return row;
}

function openShop() {
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
}
