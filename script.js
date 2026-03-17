let globalDataPoints = []; 

function switchTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    calculate();
}

/**
 * ALGORITHME STRICT V12
 */
function getDurationMultiplier(mins) {
    if (mins < 1) return 0.7;
    if (mins < 8) return 1.0;
    // Saut de 25% à 8min puis 2% par minute supplémentaire
    const mult = 1.25 + (mins - 8) * 0.02;
    return Math.min(2.0, mult); // Cap à 2x max
}

function calculate() {
    // 1. Inputs
    const longViews = parseFloat(document.getElementById('long-views').value) || 0;
    const shortsViews = parseFloat(document.getElementById('shorts-views').value) || 0;
    const nicheBase = parseFloat(document.getElementById('niche').value);
    const regionMult = parseFloat(document.getElementById('region').value);
    const durationMins = parseFloat(document.getElementById('duration-slider').value);
    const growthRate = parseFloat(document.getElementById('growth-rate').value) / 100;

    document.getElementById('duration-val').innerText = durationMins + " min";

    // 2. Gestion Somme Âges & Poids (Calcul strict v12)
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
    
    // 3. Application de l'Algorithme RPM (Strict v12)
    const durationMult = getDurationMultiplier(durationMins);
    const finalRPMLong = nicheBase * regionMult * ageWeight * durationMult;
    const revLong = (longViews / 1000) * finalRPMLong;

    const shortsRPM = parseFloat(document.getElementById('shorts-rpm').value) || 0.06;
    const revShorts = (shortsViews / 1000) * shortsRPM;

    // 4. Totaux & Affichage
    const monthlyTotal = revLong + revShorts;
    
    document.getElementById('grand-total').innerText = formatMoney(monthlyTotal);
    document.getElementById('res-year').innerText = formatMoney(monthlyTotal * 12);
    document.getElementById('res-rpm-avg').innerText = finalRPMLong.toFixed(2) + "€";
    document.getElementById('growth-val').innerText = (growthRate * 100).toFixed(0) + "%";

    // 5. Mise à jour des modules
    updateScore(finalRPMLong);
    updateStrategy(finalRPMLong, shortsRPM);
    updateProjections(monthlyTotal, longViews, growthRate);
    calculateGrowth();
}

/**
 * STRATÉGIE SYNCHRONISÉE
 */
function updateStrategy(rpmL, rpmS) {
    const target = parseFloat(document.getElementById('goal-target').value) || 0;
    const ratio = parseFloat(document.getElementById('ratio-slider').value) / 100;
    
    // Calcul de la répartition de l'objectif financier
    const partLong = target * ratio;
    const partShorts = target * (1 - ratio);
    
    // Utilisation des RPM calculés en page 1
    const vL = (partLong / (rpmL || 0.1)) * 1000;
    const vS = (partShorts / (rpmS || 0.01)) * 1000;
    
    document.getElementById('goal-plan').innerHTML = `
        Pour générer <b>${formatMoney(target)}</b> :<br><br>
        🎥 <b>${Math.round(vL).toLocaleString()}</b> vues Longues (RPM: ${rpmL.toFixed(2)}€)<br>
        📱 <b>${Math.round(vS).toLocaleString()}</b> vues Shorts
    `;
}

function updateScore(rpm) {
    let score = Math.min(100, (rpm / 15) * 100);
    document.getElementById('score-circle').innerText = Math.round(score);
    document.getElementById('score-bar').style.strokeDashoffset = 188.4 - (score / 100) * 188.4;
    document.getElementById('coach-tip').innerText = rpm > 8 ? "Excellent RPM. Votre configuration est très rentable." : "Votre RPM est faible. Augmentez la durée ou ciblez une audience plus âgée.";
}

function calculateGrowth() {
    const history = Array.from(document.querySelectorAll('.sub-history')).map(i => parseFloat(i.value) || 0);
    const diffStart = history[1] - history[0];
    const diffEnd = history[3] - history[2];
    let accel = diffStart > 0 ? (diffEnd / diffStart) : 1;
    const factor = Math.min(1.5, Math.max(1.0, 1 + (accel - 1) * 0.1));
    document.getElementById('expo-factor-display').innerText = `Exponentialité : ${factor.toFixed(2)}`;
    drawGraph(history, factor);
}

function updateProjections(totalRev, totalViews, growth) {
    let html = `<table><tr><th>Mois</th><th>Revenu Est.</th><th>Vues Est.</th></tr>`;
    let curRev = totalRev; let curViews = totalViews;
    for (let i = 1; i <= 6; i++) {
        curRev *= (1 + growth);
        curViews *= (1 + growth);
        html += `<tr><td>Mois +${i}</td><td><b>${formatMoney(curRev)}</b></td><td>${Math.round(curViews).toLocaleString()}</td></tr>`;
    }
    document.getElementById('projection-results-container').innerHTML = html + `</table>`;
}

function drawGraph(history, expo) {
    const svg = document.getElementById('sub-graph');
    if(!svg) return;
    const forecast = [];
    let lastSub = history[3];
    let growth = (history[3] - history[2]);
    for(let i=1; i<=4; i++) { growth *= expo; lastSub += growth; forecast.push(lastSub); }
    const all = [...history, ...forecast];
    globalDataPoints = all;
    const max = Math.max(...all) * 1.1; const min = Math.min(...all) * 0.9;
    const getX = (i) => (i * 400) / (all.length - 1);
    const getY = (v) => 150 - ((v - min) / (max - min) * 120 + 15);
    let dR = `M ${getX(0)} ${getY(history[0])} `;
    for(let i=1; i<4; i++) dR += `L ${getX(i)} ${getY(history[i])} `;
    let dP = `M ${getX(3)} ${getY(history[3])} `;
    for(let i=0; i<forecast.length; i++) dP += `L ${getX(4+i)} ${getY(forecast[i])} `;
    svg.innerHTML = `
        <path d="${dR}" fill="none" stroke="#555" stroke-width="3" />
        <path d="${dP}" fill="none" stroke="#FF0000" stroke-width="3" stroke-dasharray="5,5" />
        ${all.map((v, i) => `<circle cx="${getX(i)}" cy="${getY(v)}" r="4" fill="${i < 4 ? '#666' : '#FF0000'}" />`).join('')}
    `;
}

function handleGraphHover(e) {
    const tooltip = document.getElementById('graph-tooltip');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (globalDataPoints.length - 1));
    if (globalDataPoints[index]) {
        tooltip.style.left = (x + 10) + "px";
        tooltip.style.display = "block";
        tooltip.innerText = `${Math.round(globalDataPoints[index]).toLocaleString()} abonnés`;
    }
}

function formatMoney(val) { return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); }

window.onload = calculate;