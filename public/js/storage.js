/**
 * LocalStorage management for User Inputs, Custom Habits, Streaks, XP progress, and Carbon History.
 */

export const STORAGE_KEYS = {
  USER_INPUTS: 'carbon_tracker_inputs',
  HABIT_STATE: 'carbon_tracker_habits',
  USER_PROGRESS: 'carbon_tracker_progress',
  CARBON_HISTORY: 'carbon_tracker_history' // for monthly trend tracking
};

export const DEFAULT_HABITS = [
  {
    id: 'h1',
    category: 'energy',
    name: 'Unplug Standby Devices',
    description: 'Turn off power strips and unplug appliances when not in use.',
    impact: 'low',
    xp: 15,
    co2Saved: 0.15
  },
  {
    id: 'h2',
    category: 'energy',
    name: 'Lower Thermostat by 1°C',
    description: 'Keep your heating 1 degree cooler in winter or AC warmer in summer.',
    impact: 'medium',
    xp: 30,
    co2Saved: 0.60
  },
  {
    id: 'h3',
    category: 'transport',
    name: 'Walk/Bike for Short Trips',
    description: 'Replace car journeys under 3km with walking, running, or cycling.',
    impact: 'high',
    xp: 50,
    co2Saved: 1.20
  },
  {
    id: 'h4',
    category: 'transport',
    name: 'Use Public Transit',
    description: 'Take the bus or train instead of driving for daily commutes.',
    impact: 'high',
    xp: 40,
    co2Saved: 1.80
  },
  {
    id: 'h5',
    category: 'diet',
    name: 'Meatless Day',
    description: 'Avoid all meat and dairy products for at least one full day.',
    impact: 'high',
    xp: 45,
    co2Saved: 2.10
  },
  {
    id: 'h6',
    category: 'diet',
    name: 'Buy Local Food',
    description: 'Purchase fresh, locally produced seasonal vegetables and fruits.',
    impact: 'medium',
    xp: 25,
    co2Saved: 0.50
  },
  {
    id: 'h7',
    category: 'waste',
    name: 'Zero Single-Use Plastic',
    description: 'Bring reusable grocery bags, water bottles, and lunch containers.',
    impact: 'medium',
    xp: 25,
    co2Saved: 0.40
  },
  {
    id: 'h8',
    category: 'waste',
    name: 'Compost Food Waste',
    description: 'Compost organic leftovers instead of throwing them in landfill trash.',
    impact: 'medium',
    xp: 30,
    co2Saved: 0.70
  }
];

const DEFAULT_USER_INPUTS = {
  electricityMonthlyKwh: 250,
  gasMonthlyM3: 40,
  householdSize: 1,
  carWeeklyKm: 120,
  carType: 'petrol',
  transitWeeklyKm: 40,
  transitPreferredType: 'bus',
  flightsShortAnnual: 2,
  flightsLongAnnual: 0,
  dietType: 'average',
  wasteType: 'average',
  onboarded: false
};

const DEFAULT_PROGRESS = {
  xp: 0,
  level: 1,
  totalCo2Saved: 0
};

// Helper: Safely parse JSON from localStorage
function safeGet(key, defaultValue) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    console.error(`Error reading key ${key} from storage:`, e);
    return defaultValue;
  }
}

// Helper: Safely write JSON to localStorage
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing key ${key} to storage:`, e);
  }
}

/**
 * Gets user inputs, falling back to defaults if not found.
 */
export function getUserInputs() {
  return safeGet(STORAGE_KEYS.USER_INPUTS, DEFAULT_USER_INPUTS);
}

/**
 * Saves user inputs.
 */
export function saveUserInputs(inputs) {
  const current = getUserInputs();
  safeSet(STORAGE_KEYS.USER_INPUTS, { ...current, ...inputs });
}

/**
 * Gets the current habits and their tracking state.
 * Initializes default habits if not present.
 */
export function getHabitsState() {
  let stored = localStorage.getItem(STORAGE_KEYS.HABIT_STATE);
  if (!stored) {
    const initialState = DEFAULT_HABITS.map(h => ({
      ...h,
      active: false,
      completions: []
    }));
    saveHabitsState(initialState);
    return initialState;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error parsing habits state:', e);
    return [];
  }
}

/**
 * Saves habits state.
 */
export function saveHabitsState(state) {
  safeSet(STORAGE_KEYS.HABIT_STATE, state);
}

/**
 * Gets the current user XP, Level, and Total CO2 saved.
 */
export function getUserProgress() {
  return safeGet(STORAGE_KEYS.USER_PROGRESS, DEFAULT_PROGRESS);
}

/**
 * Saves user XP/Level progress.
 */
export function saveUserProgress(progress) {
  safeSet(STORAGE_KEYS.USER_PROGRESS, progress);
}

/**
 * Gets historical carbon footprint logs.
 */
export function getHistoricalScores() {
  return safeGet(STORAGE_KEYS.CARBON_HISTORY, []);
}

/**
 * Logs the current carbon footprint score for a given month.
 * Keeps only the last 12 months of history logs.
 * @param {string} dateStr 'YYYY-MM' format
 * @param {number} totalScore Carbon footprint value in kg CO2e
 */
export function saveHistoricalScore(dateStr, totalScore) {
  const history = getHistoricalScores();
  const existingIndex = history.findIndex(h => h.date === dateStr);

  if (existingIndex !== -1) {
    history[existingIndex].total = totalScore;
  } else {
    history.push({ date: dateStr, total: totalScore });
  }

  // Sort chronologically by date string
  history.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Cap at last 12 records
  if (history.length > 12) {
    history.shift();
  }

  safeSet(STORAGE_KEYS.CARBON_HISTORY, history);
  return history;
}

/**
 * Activates or deactivates a habit.
 */
export function toggleHabitActive(habitId, isActive) {
  const habits = getHabitsState();
  const index = habits.findIndex(h => h.id === habitId);
  if (index !== -1) {
    habits[index].active = isActive;
    saveHabitsState(habits);
  }
  return habits;
}

/**
 * Calculates current streak for a habit based on completion dates.
 */
export function calculateStreak(completions) {
  if (!completions || completions.length === 0) return 0;

  const uniqueDates = [...new Set(completions)].sort((a, b) => new Date(b) - new Date(a));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastCompDate = new Date(uniqueDates[0]);
  lastCompDate.setHours(0, 0, 0, 0);

  if (lastCompDate < yesterday) {
    return 0;
  }

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
 * Logs or removes completion of a habit for a given date.
 */
export function toggleHabitCompletion(habitId, dateStr) {
  const habits = getHabitsState();
  const progress = getUserProgress();
  const habitIndex = habits.findIndex(h => h.id === habitId);

  if (habitIndex === -1) return { habits, progress };

  const habit = habits[habitIndex];
  if (!dateStr) {
    dateStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  }

  const completionIndex = habit.completions.indexOf(dateStr);
  let isAdd = false;

  if (completionIndex === -1) {
    habit.completions.push(dateStr);
    isAdd = true;
  } else {
    habit.completions.splice(completionIndex, 1);
  }

  saveHabitsState(habits);

  if (isAdd) {
    progress.xp += habit.xp;
    progress.totalCo2Saved += habit.co2Saved;
  } else {
    progress.xp = Math.max(0, progress.xp - habit.xp);
    progress.totalCo2Saved = Math.max(0, progress.totalCo2Saved - habit.co2Saved);
  }

  progress.level = Math.floor(progress.xp / 100) + 1;
  saveUserProgress(progress);

  return {
    habits,
    progress,
    streak: calculateStreak(habit.completions)
  };
}

/**
 * Resets all user data.
 */
export function resetAll() {
  localStorage.removeItem(STORAGE_KEYS.USER_INPUTS);
  localStorage.removeItem(STORAGE_KEYS.HABIT_STATE);
  localStorage.removeItem(STORAGE_KEYS.USER_PROGRESS);
  localStorage.removeItem(STORAGE_KEYS.CARBON_HISTORY);
}
