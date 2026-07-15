let gameState = {
    level: 0,
    baseDamage: 10,
    hp: 3000,
    maxHp: 3000,
    trophies: 0,
    money: 0,
    hasHiddenSkill: false,
    hasDoubleSkill: false,
    currentSkin: 'default',
    ownedSkins: ['default']
};

function saveGame() {
    localStorage.setItem('swordGameState', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('swordGameState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed };
        } catch(e) {
            console.error("Save file corrupted");
        }
    }
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
    "봉인된 검"            // 13
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
    100000  // 12->13
];

const levelDamage = [
    10, 20, 40, 70, 110, 160, 220, 300, 400, 550, 750, 1000, 1500, 2000
];

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

const trophyModal = document.getElementById('trophy-modal');
const btnExitTrophy = document.getElementById('btn-exit-trophy');
const milestone100 = document.getElementById('milestone-100');

const shopModal = document.getElementById('shop-modal');
const btnExitShop = document.getElementById('btn-exit-shop');
const shopTrophyCount = document.getElementById('shop-trophy-count');
const shopBtns = document.querySelectorAll('.shop-btn');

const trainingModal = document.getElementById('training-modal');
const btnExitTrain = document.getElementById('btn-exit-train');
const trainSliceCanvas = document.getElementById('train-slice-canvas');
const trainSliceCtx = trainSliceCanvas.getContext('2d');
const robotDummy = document.getElementById('robot-dummy');

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

// Slicing Canvas
const sliceCanvas = document.getElementById('slice-canvas');
const sliceCtx = sliceCanvas.getContext('2d');
let isSlicing = false;
let slicePath = [];
let canAttack = true;

// Battle State
let battleState = {
    active: false,
    enemyMaxHp: 0,
    enemyHp: 0,
    enemyDamage: 0,
    playerHp: 3000,
    skillUsed: false,
    doubleSkillUsed: false
};

const skinColors = {
    'default': 'rgba(239, 68, 68, 0.8)', // Red
    'flame': 'rgba(249, 115, 22, 0.8)',  // Orange
    'poison': 'rgba(34, 197, 94, 0.8)',  // Green
    'lightning': 'rgba(6, 182, 212, 0.8)',// Cyan
    'dark': 'rgba(168, 85, 247, 0.8)'    // Purple
};

// Utilities
function logEvent(msg, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-entry log-${type}`;
    p.textContent = msg;
    eventLogEl.prepend(p);
}

function updateUI() {
    hpValueEl.textContent = `${gameState.hp} / ${gameState.maxHp}`;
    trophyCountEl.textContent = gameState.trophies;
    moneyCountEl.textContent = gameState.money.toLocaleString() + '원';
    
    swordNameEl.textContent = swordNames[gameState.level];
    swordLevelEl.textContent = `+${gameState.level}`;
    
    if (gameState.level >= 13) {
        enhanceCostEl.textContent = '(최고 레벨 달성)';
    } else {
        enhanceCostEl.textContent = `(비용: ${enhanceCosts[gameState.level].toLocaleString()}원)`;
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
    shopBtns.forEach(btn => {
        const skin = btn.dataset.skin;
        if (gameState.currentSkin === skin) {
            btn.textContent = '장착 중';
            btn.classList.add('equipped');
        } else if (gameState.ownedSkins.includes(skin)) {
            btn.textContent = '장착하기';
            btn.classList.remove('equipped');
        }
    });
    
    saveGame();
}

function getPlayerDamage() {
    // Training adds to baseDamage (starts at 10). Level adds its own base.
    // Let's say total damage = levelDamage[level] + (gameState.baseDamage - 10)
    const trainingBonus = gameState.baseDamage - 10;
    return levelDamage[gameState.level] + trainingBonus;
}

// Actions
btnEnhance.addEventListener('click', () => {
    if (gameState.level >= 13) {
        logEvent('봉인된 검... 이미 최고의 경지에 도달했습니다.', 'info');
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
btnShop.addEventListener('click', () => {
    updateUI();
    shopModal.classList.remove('hidden');
});

btnExitShop.addEventListener('click', () => {
    shopModal.classList.add('hidden');
});

shopBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const skin = e.target.dataset.skin;
        const price = parseInt(e.target.dataset.price);
        
        if (gameState.ownedSkins.includes(skin)) {
            // Equip
            gameState.currentSkin = skin;
            logEvent(`스킨 장착 완료!`, 'info');
            updateUI();
        } else {
            // Buy
            if (gameState.trophies >= price) {
                gameState.trophies -= price;
                gameState.ownedSkins.push(skin);
                gameState.currentSkin = skin;
                logEvent(`새로운 이펙트 스킨 구매 및 장착 완료!`, 'success');
                updateUI();
            } else {
                logEvent('트로피가 부족합니다!', 'fail');
            }
        }
    });
});

// Battle Logic
btnBattle.addEventListener('click', () => {
    startBattle();
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

function startBattle() {
    battleState.active = true;
    battleState.skillUsed = false;
    battleState.doubleSkillUsed = false;
    battleState.playerHp = gameState.maxHp;
    canAttack = true;
    
    // Resize slice canvas
    sliceCanvas.width = sliceCanvas.offsetWidth;
    sliceCanvas.height = sliceCanvas.offsetHeight;
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    
    // Enemy stats scale with trophies
    battleState.enemyMaxHp = 200 + (gameState.trophies * 15) + Math.floor(Math.random() * 200);
    battleState.enemyHp = battleState.enemyMaxHp;
    battleState.enemyDamage = 15 + (gameState.trophies * 2) + Math.floor(Math.random() * 10);
    
    // Pick random enemy character
    const enemies = ['🤖', '👹', '👽', '💀', '🤡', '🧛‍♂️', '🥷', '🧟‍♂️'];
    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    enemyCharacterEl.textContent = randomEnemy;
    
    enemyNameEl.textContent = `AI 전사 (트로피 ${gameState.trophies})`;
    
    battlePlayerStatus.textContent = '전투 준비 완료!';
    battleEnemyStatus.textContent = '상대가 노려보고 있습니다.';
    
    updateBattleUI();
    battleModal.classList.remove('hidden');
    logEvent('⚔️ 전투를 시작합니다!', 'battle');
}

function dealEnemyDamage(dmg, isWinCallback, isNextHitCallback) {
    battleState.enemyHp -= dmg;
    
    // Enemy Hit Animation
    enemyCharacterEl.style.transform = `scale(1.2) rotate(${Math.random()*30 - 15}deg)`;
    setTimeout(() => {
        enemyCharacterEl.style.transform = 'scale(1) rotate(0deg)';
    }, 150);
    
    if (battleState.enemyHp <= 0) {
        battleState.enemyHp = 0;
        updateBattleUI();
        
        let earnedTrophies = 0;
        let earnedMoney = 0;
        let msg = '';
        
        if (battleState.mode === 'pve') {
            earnedTrophies = Math.floor(Math.random() * 7) + 27; // 27 ~ 33
            earnedMoney = Math.floor(Math.random() * 1500) + 500; // 500 ~ 2000
            gameState.trophies += earnedTrophies;
            gameState.money += earnedMoney;
            msg = `승리했습니다! 트로피 ${earnedTrophies}점과 ${earnedMoney.toLocaleString()}원을 획득했습니다.`;
        } else if (battleState.mode === 'boss') {
            earnedTrophies = Math.floor(Math.random() * 50) + 100; // 100 ~ 150
            earnedMoney = 30000;
            gameState.trophies += earnedTrophies;
            gameState.money += earnedMoney;
            msg = `🎉 보스 격파 성공! 트로피 ${earnedTrophies}점과 거액 ${earnedMoney.toLocaleString()}원을 획득했습니다!`;
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
        // Enemy Turn
        setTimeout(() => {
            if (!battleState.active) return;
            
            const enemyDmg = battleState.enemyDamage;
            battleState.playerHp -= enemyDmg;
            battleEnemyStatus.textContent = `반격! ${enemyDmg}의 피해를 입었습니다.`;
            
            if (battleState.playerHp <= 0) {
                battleState.playerHp = 0;
                updateBattleUI();
                endBattle(false, '패배했습니다... 체력을 회복합니다.');
            } else {
                updateBattleUI();
                canAttack = true; // Enemy turn finished, player can attack again
            }
        }, 500);
    }
}

function processTurn(skillType) {
    if (!battleState.active || !canAttack) return;
    canAttack = false; // Prevent spamming
    
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

function startSlice(e) {
    if (!battleState.active || !canAttack) return;
    isSlicing = true;
    slicePath = [getCanvasPos(e)];
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
}

function drawSlice(e) {
    if (!isSlicing || !battleState.active || !canAttack) return;
    
    const pos = getCanvasPos(e);
    slicePath.push(pos);
    
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    sliceCtx.beginPath();
    sliceCtx.moveTo(slicePath[0].x, slicePath[0].y);
    for (let i = 1; i < slicePath.length; i++) {
        sliceCtx.lineTo(slicePath[i].x, slicePath[i].y);
    }
    
    const currentColor = skinColors[gameState.currentSkin] || skinColors['default'];
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
        
        if (dist > 50 && canAttack) {
            // Immediate Hit Animation
            enemyCharacterEl.style.transform = `scale(1.2) rotate(${Math.random()*30 - 15}deg)`;
            setTimeout(() => {
                enemyCharacterEl.style.transform = 'scale(1) rotate(0deg)';
            }, 150);
            
            // Visual feedback
            sliceCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            sliceCtx.lineWidth = 6;
            sliceCtx.stroke();
            
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
    
    const currentColor = skinColors[gameState.currentSkin] || skinColors['default'];
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
            gameState.baseDamage += 0.5;
            
            // Dummy animation
            robotDummy.style.transform = `translate(-50%, -50%) rotate(${Math.random()*20 - 10}deg) scale(1.1)`;
            setTimeout(() => {
                robotDummy.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
            }, 100);
            
            // Visual feedback
            trainSliceCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            trainSliceCtx.lineWidth = 6;
            trainSliceCtx.stroke();
            
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
    logEvent(msg, won ? 'success' : 'fail');
    
    setTimeout(() => {
        battleModal.classList.add('hidden');
        // Restore Player HP after battle
        gameState.hp = gameState.maxHp;
        
        // Reset sword level
        gameState.level = 0;
        logEvent('검이 처음(0강)으로 초기화되었습니다.', 'info');
        
        updateUI();
    }, 1500);
}

// Initial Setup
updateUI();
