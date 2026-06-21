import assert from 'assert';
import {
  calculateHomeCarbon,
  calculateTransportCarbon,
  calculateDietCarbon,
  calculateWasteCarbon,
  calculateTotalCarbon,
  calculateSimulation,
  EMISSION_FACTORS
} from '../public/js/calculations.js';

console.log('🧪 Running Carbon Footprint Calculation Engine Unit Tests...');

try {
  // Test Case 1: Home Carbon calculations
  // Input: 300 kWh electricity, 50 m3 gas, household size 2
  // Annual electricity: 300 * 12 * 0.40 = 1440 kg
  // Annual gas: 50 * 12 * 2.03 = 1218 kg
  // Total household: 2658 kg
  // Per person: 2658 / 2 = 1329 kg
  const homeResult = calculateHomeCarbon(300, 50, 2);
  assert.strictEqual(homeResult, 1329);
  console.log('✅ Test Case 1 Passed: calculateHomeCarbon');

  // Test Case 2: Transportation calculations
  // Input: 100 km petrol car per week, 50 km train per week, 10h short flights, 20h long flights
  // Car emissions: 100 * 52 * 0.20 = 1040 kg
  // Train emissions: 50 * 52 * 0.04 = 104 kg
  // Short flights: 10 * 150 = 1500 kg
  // Long flights: 20 * 110 = 2200 kg
  // Total transport: 1040 + 104 + 1500 + 2200 = 4844 kg
  const transportResult = calculateTransportCarbon(100, 'petrol', 50, 'train', 10, 20);
  assert.strictEqual(transportResult, 4844);
  console.log('✅ Test Case 2 Passed: calculateTransportCarbon');

  // Test Case 3: Diet emissions
  // Vegan diet emissions should match constant
  const veganResult = calculateDietCarbon('vegan');
  assert.strictEqual(veganResult, EMISSION_FACTORS.diet.vegan);
  console.log('✅ Test Case 3 Passed: calculateDietCarbon');

  // Test Case 4: Waste emissions
  // Low waste emissions should match constant
  const wasteResult = calculateWasteCarbon('low');
  assert.strictEqual(wasteResult, EMISSION_FACTORS.waste.low);
  console.log('✅ Test Case 4 Passed: calculateWasteCarbon');

  // Test Case 5: Total Footprint calculation
  const mockData = {
    electricityMonthlyKwh: 300,
    gasMonthlyM3: 50,
    householdSize: 2,
    carWeeklyKm: 100,
    carType: 'petrol',
    transitWeeklyKm: 50,
    transitPreferredType: 'train',
    flightsShortAnnual: 10,
    flightsLongAnnual: 20,
    dietType: 'vegan',
    wasteType: 'low'
  };
  
  // Home = 1329
  // Transport = 4844
  // Diet = 1500
  // Waste = 600
  // Total = 8273
  const totalResult = calculateTotalCarbon(mockData);
  assert.strictEqual(totalResult.home, 1329);
  assert.strictEqual(totalResult.transport, 4844);
  assert.strictEqual(totalResult.diet, 1500);
  assert.strictEqual(totalResult.waste, 600);
  assert.strictEqual(totalResult.total, 8273);
  console.log('✅ Test Case 5 Passed: calculateTotalCarbon');

  // Test Case 6: Simulation ("What-If" Analysis)
  // Switch to Electric Car (transport changes petrol to electric)
  // Petrol transport: 1040 + 104 + 1500 + 2200 = 4844 kg
  // Electric transport: (100 * 52 * 0.05) + 104 + 1500 + 2200 = 260 + 104 + 1500 + 2200 = 4064 kg
  // Transport saved = 780 kg
  // Total saved = 780 kg
  const modifications = {
    switchElectricCar: true
  };
  const simulationResult = calculateSimulation(mockData, modifications);
  assert.strictEqual(simulationResult.original.total, 8273);
  assert.strictEqual(simulationResult.simulated.transport, 4064);
  assert.strictEqual(simulationResult.savings, 780);
  assert.strictEqual(simulationResult.percentage, Math.round((780 / 8273) * 100));
  console.log('✅ Test Case 6 Passed: calculateSimulation (Electric Car)');

  // Test Case 7: Simulation with Green Energy (Solar Panels - 50% offset)
  // Home Original: 1329 kg
  // Electricity monthly: 300 kWh => 300 * 12 * 0.40 = 1440 kg. Shared by 2 = 720 kg.
  // Gas monthly: 50 m3 => 50 * 12 * 2.03 = 1218 kg. Shared by 2 = 609 kg.
  // Solar offset 50% on electricity: 720 * 0.5 = 360 kg
  // Home Simulated: 360 + 609 = 969 kg
  // Home Saved = 360 kg
  const solarMods = {
    solarPanels: true,
    solarSavingsPercent: 0.50
  };
  const solarResult = calculateSimulation(mockData, solarMods);
  assert.strictEqual(solarResult.simulated.home, 969);
  assert.strictEqual(solarResult.savings, 360);
  console.log('✅ Test Case 7 Passed: calculateSimulation (Solar Panels)');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The calculation engine is solid.');
} catch (error) {
  console.error('\n❌ Test Case Failed!');
  console.error(error);
  process.exit(1);
}
