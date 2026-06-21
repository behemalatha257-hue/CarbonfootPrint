/**
 * Carbon Footprint Calculation Constants & Engine
 * Based on values aligned with standard IPCC, EPA, and DEFRA emission factors.
 * All outputs are in kilograms of CO2 equivalent (kg CO2e) per year.
 */

// Emission factors (kg CO2e per unit)
export const EMISSION_FACTORS = {
  // Energy
  electricity: 0.40, // per kWh
  naturalGas: 2.03,  // per m³
  heatingOil: 2.68,  // per liter

  // Transport
  carTypes: {
    petrol: 0.20,   // per km
    diesel: 0.22,   // per km
    hybrid: 0.10,   // per km
    electric: 0.05, // per km (considers average grid emissions)
  },
  publicTransit: {
    bus: 0.08,      // per km
    train: 0.04,     // per km
  },
  flights: {
    shortHaul: 150.0, // per hour of flight (roughly < 3h flights, accounts for take-off impact)
    longHaul: 110.0,  // per hour of flight (roughly >= 3h flights)
  },

  // Diet (annual base in kg CO2e)
  diet: {
    meatHeavy: 3300,  // High meat consumption
    average: 2500,    // Balanced meat, fish, veg
    vegetarian: 1700, // No meat, includes dairy/eggs
    vegan: 1500,      // Purely plant-based
  },

  // Waste & Consumption (annual base in kg CO2e)
  waste: {
    high: 2000,       // Generates normal waste, no recycling, high shopper
    average: 1200,    // Standard waste with moderate recycling
    low: 600,         // Minimalist, zero waste habits, active recycler
  }
};

/**
 * Calculates annual home energy emissions.
 * @param {number} electricityMonthlyKwh Monthly electricity consumption in kWh
 * @param {number} gasMonthlyM3 Monthly gas consumption in m³
 * @param {number} householdSize Number of people sharing the household
 * @returns {number} Annual kg CO2e per person
 */
export function calculateHomeCarbon(electricityMonthlyKwh, gasMonthlyM3, householdSize = 1) {
  const size = Math.max(1, householdSize);
  const annualElectricity = (electricityMonthlyKwh * 12 * EMISSION_FACTORS.electricity);
  const annualGas = (gasMonthlyM3 * 12 * EMISSION_FACTORS.naturalGas);
  return (annualElectricity + annualGas) / size;
}

/**
 * Calculates annual transportation emissions.
 * @param {number} carWeeklyKm Weekly distance driven in km
 * @param {string} carType Type of car ('petrol', 'diesel', 'hybrid', 'electric', or 'none')
 * @param {number} transitWeeklyKm Weekly distance on public transit in km
 * @param {string} transitPreferredType Primary transit type ('bus' or 'train')
 * @param {number} flightsShortAnnual Annual hours in short-haul flights (< 3 hours)
 * @param {number} flightsLongAnnual Annual hours in long-haul flights (>= 3 hours)
 * @returns {number} Annual kg CO2e per person
 */
export function calculateTransportCarbon(
  carWeeklyKm,
  carType,
  transitWeeklyKm,
  transitPreferredType = 'bus',
  flightsShortAnnual = 0,
  flightsLongAnnual = 0
) {
  let carEmissions = 0;
  if (carType && EMISSION_FACTORS.carTypes[carType]) {
    carEmissions = carWeeklyKm * 52 * EMISSION_FACTORS.carTypes[carType];
  }

  let transitEmissions = 0;
  const transitFactor = EMISSION_FACTORS.publicTransit[transitPreferredType] || EMISSION_FACTORS.publicTransit.bus;
  transitEmissions = transitWeeklyKm * 52 * transitFactor;

  const shortFlightEmissions = flightsShortAnnual * EMISSION_FACTORS.flights.shortHaul;
  const longFlightEmissions = flightsLongAnnual * EMISSION_FACTORS.flights.longHaul;

  return carEmissions + transitEmissions + shortFlightEmissions + longFlightEmissions;
}

/**
 * Returns annual emissions for diet type.
 * @param {string} dietType 'meatHeavy', 'average', 'vegetarian', 'vegan'
 * @returns {number} Annual kg CO2e per person
 */
export function calculateDietCarbon(dietType) {
  return EMISSION_FACTORS.diet[dietType] || EMISSION_FACTORS.diet.average;
}

/**
 * Returns annual emissions for waste lifestyle.
 * @param {string} wasteType 'high', 'average', 'low'
 * @returns {number} Annual kg CO2e per person
 */
export function calculateWasteCarbon(wasteType) {
  return EMISSION_FACTORS.waste[wasteType] || EMISSION_FACTORS.waste.average;
}

/**
 * Calculates total annual emissions.
 * @param {Object} data Object containing home, transport, diet, and waste inputs
 * @returns {Object} Structured carbon breakdown (kg CO2e / year)
 */
export function calculateTotalCarbon(data) {
  const home = calculateHomeCarbon(
    Number(data.electricityMonthlyKwh || 0),
    Number(data.gasMonthlyM3 || 0),
    Number(data.householdSize || 1)
  );

  const transport = calculateTransportCarbon(
    Number(data.carWeeklyKm || 0),
    data.carType || 'none',
    Number(data.transitWeeklyKm || 0),
    data.transitPreferredType || 'bus',
    Number(data.flightsShortAnnual || 0),
    Number(data.flightsLongAnnual || 0)
  );

  const diet = calculateDietCarbon(data.dietType || 'average');
  const waste = calculateWasteCarbon(data.wasteType || 'average');

  const total = home + transport + diet + waste;

  return {
    home: Math.round(home),
    transport: Math.round(transport),
    diet: Math.round(diet),
    waste: Math.round(waste),
    total: Math.round(total)
  };
}

/**
 * Calculates simulated carbon output based on changes applied.
 * @param {Object} currentData Original inputs
 * @param {Object} modifications Modification deltas (e.g. electric car, meatless days, solar offset)
 * @returns {Object} Original vs Simulated footprint data & percentage reduction
 */
export function calculateSimulation(currentData, modifications) {
  const original = calculateTotalCarbon(currentData);
  
  // Clone current data for modifications
  const simulatedData = { ...currentData };

  // 1. Home modifications
  let electricityKwh = Number(simulatedData.electricityMonthlyKwh || 0);
  if (modifications.solarPanels) {
    electricityKwh *= (1 - Number(modifications.solarSavingsPercent || 0.50));
  }
  
  let gasM3 = Number(simulatedData.gasMonthlyM3 || 0);
  if (modifications.thermostatReduction) {
    gasM3 *= (1 - (Number(modifications.tempDegreesSaved || 1) * 0.08));
  }

  const simulatedHome = calculateHomeCarbon(
    electricityKwh,
    gasM3,
    Number(simulatedData.householdSize || 1)
  );

  // 2. Transport modifications
  let carWeeklyKm = Number(simulatedData.carWeeklyKm || 0);
  let carType = simulatedData.carType || 'none';
  let transitWeeklyKm = Number(simulatedData.transitWeeklyKm || 0);

  if (modifications.switchElectricCar && carType !== 'none') {
    carType = 'electric';
  }

  if (modifications.carToTransitKm && carWeeklyKm > 0) {
    const shift = Math.min(carWeeklyKm, Number(modifications.carToTransitKm));
    carWeeklyKm -= shift;
    transitWeeklyKm += shift;
  }

  let flightsShort = Number(simulatedData.flightsShortAnnual || 0);
  let flightsLong = Number(simulatedData.flightsLongAnnual || 0);
  if (modifications.reduceFlightsPercent) {
    const multiplier = 1 - (Number(modifications.reduceFlightsPercent) / 100);
    flightsShort *= multiplier;
    flightsLong *= multiplier;
  }

  const simulatedTransport = calculateTransportCarbon(
    carWeeklyKm,
    carType,
    transitWeeklyKm,
    simulatedData.transitPreferredType || 'bus',
    flightsShort,
    flightsLong
  );

  // 3. Diet modifications
  let dietType = simulatedData.dietType || 'average';
  if (modifications.switchDiet) {
    dietType = modifications.switchDiet;
  } else if (modifications.meatlessDaysPerWeek && dietType === 'meatHeavy') {
    const meatlessFraction = Math.min(7, Number(modifications.meatlessDaysPerWeek)) / 7;
    const meatHeavyBase = EMISSION_FACTORS.diet.meatHeavy;
    const vegetarianBase = EMISSION_FACTORS.diet.vegetarian;
    dietType = 'custom';
    simulatedData.dietCustomValue = meatHeavyBase - (meatlessFraction * (meatHeavyBase - vegetarianBase));
  } else if (modifications.meatlessDaysPerWeek && dietType === 'average') {
    const meatlessFraction = Math.min(7, Number(modifications.meatlessDaysPerWeek)) / 7;
    const averageBase = EMISSION_FACTORS.diet.average;
    const vegetarianBase = EMISSION_FACTORS.diet.vegetarian;
    dietType = 'custom';
    simulatedData.dietCustomValue = averageBase - (meatlessFraction * (averageBase - vegetarianBase));
  }

  const simulatedDiet = dietType === 'custom' 
    ? simulatedData.dietCustomValue 
    : calculateDietCarbon(dietType);

  // 4. Waste modifications
  let wasteType = simulatedData.wasteType || 'average';
  if (modifications.improveRecycling) {
    if (wasteType === 'high') wasteType = 'average';
    else if (wasteType === 'average') wasteType = 'low';
  }

  const simulatedWaste = calculateWasteCarbon(wasteType);
  const simulatedTotal = simulatedHome + simulatedTransport + simulatedDiet + simulatedWaste;

  const totalSaved = Math.max(0, original.total - simulatedTotal);
  const percentReduction = original.total > 0 ? (totalSaved / original.total) * 100 : 0;

  return {
    original: {
      home: original.home,
      transport: original.transport,
      diet: original.diet,
      waste: original.waste,
      total: original.total
    },
    simulated: {
      home: Math.round(simulatedHome),
      transport: Math.round(simulatedTransport),
      diet: Math.round(simulatedDiet),
      waste: Math.round(simulatedWaste),
      total: Math.round(simulatedTotal)
    },
    savings: Math.round(totalSaved),
    percentage: Math.round(percentReduction)
  };
}
