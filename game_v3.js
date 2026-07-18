try {
let gameState = {
    level: 0,
    baseDamage: 10,
    hp: 5000,
    maxHp: 5000,
    trophies: 0,
    money: 0,
    inventory: [],
    fuse: { active: false, endTime: 0, resultLevel: null },
    hasHiddenSkill: false,
    hasDoubleSkill: false,
    currentSkin: 'default',
    ownedSkins: ['default'],
    skinLevels: {},
    shopNextReroll: 0,
    currentShopItems: [],
    luckEventEndTime: 0,
    trophyLuckEndTime: 0,
    username: "",
    password: ""
};

function saveGame() {
    try {
        localStorage.setItem('swordGameState', JSON.stringify(gameState));
    } catch(e) {
        console.warn('localStorage is blocked or not available.');
    }
}

function loadGame() {
    let saved = null;
    try {
        saved = localStorage.getItem('swordGameState');
    } catch(e) {
        console.warn('localStorage is blocked or not available.');
    }
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed };
            if (!gameState.inventory) gameState.inventory = [];
            if (!gameState.fuse) gameState.fuse = { active: false, endTime: 0, resultLevel: null };
            if (!gameState.shopNextReroll) gameState.shopNextReroll = 0;
            if (!gameState.currentShopItems) gameState.currentShopItems = [];
            if (!gameState.skinLevels) gameState.skinLevels = {};
            if (gameState.luckEventEndTime === undefined) gameState.luckEventEndTime = 0;
        } catch(e) {
            console.error("Save file corrupted");
        }
    }
    
    // 이펙트 체력 보너스 계산 (비정상적으로 저장된 hp가 있을경우 대비)
    if (gameState.hp === 3000 && gameState.maxHp === 3000) {
        gameState.hp = 5000;
        gameState.maxHp = 5000;
    }
    recalculateMaxHp();
}

function getEffectBonus() {
    let bonusHp = 0;
    let bonusDamage = 0;
    if (typeof allEffectsPool !== 'undefined') {
        const currentEffect = allEffectsPool.find(e => e.id === gameState.currentSkin);
        if (currentEffect) {
            if (currentEffect.grade === '희귀') { bonusHp = 500; bonusDamage = 50; }
            else if (currentEffect.grade === '영웅') { bonusHp = 1500; bonusDamage = 150; }
            else if (currentEffect.grade === '전설') { bonusHp = 3000; bonusDamage = 300; }
            else if (currentEffect.grade === '신화') { bonusHp = 5000; bonusDamage = 500; }
            else if (currentEffect.grade === '비밀') { bonusHp = 10000; bonusDamage = 1000; }
            else if (currentEffect.grade === '한정') { bonusHp = 13000; bonusDamage = 1300; }
            
            let lvl = gameState.skinLevels[currentEffect.id] || 0;
            const multiplier = 1 + (lvl * 0.2);
            
            bonusHp = Math.floor(bonusHp * multiplier);
            bonusDamage = Math.floor(bonusDamage * multiplier);
        }
    }
    return { hp: bonusHp, dmg: bonusDamage };
}

function recalculateMaxHp() {
    let baseHp = 5000;
    const bonus = getEffectBonus();
    
    gameState.maxHp = baseHp + bonus.hp;
    gameState.hp = gameState.maxHp; // 장착 시 체력 꽉 채워주기
}

const swordNames = [
    "초보자에 칼",         // 0
    "강화된 초보자의 정수", // 1
    "중수의 검",           // 2
    "고수의 검",           // 3
    "국수의 검",           // 4
    "골수의 검",           // 5
    "전설에 검",           // 6
    "초월의 검",           // 7
    "진화의 검",           // 8
    "사랑의 검",           // 9
    "최종의검",            // 10
    "???의검",             // 11
    "비밀의 검",           // 12
    "봉인된 검",           // 13
    "진실의검",           // 14
    "평범한 검",           // 15 (퓨즈)
    "공허의 검",           // 16 (퓨즈)
    "블랙홀 검",           // 17 (퓨즈)
    "종말의 검",           // 18 (퓨즈)
    "67단검",              // 19 (히든)
    "여명의 검",            // 20
    "해적의 문어다리 검",   // 21 (시즌 검)
    "해적의 검",             // 22 (시즌 검)
    "빛의 검",              // 23 (한정 조합)
    "사명의 검"             // 24 (특별 한정)
];

// Enhance Costs (0 to 13)
const enhanceCosts = [
    100,    // 0->1
    300,    // 1->2
    800,    // 2->3
    1500,   // 3->4
    3000,   // 4->5
    6000,   // 5->6
    10000,  // 6->7
    18000,  // 7->8
    30000,  // 8->9
    45000,  // 9->10
    65000,  // 10->11
    85000,  // 11->12
    100000, // 12->13
    150000, // 13->14 (진실의검)
    Infinity, // 14
    Infinity, // 15
    Infinity, // 16
    Infinity, // 17
    Infinity, // 18
    Infinity, // 19
    Infinity, // 20
    Infinity, // 21 (시즌 검)
    Infinity, // 22 (시즌 검)
    Infinity, // 23 (한정 조합)
    Infinity  // 24 (특별 한정)
];

const levelDamage = [
    10, 20, 40, 70, 110, 160, 220, 300, 400, 550, 750, 1000, 1500, 2000,
    3000,   // 14: 진실의검
    40,     // 15: 평범한 검 (2강급)
    400,    // 16: 공허의 검 (8강급)
    1000,   // 17: 블랙홀 검 (11강급)
    3000,   // 18: 종말의 검
    750,    // 19: 67단검 (11강급)
    5000,   // 20: 여명의 검
    4000,   // 21: 해적의 문어다리 검 (시즌 검)
    3500,   // 22: 해적의 검 (시즌 검)
    9000,   // 23: 빛의 검 (한정 조합)
    8000    // 24: 사명의 검 (특별 한정)
];

const gradeColors = {
    '희귀': '#3b82f6',
    '영웅': '#a855f7',
    '전설': '#eab308',
    '신화': '#ef4444',
    '비밀': '#10b981',
    '한정': '#ff007f'
};

const allEffectsPool = [
    // 희귀
    { id: 'ice', name: '서리한의 한기', grade: '희귀', color: 'rgba(59, 130, 246, 0.8)', price: 20000 },
    { id: 'wind', name: '칼날 바람', grade: '희귀', color: 'rgba(16, 185, 129, 0.8)', price: 20000 },
    { id: 'earth', name: '대지의 울림', grade: '희귀', color: 'rgba(217, 119, 6, 0.8)', price: 20000 },
    // 영웅
    { id: 'poison', name: '맹독의 늪', grade: '영웅', color: 'rgba(34, 197, 94, 0.8)', price: 50000 },
    { id: 'blood', name: '핏빛 베기', grade: '영웅', color: 'rgba(220, 38, 38, 0.8)', price: 50000 },
    { id: 'shadow', name: '그림자 일격', grade: '영웅', color: 'rgba(71, 85, 105, 0.8)', price: 50000 },
    // 전설
    { id: 'light', name: '천상의 빛', grade: '전설', color: 'rgba(250, 204, 21, 0.8)', price: 120000 },
    { id: 'lightning', name: '뇌전의 분노', grade: '전설', color: 'rgba(14, 165, 233, 0.8)', price: 120000 },
    // 신화
    { id: 'dragon', name: '드래곤 브레스', grade: '신화', color: 'rgba(249, 115, 22, 0.9)', price: 250000 },
    { id: 'void', name: '공허의 틈새', grade: '신화', color: 'rgba(147, 51, 234, 0.9)', price: 250000 },
    { id: 'galaxy', name: '은하수 베기', grade: '비밀', color: 'rgba(255, 255, 255, 1)', price: 400000 },
    // 한정
    { id: 'absolute', name: '절대자의 권능', grade: '한정', color: 'rgba(255, 0, 128, 1)', price: 100000 }
];

// Fallback old colors for backwards compatibility
const skinColors = {
    'default': 'rgba(239, 68, 68, 0.8)',
    'flame': 'rgba(249, 115, 22, 0.8)',
    'poison': 'rgba(34, 197, 94, 0.8)',
    'lightning': 'rgba(6, 182, 212, 0.8)',
    'dark': 'rgba(168, 85, 247, 0.8)'
};

// DOM Elements
const hpValueEl = document.querySelector('.hp-value');
const trophyCountEl = document.getElementById('trophy-count');
const moneyCountEl = document.getElementById('money-count');
const swordDisplay = document.getElementById('sword-display');
const swordNameEl = document.getElementById('sword-name');
const swordDamageEl = document.getElementById('sword-damage');
const swordLevelEl = document.getElementById('sword-level');
const enhanceCostEl = document.getElementById('enhance-cost');
const eventLogEl = document.getElementById('event-log');
const skillArea = document.getElementById('skill-area');

const btnEnhance = document.getElementById('btn-enhance');
const btnTrain = document.getElementById('btn-train');
const btnBattle = document.getElementById('btn-battle');
const btnSkill = document.getElementById('btn-skill');
const btnSkillDouble = document.getElementById('btn-skill-double');
const btnTrophyRoad = document.getElementById('btn-trophy-road');
const btnShop = document.getElementById('btn-shop');
const btnInventory = document.getElementById('btn-inventory');
const btnStash = document.getElementById('btn-stash');

const trophyModal = document.getElementById('trophy-modal');
const btnExitTrophy = document.getElementById('btn-exit-trophy');
const milestone100 = document.getElementById('milestone-100');

const inventoryModal = document.getElementById('inventory-modal');
const btnExitInventory = document.getElementById('btn-exit-inventory');
const inventoryList = document.getElementById('inventory-list');

// Fuse DOM
const btnOpenFuse = document.getElementById('btn-open-fuse');
const fuseModal = document.getElementById('fuse-modal');
const btnExitFuse = document.getElementById('btn-exit-fuse');
const btnFuseInsert = document.getElementById('btn-fuse-insert');
const fuseStatusText = document.getElementById('fuse-status-text');
const fuseTimerText = document.getElementById('fuse-timer-text');

const fuseSelectModal = document.getElementById('fuse-select-modal');
const btnExitFuseSelect = document.getElementById('btn-exit-fuse-select');
const btnFuseStart = document.getElementById('btn-fuse-start');
const fuseInventoryList = document.getElementById('fuse-inventory-list');
const fuseSelectedCount = document.getElementById('fuse-selected-count');
let fuseSelectedIndices = [];

const shopTabSword = document.getElementById('shop-tab-sword');
const shopTabEffect = document.getElementById('shop-tab-effect');
const shopTabSeason = document.getElementById('shop-tab-season');
const shopTabLimited = document.getElementById('shop-tab-limited');
const shopSwordsSection = document.getElementById('shop-swords-section');
const shopEffectsSection = document.getElementById('shop-effects-section');
const shopSeasonSection = document.getElementById('shop-season-section');
const shopLimitedSection = document.getElementById('shop-limited-section');
const btnBuyOctopusSword = document.getElementById('btn-buy-octopus-sword');
const btnBuyPirateSword = document.getElementById('btn-buy-pirate-sword');

// 한정 조합 DOM
const btnOpenLightCombine = document.getElementById('btn-open-light-combine');
const lightCombineModal = document.getElementById('light-combine-modal');
const btnExitLightCombine = document.getElementById('btn-exit-light-combine');
const lightSlot1 = document.getElementById('light-slot-1');
const lightSlot2 = document.getElementById('light-slot-2');
const btnLightCombineStart = document.getElementById('btn-light-combine-start');
const btnMissionCombineStart = document.getElementById('btn-mission-combine-start');

// Mission Sword Feature Flag (User requested to hide until ready)
window.MISSION_SWORD_EVENT_ACTIVE = false;
let missionCombineMaterials = [null, null, null, null]; // 4 slots
let currentMissionSelectingSlot = null;
const missionSwordBox = document.getElementById('mission-sword-box');
const missionTimerText = document.getElementById('mission-timer-text');
const btnOpenMissionCombine = document.getElementById('btn-open-mission-combine');
const missionCombineModal = document.getElementById('mission-combine-modal');
const btnExitMissionCombine = document.getElementById('btn-exit-mission-combine');

const missionSlot1 = document.getElementById('mission-slot-1');
const missionSlot2 = document.getElementById('mission-slot-2');
const missionSlot3 = document.getElementById('mission-slot-3');
const missionSlot4 = document.getElementById('mission-slot-4');

const missionCombineInventoryModal = document.getElementById('mission-combine-inventory-modal');
const missionCombineInventoryList = document.getElementById('mission-combine-inventory-list');
const btnExitMissionInventory = document.getElementById('btn-exit-mission-inventory');
const lightCombineInventoryModal = document.getElementById('light-combine-inventory-modal');
const btnExitLightInventory = document.getElementById('btn-exit-light-inventory');
const lightCombineInventoryList = document.getElementById('light-combine-inventory-list');
const limitedStockText = document.getElementById('limited-stock-text');

let lightCombineMaterial1 = null; // index
let lightCombineMaterial2 = null; // index
let currentSelectingSlot = 0;

const shopModal = document.getElementById('shop-modal');
const btnExitShop = document.getElementById('btn-exit-shop');
const shopTrophyCount = document.getElementById('shop-trophy-count');
const shopItemsContainer = document.getElementById('shop-items-container');
const shopTimerEl = document.getElementById('shop-timer');

const tabSword = document.getElementById('tab-sword');
const tabEffect = document.getElementById('tab-effect');
const invSwordsSection = document.getElementById('inventory-swords-section');
const invEffectsSection = document.getElementById('inventory-effects-section');
const effectInventoryList = document.getElementById('effect-inventory-list');

const trainingModal = document.getElementById('training-modal');
const btnExitTrain = document.getElementById('btn-exit-train');
const trainSliceCanvas = document.getElementById('train-slice-canvas');
const trainSliceCtx = trainSliceCanvas.getContext('2d');
const robotDummy = document.getElementById('robot-dummy');

const loginScreenModal = document.getElementById('login-screen-modal');
const btnLoginStart = document.getElementById('btn-login-start');
const btnLoginLoad = document.getElementById('btn-login-load');
const loginNickname = document.getElementById('login-nickname');
const loginPassword = document.getElementById('login-password');
const loginSavecode = document.getElementById('login-savecode');
const btnExportSave = document.getElementById('btn-export-save');
const btnLogout = document.getElementById('btn-logout');

// Battle DOM
const battleModal = document.getElementById('battle-modal');
const battlePlayerHp = document.getElementById('battle-player-hp');
const battleEnemyHp = document.getElementById('battle-enemy-hp');
const playerHpFill = document.getElementById('player-hp-fill');
const enemyHpFill = document.getElementById('enemy-hp-fill');
const battlePlayerStatus = document.getElementById('battle-player-status');
const battleEnemyStatus = document.getElementById('battle-enemy-status');
const btnAttack = document.getElementById('btn-attack'); // Optional now
const btnFlee = document.getElementById('btn-flee');
const enemyNameEl = document.getElementById('enemy-name');
const enemyCharacterEl = document.getElementById('enemy-character');
const enemyVisualContainer = document.getElementById('enemy-visual-container');
const battleTitle = document.getElementById('battle-title');
const battleModeBadge = document.getElementById('battle-mode-badge');
const pvpTurnIndicator = document.getElementById('pvp-turn-indicator');
const battlePlayerName = document.getElementById('battle-player-name');

// Mode Select DOM
const modeSelectModal = document.getElementById('mode-select-modal');
const btnModePve = document.getElementById('btn-mode-pve');
const btnModePvp = document.getElementById('btn-mode-pvp');
const btnModeBoss = document.getElementById('btn-mode-boss');
const btnExitModeSelect = document.getElementById('btn-exit-mode-select');

// Boss Select DOM
const bossSelectModal = document.getElementById('boss-select-modal');
const btnStartNormalBoss = document.getElementById('btn-start-normal-boss');
const btnStartKrakenBoss = document.getElementById('btn-start-kraken-boss');
const btnExitBossSelect = document.getElementById('btn-exit-boss-select');


// PVP Setup DOM
const pvpSetupModal = document.getElementById('pvp-setup-modal');
const pvpP1NameEl = document.getElementById('pvp-p1-name');
const pvpP2LevelEl = document.getElementById('pvp-p2-level');
const pvpP2NameEl = document.getElementById('pvp-p2-name');
const btnStartPvp = document.getElementById('btn-start-pvp');
const btnExitPvpSetup = document.getElementById('btn-exit-pvp-setup');

// Luck Event DOM
const luckEventUi = document.getElementById('luck-event-ui');
const luckTimerText = document.getElementById('luck-timer-text');

window.triggerLuckEvent = function(minutes) {
    const addMs = minutes * 60 * 1000;
    if (gameState.luckEventEndTime > Date.now()) {
        gameState.luckEventEndTime += addMs;
    } else {
        gameState.luckEventEndTime = Date.now() + addMs;
    }
    saveGame();
    luckEventUi.classList.remove('hidden');
    logEvent(`🍀 럭 이벤트 시간이 ${minutes}분 추가되었습니다!`, 'success');
};

// Trophy Luck Event DOM
const trophyLuckEventUi = document.getElementById('trophy-luck-event-ui');
const trophyLuckTimerText = document.getElementById('trophy-luck-timer-text');

window.triggerTrophyLuckEvent = function(minutes) {
    const addMs = minutes * 60 * 1000;
    if (gameState.trophyLuckEndTime > Date.now()) {
        gameState.trophyLuckEndTime += addMs;
    } else {
        gameState.trophyLuckEndTime = Date.now() + addMs;
    }
    saveGame();
    if (trophyLuckEventUi) trophyLuckEventUi.classList.remove('hidden');
    logEvent(`🏆 트로피 2배 버프 시간이 ${minutes}분 추가되었습니다!`, 'success');
};

// Slicing Canvas
const sliceCanvas = document.getElementById('slice-canvas');
const sliceCtx = sliceCanvas.getContext('2d');
let isSlicing = false;
let slicePath = [];
let canAttack = true;
let pveEnemyAttackInterval = null;

// Battle State
let battleState = {
    active: false,
    mode: 'pve', // pve, pvp, boss
    enemyMaxHp: 0,
    enemyHp: 0,
    enemyDamage: 0,
    playerHp: 3000,
    skillUsed: false,
    doubleSkillUsed: false,
    pvpTurn: 1, // 1 for player 1, 2 for player 2
    p1Name: '나',
    p2Name: '상대방',
    p2Level: 0
};


// Utilities
function logEvent(msg, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-entry log-${type}`;
    p.textContent = msg;
    eventLogEl.prepend(p);
}

function updateUI() {
    // Removed money limit
    hpValueEl.textContent = `${gameState.hp} / ${gameState.maxHp}`;
    trophyCountEl.textContent = gameState.trophies;
    moneyCountEl.textContent = gameState.money.toLocaleString() + '원';
    
    swordNameEl.textContent = swordNames[gameState.level];
    
    if (gameState.level >= 15) {
        swordLevelEl.textContent = `[특수 검]`;
        swordLevelEl.style.color = '#ef4444';
    } else {
        swordLevelEl.textContent = `[+${gameState.level}]`;
        if (gameState.level >= 14) {
            enhanceCostEl.textContent = '(최고 레벨 달성)';
        } else {
            enhanceCostEl.textContent = `(비용: ${enhanceCosts[gameState.level].toLocaleString()}원)`;
        }
    }
    
    // Total damage = level damage + any training bonuses
    const currentBase = levelDamage[gameState.level];
    
    swordDamageEl.textContent = getPlayerDamage().toFixed(1);
    
    // Update sword classes for visual
    swordDisplay.className = '';
    swordDisplay.classList.add(`level-${gameState.level}`);
    
    if (gameState.level === 12 && !gameState.hasHiddenSkill) {
        gameState.hasHiddenSkill = true;
        logEvent('🎉 히든 조건 달성! [검기] 스킬을 획득했습니다!', 'success');
        btnSkill.classList.remove('hidden');
    }
    
    if (gameState.trophies >= 100 && !gameState.hasDoubleSkill) {
        gameState.hasDoubleSkill = true;
        logEvent('💥 트로피 100점 달성! [이중베기] 스킬을 획득했습니다!', 'success');
        btnSkillDouble.classList.remove('hidden');
        milestone100.classList.add('achieved');
    } else if (gameState.trophies >= 100) {
        milestone100.classList.add('achieved');
        btnSkillDouble.classList.remove('hidden');
    }
    
    if (gameState.hasHiddenSkill) {
        btnSkill.classList.remove('hidden');
    }
    
    // Update shop UI
    shopTrophyCount.textContent = gameState.trophies;
    saveGame();
}

function getPlayerDamage() {
    const trainingBonus = gameState.baseDamage - 10;
    const effectBonus = getEffectBonus().dmg;
    return levelDamage[gameState.level] + trainingBonus + effectBonus;
}

// Actions
btnEnhance.addEventListener('click', () => {
    if (gameState.level >= 15) {
        logEvent('특수 검은 강화할 수 없습니다.', 'info');
        return;
    }
    if (gameState.level >= 14) {
        logEvent('진실의검... 더 이상 강화할 수 없습니다.', 'info');
        return;
    }
    
    const cost = enhanceCosts[gameState.level];
    
    if (gameState.money < cost) {
        logEvent(`❌ 돈이 부족합니다. (필요: ${cost.toLocaleString()}원)`, 'fail');
        return;
    }
    
    // Pay and 100% Enhance
    gameState.money -= cost;
    
    swordDisplay.classList.add('shake');
    setTimeout(() => swordDisplay.classList.remove('shake'), 500);

    gameState.level++;
    logEvent(`✨ 강화 성공! [${swordNames[gameState.level]}] (으)로 진화했습니다!`, 'success');
    
    updateUI();
});

btnTrain.addEventListener('click', () => {
    trainingModal.classList.remove('hidden');
    trainSliceCanvas.width = trainSliceCanvas.offsetWidth;
    trainSliceCanvas.height = trainSliceCanvas.offsetHeight;
});

btnExitTrain.addEventListener('click', () => {
    trainingModal.classList.add('hidden');
});

btnTrophyRoad.addEventListener('click', () => {
    trophyModal.classList.remove('hidden');
});

btnExitTrophy.addEventListener('click', () => {
    trophyModal.classList.add('hidden');
});

// Shop Logic
function rerollShop() {
    gameState.currentShopItems = [];
    const numItems = 4;
    
    for (let i = 0; i < numItems; i++) {
        const roll = Math.random() * 100;
        let selectedGrade = '희귀';
        
        if (roll > 50 && roll <= 80) selectedGrade = '영웅';
        else if (roll > 80 && roll <= 95) selectedGrade = '전설';
        else if (roll > 95 && roll <= 99.9) selectedGrade = '신화';
        else if (roll > 99.9) selectedGrade = '비밀';
        
        const pool = allEffectsPool.filter(e => e.grade === selectedGrade);
        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        gameState.currentShopItems.push(randomItem.id);
    }
    
    gameState.shopNextReroll = Date.now() + 5 * 60 * 1000;
    saveGame();
    renderShop();
}

function renderShop() {
    shopItemsContainer.innerHTML = '';
    
    gameState.currentShopItems.forEach(id => {
        const effect = allEffectsPool.find(e => e.id === id);
        if (!effect) return;
        
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.style.borderLeft = `4px solid ${gradeColors[effect.grade]}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = gradeColors[effect.grade];
        if (effect.grade === '비밀') nameSpan.style.textShadow = '0 0 5px #fff';
        if (effect.grade === '한정') nameSpan.style.textShadow = '0 0 10px #ff007f';
        nameSpan.innerHTML = `[${effect.grade}] ${effect.name}`;
        
        const buyBtn = document.createElement('button');
        buyBtn.className = 'action-btn shop-btn';
        
        if (gameState.ownedSkins.includes(effect.id)) {
            if (gameState.currentSkin === effect.id) {
                buyBtn.textContent = '장착 중';
                buyBtn.disabled = true;
                buyBtn.style.background = '#475569';
            } else {
                buyBtn.textContent = '장착하기';
                buyBtn.style.background = 'var(--secondary)';
                buyBtn.style.color = 'white';
                buyBtn.addEventListener('click', () => {
                    gameState.currentSkin = effect.id;
                    recalculateMaxHp();
                    logEvent(`[${effect.name}] 이펙트를 장착했습니다!`, 'info');
                    saveGame();
                    renderShop();
                    updateUI();
                });
            }
        } else {
            let itemPrice = effect.price;
            buyBtn.innerHTML = `${itemPrice.toLocaleString()}원`;
            buyBtn.style.background = 'var(--accent-gold)';
            buyBtn.style.color = 'black';
            
            buyBtn.addEventListener('click', () => {
                let currentItemPrice = effect.price;
                if (gameState.money >= currentItemPrice) {
                    gameState.money -= currentItemPrice;
                    gameState.ownedSkins.push(effect.id);
                    logEvent(`[${effect.name}] 이펙트를 구매했습니다! 인벤토리를 확인하세요.`, 'success');
                    saveGame();
                    renderShop();
                    updateUI();
                } else {
                    logEvent('돈이 부족합니다!', 'fail');
                }
            });
        }
        
        div.appendChild(nameSpan);
        div.appendChild(buyBtn);
        shopItemsContainer.appendChild(div);
    });
}

btnShop.addEventListener('click', () => {
    updateUI();
    if (!gameState.shopNextReroll || Date.now() > gameState.shopNextReroll || gameState.currentShopItems.length === 0) {
        rerollShop();
    } else {
        renderShop();
    }
    shopModal.classList.remove('hidden');
});

btnExitShop.addEventListener('click', () => {
    shopModal.classList.add('hidden');
});

shopTabEffect.addEventListener('click', () => {
    shopTabEffect.style.background = 'var(--primary)';
    shopTabSeason.style.background = '#334155';
    if(shopTabLimited) shopTabLimited.style.background = '#334155';
    shopEffectsSection.classList.remove('hidden');
    shopSeasonSection.classList.add('hidden');
    if(shopLimitedSection) shopLimitedSection.classList.add('hidden');
});

shopTabSeason.addEventListener('click', () => {
    shopTabSeason.style.background = 'var(--primary)';
    shopTabEffect.style.background = '#334155';
    if(shopTabLimited) shopTabLimited.style.background = '#334155';
    shopSeasonSection.classList.remove('hidden');
    shopEffectsSection.classList.add('hidden');
    if(shopLimitedSection) shopLimitedSection.classList.add('hidden');
});

if (shopTabLimited) {
    shopTabLimited.addEventListener('click', () => {
        shopTabLimited.style.background = '#f59e0b'; // 황금색
        shopTabEffect.style.background = '#334155';
        shopTabSeason.style.background = '#334155';
        shopLimitedSection.classList.remove('hidden');
        shopEffectsSection.classList.add('hidden');
        shopSeasonSection.classList.add('hidden');
        
        updateLimitedStockUI();
    });
}

if (btnBuyOctopusSword) {
    btnBuyOctopusSword.addEventListener('click', () => {
        const price = 400000;
        if (gameState.money >= price) {
            gameState.money -= price;
            gameState.inventory.push(21); // Level 21 is Octopus Sword
            saveGame();
            updateUI();
            logEvent('🐙 해적의 문어다리 검을 구매했습니다!', 'success');
        } else {
            alert('골드가 부족합니다!');
        }
    });
}

if (btnBuyPirateSword) {
    btnBuyPirateSword.addEventListener('click', () => {
        const price = 350000;
        if (gameState.money >= price) {
            gameState.money -= price;
            gameState.inventory.push(22); // Level 22 is Pirate Sword
            saveGame();
            updateUI();
            logEvent('⚔️ 해적의 검을 구매했습니다!', 'success');
        } else {
            alert('골드가 부족합니다!');
        }
    });
}

// Inventory Logic
btnStash.addEventListener('click', () => {
    gameState.inventory.push(gameState.level);
    logEvent(`[${swordNames[gameState.level]}] (을)를 인벤토리에 보관했습니다.`, 'info');
    gameState.level = 0;
    updateUI();
});

// Inventory Tabs
tabSword.addEventListener('click', () => {
    tabSword.style.background = 'var(--primary)';
    tabEffect.style.background = '#334155';
    invSwordsSection.classList.remove('hidden');
    invEffectsSection.classList.add('hidden');
});

tabEffect.addEventListener('click', () => {
    tabEffect.style.background = 'var(--primary)';
    tabSword.style.background = '#334155';
    invEffectsSection.classList.remove('hidden');
    invSwordsSection.classList.add('hidden');
});
btnInventory.addEventListener('click', () => {
    renderInventory();
    renderEffectInventory();
    inventoryModal.classList.remove('hidden');
});

btnExitInventory.addEventListener('click', () => {
    inventoryModal.classList.add('hidden');
});

function renderEffectInventory() {
    effectInventoryList.innerHTML = '';
    
    // Add default effect
    if (!gameState.ownedSkins.includes('default')) {
        gameState.ownedSkins.unshift('default');
    }
    
    gameState.ownedSkins.forEach(id => {
        let name = '기본 베기';
        let colorStr = 'white';
        let gradeStr = '기본';
        
        const eff = allEffectsPool.find(e => e.id === id);
        if (eff) {
            name = eff.name;
            colorStr = gradeColors[eff.grade];
            gradeStr = eff.grade;
        }
        
        const lvl = gameState.skinLevels[id] || 0;
        const lvlStr = lvl > 0 ? `[+${lvl}] ` : '';
        
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.style.borderLeft = `4px solid ${colorStr}`;
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.flexWrap = 'wrap';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = colorStr;
        nameSpan.style.flex = '1';
        nameSpan.textContent = `${lvlStr}[${gradeStr}] ${name}`;
        
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '5px';
        
        if (eff && lvl < 5) {
            const upgradeCost = Math.floor(eff.price * (lvl + 1) * 0.5);
            const upgradeBtn = document.createElement('button');
            upgradeBtn.className = 'action-btn danger-btn';
            upgradeBtn.style.padding = '5px 10px';
            upgradeBtn.style.fontSize = '0.8rem';
            upgradeBtn.textContent = `강화 (${upgradeCost.toLocaleString()}원)`;
            upgradeBtn.addEventListener('click', () => {
                if (gameState.money >= upgradeCost) {
                    gameState.money -= upgradeCost;
                    gameState.skinLevels[id] = lvl + 1;
                    logEvent(`[${name}] 이펙트를 +${lvl + 1}강으로 강화했습니다!`, 'success');
                    if (gameState.currentSkin === id) {
                        recalculateMaxHp();
                    }
                    saveGame();
                    renderEffectInventory();
                    updateUI();
                } else {
                    logEvent('돈이 부족합니다!', 'fail');
                }
            });
            btnContainer.appendChild(upgradeBtn);
        } else if (eff && lvl >= 5) {
            const maxBtn = document.createElement('button');
            maxBtn.className = 'action-btn';
            maxBtn.style.padding = '5px 10px';
            maxBtn.style.fontSize = '0.8rem';
            maxBtn.style.background = '#475569';
            maxBtn.disabled = true;
            maxBtn.textContent = 'MAX';
            btnContainer.appendChild(maxBtn);
        }
        
        const equipBtn = document.createElement('button');
        equipBtn.className = 'action-btn shop-btn';
        equipBtn.style.padding = '5px 15px';
        
        if (gameState.currentSkin === id) {
            equipBtn.textContent = '장착 중';
            equipBtn.classList.add('equipped');
        } else {
            equipBtn.textContent = '장착하기';
            equipBtn.addEventListener('click', () => {
                gameState.currentSkin = id;
                recalculateMaxHp();
                logEvent(`[${name}] 이펙트를 장착했습니다!`, 'success');
                saveGame();
                renderEffectInventory();
                updateUI();
            });
        }
        btnContainer.appendChild(equipBtn);
        
        div.appendChild(nameSpan);
        div.appendChild(btnContainer);
        effectInventoryList.appendChild(div);
    });
}

function renderInventory() {
    inventoryList.innerHTML = '';
    if (gameState.inventory.length === 0) {
        inventoryList.innerHTML = '<p style="color:#94a3b8;text-align:center;">보관된 검이 없습니다.</p>';
        return;
    }
    
    gameState.inventory.forEach((lvl, index) => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = 'white';
        nameSpan.textContent = `[+${lvl}] ${swordNames[lvl]}`;
        
        const equipBtn = document.createElement('button');
        equipBtn.className = 'action-btn shop-btn';
        equipBtn.textContent = '꺼내기';
        
        equipBtn.addEventListener('click', () => {
            // 현재 검을 인벤토리에 넣고 선택한 검을 꺼냄
            gameState.inventory.push(gameState.level);
            gameState.level = lvl;
            gameState.inventory.splice(index, 1);
            logEvent(`인벤토리에서 [${swordNames[lvl]}] (을)를 꺼냈습니다!`, 'success');
            renderInventory(); // Re-render list
            updateUI();
        });
        
        const sellPrice = lvl * 2000;
        const sellBtn = document.createElement('button');
        sellBtn.className = 'action-btn danger-btn';
        sellBtn.style.marginLeft = '5px';
        sellBtn.textContent = `판매 (${sellPrice.toLocaleString()}원)`;
        
        sellBtn.addEventListener('click', () => {
            gameState.inventory.splice(index, 1);
            gameState.money += sellPrice;
            // Removed money limit
            saveGame();
            logEvent(`[${swordNames[lvl]}] (을)를 판매하여 ${sellPrice.toLocaleString()}원을 얻었습니다!`, 'success');
            renderInventory();
            updateUI();
        });
        
        div.appendChild(nameSpan);
        div.appendChild(equipBtn);
        div.appendChild(sellBtn);
        inventoryList.appendChild(div);
    });
}

// =======================
// Fuse Logic
// =======================
btnOpenFuse.addEventListener('click', () => {
    updateFuseUI();
    fuseModal.classList.remove('hidden');
});

btnExitFuse.addEventListener('click', () => {
    fuseModal.classList.add('hidden');
});

btnFuseInsert.addEventListener('click', () => {
    if (gameState.fuse.active) {
        logEvent('이미 융합이 진행 중입니다!', 'fail');
        return;
    }
    openFuseSelect();
});

btnExitFuseSelect.addEventListener('click', () => {
    fuseSelectModal.classList.add('hidden');
});

function updateFuseUI() {
    if (gameState.fuse.active) {
        btnFuseInsert.disabled = true;
        btnFuseInsert.style.opacity = '0.5';
        fuseStatusText.textContent = '융합 진행 중... ⚙️⚡';
        fuseStatusText.style.color = '#fbbf24';
    } else {
        btnFuseInsert.disabled = false;
        btnFuseInsert.style.opacity = '1';
        fuseStatusText.textContent = '대기 중...';
        fuseStatusText.style.color = '#38bdf8';
        fuseTimerText.textContent = '';
    }
}

function openFuseSelect() {
    fuseSelectedIndices = [];
    fuseSelectModal.classList.remove('hidden');
    renderFuseInventory();
}

function renderFuseInventory() {
    fuseInventoryList.innerHTML = '';
    fuseSelectedCount.textContent = fuseSelectedIndices.length;
    btnFuseStart.disabled = fuseSelectedIndices.length !== 2;
    
    let validItemsFound = false;
    
    if (gameState.inventory.length === 0) {
        fuseInventoryList.innerHTML = '<p style="color:#94a3b8;text-align:center;">보관된 검이 없습니다.</p>';
        return;
    }
    
    gameState.inventory.forEach((lvl, index) => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = 'white';
        nameSpan.textContent = `[+${lvl}] ${swordNames[lvl]}`;
        
        const selBtn = document.createElement('button');
        selBtn.className = 'action-btn shop-btn';
        
        const isValid = (lvl >= 1 && lvl <= 14);
        
        if (!isValid) {
            selBtn.textContent = '불가 (1~14강만)';
            selBtn.disabled = true;
            selBtn.style.background = '#475569';
            selBtn.style.opacity = '0.5';
        } else {
            validItemsFound = true;
            const isSelected = fuseSelectedIndices.includes(index);
            if (isSelected) {
                div.classList.add('fuse-item-selected');
                selBtn.textContent = '선택 취소';
                selBtn.style.background = 'var(--danger)';
            } else {
                selBtn.textContent = '선택하기';
                selBtn.style.background = 'var(--secondary)';
            }
            
            selBtn.addEventListener('click', () => {
                const selIdx = fuseSelectedIndices.indexOf(index);
                if (selIdx > -1) {
                    fuseSelectedIndices.splice(selIdx, 1);
                } else {
                    if (fuseSelectedIndices.length >= 2) {
                        logEvent('제물은 2개까지만 선택할 수 있습니다.', 'info');
                        return;
                    }
                    
                    if (fuseSelectedIndices.length === 1) {
                        const firstIdx = fuseSelectedIndices[0];
                        const firstLvl = gameState.inventory[firstIdx];
                        const currentTier = (firstLvl >= 1 && firstLvl <= 6) ? 1 : 2;
                        const thisTier = (lvl >= 1 && lvl <= 6) ? 1 : 2;
                        const is67Combo = (firstLvl === 6 && lvl === 7) || (firstLvl === 7 && lvl === 6);
                        
                        if (currentTier !== thisTier && !is67Combo) {
                            logEvent('1~6강과 7~12강은 섞어서 융합할 수 없습니다. (6강+7강 특수 융합 제외)', 'fail');
                            return;
                        }
                    }
                    
                    fuseSelectedIndices.push(index);
                }
                renderFuseInventory();
            });
        }
        
        div.appendChild(nameSpan);
        div.appendChild(selBtn);
        fuseInventoryList.appendChild(div);
    });
    
    updateFuseProbTable();
}

function updateFuseProbTable() {
    const container = document.getElementById('fuse-prob-container');
    if (!container) return;
    
    if (fuseSelectedIndices.length > 0) {
        const firstIdx = fuseSelectedIndices[0];
        const firstLvl = gameState.inventory[firstIdx];
        const isHighTier = (firstLvl >= 7 && firstLvl <= 12);
        
        let is67Combo = false;
        let is1314Combo = false;
        if (fuseSelectedIndices.length === 2) {
            const secondLvl = gameState.inventory[fuseSelectedIndices[1]];
            is67Combo = (firstLvl === 6 && secondLvl === 7) || (firstLvl === 7 && secondLvl === 6);
            is1314Combo = (firstLvl >= 13 && secondLvl >= 13);
        }
        
        if (is1314Combo) {
            container.innerHTML = `
                <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-secondary);">✨ 13~14강 특별 융합 ✨</h4>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #94a3b8;">평범한 검</span> <span style="color: #38bdf8; font-weight: bold;">65%</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #a855f7;">공허의 검</span> <span style="color: #c084fc; font-weight: bold;">18%</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #000; text-shadow: 0 0 5px #fff, 0 0 10px #fbbf24;">블랙홀 검</span> <span style="color: #fbbf24; font-weight: bold;">9%</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #ef4444; text-shadow: 0 0 5px #f87171;">종말의 검</span> <span style="color: #ef4444; font-weight: bold;">6%</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #fde047; text-shadow: 0 0 10px #f97316;">☀️ 여명의 검</span> <span style="color: #fde047; font-weight: bold;">2%</span>
                </div>
            `;
            return;
        }
        
        if (is67Combo) {
            container.innerHTML = `
                <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-secondary);">⚔️ 히든 융합 조합 ⚔️</h4>
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #ff007f; text-shadow: 0 0 5px #ff007f;">67쌍단검</span> <span style="color: #ff007f; font-weight: bold;">100%</span>
                </div>
            `;
            return;
        }

        if (isHighTier) {
            if (gameState.luckEventEndTime > 0) {
                container.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-secondary);">🍀 럭 이벤트 2배 확률! (7~12강) 🍀</h4>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #94a3b8;">평범한 검</span> <span style="color: #38bdf8; font-weight: bold;">40%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #a855f7;">공허의 검</span> <span style="color: #c084fc; font-weight: bold;">30%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #000; text-shadow: 0 0 5px #fff, 0 0 10px #fbbf24;">블랙홀 검</span> <span style="color: #fbbf24; font-weight: bold;">20%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span style="color: #ef4444; text-shadow: 0 0 5px #f87171;">종말의 검</span> <span style="color: #ef4444; font-weight: bold;">10%</span>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-secondary);">융합 결과 확률표 (7~12강)</h4>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #94a3b8;">평범한 검</span> <span style="color: #38bdf8; font-weight: bold;">70%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #a855f7;">공허의 검</span> <span style="color: #c084fc; font-weight: bold;">15%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #000; text-shadow: 0 0 5px #fff, 0 0 10px #fbbf24;">블랙홀 검</span> <span style="color: #fbbf24; font-weight: bold;">10%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span style="color: #ef4444; text-shadow: 0 0 5px #f87171;">종말의 검</span> <span style="color: #ef4444; font-weight: bold;">5%</span>
                    </div>
                `;
            }
        } else {
            if (gameState.luckEventEndTime > 0) {
                container.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-secondary);">🍀 럭 이벤트 2배 확률! (1~6강) 🍀</h4>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #94a3b8;">평범한 검 (2강과 동급)</span> <span style="color: #38bdf8; font-weight: bold;">80%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #a855f7;">공허의 검 (8강과 동급)</span> <span style="color: #c084fc; font-weight: bold;">14%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span style="color: #000; text-shadow: 0 0 5px #fff, 0 0 10px #fbbf24;">블랙홀 검 (11강과 동급)</span> <span style="color: #fbbf24; font-weight: bold;">6%</span>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; text-align: center; color: var(--text-secondary);">융합 결과 확률표 (1~6강)</h4>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #94a3b8;">평범한 검 (2강과 동급)</span> <span style="color: #38bdf8; font-weight: bold;">90%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #334155;">
                        <span style="color: #a855f7;">공허의 검 (8강과 동급)</span> <span style="color: #c084fc; font-weight: bold;">7%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span style="color: #000; text-shadow: 0 0 5px #fff, 0 0 10px #fbbf24;">블랙홀 검 (11강과 동급)</span> <span style="color: #fbbf24; font-weight: bold;">3%</span>
                    </div>
                `;
            }
        }
    } else {
        container.innerHTML = `<p style="text-align:center; color: #94a3b8; font-size:0.85rem; margin:0;">검을 선택하면 확률표가 표시됩니다.</p>`;
    }
}

btnFuseStart.addEventListener('click', () => {
    if (fuseSelectedIndices.length !== 2) return;
    
    // Check tier
    const lvl1 = gameState.inventory[fuseSelectedIndices[0]];
    const lvl2 = gameState.inventory[fuseSelectedIndices[1]];
    const isHighTier = (lvl1 >= 7 && lvl1 <= 12);
    const is67Combo = (lvl1 === 6 && lvl2 === 7) || (lvl1 === 7 && lvl2 === 6);
    const is1314Combo = (lvl1 >= 13 && lvl2 >= 13);
    
    // 가장 높은 인덱스부터 지워야 인벤토리 배열이 꼬이지 않음
    fuseSelectedIndices.sort((a,b) => b - a);
    fuseSelectedIndices.forEach(idx => {
        gameState.inventory.splice(idx, 1);
    });
    
    // 확률 계산
    const roll = Math.random() * 100;
    let resultLvl = 15; // 기본 평범한 검 (90% or 70%)
    
    if (is1314Combo) {
        if (roll <= 65) resultLvl = 15;
        else if (roll <= 83) resultLvl = 16;
        else if (roll <= 92) resultLvl = 17;
        else if (roll <= 98) resultLvl = 18;
        else resultLvl = 20;
    } else if (is67Combo) {
        resultLvl = 19; // 히든 쌍단검 100%
    } else if (isHighTier) {
        if (gameState.luckEventEndTime > 0) {
            // 2배 럭
            if (roll > 40 && roll <= 70) resultLvl = 16; // 30% 공허
            else if (roll > 70 && roll <= 90) resultLvl = 17; // 20% 블랙홀
            else if (roll > 90) resultLvl = 18; // 10% 종말
        } else {
            if (roll > 70 && roll <= 85) resultLvl = 16; // 15% 공허
            else if (roll > 85 && roll <= 95) resultLvl = 17; // 10% 블랙홀
            else if (roll > 95) resultLvl = 18; // 5% 종말
        }
    } else {
        if (gameState.luckEventEndTime > 0) {
            if (roll > 80 && roll <= 94) resultLvl = 16; // 14% 공허
            else if (roll > 94) resultLvl = 17; // 6% 블랙홀
        } else {
            if (roll > 90 && roll <= 97) resultLvl = 16; // 7% 공허
            else if (roll > 97) resultLvl = 17; // 3% 블랙홀
        }
    }
    
    // 3분 소요 타이머 적용
    gameState.fuse.active = true;
    gameState.fuse.endTime = Date.now() + 180000; // 3분 소요
    gameState.fuse.resultLevel = resultLvl;
    
    saveGame();
    
    fuseSelectModal.classList.add('hidden');
    updateFuseUI();
    logEvent('🔥 퓨즈머신 가동 시작! 3분 뒤에 완료됩니다.', 'success');
});

setInterval(() => {
    const now = Date.now();
    
    // Shop Reroll Timer
    if (gameState.shopNextReroll) {
        const shopRemain = gameState.shopNextReroll - now;
        if (shopRemain <= 0) {
            if (!shopModal.classList.contains('hidden')) {
                rerollShop();
            } else {
                gameState.currentShopItems = []; // Force reroll next time opened
                gameState.shopNextReroll = 0;
            }
        } else {
            if (!shopModal.classList.contains('hidden')) {
                const totalSec = Math.ceil(shopRemain / 1000);
                const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
                const s = (totalSec % 60).toString().padStart(2, '0');
                shopTimerEl.textContent = `다음 갱신: ${m}:${s}`;
            }
        }
    }
    
    // Luck Event Timer
    if (gameState.luckEventEndTime > 0) {
        const remain = gameState.luckEventEndTime - now;
        if (remain <= 0) {
            gameState.luckEventEndTime = 0;
            saveGame();
            luckEventUi.classList.add('hidden');
            logEvent('❌ 퓨즈머신 럭 이벤트가 종료되었습니다.', 'info');
        } else {
            if (luckEventUi.classList.contains('hidden')) luckEventUi.classList.remove('hidden');
            const totalSec = Math.ceil(remain / 1000);
            const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
            const s = (totalSec % 60).toString().padStart(2, '0');
            luckTimerText.textContent = `${m}:${s}`;
        }
    }
    
    // Trophy Luck Event Timer
    if (gameState.trophyLuckEndTime > 0) {
        const remainTrophy = gameState.trophyLuckEndTime - now;
        if (remainTrophy <= 0) {
            gameState.trophyLuckEndTime = 0;
            saveGame();
            if (trophyLuckEventUi) trophyLuckEventUi.classList.add('hidden');
            logEvent('❌ 트로피 2배 이벤트가 종료되었습니다.', 'info');
        } else {
            if (trophyLuckEventUi && trophyLuckEventUi.classList.contains('hidden')) trophyLuckEventUi.classList.remove('hidden');
            const totalSecTrophy = Math.ceil(remainTrophy / 1000);
            const mt = Math.floor(totalSecTrophy / 60).toString().padStart(2, '0');
            const st = (totalSecTrophy % 60).toString().padStart(2, '0');
            if (trophyLuckTimerText) trophyLuckTimerText.textContent = `${mt}:${st}`;
        }
    }
    
    // Fuse Timer
    if (!gameState.fuse.active) return;
    
    const remain = gameState.fuse.endTime - now;
    
    if (remain <= 0) {
        // 융합 완료
        gameState.fuse.active = false;
        gameState.inventory.push(gameState.fuse.resultLevel);
        const resultName = swordNames[gameState.fuse.resultLevel];
        logEvent(`⚙️ 퓨즈머신 완료! 인벤토리에 [${resultName}] 이(가) 추가되었습니다!`, 'success');
        updateFuseUI();
        saveGame();
    } else {
        // 남은 시간 렌더링
        if (!fuseModal.classList.contains('hidden')) {
            const totalSec = Math.ceil(remain / 1000);
            const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
            const s = (totalSec % 60).toString().padStart(2, '0');
            fuseTimerText.textContent = `남은 시간: ${m}:${s}`;
        }
    }
}, 1000);

// Battle Logic
btnBattle.addEventListener('click', () => {
    modeSelectModal.classList.remove('hidden');
});

btnExitModeSelect.addEventListener('click', () => {
    modeSelectModal.classList.add('hidden');
});

btnModePve.addEventListener('click', () => {
    modeSelectModal.classList.add('hidden');
    startBattle('pve');
});

btnModeBoss.addEventListener('click', () => {
    modeSelectModal.classList.add('hidden');
    bossSelectModal.classList.remove('hidden');
});

btnExitBossSelect.addEventListener('click', () => {
    bossSelectModal.classList.add('hidden');
});

btnStartNormalBoss.addEventListener('click', () => {
    bossSelectModal.classList.add('hidden');
    startBattle('boss');
});

btnStartKrakenBoss.addEventListener('click', () => {
    bossSelectModal.classList.add('hidden');
    startBattle('kraken_boss');
});

btnModePvp.addEventListener('click', () => {
    let playerName = localStorage.getItem('playerName');
    if (!playerName) {
        playerName = prompt('PVP 매칭에 사용할 닉네임을 입력해주세요!');
        if (!playerName || playerName.trim() === '') return;
        localStorage.setItem('playerName', playerName.trim());
    }

    const originalHtml = btnModePvp.innerHTML;
    btnModePvp.innerHTML = '<div class="mode-name" style="font-size: 1.5rem; font-weight: bold; color:#fbbf24;">매칭 중...</div>';
    btnModePvp.style.pointerEvents = 'none';

    setTimeout(() => {
        btnModePvp.innerHTML = originalHtml;
        btnModePvp.style.pointerEvents = 'auto';
        modeSelectModal.classList.add('hidden');

        // 30% chance to find no players
        if (Math.random() < 0.3) {
            alert('접속중인 플레이어가 없습니다.');
            return;
        }

        // Match found (Simulated)
        const botNames = ['검신', '초보자', '고인물', '타락한기사', '전설의용사', '빛의기사', '주왕'];
        const opponentName = botNames[Math.floor(Math.random() * botNames.length)];
        
        let oppLevel = gameState.level + Math.floor(Math.random() * 5) - 2;
        if (oppLevel < 0) oppLevel = 0;
        if (oppLevel > 17) oppLevel = 17;

        battleState.p1Name = localStorage.getItem('playerName');
        battleState.p2Name = opponentName;
        battleState.p2Level = oppLevel;

        startBattle('pvp_sim');
    }, 2000);
});

btnFlee.addEventListener('click', () => {
    endBattle(false, '도망쳤습니다...');
});

btnAttack.addEventListener('click', () => {
    processTurn('none');
});

btnSkill.addEventListener('click', () => {
    if (!battleState.active) {
        logEvent('전투 중에만 스킬을 사용할 수 있습니다!', 'fail');
        return;
    }
    if (battleState.skillUsed) {
        logEvent('이미 이번 전투에서 검기를 사용했습니다.', 'fail');
        return;
    }
    processTurn('aura');
});

btnSkillDouble.addEventListener('click', () => {
    if (!battleState.active) {
        logEvent('전투 중에만 스킬을 사용할 수 있습니다!', 'fail');
        return;
    }
    if (battleState.doubleSkillUsed) {
        logEvent('이미 이번 전투에서 이중베기를 사용했습니다.', 'fail');
        return;
    }
    processTurn('double');
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (!battleState.active) return;
    const key = e.key.toLowerCase();
    
    if (key === 'e') {
        if (!gameState.hasHiddenSkill) {
            logEvent('[검기] 스킬을 아직 획득하지 못했습니다!', 'info');
            return;
        }
        btnSkill.click();
    } else if (key === 'r') {
        if (!gameState.hasDoubleSkill) {
            logEvent('[이중베기] 스킬을 아직 획득하지 못했습니다!', 'info');
            return;
        }
        btnSkillDouble.click();
    }
});

function startBattle(mode) {
    battleState.active = true;
    battleState.mode = mode;
    battleState.skillUsed = false;
    battleState.doubleSkillUsed = false;
    battleState.playerHp = gameState.maxHp;
    battleState.pvpTurn = 1;
    canAttack = true;
    
    // Resize slice canvas
    sliceCanvas.width = sliceCanvas.offsetWidth;
    sliceCanvas.height = sliceCanvas.offsetHeight;
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    
    battlePlayerName.textContent = battleState.p1Name;
    
    const arena = document.querySelector('.battle-arena');
    if (arena) {
        if (mode === 'kraken_boss') {
            arena.style.background = 'linear-gradient(to bottom, #87CEEB, #1E90FF)';
            arena.style.boxShadow = 'inset 0 0 50px rgba(0,0,0,0.5)';
            arena.style.textShadow = '2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000';
            arena.style.color = '#fff';
        } else {
            arena.style.background = '';
            arena.style.boxShadow = '';
            arena.style.textShadow = '';
            arena.style.color = '';
        }
    }
    
    if (mode === 'pve') {
        battleTitle.textContent = '⚔️ PVE 전투 ⚔️';
        battleModeBadge.innerHTML = '<span style="background:var(--primary);color:white;padding:2px 8px;border-radius:12px;font-size:0.8rem;">PVE</span>';
        pvpTurnIndicator.classList.add('hidden');
        
        let calcHp = 200 + (gameState.trophies * 15) + Math.floor(Math.random() * 200);
        let calcDmg = 15 + (gameState.trophies * 2) + Math.floor(Math.random() * 10);
        battleState.enemyMaxHp = calcHp;
        battleState.enemyDamage = Math.min(4000, calcDmg);
        
        const enemies = ['🤖', '👹', '👽', '💀', '🤡', '🧛‍♂️', '🥷', '🧟‍♂️'];
        enemyCharacterEl.textContent = enemies[Math.floor(Math.random() * enemies.length)];
        enemyNameEl.textContent = `AI 전사 (트로피 ${gameState.trophies})`;
        
    } else if (mode === 'boss') {
        battleTitle.textContent = '👺 보스전 👺';
        battleModeBadge.innerHTML = '<span style="background:var(--danger);color:white;padding:2px 8px;border-radius:12px;font-size:0.8rem;">BOSS</span>';
        pvpTurnIndicator.classList.add('hidden');
        
        battleState.enemyMaxHp = 30000;
        battleState.enemyDamage = 200 + Math.floor(Math.random() * 100);
        
        enemyCharacterEl.textContent = '🐉';
        enemyNameEl.textContent = `절대 보스 (HP: 30000)`;
        
    } else if (mode === 'kraken_boss') {
        battleTitle.textContent = '🚢 대해수 전투 🚢';
        battleModeBadge.innerHTML = '<span style="background:#000080;color:white;padding:2px 8px;border-radius:12px;font-size:0.8rem;">크라켄 보스 🚢</span>';
        pvpTurnIndicator.classList.add('hidden');
        
        battleState.enemyMaxHp = 50000;
        battleState.enemyDamage = 500 + Math.floor(Math.random() * 150);
        
        enemyCharacterEl.textContent = '🦑';
        enemyNameEl.textContent = `대해수 크라켄 (HP: 50000)`;
        
    } else if (mode === 'pvp') {
        battleTitle.textContent = '⚔️ PVP 대전 ⚔️';
        battleModeBadge.innerHTML = '<span style="background:var(--accent-gold);color:black;padding:2px 8px;border-radius:12px;font-size:0.8rem;">PVP</span>';
        
        battleState.enemyMaxHp = 3000; // P2 HP
        battleState.enemyDamage = levelDamage[battleState.p2Level] || 10;
        
        enemyCharacterEl.textContent = '👤';
        enemyNameEl.textContent = `${battleState.p2Name} (+${battleState.p2Level}강)`;
        
        pvpTurnIndicator.classList.remove('hidden');
        pvpTurnIndicator.textContent = `▶ ${battleState.p1Name}의 턴!`;
    } else if (mode === 'pvp_sim') {
        battleTitle.textContent = '⚔️ 온라인 PVP ⚔️';
        battleModeBadge.innerHTML = '<span style="background:var(--accent-gold);color:black;padding:2px 8px;border-radius:12px;font-size:0.8rem;">PVP</span>';
        
        battleState.enemyMaxHp = Math.floor(100 + Math.pow(1.5, battleState.p2Level) * 20);
        battleState.enemyDamage = Math.floor(10 + Math.pow(1.4, battleState.p2Level) * 2);
        
        enemyCharacterEl.textContent = '👤';
        enemyNameEl.textContent = `${battleState.p2Name} (+${battleState.p2Level}강)`;
        
        pvpTurnIndicator.classList.add('hidden'); // Simulated PVE style
    }
    
    battleState.enemyHp = battleState.enemyMaxHp;
    
    battlePlayerStatus.textContent = '전투 준비 완료!';
    battleEnemyStatus.textContent = (mode === 'pvp' || mode === 'pvp_sim') ? '전투 준비 완료!' : '상대가 노려보고 있습니다.';
    
    updateBattleUI();
    battleModal.classList.remove('hidden');
    logEvent(`⚔️ ${mode.toUpperCase()} 전투를 시작합니다!`, 'battle');
    
    if (pveEnemyAttackInterval) clearInterval(pveEnemyAttackInterval);
    if (mode === 'pve' || mode === 'boss' || mode === 'pvp_sim') {
        pveEnemyAttackInterval = setInterval(() => {
            if (!battleState.active) {
                clearInterval(pveEnemyAttackInterval);
                return;
            }
            const enemyDmg = battleState.enemyDamage;
            battleState.playerHp -= enemyDmg;
            battlePlayerStatus.textContent = `적의 공격! ${enemyDmg} 데미지!`;
            if (battleState.playerHp <= 0) {
                battleState.playerHp = 0;
                updateBattleUI();
                endBattle(false, '패배했습니다...');
                clearInterval(pveEnemyAttackInterval);
                return;
            }
            updateBattleUI();
        }, 1000);
    }
}

function dealEnemyDamage(dmg, isWinCallback, isNextHitCallback) {
    battleState.enemyHp -= dmg;
    
    // Enemy Hit Animation
    enemyVisualContainer.style.transform = `scale(1.2) rotate(${Math.random()*30 - 15}deg)`;
    setTimeout(() => {
        enemyVisualContainer.style.transform = 'scale(1) rotate(0deg)';
    }, 150);
    
    if (battleState.enemyHp <= 0) {
        battleState.enemyHp = 0;
        updateBattleUI();
        if (pveEnemyAttackInterval) clearInterval(pveEnemyAttackInterval);
        
        let earnedTrophies = 0;
        let earnedMoney = 0;
        let msg = '';
        
        if (battleState.mode === 'pve') {
            earnedTrophies = Math.floor(Math.random() * 7) + 27; // 27 ~ 33
            if (gameState.trophyLuckEndTime > Date.now()) earnedTrophies *= 2;
            earnedMoney = Math.floor(Math.random() * 1500) + 500; // 500 ~ 2000
            gameState.trophies += earnedTrophies;
            gameState.money += earnedMoney;
            msg = `승리했습니다! 트로피 ${earnedTrophies}점과 ${earnedMoney.toLocaleString()}원을 획득했습니다.`;
        } else if (battleState.mode === 'boss') {
            earnedTrophies = Math.floor(Math.random() * 50) + 100; // 100 ~ 150
            if (gameState.trophyLuckEndTime > Date.now()) earnedTrophies *= 2;
            earnedMoney = 10000;
            gameState.trophies += earnedTrophies;
            gameState.money += earnedMoney;
            msg = `🎉 보스 격파 성공! 트로피 ${earnedTrophies}점과 보상금 ${earnedMoney.toLocaleString()}원을 획득했습니다!`;
        } else if (battleState.mode === 'kraken_boss') {
            earnedTrophies = 150;
            if (gameState.trophyLuckEndTime > Date.now()) earnedTrophies *= 2;
            earnedMoney = 10000;
            gameState.trophies += earnedTrophies;
            gameState.money += earnedMoney;
            msg = `🌊 대해수 크라켄 격파 성공! 트로피 ${earnedTrophies}점과 보상금 ${earnedMoney.toLocaleString()}원을 획득했습니다!`;
        } else if (battleState.mode === 'pvp_sim') {
            earnedTrophies = Math.floor(Math.random() * 20) + 10;
            if (gameState.trophyLuckEndTime > Date.now()) earnedTrophies *= 2;
            earnedMoney = Math.floor(Math.random() * 3000) + 1000;
            gameState.trophies += earnedTrophies;
            gameState.money += earnedMoney;
            msg = `PVP 승리! 트로피 ${earnedTrophies}점과 상금 ${earnedMoney.toLocaleString()}원을 획득했습니다!`;
        } else if (battleState.mode === 'pvp') {
            msg = `PVP 모드 승리! 플레이어의 승리입니다.`;
        }
        
        endBattle(true, msg);
        if (isWinCallback) isWinCallback();
        return;
    }
    
    updateBattleUI();
    if (isNextHitCallback) {
        isNextHitCallback();
    } else {
        if (battleState.mode === 'pvp') {
            battleState.pvpTurn = battleState.pvpTurn === 1 ? 2 : 1;
            const currentName = battleState.pvpTurn === 1 ? battleState.p1Name : battleState.p2Name;
            pvpTurnIndicator.textContent = `▶ ${currentName}의 턴!`;
            canAttack = true; // allow slicing again immediately for PVP
        } else {
            // PVE/Boss/pvp_sim: Real-time swiping (훈련장처럼 연속 베기 허용)
            canAttack = true;
        }
    }
}

function processTurn(skillType) {
    if (!battleState.active) return;
    if (battleState.mode === 'pvp') {
        if (!canAttack) return;
        canAttack = false;
    }
    
    let dmg = getPlayerDamage();
    
    if (skillType === 'aura') {
        dmg = dmg * 2; // 2x damage for skill
        battleState.skillUsed = true;
        battlePlayerStatus.textContent = `✨ 검기 발동! ${dmg.toFixed(1)}의 피해!`;
        logEvent(`✨ 검기 폭발! 적에게 ${dmg.toFixed(1)}의 데미지를 입혔습니다!`, 'battle');
        dealEnemyDamage(dmg);
    } else if (skillType === 'double') {
        const doubleDmg = dmg * 2; 
        battleState.doubleSkillUsed = true;
        battlePlayerStatus.textContent = `💥 1연격! ${doubleDmg.toFixed(1)}의 피해!`;
        logEvent(`💥 이중베기 1타! 적에게 ${doubleDmg.toFixed(1)}의 데미지!`, 'battle');
        
        dealEnemyDamage(doubleDmg, null, () => {
            if (!battleState.active) return;
            // Second hit after a short delay
            setTimeout(() => {
                if (!battleState.active) return;
                battlePlayerStatus.textContent = `💥 2연격! ${doubleDmg.toFixed(1)}의 피해!`;
                logEvent(`💥 이중베기 2타! 적에게 ${doubleDmg.toFixed(1)}의 데미지!`, 'battle');
                dealEnemyDamage(doubleDmg);
            }, 300);
        });
    } else {
        battlePlayerStatus.textContent = `공격! ${dmg.toFixed(1)}의 피해!`;
        dealEnemyDamage(dmg);
    }
}

// --- Slicing Logic ---
sliceCanvas.addEventListener('mousedown', startSlice);
sliceCanvas.addEventListener('mousemove', drawSlice);
window.addEventListener('mouseup', endSlice);

sliceCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startSlice(touch);
}, {passive: false});
sliceCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    drawSlice(touch);
}, {passive: false});
window.addEventListener('touchend', endSlice);

function getCanvasPos(evt) {
    const rect = sliceCanvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function createHitEffect(x, y, color) {
    // Sparks
    for (let i = 0; i < 6; i++) {
        const spark = document.createElement('div');
        spark.style.position = 'fixed';
        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        spark.style.width = '4px';
        spark.style.height = '15px';
        spark.style.background = color || 'white';
        spark.style.boxShadow = `0 0 5px ${color || 'white'}`;
        spark.style.borderRadius = '2px';
        spark.style.pointerEvents = 'none';
        spark.style.zIndex = '9999';
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 60 + 40;
        const tx = Math.cos(angle) * speed;
        const ty = Math.sin(angle) * speed;
        
        spark.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        document.body.appendChild(spark);
        
        requestAnimationFrame(() => {
            spark.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
            spark.style.opacity = '0';
        });
        
        setTimeout(() => spark.remove(), 300);
    }
}

function startSlice(e) {
    if (!battleState.active) return;
    if (battleState.mode === 'pvp' && !canAttack) return;
    isSlicing = true;
    slicePath = [getCanvasPos(e)];
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
}

function drawSlice(e) {
    if (!isSlicing || !battleState.active) return;
    if (battleState.mode === 'pvp' && !canAttack) return;
    
    const pos = getCanvasPos(e);
    slicePath.push(pos);
    
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    sliceCtx.beginPath();
    sliceCtx.moveTo(slicePath[0].x, slicePath[0].y);
    for (let i = 1; i < slicePath.length; i++) {
        sliceCtx.lineTo(slicePath[i].x, slicePath[i].y);
    }
    
    const eff = allEffectsPool.find(e => e.id === gameState.currentSkin);
    const currentColor = eff ? eff.color : (skinColors[gameState.currentSkin] || skinColors['default']);
    
    sliceCtx.strokeStyle = currentColor;
    sliceCtx.lineWidth = 4;
    sliceCtx.lineCap = 'round';
    sliceCtx.lineJoin = 'round';
    sliceCtx.shadowColor = currentColor.replace('0.8)', '1)');
    sliceCtx.shadowBlur = 10;
    sliceCtx.stroke();
    
    // Continuous Slicing Attack check
    if (slicePath.length > 5) {
        const start = slicePath[0];
        const end = pos;
        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        
        if (dist > 30) {
            // Immediate Hit Animation
            enemyVisualContainer.style.transform = `scale(1.2) rotate(${Math.random()*30 - 15}deg)`;
            setTimeout(() => {
                enemyVisualContainer.style.transform = 'scale(1) rotate(0deg)';
            }, 150);
            
            // Visual feedback
            sliceCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            sliceCtx.lineWidth = 6;
            sliceCtx.stroke();
            
            const globalRect = sliceCanvas.getBoundingClientRect();
            createHitEffect(globalRect.left + pos.x, globalRect.top + pos.y, currentColor);
            
            setTimeout(() => {
                sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            }, 100);
            
            processTurn('none');
            slicePath = [pos]; // Reset path to start a new slice from here
        }
    }
}

function endSlice(e) {
    if (!isSlicing) return;
    isSlicing = false;
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    slicePath = [];
}
// ---------------------

// --- Training Slicing Logic ---
let isTrainSlicing = false;
let trainSlicePath = [];

trainSliceCanvas.addEventListener('mousedown', startTrainSlice);
trainSliceCanvas.addEventListener('mousemove', drawTrainSlice);
window.addEventListener('mouseup', endTrainSlice);

trainSliceCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startTrainSlice(e.touches[0]);
}, {passive: false});
trainSliceCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    drawTrainSlice(e.touches[0]);
}, {passive: false});
window.addEventListener('touchend', endTrainSlice);

function getTrainCanvasPos(evt) {
    const rect = trainSliceCanvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function startTrainSlice(e) {
    if (trainingModal.classList.contains('hidden')) return;
    isTrainSlicing = true;
    trainSlicePath = [getTrainCanvasPos(e)];
    trainSliceCtx.clearRect(0, 0, trainSliceCanvas.width, trainSliceCanvas.height);
}

function drawTrainSlice(e) {
    if (!isTrainSlicing || trainingModal.classList.contains('hidden')) return;
    
    const pos = getTrainCanvasPos(e);
    trainSlicePath.push(pos);
    
    trainSliceCtx.clearRect(0, 0, trainSliceCanvas.width, trainSliceCanvas.height);
    trainSliceCtx.beginPath();
    trainSliceCtx.moveTo(trainSlicePath[0].x, trainSlicePath[0].y);
    for (let i = 1; i < trainSlicePath.length; i++) {
        trainSliceCtx.lineTo(trainSlicePath[i].x, trainSlicePath[i].y);
    }
    
    const eff = allEffectsPool.find(e => e.id === gameState.currentSkin);
    const currentColor = eff ? eff.color : (skinColors[gameState.currentSkin] || skinColors['default']);
    
    trainSliceCtx.strokeStyle = currentColor;
    trainSliceCtx.lineWidth = 4;
    trainSliceCtx.lineCap = 'round';
    trainSliceCtx.lineJoin = 'round';
    trainSliceCtx.shadowColor = currentColor.replace('0.8)', '1)');
    trainSliceCtx.shadowBlur = 10;
    trainSliceCtx.stroke();
    
    // Continuous Training Attack check
    if (trainSlicePath.length > 5) {
        const start = trainSlicePath[0];
        const end = pos;
        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        
        if (dist > 30) {
            gameState.baseDamage = Math.min(5010, gameState.baseDamage + 0.5);
            
            // Dummy animation
            robotDummy.style.transform = `translate(-50%, -50%) rotate(${Math.random()*20 - 10}deg) scale(1.1)`;
            setTimeout(() => {
                robotDummy.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
            }, 100);
            
            // Visual feedback
            trainSliceCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            trainSliceCtx.lineWidth = 6;
            trainSliceCtx.stroke();
            
            const globalRect = trainSliceCanvas.getBoundingClientRect();
            createHitEffect(globalRect.left + pos.x, globalRect.top + pos.y, currentColor);
            
            setTimeout(() => {
                trainSliceCtx.clearRect(0, 0, trainSliceCanvas.width, trainSliceCanvas.height);
            }, 100);
            
            updateUI();
            trainSlicePath = [pos]; // Reset path
        }
    }
}

function endTrainSlice(e) {
    if (!isTrainSlicing) return;
    isTrainSlicing = false;
    trainSliceCtx.clearRect(0, 0, trainSliceCanvas.width, trainSliceCanvas.height);
    trainSlicePath = [];
}
// ------------------------------

// Initial Setup
loadGame();

// 요청: 서버 시작/새로고침 시 버프 지급 로직 삭제됨

// 잘못 지급된 10강 24개 일괄 회수 로직 (유저당 1회만 동작)
if (!localStorage.getItem('removed_24_swords_v1')) {
    let removedCount = 0;
    for (let i = gameState.inventory.length - 1; i >= 0; i--) {
        if (gameState.inventory[i] === 10 && removedCount < 24) {
            gameState.inventory.splice(i, 1);
            removedCount++;
        }
    }
    saveGame();
    localStorage.setItem('removed_24_swords_v1', 'true');
}

// 퓨즈 버그 보상 로직 (유저당 1회만 동작)
if (!localStorage.getItem('compensation_fuse_bug_v1')) {
    // 버그 회수 과정에서 정상적인 검까지 삭제된 유저들을 위한 전체 보상 지급
    // 종말의 검(18) 3개, 블랙홀 검(17) 4개, 공허의 검(16) 5개
    gameState.inventory.push(18, 18, 18, 17, 17, 17, 17, 16, 16, 16, 16, 16);
    
    saveGame();
    localStorage.setItem('compensation_fuse_bug_v1', 'true');
}

// 기존에 뿌렸던 럭/트로피 버프 일괄 취소 (유저당 1회)
if (!localStorage.getItem('remove_bugged_buff_v1')) {
    gameState.luckEventEndTime = 0;
    gameState.trophyLuckEndTime = 0;
    saveGame();
    localStorage.setItem('remove_bugged_buff_v1', 'true');
}
if (!localStorage.getItem('removed_fuse_swords_v1')) {
    // 인벤토리에서 제거
    for (let i = gameState.inventory.length - 1; i >= 0; i--) {
        const lvl = gameState.inventory[i];
        if (lvl === 16 || lvl === 17 || lvl === 18) {
            gameState.inventory.splice(i, 1);
        }
    }
    // 장착 중인 검이 해당 검이면 0강으로 강등
    if (gameState.level === 16 || gameState.level === 17 || gameState.level === 18) {
        gameState.level = 0;
    }
    // 퓨즈 진행 중인 결과가 해당 검이면 퓨즈 취소
    if (gameState.fuse && gameState.fuse.active) {
        const rLvl = gameState.fuse.resultLevel;
        if (rLvl === 16 || rLvl === 17 || rLvl === 18) {
            gameState.fuse.active = false;
            gameState.fuse.resultLevel = null;
        }
    }
    
    saveGame();
    localStorage.setItem('removed_fuse_swords_v1', 'true');
}

// Light Sword Combine Logic
function updateLimitedStockUI() {
    // 요청에 따라 전 서버 매진(0) 처리
    localStorage.setItem('lightSwordGlobalStock', '0');
    const stock = 0;
    
    if (limitedStockText) {
        if (stock > 0) {
            limitedStockText.textContent = `남은 수량: ${stock}개`;
            btnOpenLightCombine.disabled = false;
            btnOpenLightCombine.style.opacity = '1';
        } else {
            limitedStockText.textContent = `매진되었습니다!`;
            btnOpenLightCombine.disabled = true;
            btnOpenLightCombine.style.opacity = '0.5';
            btnOpenLightCombine.textContent = '조합 불가';
        }
    }
}

if(btnOpenLightCombine) {
    btnOpenLightCombine.addEventListener('click', () => {
        lightCombineMaterial1 = null;
        lightCombineMaterial2 = null;
        updateLightCombineUI();
        lightCombineModal.classList.remove('hidden');
    });
}
if(btnExitLightCombine) {
    btnExitLightCombine.addEventListener('click', () => {
        lightCombineModal.classList.add('hidden');
    });
}
if(btnExitLightInventory) {
    btnExitLightInventory.addEventListener('click', () => {
        lightCombineInventoryModal.classList.add('hidden');
    });
}

function updateLightCombineUI() {
    if (lightCombineMaterial1 !== null) {
        const lvl = gameState.inventory[lightCombineMaterial1];
        lightSlot1.innerHTML = `<span style="font-size: 0.9rem; color: #fff;">[+${lvl}]<br>${swordNames[lvl]}</span>`;
        lightSlot1.style.borderColor = '#38bdf8';
    } else {
        lightSlot1.innerHTML = '+';
        lightSlot1.style.borderColor = '#fde047';
    }
    
    if (lightCombineMaterial2 !== null) {
        const lvl = gameState.inventory[lightCombineMaterial2];
        lightSlot2.innerHTML = `<span style="font-size: 0.9rem; color: #fff;">[+${lvl}]<br>${swordNames[lvl]}</span>`;
        lightSlot2.style.borderColor = '#38bdf8';
    } else {
        lightSlot2.innerHTML = '+';
        lightSlot2.style.borderColor = '#fde047';
    }
    
    // 두 개 모두 선택되었고, 하나는 20강, 하나는 22강이어야 함
    let isValid = false;
    if (lightCombineMaterial1 !== null && lightCombineMaterial2 !== null) {
        const l1 = gameState.inventory[lightCombineMaterial1];
        const l2 = gameState.inventory[lightCombineMaterial2];
        if ((l1 === 20 && l2 === 22) || (l1 === 22 && l2 === 20)) {
            isValid = true;
        }
    }
    
    btnLightCombineStart.disabled = !isValid;
    if (isValid) {
        btnLightCombineStart.style.boxShadow = '0 0 20px #fde047';
    } else {
        btnLightCombineStart.style.boxShadow = 'none';
    }
}

if (lightSlot1) {
    lightSlot1.addEventListener('click', () => {
        currentSelectingSlot = 1;
        openLightCombineInventory();
    });
}
if (lightSlot2) {
    lightSlot2.addEventListener('click', () => {
        currentSelectingSlot = 2;
        openLightCombineInventory();
    });
}

function openLightCombineInventory() {
    lightCombineInventoryList.innerHTML = '';
    let found = false;
    
    gameState.inventory.forEach((lvl, index) => {
        const div = document.createElement('div');
        div.className = 'shop-item'; // 퓨즈 스타일과 동일하게
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = 'white';
        nameSpan.textContent = `[+${lvl}] ${swordNames[lvl]}`;
        
        const selBtn = document.createElement('button');
        selBtn.className = 'action-btn shop-btn';
        
        // 여명의 검(20), 해적의 검(22)만 가능
        const isValid = (lvl === 20 || lvl === 22);
        
        if (!isValid) {
            selBtn.textContent = '불가 (재료 아님)';
            selBtn.disabled = true;
            selBtn.style.background = '#475569';
            selBtn.style.opacity = '0.5';
        } else {
            // 이미 다른 슬롯에 등록된 인덱스인지 확인
            const isAlreadySelected = (currentSelectingSlot === 1 && lightCombineMaterial2 === index) ||
                                      (currentSelectingSlot === 2 && lightCombineMaterial1 === index);
            
            if (isAlreadySelected) {
                selBtn.textContent = '선택됨';
                selBtn.disabled = true;
                selBtn.style.background = '#f59e0b';
                selBtn.style.opacity = '0.8';
            } else {
                found = true;
                selBtn.textContent = '선택하기';
                selBtn.style.background = 'var(--secondary)';
                selBtn.onclick = () => {
                    if (currentSelectingSlot === 1) lightCombineMaterial1 = index;
                    if (currentSelectingSlot === 2) lightCombineMaterial2 = index;
                    lightCombineInventoryModal.classList.add('hidden');
                    updateLightCombineUI();
                };
            }
        }
        
        div.appendChild(nameSpan);
        div.appendChild(selBtn);
        lightCombineInventoryList.appendChild(div);
    });
    
    if (gameState.inventory.length === 0) {
        lightCombineInventoryList.innerHTML = '<p style="color:#94a3b8; text-align:center;">보관된 검이 없습니다.</p>';
    }
    
    lightCombineInventoryModal.classList.remove('hidden');
}

if (btnLightCombineStart) {
    btnLightCombineStart.addEventListener('click', () => {
        // 더블체크
        let stock = parseInt(localStorage.getItem('lightSwordGlobalStock')) || 0;
        if (stock <= 0) {
            alert("이미 한정 수량이 모두 소진되었습니다!");
            lightCombineModal.classList.add('hidden');
            updateLimitedStockUI();
            return;
        }
        
        if (lightCombineMaterial1 !== null && lightCombineMaterial2 !== null) {
            // 인벤토리에서 삭제 (인덱스가 큰 것부터 삭제)
            const indices = [lightCombineMaterial1, lightCombineMaterial2].sort((a,b) => b-a);
            gameState.inventory.splice(indices[0], 1);
            gameState.inventory.splice(indices[1], 1);
            
            // 빛의 검 추가
            gameState.inventory.push(23);
            
            // 수량 차감
            stock--;
            localStorage.setItem('lightSwordGlobalStock', stock.toString());
            
            saveGame();
            
            lightCombineModal.classList.add('hidden');
            updateLimitedStockUI();
            updateUI();
            
            logEvent('✨ 신성한 융합 성공! [빛의 검]이 탄생했습니다!', 'success');
            
            // 화면 꽉 차는 이펙트
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100vw'; flash.style.height = '100vh';
            flash.style.background = '#fff';
            flash.style.zIndex = '99999';
            flash.style.transition = 'opacity 1.5s ease-out';
            document.body.appendChild(flash);
            
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 1500);
            }, 100);
        }
    });
}

// ----------------------------------------------------
// Mission Sword Event Logic (사명의 검)
// ----------------------------------------------------

function updateMissionSwordEventUI() {
    if (!window.MISSION_SWORD_EVENT_ACTIVE) {
        if(missionSwordBox) missionSwordBox.style.display = 'none';
        return;
    }
    
    // Start the timer if not started
    if (!localStorage.getItem('missionEventStartTime')) {
        localStorage.setItem('missionEventStartTime', Date.now().toString());
    }
    
    const startTime = parseInt(localStorage.getItem('missionEventStartTime'));
    const endTime = startTime + (20 * 60 * 1000); // 20 minutes
    const now = Date.now();
    
    if (now >= endTime) {
        // Event over
        if(missionSwordBox) missionSwordBox.style.display = 'none';
        if(missionCombineModal && !missionCombineModal.classList.contains('hidden')) {
            missionCombineModal.classList.add('hidden');
        }
    } else {
        // Event active
        if(missionSwordBox) missionSwordBox.style.display = 'block';
        const remainMs = endTime - now;
        const mins = Math.floor(remainMs / 60000);
        const secs = Math.floor((remainMs % 60000) / 1000);
        if(missionTimerText) {
            missionTimerText.textContent = `남은 시간: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// Update timer every second
setInterval(updateMissionSwordEventUI, 1000);
// Call once on load
setTimeout(updateMissionSwordEventUI, 500);

if (btnOpenMissionCombine) {
    btnOpenMissionCombine.addEventListener('click', () => {
        missionCombineMaterials = [null, null, null, null];
        updateMissionCombineUI();
        missionCombineModal.classList.remove('hidden');
    });
}
if (btnExitMissionCombine) {
    btnExitMissionCombine.addEventListener('click', () => {
        missionCombineModal.classList.add('hidden');
    });
}
if (btnExitMissionInventory) {
    btnExitMissionInventory.addEventListener('click', () => {
        missionCombineInventoryModal.classList.add('hidden');
    });
}

function updateMissionCombineUI() {
    let selectedCount = 0;
    
    const slots = [missionSlot1, missionSlot2, missionSlot3, missionSlot4];
    
    for (let i = 0; i < 4; i++) {
        const slot = slots[i];
        const matIndex = missionCombineMaterials[i];
        
        if (matIndex !== null) {
            const lvl = gameState.inventory[matIndex];
            slot.innerHTML = `<span style="font-size: 0.9rem; color: #fff;">[+${lvl}]<br>${swordNames[lvl]}</span>`;
            slot.style.borderColor = '#ef4444';
            selectedCount++;
        } else {
            slot.innerHTML = '+';
            slot.style.borderColor = '#94a3b8';
        }
    }
    
    btnMissionCombineStart.disabled = (selectedCount !== 4);
    if (selectedCount === 4) {
        btnMissionCombineStart.style.opacity = '1';
        btnMissionCombineStart.style.cursor = 'pointer';
    } else {
        btnMissionCombineStart.style.opacity = '0.5';
        btnMissionCombineStart.style.cursor = 'not-allowed';
    }
}

function openMissionCombineInventory() {
    missionCombineInventoryList.innerHTML = '';
    let found = false;
    
    gameState.inventory.forEach((lvl, index) => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = 'white';
        nameSpan.textContent = `[+${lvl}] ${swordNames[lvl]}`;
        
        const selBtn = document.createElement('button');
        selBtn.className = 'action-btn shop-btn';
        
        // 사명의 검 재료: 진실의 검(14강), 해적의 검(22강)
        const isValid = (lvl === 14 || lvl === 22);
        
        if (!isValid) {
            selBtn.textContent = '불가 (재료 아님)';
            selBtn.disabled = true;
            selBtn.style.background = '#475569';
            selBtn.style.opacity = '0.5';
        } else {
            // 이미 다른 슬롯에 등록된 인덱스인지 확인
            const isAlreadySelected = missionCombineMaterials.includes(index);
            
            if (isAlreadySelected) {
                selBtn.textContent = '선택됨';
                selBtn.disabled = true;
                selBtn.style.background = '#ef4444';
                selBtn.style.opacity = '0.8';
            } else {
                found = true;
                selBtn.textContent = '선택하기';
                selBtn.style.background = 'var(--secondary)';
                selBtn.onclick = () => {
                    missionCombineMaterials[currentMissionSelectingSlot] = index;
                    missionCombineInventoryModal.classList.add('hidden');
                    updateMissionCombineUI();
                };
            }
        }
        
        div.appendChild(nameSpan);
        div.appendChild(selBtn);
        missionCombineInventoryList.appendChild(div);
    });
    
    if (gameState.inventory.length === 0) {
        missionCombineInventoryList.innerHTML = '<p style="color:#94a3b8; text-align:center;">보관된 검이 없습니다.</p>';
    }
    
    missionCombineInventoryModal.classList.remove('hidden');
}

[missionSlot1, missionSlot2, missionSlot3, missionSlot4].forEach((slot, idx) => {
    if(slot) {
        slot.addEventListener('click', () => {
            currentMissionSelectingSlot = idx;
            openMissionCombineInventory();
        });
    }
});

if (btnMissionCombineStart) {
    btnMissionCombineStart.addEventListener('click', () => {
        // 검증: 진실의검(14) 3개, 해적의검(22) 1개인지 확인
        let count14 = 0;
        let count22 = 0;
        for (let i = 0; i < 4; i++) {
            const lvl = gameState.inventory[missionCombineMaterials[i]];
            if (lvl === 14) count14++;
            if (lvl === 22) count22++;
        }
        
        if (count14 !== 3 || count22 !== 1) {
            alert('재료가 올바르지 않습니다! (진실의 검 3개, 해적의 검 1개 필요)');
            return;
        }
        
        // 인벤토리에서 삭제 (인덱스가 큰 것부터 삭제해야 밀림 방지)
        const indices = [...missionCombineMaterials].sort((a,b) => b-a);
        for (let idx of indices) {
            gameState.inventory.splice(idx, 1);
        }
        
        // 사명의 검(24강) 지급
        gameState.inventory.push(24);
        saveGame();
        
        missionCombineModal.classList.add('hidden');
        updateUI();
        
        logEvent('👑 전설의 [사명의 검]이 탄생했습니다!', 'success');
        
        // 화면 꽉 차는 붉은 이펙트
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100vw'; flash.style.height = '100vh';
        flash.style.background = '#ef4444';
        flash.style.zIndex = '99999';
        flash.style.transition = 'opacity 2s ease-out';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 2000);
        }, 100);
    });
}

// 페이크 타이머: 약 5~15분 사이에 누군가 하나씩 만들어가서 한정수량이 줄어드는 효과
setInterval(() => {
    let stock = parseInt(localStorage.getItem('lightSwordGlobalStock')) || 0;
    if (stock > 0) {
        if (Math.random() < 0.05) { // 30초마다 5% 확률
            stock--;
            localStorage.setItem('lightSwordGlobalStock', stock.toString());
            if(!shopLimitedSection.classList.contains('hidden')) {
                updateLimitedStockUI();
            }
            logEvent('💬 다른 유저가 [빛의 검]을 조합했습니다!', 'info');
        }
    }
}, 30000);

updateUI(); // 변경된 상태 반영

// 웰컴 토스트 로직
const welcomeToast = document.getElementById('welcome-toast');
if (welcomeToast) {
    if (!localStorage.getItem('seen_toast_67')) {
        localStorage.setItem('seen_toast_67', 'true');
        welcomeToast.style.opacity = '1';
        setTimeout(() => {
            welcomeToast.style.opacity = '0';
            setTimeout(() => {
                welcomeToast.remove();
            }, 500); 
        }, 3000);
    } else {
        welcomeToast.remove();
    }
}

updateUI();

function updateBattleUI() {
    battlePlayerHp.textContent = battleState.playerHp;
    battleEnemyHp.textContent = battleState.enemyHp;
    
    const pPercent = Math.max(0, (battleState.playerHp / gameState.maxHp) * 100);
    const ePercent = Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100);
    
    playerHpFill.style.width = `${pPercent}%`;
    enemyHpFill.style.width = `${ePercent}%`;
    
    if (pPercent < 30) playerHpFill.style.background = 'var(--accent-red)';
    else playerHpFill.style.background = 'var(--success)';
    
    if (ePercent < 30) enemyHpFill.style.background = 'var(--accent-red)';
    else enemyHpFill.style.background = 'var(--success)';
}

function endBattle(won, msg) {
    battleState.active = false;
    isSlicing = false;
    if (pveEnemyAttackInterval) clearInterval(pveEnemyAttackInterval);
    logEvent(msg, won ? 'success' : 'fail');
    
    setTimeout(() => {
        battleModal.classList.add('hidden');
        // Restore Player HP after battle
        gameState.hp = gameState.maxHp;
        
        updateUI();
    }, 1500);
}

// Initial Setup
if (gameState.fuse && gameState.fuse.active) {
    gameState.fuse.endTime = Date.now() - 1000; // Auto complete pending fuse
}

function showFireworks() {
    const fwContainer = document.createElement('div');
    fwContainer.style.position = 'fixed';
    fwContainer.style.top = '0';
    fwContainer.style.left = '0';
    fwContainer.style.width = '100vw';
    fwContainer.style.height = '100vh';
    fwContainer.style.pointerEvents = 'none';
    fwContainer.style.zIndex = '9998'; 
    document.body.appendChild(fwContainer);

    for (let i = 0; i < 40; i++) {
        const fw = document.createElement('div');
        const emojis = ['🎆', '🎇', '✨', '🎉'];
        fw.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        fw.style.position = 'absolute';
        fw.style.fontSize = (Math.random() * 2 + 1) + 'rem';
        fw.style.left = Math.random() * 100 + 'vw';
        fw.style.top = Math.random() * 100 + 'vh';
        fw.style.opacity = '0';
        fw.style.transition = 'all 1s ease-out';
        fw.style.transform = `translateY(50px) scale(0.5)`;
        fwContainer.appendChild(fw);

        setTimeout(() => {
            fw.style.opacity = '1';
            fw.style.transform = `translateY(${Math.random() * -100 - 50}px) scale(1.5)`;
        }, Math.random() * 500);
    }

    setTimeout(() => {
        fwContainer.style.opacity = '0';
        fwContainer.style.transition = 'opacity 1s';
        setTimeout(() => fwContainer.remove(), 1000);
    }, 2000); 
}

if (!localStorage.getItem('giveaway_fuse_luck_10m_v8')) {
    triggerLuckEvent(10);
    triggerTrophyLuckEvent(10);
    saveGame();
    localStorage.setItem('giveaway_fuse_luck_10m_v8', 'true');
    setTimeout(() => {
        showFireworks();
        logEvent('🎁 운영자의 깜짝 선물! 퓨즈 럭 & 트로피 2배 10분이 (또) 발동되었습니다!', 'success');
    }, 1000);
}

if (!localStorage.getItem('giveaway_swords_6_7_v6')) {
    gameState.inventory.push(6, 7);
    saveGame();
    localStorage.setItem('giveaway_swords_6_7_v6', 'true');
    setTimeout(() => {
        showFireworks();
        logEvent('🎁 특별 선물! 6강 검과 7강 검이 (또) 지급되었습니다!', 'success');
    }, 1500);
}

if (!localStorage.getItem('giveaway_swords_10x4_v1')) {
    gameState.inventory.push(10, 10, 10, 10);
    saveGame();
    localStorage.setItem('giveaway_swords_10x4_v1', 'true');
    setTimeout(() => {
        showFireworks();
        logEvent('🎁 특별 선물! 10강 검 4개가 지급되었습니다!', 'success');
    }, 2000);
}

// 14강 버그 회수 로직
if (!localStorage.getItem('recall_14_swords_bug')) {
    const originalLength = gameState.inventory.length;
    gameState.inventory = gameState.inventory.filter(lvl => lvl !== 14);
    const recalledCount = originalLength - gameState.inventory.length;
    if (recalledCount > 0) {
        logEvent(`⚠️ 퓨즈 머신 버그로 잘못 생성된 14강 검 ${recalledCount}개가 시스템에 의해 회수되었습니다.`, 'fail');
        saveGame();
    }
    localStorage.setItem('recall_14_swords_bug', 'true');
}

if (!localStorage.getItem('giveaway_13_swords_v7')) {
    gameState.inventory.push(13, 13);
    saveGame();
    localStorage.setItem('giveaway_13_swords_v7', 'true');
    setTimeout(() => {
        showFireworks();
        logEvent('🎁 전 서버 특별 보상! 13강 봉인된 검 2자루가 지급되었습니다!', 'success');
    }, 2000);
}

// ----------------------------------------------------
// 계정 시스템 및 세이브 연동
// ----------------------------------------------------

function initLoginSystem() {
    let saved = localStorage.getItem('swordGameState');
    if (!saved) {
        // 저장된 데이터가 없으면 로그인 창 표시
        loginScreenModal.style.display = 'flex';
        loginScreenModal.classList.remove('hidden');
    } else {
        // 저장된 데이터가 있으면 환영 메시지 출력
        setTimeout(() => {
            logEvent(`환영합니다, ${gameState.username || '용사'}님!`, 'success');
        }, 1000);
    }
}

if (btnLoginStart) {
    btnLoginStart.addEventListener('click', () => {
        const nickname = loginNickname.value.trim();
        const password = loginPassword.value.trim();
        
        if (!nickname) {
            alert('닉네임을 입력해주세요!');
            return;
        }
        
        gameState.username = nickname;
        gameState.password = password; // 추후 암호화나 확인용
        gameState.money = 500;
        
        saveGame();
        
        loginScreenModal.style.display = 'none';
        loginScreenModal.classList.add('hidden');
        
        updateUI();
        logEvent(`환영합니다, ${nickname}님! 지원금 500원이 지급되었습니다.`, 'success');
    });
}

if (btnLoginLoad) {
    btnLoginLoad.addEventListener('click', () => {
        const code = loginSavecode.value.trim();
        if (!code) {
            alert('세이브 코드를 입력해주세요!');
            return;
        }
        
        try {
            // Base64 디코딩 (유니코드 지원)
            const decodedStr = decodeURIComponent(atob(code).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const parsed = JSON.parse(decodedStr);
            if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('level')) {
                localStorage.setItem('swordGameState', JSON.stringify(parsed));
                alert('세이브 데이터를 성공적으로 불러왔습니다!');
                window.location.reload();
            } else {
                throw new Error("Invalid Save Data");
            }
        } catch (e) {
            alert('잘못된 세이브 코드입니다. 복사한 코드가 맞는지 확인해주세요.');
        }
    });
}

if (btnExportSave) {
    btnExportSave.addEventListener('click', () => {
        try {
            const dataStr = JSON.stringify(gameState);
            // Base64 인코딩 (유니코드 지원)
            const encodedStr = btoa(encodeURIComponent(dataStr).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
            }));
            
            navigator.clipboard.writeText(encodedStr).then(() => {
                alert('세이브 코드가 클립보드에 복사되었습니다! (다른 기기에서 이어하기 창에 붙여넣으세요)');
            }).catch(err => {
                // 클립보드 복사 실패 시 prompt 제공
                prompt('클립보드 복사에 실패했습니다. 아래 코드를 복사하세요:', encodedStr);
            });
        } catch(e) {
            alert('세이브 코드 생성에 실패했습니다.');
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(confirm('정말 로그아웃 하시겠습니까? (현재 기기의 플레이 데이터가 초기화되며, 다른 기기에서 불러오려면 미리 세이브 코드를 복사해두셔야 합니다!)')) {
            localStorage.removeItem('swordGameState');
            window.location.reload();
        }
    });
}

// Start Game
if (!localStorage.getItem('apology_compensation_v3')) {
    // 잃어버린 유저들을 위한 역대급 보상 + 이펙트 전종
    gameState.inventory.push(23, 22, 22, 20, 20, 20, 19, 19, 19, 18, 18, 17, 16, 15, 14, 14, 14);
    gameState.money += 1000000;
    if (gameState.level < 23) gameState.level = 23; 
    
    // 상점의 모든 이펙트 지급
    allEffectsPool.forEach(eff => {
        if (!gameState.ownedSkins.includes(eff.id)) {
            gameState.ownedSkins.push(eff.id);
        }
    });
    
    saveGame();
    localStorage.setItem('apology_compensation_v3', 'true');
    setTimeout(() => {
        alert("⚠️ [시스템 공지] ⚠️\n\n죄송합니다. 이펙트까지 모두 초기화된 것을 확인했습니다.\n추가 사죄의 의미로 게임 내 존재하는 【모든 이펙트 스킨】을 소유 처리해드렸습니다! (덤으로 검과 골드도 한 번 더 쏩니다!)\n거듭 죄송합니다!");
    }, 1500);
}

initLoginSystem();
updateUI();
} catch(e) {
    console.error(e);
    alert("상세 에러:\n" + e.message + "\n" + e.stack);
}
