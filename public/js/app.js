/**
 * Upgraded Main Application Controller
 * Connects Storage APIs, Carbon Math, UI presentation layers, and fetches backend server APIs.
 */

import {
  getUserInputs,
  saveUserInputs,
  getHabitsState,
  toggleHabitActive,
  toggleHabitCompletion,
  getUserProgress,
  getHistoricalScores,
  saveHistoricalScore,
  resetAll,
  saveUserProgress
} from './storage.js';

import { calculateTotalCarbon } from './calculations.js';

import {
  initWizard,
  updateDashboard,
  renderHabits,
  updateSandbox,
  initTipOfTheDay,
  updateProgressHeader,
  hideOnboardingWizard,
  showOnboardingWizard,
  renderEcoCoachResponse,
  renderEcoChallenge,
  renderLeaderboard,
  renderOffsets,
  renderHistoryTrend,
  populateMonthLogger,
  renderHistoryList
} from './ui.js';

// Application State
let userInputs = {};
let habitsState = [];
let userProgress = {};
let currentResults = {};
let carbonHistory = [];
let activeHabitFilter = 'all';

const getElement = (id) => document.getElementById(id);
const hasResults = (results) => results && typeof results.total === 'number';

/**
 * Initializes the full-stack web application.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch Local Data
  userInputs = getUserInputs();
  habitsState = getHabitsState();
  userProgress = getUserProgress();
  carbonHistory = getHistoricalScores();

  // 2. Render Header Stats
  updateProgressHeader(userProgress);

  // 3. Initialize daily tip
  initTipOfTheDay();

  // 4. Initial assessment routing
  if (userInputs.onboarded) {
    hideOnboardingWizard();
    
    currentResults = calculateTotalCarbon(userInputs);
    updateDashboard(currentResults);
    
    setupSandboxEventListeners();
    updateSandbox(userInputs, currentResults);
    
    // Load Backend APIs & Trend Data
    initializeFullStackFeatures();
  } else {
    setupOnboardingFlow();
  }

  // 5. Build Eco-Habits panel
  setupHabitsEventListeners();
  renderHabitsList();

  // 6. Bind footer utility actions
  setupUtilityEventListeners();
});

/**
 * Connects Onboarding form wizards
 */
function setupOnboardingFlow() {
  prefillForms(userInputs);

  initWizard(
    () => {
      document.getElementById('calculator-section').scrollIntoView({ behavior: 'smooth' });
    },
    () => {
      const energyData = getFormData('form-energy');
      const transportData = getFormData('form-transport');
      const dietData = getFormData('form-diet');
      const wasteData = getFormData('form-waste');

      userInputs = {
        ...userInputs,
        ...energyData,
        ...transportData,
        ...dietData,
        ...wasteData,
        onboarded: true
      };

      saveUserInputs(userInputs);
      currentResults = calculateTotalCarbon(userInputs);
      
      updateDashboard(currentResults);
      hideOnboardingWizard();
      
      document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
      
      setupSandboxEventListeners();
      updateSandbox(userInputs, currentResults);

      // Load Backend APIs & Trend Data
      initializeFullStackFeatures();
    }
  );
}

/**
 * Orchestrates fetch requests and plots backend assets
 */
function initializeFullStackFeatures() {
  // Fetch AI Eco-Coach Advice
  setupEcoCoachEventListeners();
  setupChallengeEventListeners();

  // Fetch Community Leaderboard
  fetchLeaderboard();

  // Fetch personalized eco challenge
  fetchEcoChallenge();

  // Fetch Offsetting Marketplace
  fetchOffsets();

  // Setup Carbon Trend History line graph
  setupHistoryEventListeners();
  renderHistoryGraph();
}

/**
 * 1. AI Eco-Coach API Integration
 */
function setupEcoCoachEventListeners() {
  const btnCoach = getElement('btn-consult-coach');
  if (!btnCoach) return;

  btnCoach.addEventListener('click', async () => {
    btnCoach.textContent = 'Coach Auditing Calculations...';
    btnCoach.disabled = true;

    try {
      const response = await fetch('/api/eco-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentResults)
      });

      if (!response.ok) throw new Error('API server returned error.');

      const data = await response.json();
      renderEcoCoachResponse(data.advice);
    } catch (e) {
      console.error('Eco-Coach Connection Error:', e);
      renderEcoCoachResponse(`<p style="color: var(--color-danger);">⚠️ <strong>Connection Error:</strong> Could not connect to the Express coaching server. Make sure the Node server is running.</p>`);
    } finally {
      btnCoach.innerHTML = `
        <svg class="btn-arrow" style="transform: rotate(0deg); width: 16px; height: 16px;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Consult Eco-Coach
      `;
      btnCoach.disabled = false;
    }
  });
}

/**
 * 2. Leaderboard API Fetch
 */
async function fetchLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('Leaderboard API failed.');
    const data = await response.json();
    renderLeaderboard(data.users);
  } catch (e) {
    console.error('Leaderboard Fetch Error:', e);
  }
}

/**
 * 3. Offsets Marketplace API Fetch
 */
async function fetchOffsets() {
  if (!hasResults(currentResults)) return;

  try {
    const response = await fetch(`/api/offsets?emissions=${currentResults.total}`);
    if (!response.ok) throw new Error('Offset API failed.');
    const data = await response.json();

    renderOffsets(data, (projectId) => {
      // Callback triggered when "Fund Project" is clicked
      userProgress.xp += 100; // Large reward
      userProgress.level = Math.floor(userProgress.xp / 100) + 1;
      saveUserProgress(userProgress);
      updateProgressHeader(userProgress);

      const modal = getElement('offset-success-modal');
      if (modal && typeof modal.showModal === 'function') {
        modal.showModal();
      }
    });
  } catch (e) {
    console.error('Offsets Fetch Error:', e);
  }
}

/**
 * 4. Monthly Trend History Logging
 */
function setupHistoryEventListeners() {
  const form = getElement('trend-log-form');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const select = document.getElementById('select-log-month');
    const selectedMonth = select.value;

    // Log calculation score
    carbonHistory = saveHistoricalScore(selectedMonth, currentResults.total);

    // Refresh display
    renderHistoryGraph();

    // Congratulate user with small XP reward for record-keeping
    userProgress.xp += 10;
    userProgress.level = Math.floor(userProgress.xp / 100) + 1;
    saveUserProgress(userProgress);
    updateProgressHeader(userProgress);
  });

  // Modal close trigger
  const closeBtn = getElement('btn-close-modal');
  const offsetModal = getElement('offset-success-modal');
  if (closeBtn && offsetModal && typeof offsetModal.close === 'function') {
    closeBtn.addEventListener('click', () => {
      offsetModal.close();
    });
  }
}

async function fetchEcoChallenge() {
  const challengeArea = getElement('challenge-content-area');
  if (!challengeArea) return;

  if (!hasResults(currentResults)) {
    challengeArea.innerHTML = '<p class="field-hint">Complete the assessment first to generate a personalized challenge.</p>';
    return;
  }

  challengeArea.innerHTML = '<p class="field-hint">Generating your personalized challenge...</p>';

  try {
    const response = await fetch('/api/eco-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentResults)
    });

    if (!response.ok) throw new Error('Eco challenge API failed.');

    const data = await response.json();
    renderEcoChallenge(data);
  } catch (error) {
    console.error('Eco Challenge Fetch Error:', error);
    challengeArea.innerHTML = '<p style="color: var(--color-danger);">Unable to load your personalized challenge right now. Please try again later.</p>';
  }
}

function setupChallengeEventListeners() {
  const challengeButton = getElement('btn-generate-challenge');
  if (!challengeButton) return;

  challengeButton.addEventListener('click', () => {
    fetchEcoChallenge();
  });
}

function renderHistoryGraph() {
  renderHistoryTrend(carbonHistory);
  renderHistoryList(carbonHistory);
  
  // Update monthly dropdown choices
  const loggedMonths = carbonHistory.map(h => h.date);
  populateMonthLogger(loggedMonths);
}

/**
 * Form Pre-fill & Form Reader utilities
 */
function prefillForms(data) {
  if (!data) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('input-electricity', data.electricityMonthlyKwh);
  setVal('input-gas', data.gasMonthlyM3);
  setVal('input-household', data.householdSize);
  setVal('input-car-km', data.carWeeklyKm);
  setVal('select-car-type', data.carType);
  setVal('input-transit-km', data.transitWeeklyKm);
  setVal('select-transit-type', data.transitPreferredType);
  setVal('input-flights-short', data.flightsShortAnnual);
  setVal('input-flights-long', data.flightsLongAnnual);

  const dietEl = document.querySelector(`input[name="dietType"][value="${data.dietType}"]`);
  if (dietEl) dietEl.checked = true;

  const wasteEl = document.querySelector(`input[name="wasteType"][value="${data.wasteType}"]`);
  if (wasteEl) wasteEl.checked = true;
}

function getFormData(formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const data = {};
  for (let [key, val] of formData.entries()) {
    if (val === '') {
      data[key] = 0;
    } else if (!isNaN(val) && key !== 'carType' && key !== 'transitPreferredType' && key !== 'dietType' && key !== 'wasteType') {
      data[key] = Number(val);
    } else {
      data[key] = val;
    }
  }
  return data;
}

/**
 * Sandbox What-If Simulator binding
 */
let sandboxListenersBound = false;
function setupSandboxEventListeners() {
  if (sandboxListenersBound) return;
  const rangeBike = document.getElementById('range-commute-bike');
  const rangeMeatless = document.getElementById('range-meatless-days');
  const toggleGreen = document.getElementById('toggle-green-energy');
  const toggleEv = document.getElementById('toggle-ev');
  const rangeFlights = document.getElementById('range-flights-reduction');

  const triggerUpdate = () => {
    updateSandbox(userInputs, currentResults);
  };

  rangeBike.addEventListener('input', triggerUpdate);
  rangeMeatless.addEventListener('input', triggerUpdate);
  toggleGreen.addEventListener('change', triggerUpdate);
  toggleEv.addEventListener('change', triggerUpdate);
  rangeFlights.addEventListener('input', triggerUpdate);

  sandboxListenersBound = true;
}

/**
 * Eco-Habits panel binding
 */
function setupHabitsEventListeners() {
  const tabs = document.querySelectorAll('.habit-filter-tabs .tab-btn');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeHabitFilter = tab.getAttribute('data-filter');
      renderHabitsList();
    });
  });
}

function renderHabitsList() {
  renderHabits(
    habitsState,
    activeHabitFilter,
    (habitId) => {
      const isCurrentlyActive = habitsState.find(h => h.id === habitId).active;
      habitsState = toggleHabitActive(habitId, !isCurrentlyActive);
      renderHabitsList();
    },
    (habitId) => {
      const result = toggleHabitCompletion(habitId);
      habitsState = result.habits;
      userProgress = result.progress;

      updateProgressHeader(userProgress);
      renderHabitsList();
    }
  );
}

/**
 * Footer utility event listeners
 */
function setupUtilityEventListeners() {
  const btnReassess = getElement('btn-reassess');
  const btnReset = getElement('btn-reset-data');
  const btnExport = getElement('btn-export-data');

  if (btnReassess) {
    btnReassess.addEventListener('click', () => {
      showOnboardingWizard();
      setupOnboardingFlow();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to clear all your local inputs, completed habits, and XP progress? This cannot be undone.')) {
        resetAll();
        window.location.reload();
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', (e) => {
      e.preventDefault();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        inputs: userInputs,
        progress: userProgress,
        habits: habitsState,
        history: carbonHistory
      }, null, 2));
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "ecostep_profile.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }
}
