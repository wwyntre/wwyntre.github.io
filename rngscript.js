const rarities = {
    basic: { color: 'lightgreen', odds: 1 / 2 },
    simple: { color: 'lightgreen', odds: 1 / 4 },
    okay: { color: 'lightgreen', odds: 1 / 8 },
    good: { color: 'lightgreen', odds: 1 / 16 },
    great: { color: 'lightgreen', odds: 1 / 32 },
    awesome: { color: 'lightgreen', odds: 1 / 64 },
    super: { color: 'deepskyblue', odds: 1 / 128 },
    crazy: { color: 'deepskyblue', odds: 1 / 256 },
    insane: { color: 'red', odds: 1 / 512 },
    rare: { color: 'blue', odds: 1 / 1024 },
    exquisite: { color: 'blue', odds: 1 / 2048 },
    supreme: { color: 'blue', odds: 1 / 4096 },
    stellar: { color: 'pink', odds: 1 / 8192 },
    mythical: { color: 'pink', odds: 1 / 16384 },
    legendary: { color: 'pink', odds: 1 / 32768 },
    holy: { color: 'gold', odds: 1 / 65536 },
    sacred: { color: 'orange', odds: 1 / 131072 },
    divine: { color: 'orange', odds: 1 / 262144 },
    celestial: { color: 'lightcoral', odds: 1 / 524288 },
    ethereal: { color: 'lightcoral', odds: 1 / 1048576 },
    eclipse: { color: 'darkgray', odds: 1 / 2097152 },
    astral: { color: 'cyan', odds: 1 / 4194304 },
    quantum: { color: 'cyan', odds: 1 / 8388608 },
    unfathomable: { color: 'cyan', odds: 1 / 16777216 },
    omniscient: { color: 'cyan', odds: 1 / 33554432 },
    solar: { color: 'purple', odds: 1 / 67108864 },
    nebula: { color: 'purple', odds: 1 / 134217728 },
    quasar: { color: 'purple', odds: 1 / 268435456 },
    hypernova: { color: 'purple', odds: 1 / 536870912 },
    galactic: { color: 'white', odds: 1 / 1073741824 },
    cosmic: { color: 'white', odds: 1 / 2147483648 },
    absolute: { color: 'white', odds: 1 / 4294967296 },
    eternal: { color: 'white', odds: 1 / 8589934592 },
    infinity: { animation: 'fadeBlackWhite 2s infinite', odds: 1 / 17179869184 },
    omnifinity: { animation: 'fadeBlackWhite 1.5s infinite', odds: 1 / 34359738368 },
    universal: { animation: 'fadeBlackWhite 1s infinite', odds: 1 / 68719476736 },
    multiversal: { animation: 'fadeBlackWhite 0.5s infinite', odds: 1 / 137438953472 },
    omniversal: { animation: 'fadeBlackWhite 0.2s infinite', odds: 1 / 274877906944 },
    dimensional: { animation: 'flashRedPurpleBlue 1s infinite', odds: 1 / 549755813888 },
    transdimensional: { animation: 'flashRedPurpleBlue 0.3s infinite', odds: 1 / 1099511627776 },
    oblivion: { animation: 'flashBlackWhite 1s infinite', odds: 1 / 2199023255552 },
    omega: { animation: 'colorCycle 5s infinite', odds: 1 / 4398046511104 },
    epsilonzero: { animation: 'colorCycle 2.5s infinite', odds: 1 / 8796093022208 },
    antimatter: { animation: 'fadeBlackRed 2s infinite', odds: 1 / 17592186044416 },
    thetruth: { animation: 'fadeWhiteYellow 2s infinite', odds: 1 / 35184372088832 },
    godlike: { animation: 'fadeWhiteYellow 2s infinite', odds: 1 / 70368744177664 },
    reality: { animation: 'flashColorCycle 1s infinite', odds: 1 / 140737488355328 }
};

let inventory = {};
let totalRolls = 0;
let rarestRarity = null;  // Variable to track the rarest item obtained
let rngoldAmount = 0;

function getRandomRarity() {
    let rand = Math.random();
    let cumulativeOdds = 0;

    for (let rarity in rarities) {
        let odds = rarities[rarity].odds || 0;
        cumulativeOdds += odds;
        if (rand < cumulativeOdds) {
            return rarity;
        }
    }
    return 'basic';
}

function updateRarestRarity(currentRarity) {
    if (!rarestRarity || rarities[currentRarity].odds < rarities[rarestRarity].odds) {
        rarestRarity = currentRarity;
    }
}

function updateLists() {
    let inventoryList = document.getElementById('inventoryList');
    let rarityList = document.getElementById('rarityList');

    inventoryList.innerHTML = '';
    rarityList.innerHTML = '';

    for (let rarity in rarities) {
        let count = inventory[rarity] || 0;
        let listItem = document.createElement('li');
        listItem.textContent = `${rarity.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${count}`;
        listItem.style.color = rarities[rarity].color;
        if (rarities[rarity].animation) {
            listItem.style.animation = rarities[rarity].animation;
        }
        inventoryList.appendChild(listItem);
    }

    for (let rarity in rarities) {
        let listItem = document.createElement('li');
        listItem.textContent = `${rarity.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: 1 in ${Math.round(1 / rarities[rarity].odds)}`;
        listItem.style.color = rarities[rarity].color;
        rarityList.appendChild(listItem);
    }

    if (rarestRarity) {
        let rarestItemDisplay = document.createElement('li');
        rarestItemDisplay.textContent = `Rarest Item Obtained: ${rarestRarity.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        rarestItemDisplay.style.color = rarities[rarestRarity].color;
        if (rarities[rarestRarity].animation) {
            rarestItemDisplay.style.animation = rarities[rarestRarity].animation;
        }
        rarityList.appendChild(rarestItemDisplay);
    }

    document.getElementById('totalRolls').textContent = `Total Rolls: ${totalRolls}`;
}

function updateRNGoldDisplay() {
    const rngoldValue = document.getElementById('rngoldValue');
    rngoldValue.textContent = rngoldAmount.toFixed(1);
}

document.getElementById('rollButton').addEventListener('click', () => {
    let rarity = getRandomRarity();
    inventory[rarity] = (inventory[rarity] || 0) + 1;
    totalRolls++;

    updateRarestRarity(rarity);

    let itemDisplay = document.getElementById('itemDisplay');
    let oddsDisplay = document.getElementById('oddsDisplay');

    itemDisplay.textContent = rarity.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    itemDisplay.style.color = rarities[rarity].color;
    if (rarities[rarity].animation) {
        itemDisplay.style.animation = rarities[rarity].animation;
    } else {
        itemDisplay.style.animation = '';
    }

    oddsDisplay.textContent = `Odds: 1 in ${Math.round(1 / rarities[rarity].odds)}`;

    updateLists();
});

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove 'active' class from all tabs and tab contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add 'active' class to the clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    document.getElementById('left-arrow').addEventListener('click', () => {
        let rarityDisplay = document.getElementById('rarity-display');
        let rarityOrder = Object.keys(rarities);
        let currentIndex = rarityOrder.indexOf(rarityDisplay.textContent.toLowerCase().replace(/ /g, '-'));
        let newIndex = (currentIndex - 1 + rarityOrder.length) % rarityOrder.length;
        rarityDisplay.textContent = rarityOrder[newIndex];
    });

    document.getElementById('right-arrow').addEventListener('click', () => {
        let rarityDisplay = document.getElementById('rarity-display');
        let rarityOrder = Object.keys(rarities);
        let currentIndex = rarityOrder.indexOf(rarityDisplay.textContent.toLowerCase().replace(/ /g, '-'));
        let newIndex = (currentIndex + 1) % rarityOrder.length;
        rarityDisplay.textContent = rarityOrder[newIndex];
    });

    document.getElementById('convert-button').addEventListener('click', () => {
        let rarityDisplay = document.getElementById('rarity-display').textContent.toLowerCase().replace(/ /g, '-');
        let amount = parseInt(document.getElementById('amount-input').value, 10);
        if (isNaN(amount) || amount < 1) {
            alert('Please enter a valid amount.');
            return;
        }

        // Check if user has enough items of the selected rarity
        if ((inventory[rarityDisplay] || 0) < amount) {
            alert('You do not have enough items of this rarity.');
            return;
        }

        let rarity = rarities[rarityDisplay];
        let rngoldValue = amount * (1 / rarity.odds) / 2;
        rngoldAmount += rngoldValue;
        updateRNGoldDisplay();
        inventory[rarityDisplay] -= amount;
        if (inventory[rarityDisplay] < 0) inventory[rarityDisplay] = 0;
        updateLists();
    });

    document.getElementById('rngoldIcon').src = 'rngold-icon.png';
    updateRNGoldDisplay();
});
