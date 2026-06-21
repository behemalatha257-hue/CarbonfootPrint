import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()'
  });
  next();
});
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

function parseNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getSectorBreakdown(rawInput = {}) {
  return [
    { name: 'Home Energy', value: parseNumber(rawInput.home) },
    { name: 'Transportation', value: parseNumber(rawInput.transport) },
    { name: 'Diet & Food', value: parseNumber(rawInput.diet) },
    { name: 'Consumption & Waste', value: parseNumber(rawInput.waste) }
  ].sort((a, b) => b.value - a.value);
}

export function buildCoachAdvice(total, sectors) {
  const topSector = sectors[0];
  const secondSector = sectors[1];
  const topShare = total > 0 ? Math.round((topSector.value / total) * 100) : 0;
  const summary = total < 2000
    ? `🎉 Incredible Standing! Your footprint is ${total.toLocaleString()} kg CO₂e/yr, which is already within the global 1.5°C threshold (< 2,000 kg). You are leading by example!`
    : `Your annual footprint is ${total.toLocaleString()} kg CO₂e/yr. To meet global climate targets, aim to reduce this below 2,000 kg.`;

  const recommendations = [];
  if (topSector.name === 'Home Energy') {
    recommendations.push(
      'Deploy solar panels or switch to a green electricity tariff to reduce home emissions by up to 75%.',
      'Turn down your thermostat by 1°C during winter to reduce heating emissions by roughly 8%.',
      'Unplug standby devices and identify the biggest household energy drains.'
    );
  } else if (topSector.name === 'Transportation') {
    recommendations.push(
      'Replace one weekly car commute with public transit or active travel to reduce transport emissions.',
      'Upgrade to a hybrid or electric vehicle if you drive regularly to cut fuel emissions significantly.',
      'Reduce air travel where possible; even one fewer round trip saves hundreds of kilograms of CO₂e.'
    );
  } else if (topSector.name === 'Diet & Food') {
    recommendations.push(
      'Try Meatless Mondays or more plant-based meals to lower food-related emissions.',
      'Switch dairy to plant-based alternatives for breakfast and snacks.',
      'Choose local and seasonal foods to reduce food miles and packaging impact.'
    );
  } else {
    recommendations.push(
      'Avoid single-use packaging and replace disposables with reusable items.',
      'Start composting organic waste to keep methane out of landfills.',
      'Buy secondhand products instead of new ones to lower manufacturing emissions.'
    );
  }

  if (secondSector && secondSector.value > 1000) {
    recommendations.push(`Secondary target: review your ${secondSector.name.toLowerCase()} footprint, which currently adds ${secondSector.value.toLocaleString()} kg CO₂e per year.`);
  }

  return {
    headline: total < 2000 ? 'Incredible Standing!' : 'Personalized Reduction Plan',
    summary,
    topContributor: {
      name: topSector.name,
      value: topSector.value,
      share: topShare
    },
    recommendations
  };
}

export function buildEcoChallenge(total, sectors) {
  const topSector = sectors[0];
  const challenge = {
    title: 'Eco Step-Up Mission',
    summary: 'Build momentum with one high-impact action and a focused improvement path for the next 14 days.',
    target: '',
    duration: '2 weeks',
    extraTips: []
  };

  if (topSector.name === 'Home Energy') {
    challenge.title = 'Home Energy Reboot';
    challenge.target = 'Reduce home energy emissions by at least 10% over the next 14 days.';
    challenge.extraTips = [
      'Switch to LED lighting and unplug unused devices.',
      'Lower thermostat or raise cooling setpoint by 1°C.',
      'Map your appliance usage for one week and identify the top three energy drains.'
    ];
  } else if (topSector.name === 'Transportation') {
    challenge.title = 'Transit Commitment Sprint';
    challenge.target = 'Replace one weekly car commute with public transit, cycling, or walking.';
    challenge.extraTips = [
      'Plan three transit or active travel routes before the week starts.',
      'Challenge a friend to join you on a car-free day.',
      'Track every avoided kilometer and celebrate small wins.'
    ];
  } else if (topSector.name === 'Diet & Food') {
    challenge.title = 'Plant-Powered Week';
    challenge.target = 'Choose at least three plant-based meals in the next 7 days.';
    challenge.extraTips = [
      'Prepare a meatless lunch or dinner menu in advance.',
      'Swap dairy milk for plant-based alternatives at breakfast.',
      'Choose seasonal produce and skip processed packaged meals.'
    ];
  } else {
    challenge.title = 'Zero-Waste Challenge';
    challenge.target = 'Cut single-use packaging and compost all food waste for two weeks.';
    challenge.extraTips = [
      'Carry reusable bags, bottles, and containers.',
      'Sort waste into recycling, compost, and reuse piles.',
      'Buy one pre-loved item instead of new.'
    ];
  }

  return {
    challenge,
    roadmap: [
      { step: 'Audit Your Top Emission Area', detail: `Review your ${topSector.name.toLowerCase()} profile and set one measurable action.` },
      { step: 'Take One High-Impact Action', detail: challenge.target },
      { step: 'Log Progress and Celebrate', detail: 'Record your results and update your trend history weekly.' }
    ],
    topSector: topSector.name,
    projectedReduction: Math.round(total * 0.10)
  };
}

// 1. AI Eco-Coach Advice API
app.post('/api/eco-coach', (req, res) => {
  const total = parseNumber(req.body.total);
  if (total <= 0) {
    return res.status(400).json({ error: 'Incomplete or invalid carbon footprint inputs.' });
  }

  const sectors = getSectorBreakdown(req.body);
  res.json({
    highestSector: sectors[0].name,
    advice: buildCoachAdvice(total, sectors)
  });
});

// 1.5. Personalized Eco-Challenge Generator
app.post('/api/eco-challenge', (req, res) => {
  const total = parseNumber(req.body.total);
  if (total <= 0) {
    return res.status(400).json({ error: 'Incomplete or invalid carbon footprint inputs.' });
  }

  const sectors = getSectorBreakdown(req.body);
  res.json(buildEcoChallenge(total, sectors));
});

// 2. Regional Community Leaderboard API
app.get('/api/leaderboard', (req, res) => {
  const users = [
    { rank: 1, name: 'SolarEcoWarrior', level: 8, dailySaved: 4.8, annualTotal: 1750, avatar: '🟢' },
    { rank: 2, name: 'WindRider44', level: 6, dailySaved: 3.9, annualTotal: 2150, avatar: '🔵' },
    { rank: 3, name: 'PlantBasedPete', level: 5, dailySaved: 3.1, annualTotal: 2500, avatar: '🥗' },
    { rank: 4, name: 'CompostKing', level: 4, dailySaved: 2.7, annualTotal: 2950, avatar: '🍂' },
    { rank: 5, name: 'MinimalistMaya', level: 3, dailySaved: 2.1, annualTotal: 3400, avatar: '🎒' }
  ];
  res.json({ users });
});

// 3. Carbon Offsetting Marketplace API
app.get('/api/offsets', (req, res) => {
  const emissions = parseNumber(req.query.emissions);
  if (emissions < 0) {
    return res.status(400).json({ error: 'Emissions must be a non-negative number.' });
  }

  // A mature tree absorbs roughly 22 kg of CO2 per year
  const treesNeeded = Math.ceil(emissions / 22);
  const treeCost = treesNeeded * 5; // $5 per tree planted

  const projects = [
    {
      id: 'proj-reforest',
      name: 'Amazon Rainforest Reforestation',
      desc: 'Plant native saplings to restore degraded parts of Brazil\'s rainforest. Crucial for biodiversity and global oxygen.',
      unitMetric: 'trees planted',
      requiredQty: treesNeeded,
      costUsd: treeCost,
      partner: 'OneTreePlanted Org'
    },
    {
      id: 'proj-wind',
      name: 'Sahara Wind Turbine Array',
      desc: 'Displace fossil-fuel grids by funding clean wind turbine projects in North Africa.',
      unitMetric: 'tonnes CO₂ offset',
      requiredQty: Number((emissions / 1000).toFixed(2)),
      costUsd: Math.ceil((emissions / 1000) * 12), // $12 per tonne
      partner: 'Gold Standard Wind'
    },
    {
      id: 'proj-cookstove',
      name: 'Clean Cookstoves in East Africa',
      desc: 'Provide efficient wood-burning cookstoves to families in Kenya. Improves lung health and cuts fuel demand by 50%.',
      unitMetric: 'stoves funded',
      requiredQty: Math.max(1, Math.ceil(emissions / 1500)), // 1 stove offsets ~1.5 tonnes
      costUsd: Math.max(1, Math.ceil(emissions / 1500)) * 25, // $25 per stove
      partner: 'Clean Air Kenya'
    }
  ];

  res.json({
    emissions: emissions,
    treesNeeded: treesNeeded,
    projects: projects
  });
});

// API 404 handler for unknown backend routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

// Catch-all: serve index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unexpected server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`🚀 EcoStep Full-Stack Server running on http://localhost:${PORT}`);
  });
}
