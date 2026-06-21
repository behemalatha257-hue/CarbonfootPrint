import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 1. AI Eco-Coach Advice API
app.post('/api/eco-coach', (req, res) => {
  const { total, home, transport, diet, waste } = req.body;

  if (total === undefined || total === null) {
    return res.status(400).json({ error: 'Incomplete carbon footprint inputs.' });
  }

  // Find the highest contributor
  const sectors = [
    { name: 'Home Energy', value: Number(home || 0) },
    { name: 'Transportation', value: Number(transport || 0) },
    { name: 'Diet & Food', value: Number(diet || 0) },
    { name: 'Consumption & Waste', value: Number(waste || 0) }
  ];

  sectors.sort((a, b) => b.value - a.value);
  const topSector = sectors[0];

  let adviceHTML = `<h3>Eco-Coach Assessment</h3>`;
  
  if (total < 2000) {
    adviceHTML += `<p>🎉 <strong>Incredible Standing!</strong> Your footprint is <strong>${total.toLocaleString()} kg CO₂e/yr</strong>, which is already within the global 1.5°C threshold (< 2,000 kg). You are leading by example!</p>`;
  } else {
    adviceHTML += `<p>Your annual footprint is <strong>${total.toLocaleString()} kg CO₂e/yr</strong>. To meet global climate targets, aim to reduce this below 2,000 kg.</p>`;
  }

  const topShare = total > 0 ? Math.round((topSector.value / total) * 100) : 0;
  adviceHTML += `<p>🔍 <strong>Top Contributor:</strong> Your largest emission source is <strong>${topSector.name}</strong> at <strong>${topSector.value.toLocaleString()} kg CO₂e/yr</strong> (${topShare}% of total).</p>`;

  adviceHTML += `<h4>🎯 Personalized Action Recommendations:</h4><ul>`;

  // Specific advices based on the highest category
  if (topSector.name === 'Home Energy') {
    adviceHTML += `
      <li><strong>Deploy Solar Power:</strong> Switching to solar energy or a green electric tariff offset can reduce home emissions by up to 75%.</li>
      <li><strong>Smart Climate Control:</strong> Turning down your thermostat by just 1°C in winter reduces gas heating emissions by ~8%.</li>
      <li><strong>Eliminate Vampire Power:</strong> Unplugging idle power blocks and standby devices can shave off 10% of electricity use.</li>
    `;
  } else if (topSector.name === 'Transportation') {
    adviceHTML += `
      <li><strong>Switch to Transit:</strong> Shifting 40 km of weekly car commutes to bus or metro trains prevents up to 250 kg of CO₂ per year.</li>
      <li><strong>Upgrade to Electric:</strong> If you drive daily, upgrading to an electric vehicle reduces fuel emissions by over 75% on standard grids.</li>
      <li><strong>Minimize Aviation:</strong> Air travel is carbon-intensive. Reducing medium-haul flights by just 2 hours prevents 220 kg of carbon.</li>
    `;
  } else if (topSector.name === 'Diet & Food') {
    adviceHTML += `
      <li><strong>Adopt Meatless Mondays:</strong> Removing beef and pork from your diet for just 2 days a week cuts food emissions by ~450 kg/yr.</li>
      <li><strong>Shift to Vegan Breakfasts:</strong> Replacing dairy milk and eggs with plant alternatives reduces agricultural methane demand.</li>
      <li><strong>Eat Local & Seasonal:</strong> Sourcing foods grown within 150 km minimizes cargo transit emissions (food miles).</li>
    `;
  } else {
    adviceHTML += `
      <li><strong>Target Zero Waste:</strong> Avoiding single-use plastic containers and bringing bags prevents packaging production footprints.</li>
      <li><strong>Relaunch Kitchen Composting:</strong> Composting food scraps prevents them from generating methane in deep landfills.</li>
      <li><strong>Buy Secondhand:</strong> Buying clothing and electronics refurbished or pre-loved cuts manufacturing emissions by up to 80%.</li>
    `;
  }

  // General secondary advice
  const secondSector = sectors[1];
  if (secondSector && secondSector.value > 1000) {
    adviceHTML += `<li><strong>Secondary Target (${secondSector.name}):</strong> Since this accounts for ${secondSector.value.toLocaleString()} kg, consider auditing this category next to maximize savings.</li>`;
  }

  adviceHTML += `</ul>`;

  res.json({
    highestSector: topSector.name,
    advice: adviceHTML
  });
});

// 1.5. Personalized Eco-Challenge Generator
app.post('/api/eco-challenge', (req, res) => {
  const { total, home, transport, diet, waste } = req.body;
  if (total === undefined || total === null) {
    return res.status(400).json({ error: 'Incomplete carbon footprint inputs.' });
  }

  const sectors = [
    { name: 'Home Energy', value: Number(home || 0) },
    { name: 'Transportation', value: Number(transport || 0) },
    { name: 'Diet & Food', value: Number(diet || 0) },
    { name: 'Consumption & Waste', value: Number(waste || 0) }
  ];
  sectors.sort((a, b) => b.value - a.value);
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

  const roadmap = [
    { step: 'Audit Your Top Emission Area', detail: `Review your ${topSector.name.toLowerCase()} profile and set one measurable action.` },
    { step: 'Take One High-Impact Action', detail: challenge.target },
    { step: 'Log Progress and Celebrate', detail: 'Record your results and update your trend history weekly.' }
  ];

  res.json({
    challenge,
    roadmap,
    topSector: topSector.name,
    projectedReduction: Math.round(total * 0.10)
  });
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
  const emissions = Number(req.query.emissions || 0);

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

// Catch-all: serve index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`🚀 EcoStep Full-Stack Server running on http://localhost:${PORT}`);
  });
}
