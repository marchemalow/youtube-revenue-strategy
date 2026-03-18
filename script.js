let isAcreActive = false;

// --- FONCTIONS DE SAUVEGARDE ---

function saveData() {
    const data = {
        niche: document.getElementById('niche').value,
        longViews: document.getElementById('long-views').value,
        region: document.getElementById('region').value,
        duration: document.getElementById('duration-slider').value,
        shortsViews: document.getElementById('shorts-views').value,
        shortsRpm: document.getElementById('shorts-rpm').value,
        agePcts: Array.from(document.querySelectorAll('.age-pct')).map(i => i.value),
        goalTarget: document.getElementById('goal-target').value,
        ratio: document.getElementById('ratio-slider').value,
        growthRate: document.getElementById('growth-rate').value,
        subHistory: Array.from(document.querySelectorAll('.sub-history')).map(i => i.value),
        fiscalStatus: document.getElementById('fiscal-status').value,
        isAcre: isAcreActive
    };
    localStorage.setItem('ytStrategyData', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('ytStrategyData');
    if (!saved) return;
    
    const data = JSON.parse(saved);
    
    // Remplissage des champs
    if(data.niche) document.getElementById('niche').value = data.niche;
    if(data.longViews) document.getElementById('long-views').value = data.longViews;
    if(data.region) document.getElementById('region').value = data.region;
    if(data.duration) document.getElementById('duration-slider').value = data.duration;
    if(data.shortsViews) document.getElementById('shorts-views').value = data.shortsViews;
    if(data.shortsRpm) document.getElementById('shorts-rpm').value = data.shortsRpm;
    if(data.goalTarget) document.getElementById('goal-target').value = data.goalTarget;
    if(data.ratio) document.getElementById('ratio-slider').value = data.ratio;
    if(data.growthRate) document.getElementById('growth-rate').value = data.growthRate;
    if(data.fiscalStatus) document.getElementById('fiscal-status').value = data.fiscalStatus;
    
    if(data.agePcts) {
        const inputs = document.querySelectorAll('.age-pct');
        data.agePcts.forEach((val, i) => { if(inputs[i]) inputs[i].value = val; });
    }
    
    if(data.subHistory) {
        const inputs = document.querySelectorAll('.sub-history');
        data.subHistory.forEach((val, i) => { if(inputs[i]) inputs[i].value = val; });
    }

    if(data.isAcre !== undefined) {
        isAcreActive = data.isAcre;
        const btn = document.getElementById('acre-toggle');
        if (isAcreActive) btn.classList.add('active');
        else btn.classList.remove('active');
    }

    calculate(); // Relancer le calcul après chargement
}

// --- LOGIQUE DE L'APPLICATION ---

function switchTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    calculate();
}

function toggleAcre() {
    isAcreActive = !isAcreActive;
    const btn = document.getElementById('acre-toggle');
    if (isAcreActive) btn.classList.add('active');
    else btn.classList.remove('active');
    calculate();
}

function calculate() {
    const longViews = parseFloat(document.getElementById('long-views').value) || 0;
    const shortsViews = parseFloat(document.getElementById('shorts-views').value) || 0;
    const nicheBase = parseFloat(document.getElementById('niche').value);
    const regionMult = parseFloat(document.getElementById('region').value);
    const durationMins = parseFloat(document.getElementById('duration-slider').value);
    const fiscalStatus = document.getElementById('fiscal-status').value;

    document.getElementById('duration-val').innerText = durationMins + " min";

    const ageInputs = document.querySelectorAll('.age-pct');
    let ageTotal = 0;
    let ageWeight = 0;
    ageInputs.forEach(el => {
        const val = parseFloat(el.value) || 0;
        ageTotal += val;
        ageWeight += (val / 100) * parseFloat(el.dataset.weight);
    });

    const badge = document.getElementById('age-total-badge');
    badge.innerText = `Total: ${ageTotal}%`;
    badge.style.background = ageTotal !== 100 ? "#ef4444" : "#10b981";
    
    const durationMult = durationMins < 8 ? 1.0 : Math.min(2.0, 1.25 + (durationMins - 8) * 0.02);
    const finalRPMLong = nicheBase * regionMult * ageWeight * durationMult;
    const revLong = (longViews / 1000) * finalRPMLong;

    const shortsRPM = parseFloat(document.getElementById('shorts-rpm').value) || 0.06;
    const revShorts = (shortsViews / 1000) * shortsRPM;

    let taxRate = 1.0;
    const acreBox = document.getElementById('acre-container');
    
    if (fiscalStatus === 'ae') {
        acreBox.style.display = "flex";
        taxRate = isAcreActive ? 0.89 : 0.78; 
    } else {
        acreBox.style.display = "none";
        if (fiscalStatus === 'sasu') taxRate = 0.70;
        if (fiscalStatus === 'eurl') taxRate = 0.55;
    }

    const monthlyGross = revLong + revShorts;
    const monthlyNet = monthlyGross * taxRate;
    const racketAmount = monthlyGross - monthlyNet;

    document.getElementById('grand-total').innerText = formatMoney(monthlyGross);
    document.getElementById('res-year').innerText = formatMoney(monthlyGross * 12);
    document.getElementById('res-rpm-avg').innerText = finalRPMLong.toFixed(2) + "€";

    const netArea = document.getElementById('net-area');
    if (fiscalStatus !== 'none') {
        netArea.style.display = "flex";
        document.getElementById('net-total').innerText = formatMoney(monthlyNet);
        document.getElementById('racket-total').innerText = "-" + formatMoney(racketAmount);
        
        document.getElementById('summary-gross').innerText = formatMoney(monthlyGross);
        document.getElementById('summary-tax').innerText = "-" + formatMoney(racketAmount);
        document.getElementById('summary-net').innerText = formatMoney(monthlyNet);
    } else {
        netArea.style.display = "none";
        document.getElementById('summary-gross').innerText = formatMoney(monthlyGross);
        document.getElementById('summary-tax').innerText = "0.00 €";
        document.getElementById('summary-net').innerText = formatMoney(monthlyGross);
    }

    updateScore(finalRPMLong);
    updateStrategy(finalRPMLong, shortsRPM);
    updateProjections(monthlyGross);
    drawGrowthGraph();

    // SAUVEGARDE AUTOMATIQUE
    saveData();
}

function updateScore(rpm) {
    let score = Math.min(100, (rpm / 15) * 100);
    document.getElementById('score-circle').innerText = Math.round(score);
    const bar = document.getElementById('score-bar');
    bar.style.strokeDashoffset = 188.4 - (score / 100) * 188.4;

    const coach = document.getElementById('coach-tip');
    if (rpm > 10) coach.innerText = "Configuration Elite. Votre niche est extrêmement rentable.";
    else if (rpm > 5) coach.innerText = "Bonne rentabilité. Optimisez la durée pour passer au niveau supérieur.";
    else coach.innerText = "RPM faible. Envisagez une niche plus 'High Ticket' ou une audience plus âgée.";
}

function updateStrategy(rpmL, rpmS) {
    const target = parseFloat(document.getElementById('goal-target').value) || 0;
    const ratio = parseFloat(document.getElementById('ratio-slider').value) / 100;
    const vL = (target * ratio / (rpmL || 0.1)) * 1000;
    const vS = (target * (1 - ratio) / (rpmS || 0.01)) * 1000;
    document.getElementById('goal-plan').innerHTML = `Pour générer <b>${formatMoney(target)}</b> :<br>🎥 <b>${Math.round(vL).toLocaleString()}</b> vues Longues<br>📱 <b>${Math.round(vS).toLocaleString()}</b> vues Shorts`;
}

function updateProjections(total) {
    const growth = parseFloat(document.getElementById('growth-rate').value) / 100;
    document.getElementById('growth-val').innerText = (growth * 100).toFixed(0) + "%";
    let html = `<table style="width:100%; margin-top:15px; font-size:0.8rem; border-collapse: collapse;">`;
    let cur = total;
    for (let i = 1; i <= 3; i++) {
        cur *= (1 + growth);
        html += `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0;">Mois +${i}</td><td style="text-align:right; color:#10b981; font-weight:800; padding: 8px 0;">${formatMoney(cur)}</td></tr>`;
    }
    document.getElementById('projection-results-container').innerHTML = html + `</table>`;
}

function drawGrowthGraph() {
    const svg = document.getElementById('sub-graph');
    const history = Array.from(document.querySelectorAll('.sub-history')).map(i => parseFloat(i.value) || 0);
    const max = Math.max(...history) * 1.2;
    const points = history.map((v, i) => `${(i * 400) / 3},${150 - (v / max * 120 + 15)}`).join(' ');
    svg.innerHTML = `<polyline points="${points}" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`;
}

function formatMoney(val) { 
    return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); 
}

// CHARGEMENT AU DÉMARRAGE
window.onload = loadData;