function switchTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    calculate();
}

function calculate() {
    // 1. Inputs de base
    const longViews = parseFloat(document.getElementById('long-views').value) || 0;
    const shortsViews = parseFloat(document.getElementById('shorts-views').value) || 0;
    const nicheBase = parseFloat(document.getElementById('niche').value);
    const regionMult = parseFloat(document.getElementById('region').value);
    const durationMins = parseFloat(document.getElementById('duration-slider').value);
    const taxRate = parseFloat(document.getElementById('tax-rate').value);

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

    const badge = document.getElementById('age-total-badge');
    badge.innerText = `Total: ${ageTotal}%`;
    badge.style.background = ageTotal !== 100 ? "#ff4757" : "#2ecc71";
    
    // 3. Algorithme RPM v12
    const durationMult = durationMins < 8 ? 1.0 : Math.min(2.0, 1.25 + (durationMins - 8) * 0.02);
    const finalRPMLong = nicheBase * regionMult * ageWeight * durationMult;
    const revLong = (longViews / 1000) * finalRPMLong;

    const shortsRPM = parseFloat(document.getElementById('shorts-rpm').value) || 0.06;
    const revShorts = (shortsViews / 1000) * shortsRPM;

    // 4. Totaux
    const monthlyGross = revLong + revShorts;
    const monthlyNet = monthlyGross * taxRate;
    const racketAmount = monthlyGross - monthlyNet;

    // 5. Affichage Argent
    document.getElementById('grand-total').innerText = formatMoney(monthlyGross);
    document.getElementById('res-year').innerText = formatMoney(monthlyGross * 12);
    document.getElementById('res-rpm-avg').innerText = finalRPMLong.toFixed(2) + "€";

    // 6. Net Optimizer & Racket
    const netArea = document.getElementById('net-area');
    if (taxRate < 1.0) {
        netArea.style.display = "flex";
        document.getElementById('net-total').innerText = formatMoney(monthlyNet);
        document.getElementById('racket-total').innerText = "-" + formatMoney(racketAmount);
    } else {
        netArea.style.display = "none";
    }

    // 7. Autres modules
    updateScore(finalRPMLong);
    updateStrategy(finalRPMLong, shortsRPM);
    updateProjections(monthlyGross);
    drawGrowthGraph();
}

function updateScore(rpm) {
    let score = Math.min(100, (rpm / 15) * 100);
    document.getElementById('score-circle').innerText = Math.round(score);
    document.getElementById('score-bar').style.strokeDashoffset = 188.4 - (score / 100) * 188.4;
    document.getElementById('coach-tip').innerText = rpm > 8 ? "Excellent RPM. Votre niche est très rentable." : "RPM faible. Ciblez une audience plus mature.";
}

function updateStrategy(rpmL, rpmS) {
    const target = parseFloat(document.getElementById('goal-target').value) || 0;
    const ratio = parseFloat(document.getElementById('ratio-slider').value) / 100;
    const vL = (target * ratio / (rpmL || 0.1)) * 1000;
    const vS = (target * (1 - ratio) / (rpmS || 0.01)) * 1000;
    document.getElementById('goal-plan').innerHTML = `Pour <b>${formatMoney(target)}</b> :<br>🎥 <b>${Math.round(vL).toLocaleString()}</b> vues Longues<br>📱 <b>${Math.round(vS).toLocaleString()}</b> vues Shorts`;
}

function updateProjections(total) {
    const growth = parseFloat(document.getElementById('growth-rate').value) / 100;
    document.getElementById('growth-val').innerText = (growth * 100).toFixed(0) + "%";
    let html = `<table style="width:100%; margin-top:15px; font-size:0.8rem;">`;
    let cur = total;
    for (let i = 1; i <= 3; i++) {
        cur *= (1 + growth);
        html += `<tr><td>Mois +${i}</td><td style="text-align:right; color:#2ecc71; font-weight:800;">${formatMoney(cur)}</td></tr>`;
    }
    document.getElementById('projection-results-container').innerHTML = html + `</table>`;
}

function drawGrowthGraph() {
    const svg = document.getElementById('sub-graph');
    const history = Array.from(document.querySelectorAll('.sub-history')).map(i => parseFloat(i.value) || 0);
    const max = Math.max(...history) * 1.2;
    const points = history.map((v, i) => `${(i * 400) / 3},${150 - (v / max * 100)}`).join(' ');
    svg.innerHTML = `<polyline points="${points}" fill="none" stroke="#FF0000" stroke-width="4" />`;
}

function formatMoney(val) { 
    return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); 
}

// Initialisation
calculate();