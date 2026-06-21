/**
 * UI Rendering and Animation Controller (Upgraded)
 * Handles all DOM manipulation, SVG line-chart plotting, wizard flows, 
 * leaderboards, offsets rendering, and dashboard updates.
 */

import { calculateSimulation } from './calculations.js';

const ECO_TIPS = [
  "Switching to LED light bulbs uses up to 85% less energy and lasts up to 25 times longer than incandescent lighting.",
  "Leaving chargers plugged in when not charging still draws 'phantom energy'. Unplug them to save up to 10% on your electricity bill.",
  "Reducing your heating by just 1°C can lower your home carbon emissions by roughly 8% per year.",
  "Eating one plant-based meal a day for a year saves equivalent emissions to driving 1,200 kilometers in a gas car.",
  "Washing your clothes at 30°C instead of 40°C or higher saves up to 40% of the electricity used per cycle.",
  "Commuting by bicycle instead of a petrol car for just 10 km a day prevents 500 kg of CO2 emissions annually.",
  "Reducing your annual flight hours by 50% can cut your transport carbon footprint in half.",
  "Composting organic kitchen scraps prevents them from rotting in landfills, where they produce harmful methane gas.",
  "Buying local, seasonal food drastically reduces emissions from long-distance transport (known as 'food miles').",
  "Replacing single-use plastic water bottles with a stainless steel bottle prevents plastic manufacturing emissions."
];

let currentTipIndex = 0;

/**
 * Form Wizard Orchestration
 */
export function initWizard(onStart, onSubmit) {
  const btnStart = document.getElementById('btn-start-wizard');
  const btnsNext = document.querySelectorAll('.btn-next');
  const btnsPrev = document.querySelectorAll('.btn-prev');
  const btnSubmit = document.getElementById('btn-submit-wizard');

  btnStart.addEventListener('click', () => {
    switchStep('wizard-step-welcome', 'wizard-step-energy');
    if (onStart) onStart();
  });

  btnsNext.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStepId = btn.closest('.wizard-step').id;
      const nextStepId = btn.getAttribute('data-next');
      if (validateStepForm(currentStepId)) {
        switchStep(currentStepId, nextStepId);
      }
    });
  });

  btnsPrev.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStepId = btn.closest('.wizard-step').id;
      const prevStepId = btn.getAttribute('data-prev');
      switchStep(currentStepId, prevStepId);
    });
  });

  btnSubmit.addEventListener('click', () => {
    const currentStepId = 'wizard-step-waste';
    if (validateStepForm(currentStepId)) {
      if (onSubmit) onSubmit();
    }
  });
}

function switchStep(fromId, toId) {
  const fromStep = document.getElementById(fromId);
  const toStep = document.getElementById(toId);
  if (fromStep && toStep) {
    fromStep.classList.remove('active');
    setTimeout(() => {
      fromStep.style.display = 'none';
      toStep.style.display = 'block';
      setTimeout(() => {
        toStep.classList.add('active');
      }, 50);
    }, 400);
  }
}

function validateStepForm(stepId) {
  const stepEl = document.getElementById(stepId);
  const inputs = stepEl.querySelectorAll('input[required], select[required]');
  let isValid = true;
  inputs.forEach(input => {
    if (!input.value || Number(input.value) < 0) {
      input.style.borderColor = 'var(--color-danger)';
      input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
      isValid = false;
    } else {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    }
  });
  return isValid;
}

export function formatNumber(num) {
  return Number(num).toLocaleString('en-US');
}

/**
 * Updates the visual dashboard including progress gauge, comparative bars, and source chart.
 */
export function updateDashboard(results) {
  const totalValEl = document.getElementById('dashboard-total-val');
  const compUserValEl = document.getElementById('comp-user-val');
  const compUserBarEl = document.getElementById('comp-user-bar');
  const gaugeFillEl = document.getElementById('dashboard-gauge-fill');
  const statusTagEl = document.getElementById('eco-status-tag');
  const statusTextEl = document.getElementById('eco-status-text');

  if (!results || results.total === 0) return;

  animateNumber(totalValEl, results.total);

  compUserValEl.textContent = `${formatNumber(results.total)} kg`;
  const userPercent = Math.min(100, Math.round((results.total / 6000) * 100));
  compUserBarEl.style.width = `${userPercent}%`;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const fillPercentage = Math.min(1.0, results.total / 8000);
  const strokeOffset = circumference - (fillPercentage * circumference);
  gaugeFillEl.style.strokeDashoffset = strokeOffset;

  let color = 'var(--color-primary)';
  let statusClass = 'status-excellent';
  let statusTitle = 'Planet Hero';
  let statusText = 'Outstanding! Your footprint is within the 1.5°C climate limit. Keep building habits to lead the change.';

  if (results.total > 2000 && results.total <= 4000) {
    color = 'var(--color-secondary)';
    statusClass = 'status-good';
    statusTitle = 'Carbon Conscious';
    statusText = 'Great job! You are below the average global citizen footprint. Small habit adjustments can reduce it further.';
  } else if (results.total > 4000 && results.total <= 6000) {
    color = 'var(--color-warning)';
    statusClass = 'status-warning';
    statusTitle = 'Eco-Explorer';
    statusText = 'Your emissions are close to the national baseline. Use our Sandbox simulator to target major reduction actions.';
  } else if (results.total > 6000) {
    color = 'var(--color-danger)';
    statusClass = 'status-high';
    statusTitle = 'Carbon Heavyweight';
    statusText = 'Your carbon footprint is above standard levels. Commit to meatless days, commute by transit, or reduce flights.';
  }

  gaugeFillEl.style.stroke = color;
  statusTagEl.className = `eco-status-pill ${statusClass}`;
  statusTagEl.textContent = statusTitle;
  statusTextEl.textContent = statusText;

  renderBreakdownChart(results);
}

function renderBreakdownChart(results) {
  const chartEl = document.getElementById('source-breakdown-chart');
  if (!chartEl) return;

  const categories = [
    { key: 'home', label: 'Home Energy', colorClass: 'energy' },
    { key: 'transport', label: 'Transportation', colorClass: 'transport' },
    { key: 'diet', label: 'Food & Diet', colorClass: 'diet' },
    { key: 'waste', label: 'Consumption/Waste', colorClass: 'waste' }
  ];

  const maxVal = Math.max(1, results.home, results.transport, results.diet, results.waste);

  let html = '';
  categories.forEach(cat => {
    const val = results[cat.key] || 0;
    const pct = Math.round((val / maxVal) * 100);
    html += `
      <div class="bar-row">
        <div class="bar-info">
          <span class="bar-label-name">${cat.label}</span>
          <span class="bar-label-val">${formatNumber(val)} kg CO₂e</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${cat.colorClass}" style="width: 0%;" data-width="${pct}%"></div>
        </div>
      </div>
    `;
  });

  chartEl.innerHTML = html;

  setTimeout(() => {
    chartEl.querySelectorAll('.bar-fill').forEach(bar => {
      bar.style.width = bar.getAttribute('data-width');
    });
  }, 100);
}

function animateNumber(element, target) {
  let start = Number(element.textContent.replace(/,/g, '')) || 0;
  const duration = 800;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = progress * (2 - progress);
    const current = Math.round(start + (target - start) * easeProgress);
    element.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

/**
 * Onboarding/wizard visibility control
 */
export function hideOnboardingWizard() {
  document.getElementById('calculator-section').style.display = 'none';
  document.getElementById('btn-reassess').style.display = 'inline-flex';
  
  // Show new innovative features blocks
  document.getElementById('coach-section').style.display = 'block';
  document.getElementById('challenge-section').style.display = 'block';
  document.getElementById('trend-section').style.display = 'block';
  document.getElementById('offsets-section').style.display = 'block';
}

export function showOnboardingWizard() {
  document.getElementById('calculator-section').style.display = 'block';
  document.getElementById('btn-reassess').style.display = 'none';
  document.getElementById('challenge-section').style.display = 'none';
  document.getElementById('calculator-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Habit Builder View renderer
 */
export function renderHabits(habitsState, activeFilter, onToggleCommit, onToggleComplete) {
  const container = document.getElementById('habit-deck-container');
  if (!container) return;

  let filtered = habitsState;
  if (activeFilter === 'active') {
    filtered = habitsState.filter(h => h.active);
  } else if (activeFilter === 'completed') {
    const todayStr = new Date().toLocaleDateString('en-CA');
    filtered = habitsState.filter(h => h.completions.includes(todayStr));
  }

  if (filtered.length === 0) {
    let emptyMessage = "No habits found.";
    if (activeFilter === 'active') {
      emptyMessage = "No active commitments. Explore and commit to habits below!";
    } else if (activeFilter === 'completed') {
      emptyMessage = "You haven't completed any habits today. Log them to keep your streak!";
    }
    container.innerHTML = `<div class="chart-empty-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">${emptyMessage}</div>`;
    return;
  }

  const todayStr = new Date().toLocaleDateString('en-CA');

  container.innerHTML = filtered.map(habit => {
    const isCommitted = habit.active;
    const isCompletedToday = habit.completions.includes(todayStr);
    
    const completionsSorted = [...new Set(habit.completions)].sort((a, b) => new Date(b) - new Date(a));
    const currentStreak = calculateHabitStreak(completionsSorted);
    const streakHtml = currentStreak > 0 
      ? `<span class="streak-counter" title="Active streak">
          <svg class="streak-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ${currentStreak}d Streak
         </span>`
      : '';

    return `
      <div class="habit-item ${isCommitted ? 'active-commitment' : ''} ${isCompletedToday ? 'completed-today' : ''}" data-id="${habit.id}">
        ${isCommitted ? `
          <button class="habit-log-toggle" aria-label="Log habit completion" title="Click to log daily completion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        ` : ''}

        <div class="habit-item-header">
          <span class="habit-category-tag tag-${habit.category}">${habit.category}</span>
          <span class="habit-impact-badge impact-${habit.impact}">${habit.impact} Impact</span>
        </div>

        <div class="habit-item-body">
          <h3>${habit.name}</h3>
          <p>${habit.description}</p>
          <div class="habit-metrics">
            <span>Saves: <strong>${habit.co2Saved} kg</strong>/day</span>
            ${streakHtml}
          </div>
        </div>

        <div class="habit-action-row">
          <span class="xp-gift">
            <svg class="xp-gift-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            +${habit.xp} XP
          </span>

          <button class="btn-habit-commit ${isCommitted ? 'committed' : ''}">
            ${isCommitted ? 'Uncommit' : 'Commit'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.habit-item').forEach(card => {
    const id = card.getAttribute('data-id');
    
    card.querySelector('.btn-habit-commit').addEventListener('click', (e) => {
      e.stopPropagation();
      if (onToggleCommit) onToggleCommit(id);
    });

    const logBtn = card.querySelector('.habit-log-toggle');
    if (logBtn) {
      logBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onToggleComplete) onToggleComplete(id);
      });
    }
  });
}

function calculateHabitStreak(uniqueDates) {
  if (!uniqueDates || uniqueDates.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastCompDate = new Date(uniqueDates[0]);
  lastCompDate.setHours(0, 0, 0, 0);

  if (lastCompDate < yesterday) return 0;

  let streak = 0;
  let checkDate = new Date(lastCompDate);

  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i]);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Scenario Sandbox Simulator
 */
export function updateSandbox(currentInputs, originalResults) {
  const rangeBike = document.getElementById('range-commute-bike');
  const valBike = document.getElementById('val-commute-bike');
  const rangeMeatless = document.getElementById('range-meatless-days');
  const valMeatless = document.getElementById('val-meatless-days');
  const toggleGreen = document.getElementById('toggle-green-energy');
  const valGreen = document.getElementById('val-green-energy');
  const toggleEv = document.getElementById('toggle-ev');
  const valEv = document.getElementById('val-ev');
  const evGroup = document.getElementById('sandbox-ev-group');
  const rangeFlights = document.getElementById('range-flights-reduction');
  const valFlights = document.getElementById('val-flights-reduction');

  const savedNumEl = document.getElementById('sandbox-saved-num');
  const savedPctEl = document.getElementById('sandbox-saved-percent');
  const barOrigEl = document.getElementById('sandbox-bar-orig');
  const barSimEl = document.getElementById('sandbox-bar-sim');
  const lblOrigEl = document.getElementById('sandbox-lbl-orig');
  const lblSimEl = document.getElementById('sandbox-lbl-sim');

  if (!originalResults || originalResults.total === 0) return;

  const drives = currentInputs.carWeeklyKm > 0 && currentInputs.carType !== 'none';
  if (drives) {
    evGroup.style.display = 'flex';
  } else {
    evGroup.style.display = 'none';
    toggleEv.checked = false;
  }

  valBike.textContent = `${rangeBike.value}%`;
  valMeatless.textContent = `${rangeMeatless.value} ${rangeMeatless.value === '1' ? 'day' : 'days'}`;
  valGreen.textContent = toggleGreen.checked ? 'Solar / Renewable' : 'Standard Grid';
  valEv.textContent = toggleEv.checked ? 'Electric Car' : 'No';
  valFlights.textContent = `${rangeFlights.value}%`;

  const carKm = Number(currentInputs.carWeeklyKm || 0);
  const bikeShare = Number(rangeBike.value) / 100;
  const carToTransitKm = carKm * bikeShare;

  const modifications = {
    carToTransitKm: carToTransitKm,
    meatlessDaysPerWeek: Number(rangeMeatless.value),
    solarPanels: toggleGreen.checked,
    solarSavingsPercent: 0.75,
    switchElectricCar: toggleEv.checked,
    reduceFlightsPercent: Number(rangeFlights.value)
  };

  const simResult = calculateSimulation(currentInputs, modifications);

  animateNumber(savedNumEl, simResult.savings);
  savedPctEl.textContent = `${simResult.percentage}% Reduction`;

  lblOrigEl.textContent = `${formatNumber(originalResults.total)} kg`;
  lblSimEl.textContent = `${formatNumber(simResult.simulated.total)} kg`;

  const originalHeight = 100;
  const simulatedHeight = Math.max(15, Math.round((simResult.simulated.total / originalResults.total) * 100));

  barOrigEl.style.height = `${originalHeight}%`;
  barSimEl.style.height = `${simulatedHeight}%`;
}

/**
 * Educational tip carousel handler
 */
export function initTipOfTheDay() {
  const tipContentEl = document.getElementById('daily-tip-content');
  const btnNextTip = document.getElementById('btn-next-tip');

  function renderTip() {
    tipContentEl.style.opacity = 0;
    setTimeout(() => {
      tipContentEl.textContent = ECO_TIPS[currentTipIndex];
      tipContentEl.style.opacity = 1;
    }, 200);
  }

  btnNextTip.addEventListener('click', () => {
    currentTipIndex = (currentTipIndex + 1) % ECO_TIPS.length;
    renderTip();
  });

  currentTipIndex = Math.floor(Math.random() * ECO_TIPS.length);
  tipContentEl.textContent = ECO_TIPS[currentTipIndex];
}

/**
 * Updates level badges and XP progress in the header
 */
export function updateProgressHeader(progress) {
  const badgeTitleEl = document.getElementById('user-badge-title');
  const levelValEl = document.getElementById('user-level-val');
  const xpBarEl = document.getElementById('user-xp-bar');
  const xpTooltipEl = document.getElementById('user-xp-tooltip');
  const savedCo2ValEl = document.getElementById('total-co2-saved-val');

  if (!progress) return;

  levelValEl.textContent = `Lvl ${progress.level}`;
  savedCo2ValEl.textContent = progress.totalCo2Saved.toFixed(1);

  const currentLevelXp = progress.xp % 100;
  xpBarEl.style.width = `${currentLevelXp}%`;
  xpTooltipEl.textContent = `${currentLevelXp} / 100 XP (Total: ${progress.xp} XP)`;

  let badge = 'Eco-Explorer';
  if (progress.level >= 2 && progress.level < 4) badge = 'Carbon Reducer';
  else if (progress.level >= 4 && progress.level < 7) badge = 'Planet Guardian';
  else if (progress.level >= 7) badge = 'Green Sovereign';

  badgeTitleEl.textContent = badge;
}

// ==========================================================================
// [NEW PRESENTATION LAYER FUNCTIONS FOR INNOVATIVE FEATURES]
// ==========================================================================

/**
 * Renders the AI Eco Coach feedback bubble
 */
export function renderEcoCoachResponse(textHTML) {
  const responseArea = document.getElementById('coach-response-area');
  if (!responseArea) return;
  responseArea.innerHTML = textHTML;
}

export function renderEcoChallenge(data) {
  const challengeArea = document.getElementById('challenge-content-area');
  if (!challengeArea) return;

  if (!data || !data.challenge) {
    challengeArea.innerHTML = '<p class="field-hint">Unable to generate a challenge at this time.</p>';
    return;
  }

  const actionList = data.challenge.extraTips.map(tip => `<li>${tip}</li>`).join('');
  const roadmapList = data.roadmap.map(step => `<li><strong>${step.step}:</strong> ${step.detail}</li>`).join('');

  challengeArea.innerHTML = `
    <div class="challenge-summary-card">
      <h3>${data.challenge.title}</h3>
      <p>${data.challenge.summary}</p>
      <div class="challenge-target">Target: ${data.challenge.target}</div>
      <div class="challenge-metrics">
        <span>Duration: ${data.challenge.duration}</span>
        <span>Projected Reduction: ${data.projectedReduction} kg CO₂e</span>
      </div>
      <div class="challenge-section-pane">
        <div>
          <h4>Action Roadmap</h4>
          <ul>${roadmapList}</ul>
        </div>
        <div>
          <h4>Bonus Tips</h4>
          <ul>${actionList}</ul>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the Community Leaderboard table rows
 */
export function renderLeaderboard(users) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Leaderboard empty.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(user => {
    let rankBadgeClass = 'rank-other';
    if (user.rank === 1) rankBadgeClass = 'rank-1';
    else if (user.rank === 2) rankBadgeClass = 'rank-2';
    else if (user.rank === 3) rankBadgeClass = 'rank-3';

    return `
      <tr>
        <td><span class="rank-badge ${rankBadgeClass}">${user.rank}</span></td>
        <td>
          <div class="leaderboard-warrior">
            <span class="warrior-avatar">${user.avatar}</span>
            <span class="warrior-name">${user.name}</span>
            <span class="warrior-level-pill">Lvl ${user.level}</span>
          </div>
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--color-primary);">${user.dailySaved.toFixed(1)} kg</td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders the Offset Marketplace projects list
 */
export function renderOffsets(data, onFundProject) {
  const treeCountEl = document.getElementById('offsets-trees-val');
  const container = document.getElementById('offsets-projects-container');

  if (!data) return;

  treeCountEl.textContent = formatNumber(data.treesNeeded);

  container.innerHTML = data.projects.map(proj => {
    return `
      <div class="offset-project-item" data-id="${proj.id}">
        <div class="offset-project-header">
          <span class="offset-project-partner">${proj.partner}</span>
          <h3>${proj.name}</h3>
        </div>
        <p>${proj.desc}</p>
        <div class="offset-pricing-panel">
          <div class="offset-price-tag">
            <span class="price-usd">$${formatNumber(proj.costUsd)}</span>
            <span class="qty-metric">For ${formatNumber(proj.requiredQty)} ${proj.unitMetric}</span>
          </div>
          <button class="btn btn-primary btn-sm btn-fund-offset">Fund Project</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach button triggers
  container.querySelectorAll('.offset-project-item').forEach(card => {
    const id = card.getAttribute('data-id');
    card.querySelector('.btn-fund-offset').addEventListener('click', () => {
      if (onFundProject) onFundProject(id);
    });
  });
}

/**
 * Renders the interactive SVG carbon emissions monthly line graph.
 */
export function renderHistoryTrend(history) {
  const svg = document.getElementById('history-trend-svg');
  if (!svg) return;

  // Clear existing paths/text
  svg.innerHTML = '';

  if (!history || history.length < 2) {
    svg.innerHTML = `<text x="200" y="100" text-anchor="middle" fill="var(--text-muted)" font-size="12">Log at least 2 calculation audits to view trend line</text>`;
    return;
  }

  // Define SVG grid sizing parameters
  const paddingX = 40;
  const paddingY = 30;
  const width = 360;
  const height = 140;

  const pointsCount = history.length;
  const stepX = width / (pointsCount - 1);

  // Scale calculations: find min/max values
  const totals = history.map(h => h.total);
  const minVal = 0; // Baseline
  const maxVal = Math.max(7000, ...totals) * 1.15; // Give padding at top

  // Map values to coordinates
  const coords = history.map((record, index) => {
    const x = paddingX + (index * stepX);
    const y = paddingY + height - ((record.total - minVal) / (maxVal - minVal)) * height;
    return { x, y, record };
  });

  // RENDER DYNAMIC GRID & GRADIENTS
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--color-accent)"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  // Render Horizontal Grid Lines
  const gridLines = 3;
  for (let i = 0; i <= gridLines; i++) {
    const gridY = paddingY + (height / gridLines) * i;
    const gridVal = Math.round(maxVal - (maxVal / gridLines) * i);
    
    // Line path
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', paddingX);
    line.setAttribute('y1', gridY);
    line.setAttribute('x2', paddingX + width);
    line.setAttribute('y2', gridY);
    line.setAttribute('class', 'line-chart-grid-line');
    svg.appendChild(line);

    // Value Labels
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', paddingX - 8);
    label.setAttribute('y', gridY + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('fill', 'var(--text-muted)');
    label.setAttribute('font-size', '8');
    label.setAttribute('font-weight', '700');
    label.textContent = `${Math.round(gridVal / 1000)}k`;
    svg.appendChild(label);
  }

  // DRAW CHART LINE
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  let areaD = `M ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 1; i < coords.length; i++) {
    pathD += ` L ${coords[i].x} ${coords[i].y}`;
    areaD += ` L ${coords[i].x} ${coords[i].y}`;
  }

  areaD += ` L ${coords[coords.length - 1].x} ${paddingY + height} L ${coords[0].x} ${paddingY + height} Z`;

  // Draw Area Fill
  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  areaPath.setAttribute('d', areaD);
  areaPath.setAttribute('class', 'line-chart-area-fill');
  svg.appendChild(areaPath);

  // Draw Line
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('d', pathD);
  linePath.setAttribute('class', 'line-chart-path');
  svg.appendChild(linePath);

  // DRAW DATA DOTS & MONTH LABELS
  coords.forEach(coord => {
    // Circle node
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coord.x);
    circle.setAttribute('cy', coord.y);
    circle.setAttribute('r', '5');
    circle.setAttribute('class', 'line-chart-point');
    
    // Dynamic description tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${coord.record.date}: ${formatNumber(coord.record.total)} kg CO2e`;
    circle.appendChild(title);
    svg.appendChild(circle);

    // Month Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', coord.x);
    text.setAttribute('y', paddingY + height + 16);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--text-secondary)');
    text.setAttribute('font-size', '8');
    text.setAttribute('font-weight', '600');
    // Format date string 'YYYY-MM' to 'MMM'
    const dateObj = new Date(coord.record.date + "-02");
    const mStr = dateObj.toLocaleString('default', { month: 'short' });
    text.textContent = `${mStr}`;
    svg.appendChild(text);
  });
}

/**
 * Prepares the monthly selector logger values
 */
export function populateMonthLogger(loggedMonths) {
  const select = document.getElementById('select-log-month');
  if (!select) return;

  select.innerHTML = '';
  const now = new Date();

  // Create list of last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateVal = d.toLocaleDateString('en-CA').substring(0, 7); // 'YYYY-MM'
    const display = d.toLocaleTimeString('default', { month: 'long', year: 'numeric' });
    
    // Formatting: e.g. "June 2026"
    const displayStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const isLogged = loggedMonths.includes(dateVal);
    
    const opt = document.createElement('option');
    opt.value = dateVal;
    opt.textContent = `${displayStr}${isLogged ? ' (Updated)' : ''}`;
    
    if (i === 0) opt.selected = true; // default select current month
    select.appendChild(opt);
  }
}

/**
 * Formats lists of historical items into UI records list.
 */
export function renderHistoryList(history) {
  const container = document.getElementById('logged-records-container');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = `<div class="field-hint" style="text-align: center;">No audit logs recorded yet.</div>`;
    return;
  }

  // Render reverse chronological list
  const list = [...history].reverse();
  container.innerHTML = list.map(item => {
    const dateObj = new Date(item.date + "-02");
    const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    return `
      <div class="record-row">
        <span class="record-date">${label}</span>
        <span class="record-value">${formatNumber(item.total)} kg CO₂e</span>
      </div>
    `;
  }).join('');
}
