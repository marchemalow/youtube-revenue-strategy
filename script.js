let isAcreActive = false;

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
    // 1. Inputs de base
    const longViews = parseFloat(document.getElementById('long-views').value) || 0;
    const shortsViews = parseFloat(document.getElementById('shorts-views').value) || 0;
    const nicheBase = parseFloat(document.getElementById('niche').value);
    const regionMult = parseFloat(document.getElementById('region').value);
    const durationMins = parseFloat(document.getElementById('duration-slider').value);
    const fiscalStatus = document.getElementById('fiscal-status').value;

    document.getElementById('duration-val').innerText = durationMins + " min";

    // 2. Calcul Poids Âge
    const ageInputs = document.querySelectorAll('.age-pct');
    let ageTotal = 0;
    let ageWeight = 0;
    ageInputs.forEach(el => {
        const val = parseFloat(el.value) || 0;
        ageTotal += val;
        ageWeight += (val / 100) * parseFloat(el.dataset.weight);
    });

    // FIX: Affichage du badge Total 100%
    const badge = document.getElementById('age-total-badge');
    badge.innerText = `Total: ${ageTotal}%`;
    badge.style.background = ageTotal !== 100 ? "#ef4444" : "#10b981";
    
    // 3. Algorithme RPM v12
    const durationMult = durationMins < 8 ? 1.0 : Math.min(2.0, 1.25 + (durationMins - 8) * 0.02);
    const finalRPMLong = nicheBase * regionMult * ageWeight * durationMult;
    const revLong = (longViews / 1000) * finalRPMLong;

    const shortsRPM = parseFloat(document.getElementById('shorts-rpm').value) || 0.06;
    const revShorts = (shortsViews / 1000) * shortsRPM;

    // 4. Fiscalité Logic
    let taxRate = 1.0;
    const acreBox = document.getElementById('acre-container');
    
    if (fiscalStatus === 'ae') {
        acreBox.style.display = "flex";
        taxRate = isAcreActive ? 0.89 : 0.78; // ACRE = ~11% charges, Normal = ~22%
    } else {
        acreBox.style.display = "none";
        if (fiscalStatus === 'sasu') taxRate = 0.70;
        if (fiscalStatus === 'eurl') taxRate = 0.55;
    }

    const monthlyGross = revLong + revShorts;
    const monthlyNet = monthlyGross * taxRate;
    const racketAmount = monthlyGross - monthlyNet;

    // 5. Affichage Argent
    document.getElementById('grand-total').innerText = formatMoney(monthlyGross);
    document.getElementById('res-year').innerText = formatMoney(monthlyGross * 12);
    document.getElementById('res-rpm-avg').innerText = finalRPMLong.toFixed(2) + "€";

    // 6. Net Display & Fiscal Summary
    const netArea = document.getElementById('net-area');
    if (fiscalStatus !== 'none') {
        netArea.style.display = "flex";
        document.getElementById('net-total').innerText = formatMoney(monthlyNet);
        document.getElementById('racket-total').innerText = "-" + formatMoney(racketAmount);
        
        // Update Fiscal Tab Summary
        document.getElementById('summary-gross').innerText = formatMoney(monthlyGross);
        document.getElementById('summary-tax').innerText = "-" + formatMoney(racketAmount);
        document.getElementById('summary-net').innerText = formatMoney(monthlyNet);
    } else {
        netArea.style.display = "none";
        document.getElementById('summary-gross').innerText = formatMoney(monthlyGross);
        document.getElementById('summary-tax').innerText = "0.00 €";
        document.getElementById('summary-net').innerText = formatMoney(monthlyGross);
    }

    // 7. Autres modules
    updateScore(finalRPMLong);
    updateStrategy(finalRPMLong, shortsRPM);
    updateProjections(monthlyGross);
    drawGrowthGraph();
}

function updateScore(rpm) {
    // FIX: Score de potentiel et barre circulaire
    let score = Math.min(100, (rpm / 15) * 100);
    document.getElementById('score-circle').innerText = Math.round(score);
    
    const bar = document.getElementById('score-bar');
    const offset = 188.4 - (score / 100) * 188.4;
    bar.style.strokeDashoffset = offset;

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

// Initialisation au chargement
window.onload = calculate;