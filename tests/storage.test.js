import assert from 'assert';
import {
  STORAGE_KEYS,
  getUserInputs,
  saveUserInputs,
  getHabitsState,
  toggleHabitActive,
  toggleHabitCompletion,
  getUserProgress,
  saveUserProgress,
  getHistoricalScores,
  saveHistoricalScore,
  resetAll
} from '../public/js/storage.js';

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

global.localStorage = createLocalStorage();

global.Date = Date;

console.log('🧪 Running storage persistence unit tests...');

try {
  resetAll();

  const defaultInputs = getUserInputs();
  assert.strictEqual(defaultInputs.electricityMonthlyKwh, 250);
  assert.strictEqual(defaultInputs.carType, 'petrol');

  saveUserInputs({ electricityMonthlyKwh: 300, carType: 'electric' });
  const updatedInputs = getUserInputs();
  assert.strictEqual(updatedInputs.electricityMonthlyKwh, 300);
  assert.strictEqual(updatedInputs.carType, 'electric');

  const habits = getHabitsState();
  assert.ok(Array.isArray(habits));
  assert.strictEqual(habits.length, 8);

  const beforeActive = habits[0].active;
  const toggledHabits = toggleHabitActive(habits[0].id, !beforeActive);
  assert.strictEqual(toggledHabits[0].active, !beforeActive);

  const progressBefore = getUserProgress();
  assert.strictEqual(progressBefore.xp, 0);

  const { habits: completedHabits, progress: completedProgress } = toggleHabitCompletion(habits[0].id);
  assert.ok(completedProgress.xp >= habits[0].xp);
  assert.ok(completedHabits[0].completions.length >= 1);

  const storedHistory = getHistoricalScores();
  assert.deepStrictEqual(storedHistory, []);

  const scoreHistory = saveHistoricalScore('2026-06', 4200);
  assert.strictEqual(scoreHistory.length, 1);
  assert.strictEqual(scoreHistory[0].date, '2026-06');
  assert.strictEqual(scoreHistory[0].total, 4200);

  // ensure history caps at 12
  for (let i = 1; i <= 13; i++) {
    saveHistoricalScore(`2026-${String(i).padStart(2, '0')}`, 3000 + i);
  }
  const trimmedHistory = getHistoricalScores();
  assert.strictEqual(trimmedHistory.length, 12);

  resetAll();
  assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USER_INPUTS), null);
  assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USER_PROGRESS), null);
  assert.strictEqual(localStorage.getItem(STORAGE_KEYS.HABIT_STATE), null);
  assert.strictEqual(localStorage.getItem(STORAGE_KEYS.CARBON_HISTORY), null);

  console.log('✅ Storage persistence tests passed successfully.');
} catch (error) {
  console.error('❌ Storage persistence tests failed.');
  console.error(error);
  process.exit(1);
}
