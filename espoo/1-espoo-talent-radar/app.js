// Espoo TalentPulse AI — Hiring Radar, Event Strategist & Anti-Bluff Gatekeeper

const STORAGE_KEY_API = 'espoo_gemini_api_key';
const STORAGE_KEY_MODEL = 'espoo_gemini_model';
const STORAGE_KEY_EXPORT_EVENT = 'espoo_exported_event';

// Initial realistic Espoo knowledge-work employer dataset
const DEFAULT_EMPLOYERS = [
  {
    id: 'fortum',
    name: 'Fortum',
    district: 'Keilaniemi, Espoo',
    sector: 'Energy Transformation',
    openRoles: 26,
    seniorCount: 19,
    entryCount: 7,
    velocityPct: 38,
    atsSource: 'Workday Career Portal',
    hotSkills: ['Grid-Forming Inverters', 'Power Market Optimization', 'Python / MILP', 'BESS Telemetry'],
    sampleRoles: ['Senior Power Systems Modeling Lead', 'Energy Trading Quant', 'Grid Flexibility Thesis Worker'],
    summary: 'Rapid expansion in Nordic clean dispatch, battery storage optimization, and industrial decarbonization modeling.'
  },
  {
    id: 'neste',
    name: 'Neste',
    district: 'Keilaniemi, Espoo',
    sector: 'Energy Transformation',
    openRoles: 23,
    seniorCount: 15,
    entryCount: 8,
    velocityPct: 31,
    atsSource: 'Neste Careers API',
    hotSkills: ['Process Simulation (Aspen)', 'Green Hydrogen Electrolysis', 'Catalysis R&D', 'Supply Chain AI'],
    sampleRoles: ['Lead Process Simulation Engineer', 'Hydrogen Pilot Systems Specialist', 'Junior Chemical Process Analyst'],
    summary: 'Scaling renewable aviation fuel (SAF) refining algorithms and hydrogen-integrated production units.'
  },
  {
    id: 'iqm',
    name: 'IQM Quantum Computers',
    district: 'Otaniemi, Espoo',
    sector: 'Quantum & Space DeepTech',
    openRoles: 31,
    seniorCount: 24,
    entryCount: 7,
    velocityPct: 44,
    atsSource: 'Greenhouse ATS',
    hotSkills: ['Cryogenic RF Packaging', 'Quantum Error Correction', 'FPGA Pulse Control', 'C++ / Qiskit'],
    sampleRoles: ['Principal QPU Calibration Physicist', 'Senior Cryo-Electronics Engineer', 'Quantum Compiler Intern'],
    summary: 'Heavy international hiring for superconducting quantum processors and fault-tolerant control stacks.'
  },
  {
    id: 'iceye',
    name: 'ICEYE',
    district: 'Otaniemi, Espoo',
    sector: 'Quantum & Space DeepTech',
    openRoles: 25,
    seniorCount: 19,
    entryCount: 6,
    velocityPct: 29,
    atsSource: 'Lever ATS',
    hotSkills: ['SAR Signal Processing', 'Flight Software C++', 'Orbital Edge ML', 'X-Band Phased Arrays'],
    sampleRoles: ['Staff SAR Image Formation Engineer', 'Spacecraft Avionics Lead', 'Earth Observation ML Trainee'],
    summary: 'Expanding synthetic aperture radar satellite constellation analytics and autonomous orbital tasking.'
  },
  {
    id: 'nokia',
    name: 'Nokia',
    district: 'Karakaari, Espoo',
    sector: '6G & Embedded Systems',
    openRoles: 46,
    seniorCount: 31,
    entryCount: 15,
    velocityPct: 22,
    atsSource: 'Oracle Taleo Feed',
    hotSkills: ['6G RAN Physical Layer', 'Embedded Rust / C++', 'AI-Native Air Interface', 'Real-Time Linux'],
    sampleRoles: ['6G AI-RAN Principal Architect', 'Senior L1 DSP Software Engineer', '5G/6G Summer & Thesis Trainee'],
    summary: 'Building next-gen AI-native wireless architectures and ultra-low-latency base station silicon software.'
  },
  {
    id: 'qtgroup',
    name: 'Qt Group',
    district: 'Leppävaara / Keilaniemi, Espoo',
    sector: '6G & Embedded Systems',
    openRoles: 18,
    seniorCount: 12,
    entryCount: 6,
    velocityPct: 19,
    atsSource: 'Teamtailor ATS',
    hotSkills: ['C++20 / QML', 'GPU Shaders / Vulkan', 'Compiler Tooling', 'Safety-Critical Automotive HMI'],
    sampleRoles: ['Senior Rendering Engine Developer', 'Embedded Toolchain Architect', 'Junior QA Automation Engineer'],
    summary: 'Growing cross-platform embedded graphics framework engineering for EV cockpits and medical devices.'
  },
  {
    id: 'vtt',
    name: 'VTT Technical Research Centre',
    district: 'Otaniemi, Espoo',
    sector: 'Energy Transformation',
    openRoles: 20,
    seniorCount: 11,
    entryCount: 9,
    velocityPct: 27,
    atsSource: 'VTT Recruitment Portal',
    hotSkills: ['Cleanroom Microelectronics', 'Power-to-X Catalysis', 'SMR Nuclear Modeling', 'Photonics'],
    sampleRoles: ['Senior Scientist — Power-to-X', 'Silicon Photonics Research Lead', 'MSc Thesis Researcher — Electrolyzers'],
    summary: 'Strong thesis-to-scientist hiring pipeline bridging Aalto University research and Finnish deep-tech spinouts.'
  },
  {
    id: 'kone',
    name: 'Kone',
    district: 'Keilaniemi, Espoo',
    sector: 'Smart Urban & CleanTech AI',
    openRoles: 29,
    seniorCount: 18,
    entryCount: 11,
    velocityPct: 16,
    atsSource: 'Workday Career Portal',
    hotSkills: ['Predictive Maintenance IoT', 'People Flow Simulation', 'AWS Edge Telemetry', 'Regenerative Drives'],
    sampleRoles: ['Senior Edge AI Telemetry Architect', 'Urban Mobility Simulation Specialist', 'Cloud IoT Junior Developer'],
    summary: 'Digitizing high-rise people flow with low-energy regenerative elevator drives and real-time fault prediction.'
  }
];

const SAMPLE_APPLICANTS = [
  {
    id: 'cand-1',
    name: 'Dr. Mikko Väisänen',
    origin: 'Zurich, Switzerland (Relocating to Espoo)',
    claimedTitle: 'Senior Grid Control & Power Electronics Lead · 8 yrs',
    proofLinks: 'github.com/mvaisanen-grid · 4 IEEE PES Transactions papers',
    answer: 'For 45% wind + electrolyzer SSO (typically 12–35 Hz in weak Nordic buses), I first inspect the d-q frame impedance phase margin from PMU/EMT phasor streams and the virtual synchronous machine (VSM) droop gain K_q alongside the PLL bandwidth. Practically, detuning the PLL outer bandwidth below 8 Hz, adding an active damping notch filter on the inverter inner current loop, and coordinating electrolyzer rectifier DC-link ramp-rate limits resolves the negative damping region without tripping the stack.',
    presetEval: {
      caliberScore: 95,
      authenticityStatus: 'Verified High-Caliber Specialist',
      bluffRisk: 'Very Low (4%)',
      decision: 'Admitted — VIP Fast-Track',
      assignedRoom: 'CleanTech & Energy Lounge (Fortum & Neste)',
      bestEmployers: ['Fortum', 'VTT Technical Research Centre'],
      auditSummary: 'Demonstrates authentic EMT/PMU diagnostic fluency. Correctly links d-q impedance phase margin, PLL outer-loop bandwidth interaction, and electrolyzer rectifier DC-link dynamics—impossible to bluff with generic LLM buzzwords.',
      strengths: [
        'Concrete telemetry parameters cited (d-q impedance, PLL bandwidth < 8 Hz, PMU/EMT phasor streams)',
        'Direct mitigation linking inverter current-loop active damping and electrolyzer ramp-rate coordination',
        'Strong match for Fortum Grid Flexibility Lead & VTT Power-to-X roles'
      ],
      redFlags: []
    }
  },
  {
    id: 'cand-2',
    name: 'Alexey "AI-Visionary" Morozov',
    origin: 'Remote Global Applicant',
    claimedTitle: 'Chief Energy Transformation & Quantum AI Architect · 11 yrs',
    proofLinks: 'LinkedIn profile only (no GitHub, no patents, broken portfolio URL)',
    answer: 'We can leverage cutting-edge Generative AI and Blockchain synergy to seamlessly optimize the smart grid ecosystem in real time. By deploying scalable cloud microservices and deep neural networks on Kubernetes, the wind energy and hydrogen electrolyzers will automatically balance all oscillations with zero latency and 100% reliability.',
    presetEval: {
      caliberScore: 22,
      authenticityStatus: 'High Bluff / Buzzword Stuffing Detected',
      bluffRisk: 'Critical (91%)',
      decision: 'Rejected / Proof Requested',
      assignedRoom: 'None (Gatekeeper Blocked)',
      bestEmployers: [],
      auditSummary: 'Classic registration exaggeration. Claims 11 years as a "Chief Energy & Quantum AI Architect" yet fails to name a single physical quantity, electrical control loop, or telemetry signal. Relies on irrelevant buzzwords (Blockchain, Kubernetes, 100% reliability). Admitting this candidate would harm Espoo’s credibility with Fortum/Neste engineers.',
      strengths: [],
      redFlags: [
        'Zero domain physics or control telemetry mentioned (ignores PLL, impedance, frequency, or DC-link)',
        'Unverifiable claims ("Chief Quantum & Energy Architect") with missing technical portfolio',
        'Buzzword substitution ("Blockchain + GenAI microservices for zero-latency grid balance")'
      ]
    }
  },
  {
    id: 'cand-3',
    name: 'Sofia Lindqvist',
    origin: 'Stockholm, Sweden (KTH MSc Graduate)',
    claimedTitle: 'MSc Electrical Engineering & Energy Systems · Entry / Thesis',
    proofLinks: 'github.com/slindqvist-kth · MSc Thesis on Grid-Forming Droop Control in Simulink',
    answer: 'I would examine the bus voltage THD and active/reactive power oscillations at the electrolyzer PCC using FFT on high-rate (≥1 kHz) PQ recorder logs. In my thesis on Simulink EMT models, high proportional gain in the converter PLL under low SCR (<2.5) caused sub-synchronous resonance; lowering PLL bandwidth and enabling virtual impedance damping stabilized the PCC voltage.',
    presetEval: {
      caliberScore: 88,
      authenticityStatus: 'Authentic High-Potential Graduate',
      bluffRisk: 'Low (9%)',
      decision: 'Admitted — Entry & Thesis Track',
      assignedRoom: 'CleanTech & Energy Lounge (Fortum & Neste)',
      bestEmployers: ['Fortum', 'Neste', 'VTT Technical Research Centre'],
      auditSummary: 'Clear hands-on simulation experience matching entry/thesis openings. Honest about academic scope (Simulink EMT models) while accurately referencing SCR < 2.5, ≥1 kHz PQ recorder FFT logs, and virtual impedance damping.',
      strengths: [
        'Accurate understanding of weak-grid Short-Circuit Ratio (SCR < 2.5) sensitivity',
        'Practical measurement plan (≥1 kHz PQ recorder FFT at Point of Common Coupling)',
        'Ideal fit for Fortum / VTT Entry & MSc Graduate roles'
      ],
      redFlags: []
    }
  },
  {
    id: 'cand-4',
    name: 'Dr. Kenji Takahashi',
    origin: 'Munich, Germany',
    claimedTitle: 'Staff Cryogenic RF & Control Systems Engineer · 7 yrs',
    proofLinks: 'arXiv:2308.xxxxx · Cryo-CMOS mux readout contributor',
    answer: 'For power/electrolyzer SSO I am an RF/cryo systems specialist rather than high-voltage grid engineer, though conceptually I would inspect the closed-loop phase margin and Bode sensitivity peak between the inverter current regulator and the load input admittance—similar to avoiding negative-resistance oscillation in bias networks. (Applying primarily for IQM/ICEYE track).',
    presetEval: {
      caliberScore: 84,
      authenticityStatus: 'Verified Specialist (Cross-Track Redirect)',
      bluffRisk: 'Low (7%)',
      decision: 'Admitted — Redirected to Quantum/Space Track',
      assignedRoom: 'Quantum & SpaceTech Lab (IQM & ICEYE)',
      bestEmployers: ['IQM Quantum Computers', 'ICEYE'],
      auditSummary: 'Refreshing intellectual honesty: explicitly states domain boundary instead of bluffing, while accurately transferring Bode sensitivity / negative-resistance admittance principles. Strong fit for IQM Quantum or ICEYE RF roles.',
      strengths: [
        'Zero bluffing — transparently states domain boundary while applying control theory accurately',
        'Verified arXiv track record in Cryo-CMOS readout',
        'High-value match for Otaniemi DeepTech employers (IQM, ICEYE)'
      ],
      redFlags: []
    }
  }
];

const MICRO_CHALLENGES = [
  {
    tag: 'Energy Transformation Summit (Fortum · Neste · VTT)',
    text: 'In a Nordic grid with 45% wind penetration and low synchronous inertia, how would you diagnose and mitigate sub-synchronous oscillation between a grid-forming inverter park and an electrolyzer load? Mention one telemetry signal or control parameter you actually inspect.'
  },
  {
    tag: 'Otaniemi Quantum & Space DeepTech (IQM · ICEYE)',
    text: 'You observe unexpected 1/f phase noise degradation or thermal drift in a cryogenic RF readout / X-band phased array pipeline after scaling from 8 to 64 channels. Describe the first two physical measurements or calibration diagnostics you run to isolate crosstalk vs. thermal budget.'
  },
  {
    tag: '6G & Embedded Systems Hub (Nokia · Qt Group)',
    text: 'Your real-time embedded C++/Rust packet-processing loop on an ARM/RISC-V target misses its 250 µs P99 latency SLA only under bursty DMA traffic. Walk through two concrete profiling checks (memory, cache, IRQ affinity, or lock contention) you perform before rewriting code.'
  }
];

// Application State
let employers = JSON.parse(JSON.stringify(DEFAULT_EMPLOYERS));
let activeSector = 'All';
let activeSeniorityFilter = 'all';
let selectedCluster = 'Energy Transformation';
let currentEventBlueprint = null;
let currentChallengeIndex = 0;
let hiringChart = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initTabs();
  initApiConfigModal();
  initRadarControls();
  initEventArchitect();
  initGatekeeper();

  renderEmployers();
  renderHiringChart();
  generateDefaultEventBlueprint(selectedCluster);
  renderApplicantQueue();
  selectApplicant(SAMPLE_APPLICANTS[0]);
});

// ==================== TABS ====================

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach((p) => {
        if (p.id === targetId) p.classList.remove('hidden');
        else p.classList.add('hidden');
      });
      if (targetId === 'radar-tab' && hiringChart) {
        hiringChart.resize();
      }
    });
  });
}

// ==================== GEMINI API CLIENT & CONFIG ====================

function getApiKey() {
  return localStorage.getItem(STORAGE_KEY_API) || '';
}

function getSelectedModel() {
  return localStorage.getItem(STORAGE_KEY_MODEL) || 'gemini-2.5-flash';
}

function updateApiBadgeUI() {
  const key = getApiKey();
  const model = getSelectedModel();
  const badge = document.getElementById('ai-mode-badge');
  const dot = document.getElementById('api-status-dot');
  const label = document.getElementById('api-btn-label');

  if (key) {
    badge.textContent = `Live Gemini API (${model})`;
    badge.className = 'text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30';
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    label.textContent = `Gemini Connected`;
  } else {
    badge.textContent = 'Demo Intelligence Mode';
    badge.className = 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30';
    dot.className = 'w-2 h-2 rounded-full bg-amber-400';
    label.textContent = 'Configure Gemini API Key';
  }
}

function initApiConfigModal() {
  const modal = document.getElementById('api-modal');
  const openBtn = document.getElementById('open-api-modal-btn');
  const closeBtn = document.getElementById('close-api-modal-btn');
  const keyInput = document.getElementById('gemini-api-key-input');
  const modelSelect = document.getElementById('gemini-model-select');
  const saveBtn = document.getElementById('save-api-key-btn');
  const clearBtn = document.getElementById('clear-api-key-btn');
  const testBtn = document.getElementById('test-api-key-btn');
  const feedback = document.getElementById('api-test-feedback');

  keyInput.value = getApiKey();
  modelSelect.value = getSelectedModel();
  updateApiBadgeUI();

  openBtn.addEventListener('click', () => {
    keyInput.value = getApiKey();
    modelSelect.value = getSelectedModel();
    feedback.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn.addEventListener('click', () => {
    const val = keyInput.value.trim();
    const model = modelSelect.value;
    if (val) {
      localStorage.setItem(STORAGE_KEY_API, val);
    } else {
      localStorage.removeItem(STORAGE_KEY_API);
    }
    localStorage.setItem(STORAGE_KEY_MODEL, model);
    updateApiBadgeUI();
    closeModal();
    showToast(val ? `Gemini API enabled (${model})` : 'Switched to Demo Intelligence Mode');
  });

  clearBtn.addEventListener('click', () => {
    keyInput.value = '';
    localStorage.removeItem(STORAGE_KEY_API);
    updateApiBadgeUI();
    feedback.classList.add('hidden');
    showToast('API key cleared — using Demo Intelligence Mode');
  });

  testBtn.addEventListener('click', async () => {
    const val = keyInput.value.trim();
    const model = modelSelect.value;
    if (!val) {
      feedback.textContent = 'Please paste a Gemini API key first.';
      feedback.className = 'text-xs p-2.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-400/30';
      feedback.classList.remove('hidden');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    feedback.classList.add('hidden');

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(val)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with exactly: ESPOO_OK' }] }]
          })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Connected';
      feedback.textContent = `Success! ${model} responded: "${reply.trim()}"`;
      feedback.className = 'text-xs p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-400/30';
      feedback.classList.remove('hidden');
    } catch (err) {
      feedback.textContent = `Connection failed: ${err.message}`;
      feedback.className = 'text-xs p-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-400/30';
      feedback.classList.remove('hidden');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';
    }
  });
}

/**
 * Calls Google Gemini REST API with optional JSON schema.
 * Returns { usedLiveAI: boolean, data: object } or throws on network/API failure.
 */
async function callGeminiJSON(prompt, responseSchema) {
  const apiKey = getApiKey();
  const model = getSelectedModel();
  if (!apiKey) {
    return { usedLiveAI: false, data: null };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35,
      responseMimeType: 'application/json'
    }
  };
  if (responseSchema) {
    body.generationConfig.responseSchema = responseSchema;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Gemini API error (${response.status})`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return { usedLiveAI: true, data: JSON.parse(text) };
}

// ==================== TAB 1: ESPOO HIRING RADAR ====================

function initRadarControls() {
  document.querySelectorAll('.sector-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSector = btn.dataset.sector;
      document.querySelectorAll('.sector-chip').forEach((c) => {
        if (c.dataset.sector === activeSector) {
          c.className = 'sector-chip px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/40';
        } else {
          c.className = 'sector-chip px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-slate-500';
        }
      });
      renderEmployers();
    });
  });

  document.getElementById('seniority-filter').addEventListener('change', (e) => {
    activeSeniorityFilter = e.target.value;
    renderEmployers();
  });

  document.getElementById('load-sample-scan-btn').addEventListener('click', () => {
    document.getElementById('scan-company-name').value = 'Kempower / ReOrbit Espoo Lab';
    document.getElementById('scan-raw-input').value =
      'Careers Feed — Espoo / Otaniemi & Lahti Hub:\n' +
      '- Senior DC Fast-Charging Power Electronics Architect (5 openings)\n' +
      '- Staff Embedded Linux & OCPP Cloud Security Engineer (3 openings)\n' +
      '- Lead Thermal & Liquid-Cooled Cable Systems Engineer (2 openings)\n' +
      '- Master Thesis Researcher: Silicon Carbide (SiC) Inverter Efficiency (4 openings)\n' +
      '- Graduate Grid-Integration Software Developer (2 openings)';
  });

  document.getElementById('run-live-scan-btn').addEventListener('click', handleLiveEmployerScan);
}

async function handleLiveEmployerScan() {
  const companyInput = document.getElementById('scan-company-name').value.trim();
  const rawInput = document.getElementById('scan-raw-input').value.trim();
  const statusEl = document.getElementById('scan-status-msg');
  const btn = document.getElementById('run-live-scan-btn');

  if (!rawInput && !companyInput) {
    showToast('Enter a company name or paste a career page snippet first.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span>Analyzing Feed...</span>';
  statusEl.classList.remove('hidden');
  statusEl.textContent = getApiKey() ? 'Calling Gemini API to structure hiring signals...' : 'Parsing career text with built-in extractor...';

  try {
    const schema = {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        district: { type: 'STRING' },
        sector: {
          type: 'STRING',
          enum: ['Energy Transformation', 'Quantum & Space DeepTech', '6G & Embedded Systems', 'Smart Urban & CleanTech AI']
        },
        openRoles: { type: 'INTEGER' },
        seniorCount: { type: 'INTEGER' },
        entryCount: { type: 'INTEGER' },
        velocityPct: { type: 'INTEGER' },
        hotSkills: { type: 'ARRAY', items: { type: 'STRING' } },
        sampleRoles: { type: 'ARRAY', items: { type: 'STRING' } },
        summary: { type: 'STRING' }
      },
      required: ['name', 'district', 'sector', 'openRoles', 'seniorCount', 'entryCount', 'velocityPct', 'hotSkills', 'sampleRoles', 'summary']
    };

    const prompt = `You are a talent market analyst for the City of Espoo, Finland.
Extract structured hiring metrics for this Espoo knowledge-work employer from the snippet/URL below.
Company hint: "${companyInput || 'Unknown Espoo Company'}"
Career input:
"""
${rawInput || companyInput}
"""
Classify into one of the four sectors: "Energy Transformation", "Quantum & Space DeepTech", "6G & Embedded Systems", or "Smart Urban & CleanTech AI". Ensure openRoles = seniorCount + entryCount.`;

    let extracted = null;
    let sourceLabel = 'Built-in Extractor';

    if (getApiKey()) {
      const res = await callGeminiJSON(prompt, schema);
      if (res.usedLiveAI && res.data) {
        extracted = res.data;
        sourceLabel = 'Live Gemini API';
      }
    }

    if (!extracted) {
      extracted = heuristicExtractEmployer(companyInput, rawInput);
    }

    const newEmp = {
      id: 'custom-' + Date.now(),
      atsSource: `Scanned (${sourceLabel})`,
      ...extracted
    };

    employers.unshift(newEmp);
    renderEmployers();
    renderHiringChart();

    statusEl.textContent = `Added ${newEmp.name} (${newEmp.openRoles} open roles) via ${sourceLabel}!`;
    showToast(`${newEmp.name} added to Espoo Hiring Radar (${sourceLabel})`);
  } catch (err) {
    statusEl.textContent = `Scan error: ${err.message}. Falling back to heuristic scan.`;
    const fallback = heuristicExtractEmployer(companyInput, rawInput);
    employers.unshift({ id: 'custom-' + Date.now(), atsSource: 'Local Fallback', ...fallback });
    renderEmployers();
    renderHiringChart();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="zap" class="w-3.5 h-3.5"></i><span>Scan &amp; Add to Radar</span>';
    lucide.createIcons();
  }
}

function heuristicExtractEmployer(nameHint, text) {
  const combined = `${nameHint} ${text}`.toLowerCase();
  let sector = 'Smart Urban & CleanTech AI';
  if (/energy|battery|power|grid|hydrogen|solar|wind|charging|electroly/.test(combined)) {
    sector = 'Energy Transformation';
  } else if (/quantum|cryo|qubit|space|satellite|orbital|sar|radar/.test(combined)) {
    sector = 'Quantum & Space DeepTech';
  } else if (/6g|5g|embedded|rust|c\+\+|firmware|rtos|ran|linux|compiler/.test(combined)) {
    sector = '6G & Embedded Systems';
  }

  // Count numeric mentions or lines
  const seniorMatches = (combined.match(/\b(senior|staff|principal|lead|architect)\b/g) || []).length;
  const entryMatches = (combined.match(/\b(junior|entry|graduate|thesis|intern|trainee)\b/g) || []).length;
  const numbers = (text.match(/\b\d{1,2}\b/g) || []).map(Number).filter((n) => n > 0 && n < 40);
  const totalRoles = numbers.length ? Math.min(60, numbers.reduce((a, b) => a + b, 0)) : Math.max(8, (seniorMatches + entryMatches) * 3 || 14);
  const seniorRatio = seniorMatches + entryMatches > 0 ? seniorMatches / (seniorMatches + entryMatches) : 0.65;
  const seniorCount = Math.max(1, Math.round(totalRoles * seniorRatio));
  const entryCount = Math.max(0, totalRoles - seniorCount);

  return {
    name: nameHint || 'Espoo DeepTech Innovator',
    district: 'Otaniemi / Keilaniemi, Espoo',
    sector,
    openRoles: seniorCount + entryCount,
    seniorCount,
    entryCount,
    velocityPct: 26,
    hotSkills: ['Domain R&D', 'Systems Engineering', 'Cloud & Edge AI', 'Simulation'],
    sampleRoles: [
      `Senior ${sector.split(' ')[0]} Systems Lead`,
      'Principal R&D Engineer',
      'MSc Thesis / Graduate Engineer'
    ],
    summary: `Extracted from pasted career feed showing demand across ${sector} knowledge roles in Espoo.`
  };
}

function renderEmployers() {
  const container = document.getElementById('employer-grid');
  const filtered = employers.filter((emp) => {
    if (activeSector !== 'All' && emp.sector !== activeSector) return false;
    const seniorPct = emp.openRoles ? (emp.seniorCount / emp.openRoles) * 100 : 0;
    const entryPct = emp.openRoles ? (emp.entryCount / emp.openRoles) * 100 : 0;
    if (activeSeniorityFilter === 'senior-heavy' && seniorPct < 60) return false;
    if (activeSeniorityFilter === 'entry-heavy' && entryPct < 35) return false;
    return true;
  });

  // Update KPIs
  const totalRoles = employers.reduce((acc, e) => acc + e.openRoles, 0);
  const totalSenior = employers.reduce((acc, e) => acc + e.seniorCount, 0);
  const totalEntry = employers.reduce((acc, e) => acc + e.entryCount, 0);
  const seniorPctTotal = totalRoles ? Math.round((totalSenior / totalRoles) * 100) : 0;
  const entryPctTotal = 100 - seniorPctTotal;

  document.getElementById('kpi-employers').textContent = employers.length;
  document.getElementById('tab-employer-count').textContent = employers.length;
  document.getElementById('kpi-open-roles').textContent = totalRoles;
  document.getElementById('kpi-seniority-split').textContent = `${seniorPctTotal}% / ${entryPctTotal}%`;

  // Top cluster by roles
  const clusterTotals = {};
  employers.forEach((e) => {
    clusterTotals[e.sector] = (clusterTotals[e.sector] || 0) + e.openRoles;
  });
  const topCluster = Object.entries(clusterTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Energy Transformation';
  document.getElementById('kpi-top-cluster').textContent = topCluster;

  if (!filtered.length) {
    container.innerHTML = `<div class="col-span-full glass-card rounded-2xl p-8 text-center text-sm text-slate-400">No employers match these filters. Try broadening the sector or seniority filter.</div>`;
    return;
  }

  container.innerHTML = filtered
    .map((emp) => {
      const seniorPct = emp.openRoles ? Math.round((emp.seniorCount / emp.openRoles) * 100) : 50;
      const entryPct = 100 - seniorPct;
      return `
        <article class="glass-card glass-card-hover rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="text-[11px] font-semibold uppercase tracking-wide text-sky-400">${escapeHtml(emp.sector)}</span>
                <h3 class="text-base font-bold text-white leading-snug">${escapeHtml(emp.name)}</h3>
                <p class="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i>
                  ${escapeHtml(emp.district)}
                </p>
              </div>
              <div class="text-right shrink-0">
                <div class="text-xl font-extrabold text-white">${emp.openRoles}</div>
                <div class="text-[11px] font-semibold text-emerald-400">+${emp.velocityPct}% surge</div>
              </div>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(emp.summary)}</p>

            <!-- Senior vs Entry bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Senior/Lead: <strong class="text-indigo-300">${emp.seniorCount} (${seniorPct}%)</strong></span>
                <span>Entry/Thesis: <strong class="text-cyan-300">${emp.entryCount} (${entryPct}%)</strong></span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div style="width:${seniorPct}%" class="bg-indigo-500"></div>
                <div style="width:${entryPct}%" class="bg-cyan-400"></div>
              </div>
            </div>

            <!-- Skills -->
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${emp.hotSkills
                .slice(0, 4)
                .map((s) => `<span class="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/70">${escapeHtml(s)}</span>`)
                .join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span class="text-[10px] text-slate-500 truncate">${escapeHtml(emp.atsSource)}</span>
            <button onclick="jumpToEventCluster('${escapeHtml(emp.sector)}')" class="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 shrink-0">
              <span>Design Event</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  lucide.createIcons();
}

function jumpToEventCluster(sector) {
  selectedCluster = sector;
  document.querySelectorAll('.cluster-preset-btn').forEach((b) => {
    if (b.dataset.cluster === sector) {
      b.className = 'cluster-preset-btn w-full text-left p-3 rounded-xl border border-sky-400/50 bg-sky-500/15 transition';
    } else {
      b.className = 'cluster-preset-btn w-full text-left p-3 rounded-xl border border-slate-700/80 bg-slate-900/70 hover:border-slate-500 transition';
    }
  });
  document.querySelector('[data-tab="event-generator-tab"]').click();
  generateDefaultEventBlueprint(sector);
}

function renderHiringChart() {
  const ctx = document.getElementById('hiring-velocity-chart');
  if (!ctx) return;

  const sectors = [
    'Energy Transformation',
    'Quantum & Space DeepTech',
    '6G & Embedded Systems',
    'Smart Urban & CleanTech AI'
  ];

  const seniorData = sectors.map((sec) =>
    employers.filter((e) => e.sector === sec).reduce((acc, e) => acc + e.seniorCount, 0)
  );
  const entryData = sectors.map((sec) =>
    employers.filter((e) => e.sector === sec).reduce((acc, e) => acc + e.entryCount, 0)
  );

  if (hiringChart) {
    hiringChart.destroy();
  }

  hiringChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['⚡ Energy Transformation', '⚛️ Quantum & Space', '📡 6G & Embedded', '🏙️ Smart Urban AI'],
      datasets: [
        {
          label: 'Senior / Principal Roles (Global Outreach)',
          data: seniorData,
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          borderRadius: 6
        },
        {
          label: 'Entry / Thesis Roles (University Outreach)',
          data: entryData,
          backgroundColor: 'rgba(34, 211, 238, 0.85)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#cbd5e1', font: { size: 11 } }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { display: false }
        },
        y: {
          stacked: true,
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(148, 163, 184, 0.12)' }
        }
      }
    }
  });
}

// ==================== TAB 2: AI EVENT & GLOBAL OUTREACH ARCHITECT ====================

function initEventArchitect() {
  document.querySelectorAll('.cluster-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCluster = btn.dataset.cluster;
      document.querySelectorAll('.cluster-preset-btn').forEach((b) => {
        if (b === btn) {
          b.className = 'cluster-preset-btn w-full text-left p-3 rounded-xl border border-sky-400/50 bg-sky-500/15 transition';
        } else {
          b.className = 'cluster-preset-btn w-full text-left p-3 rounded-xl border border-slate-700/80 bg-slate-900/70 hover:border-slate-500 transition';
        }
      });
    });
  });

  document.getElementById('generate-event-btn').addEventListener('click', generateEventWithAI);
}

async function generateEventWithAI() {
  const btn = document.getElementById('generate-event-btn');
  const seniorityMode = document.getElementById('event-seniority-mode').value;
  const customNote = document.getElementById('event-custom-note').value.trim();

  const clusterEmployers = employers.filter((e) => e.sector === selectedCluster);
  const totalOpen = clusterEmployers.reduce((a, b) => a + b.openRoles, 0);
  const totalSenior = clusterEmployers.reduce((a, b) => a + b.seniorCount, 0);
  const totalEntry = clusterEmployers.reduce((a, b) => a + b.entryCount, 0);

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span>Architecting Event &amp; Channels...</span>';

  try {
    if (getApiKey()) {
      const schema = {
        type: 'OBJECT',
        properties: {
          eventTitle: { type: 'STRING' },
          tagline: { type: 'STRING' },
          keynoteTopic: { type: 'STRING' },
          speakerArchetype: { type: 'STRING' },
          whyTopTalentAttends: { type: 'STRING' },
          agenda: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                time: { type: 'STRING' },
                title: { type: 'STRING' },
                room: { type: 'STRING' }
              }
            }
          },
          entryOutreach: {
            type: 'OBJECT',
            properties: {
              applicable: { type: 'BOOLEAN' },
              targetUniversities: { type: 'ARRAY', items: { type: 'STRING' } },
              degreePrograms: { type: 'ARRAY', items: { type: 'STRING' } },
              tactics: { type: 'ARRAY', items: { type: 'STRING' } }
            }
          },
          seniorOutreach: {
            type: 'OBJECT',
            properties: {
              targetCommunities: { type: 'ARRAY', items: { type: 'STRING' } },
              globalHubs: { type: 'ARRAY', items: { type: 'STRING' } },
              tactics: { type: 'ARRAY', items: { type: 'STRING' } }
            }
          },
          antiBluffQuestion: { type: 'STRING' },
          venuePreset: { type: 'STRING', enum: ['energy', 'quantum', 'roundtable'] }
        },
        required: [
          'eventTitle',
          'tagline',
          'keynoteTopic',
          'speakerArchetype',
          'whyTopTalentAttends',
          'agenda',
          'entryOutreach',
          'seniorOutreach',
          'antiBluffQuestion',
          'venuePreset'
        ]
      };

      const prompt = `You are designing a strategic online/hybrid talent attraction event for the City of Espoo, Finland.
Hiring Cluster: ${selectedCluster}
Employers hiring in Espoo: ${clusterEmployers.map((e) => `${e.name} (${e.openRoles} roles: ${e.seniorCount} senior, ${e.entryCount} entry; skills: ${e.hotSkills.join(', ')})`).join(' | ')}
Totals: ${totalOpen} open roles (${totalSenior} senior, ${totalEntry} entry).
Seniority strategy requested: ${seniorityMode}.
Extra organizer note: ${customNote || 'None'}.

Design a flagship technical keynote + 3D spatial networking event that attracts genuinely high-caliber specialists (NOT a generic career fair).
Provide:
1. A compelling technical keynote topic & speaker archetype.
2. Specific Finnish & European universities/programs for Entry/Thesis talent if entry roles exist.
3. Specific global specialist channels (IEEE/ACM working groups, GitHub repos, arXiv domains, niche conferences) for Senior roles.
4. A 3-minute anti-bluff scenario question to vet registrants.`;

      const res = await callGeminiJSON(prompt, schema);
      if (res.usedLiveAI && res.data) {
        currentEventBlueprint = {
          ...res.data,
          cluster: selectedCluster,
          employers: clusterEmployers.map((e) => e.name),
          totalOpen,
          totalSenior,
          totalEntry,
          source: `Live Gemini API (${getSelectedModel()})`
        };
        renderEventBlueprint(currentEventBlueprint);
        showToast('Generated bespoke Event & Outreach Blueprint via Gemini!');
        return;
      }
    }

    generateDefaultEventBlueprint(selectedCluster, seniorityMode, customNote);
    showToast('Event Blueprint updated (Demo Intelligence Mode)');
  } catch (err) {
    showToast(`Gemini error: ${err.message} — using built-in blueprint`);
    generateDefaultEventBlueprint(selectedCluster, seniorityMode, customNote);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i><span>Generate Event &amp; Outreach Blueprint</span>';
    lucide.createIcons();
  }
}

function generateDefaultEventBlueprint(cluster, seniorityMode = 'auto', customNote = '') {
  const clusterEmployers = employers.filter((e) => e.sector === cluster);
  const totalOpen = clusterEmployers.reduce((a, b) => a + b.openRoles, 0);
  const totalSenior = clusterEmployers.reduce((a, b) => a + b.seniorCount, 0);
  const totalEntry = clusterEmployers.reduce((a, b) => a + b.entryCount, 0);

  const templates = {
    'Energy Transformation': {
      eventTitle: 'Espoo Grid-Forming & Green Hydrogen Engineering Symposium',
      tagline: 'Live technical briefing on Nordic sector coupling, BESS market dispatch & Power-to-X breakthroughs',
      keynoteTopic: 'Sub-Second Nordic Grid Stability: Co-Simulating 500 MW Electrolyzers with Grid-Forming Inverters',
      speakerArchetype: 'Chief Grid Architect (Fortum) + Principal Power-to-X Scientist (VTT) + Neste SAF Lead',
      whyTopTalentAttends: 'Senior engineers attend for peer-level war stories on real megawatt-scale stability bottlenecks, not HR pitches — plus direct VIP room access to Keilaniemi hiring engineering leads.',
      agenda: [
        { time: '17:00 EET', title: 'Zoom Keynote Stage: Real-Time Nordic Grid & Hydrogen Co-Optimization', room: 'Main Auditorium' },
        { time: '17:45 EET', title: 'Spatial Breakout: Fortum & Neste Live Architecture Critiques', room: 'CleanTech & Energy Lounge' },
        { time: '18:25 EET', title: '1-on-1 Pre-Vetted Candidate Speed Conversations & Thesis Clinics', room: 'VIP Interview Pods' }
      ],
      entryOutreach: {
        applicable: seniorityMode !== 'senior',
        targetUniversities: ['Aalto University (School of Electrical Engineering & CHEM)', 'LUT University (Energy Systems)', 'Tampere University', 'KTH Stockholm & TU Delft'],
        degreePrograms: ['MSc Advanced Energy Solutions', 'MSc Hydrogen & Process Engineering', 'Power Electronics & Control Systems'],
        tactics: [
          'Co-host 10-minute Thesis Topic Teasers with Aalto Sähkökilta & Kemistikilta guilds',
          'Offer priority MSc Thesis interview slots in the 3D VTT/Neste rooms for top challenge scorers'
        ]
      },
      seniorOutreach: {
        targetCommunities: ['IEEE Power & Energy Society (PES) & CIGRE Working Group B4', 'PyPSA / PandaPower open-source contributors on GitHub', 'Aspen / Modelica industrial simulation forums'],
        globalHubs: ['Zurich / Baden (ETH Power Systems)', 'Munich & Aachen (RWTH)', 'Glasgow & Delft offshore wind/grid clusters'],
        tactics: [
          'Invite cited authors from IEEE Transactions on Power Systems as VIP panel respondents',
          'Run targeted GitHub + arXiv author invitations highlighting Finland relocation & Keilaniemi R&D autonomy'
        ]
      },
      antiBluffQuestion: MICRO_CHALLENGES[0].text,
      venuePreset: 'energy'
    },
    'Quantum & Space DeepTech': {
      eventTitle: 'Otaniemi Cryo-QPU & Orbital SAR DeepTech Colloquium',
      tagline: 'Inside Europe’s densest Quantum & NewSpace cluster — from millikelvin packaging to X-band constellations',
      keynoteTopic: 'Scaling Fault-Tolerant Superconducting QPUs & Autonomous On-Board SAR Processing',
      speakerArchetype: 'QPU Calibration Lead (IQM) + Staff Flight Systems Architect (ICEYE)',
      whyTopTalentAttends: 'Rare behind-the-scenes hardware telemetry sharing from Otaniemi cleanrooms and satellite mission ops, with vetted 1-on-1 engineering discussions.',
      agenda: [
        { time: '17:00 EET', title: 'Zoom Keynote: Breaking the 100-Qubit Cryo Wiring & Orbital Edge Bottleneck', room: 'Main Auditorium' },
        { time: '17:45 EET', title: 'Spatial Room Deep-Dive: Cryo-CMOS & SAR Signal Processing Live Q&A', room: 'Quantum & SpaceTech Lab' },
        { time: '18:30 EET', title: 'Invitation-Only Principal Architect Discussions', room: 'VIP Interview Pods' }
      ],
      entryOutreach: {
        applicable: seniorityMode !== 'senior',
        targetUniversities: ['Aalto University (Quantum Technology & Engineering Physics)', 'University of Helsinki (Physics)', 'ETH Zurich & TU Munich'],
        degreePrograms: ['BSc/MSc Quantum Technology', 'Space Science & Technology (SpaceMaster)', 'RF & Microwave Engineering'],
        tactics: [
          'Target Aalto Quantum Science & Technology (QST) student cohorts and Fyysikkokilta',
          'Open a dedicated MSc Thesis & Summer Cryo-Lab room in the 3D venue'
        ]
      },
      seniorOutreach: {
        targetCommunities: ['APS March Meeting & IEEE Applied Superconductivity presenters', 'Qiskit / Cirq / Mitiq core open-source contributors', 'IGARSS & SmallSat Conference RF/SAR authors'],
        globalHubs: ['Munich / Garching Quantum Valley', 'Delft (QuTech)', 'Boulder / Pasadena / Montreal'],
        tactics: [
          'Personalized invites to recent arXiv quant-ph and IEEE TGRS authors with Espoo deep-tech visa fast-track briefing',
          'Gate VIP Lab Room access behind technical challenge verification (>80% caliber score)'
        ]
      },
      antiBluffQuestion: MICRO_CHALLENGES[1].text,
      venuePreset: 'quantum'
    },
    '6G & Embedded Systems': {
      eventTitle: 'Espoo 6G AI-RAN & Ultra-Low-Latency Embedded Summit',
      tagline: 'Deterministic Rust/C++, GPU-accelerated embedded HMIs & AI-native wireless physical layers',
      keynoteTopic: 'Deterministic Sub-Millisecond Pipelines: Embedded Rust, Vulkan Shaders & 6G L1 Acceleration',
      speakerArchetype: '6G RAN Chief Architect (Nokia) + Qt Graphics Toolchain Lead',
      whyTopTalentAttends: 'Pure systems engineering depth — kernel profiling, zero-copy DMA, and AI-native air-interface benchmarks.',
      agenda: [
        { time: '17:00 EET', title: 'Zoom Keynote: Hardware-Software Co-Design for 6G & Automotive Cockpits', room: 'Main Auditorium' },
        { time: '17:45 EET', title: 'Spatial Engineering Hub: Live Profiling & Compiler Teardown', room: '6G & AI Engineering Hub' },
        { time: '18:20 EET', title: 'Direct Hiring Manager Pods (Karakaari & Leppävaara Teams)', room: 'VIP Interview Pods' }
      ],
      entryOutreach: {
        applicable: seniorityMode !== 'senior',
        targetUniversities: ['Aalto University (ELEC & SCI)', 'University of Oulu (6G Flagship)', 'Tampere University', 'KTH & DTU'],
        degreePrograms: ['Communications & Data Science', 'Embedded & Real-Time Systems', 'Computer Graphics & Compilers'],
        tactics: [
          'Distribute a 15-minute C++/Rust latency challenge across Finnish CS/EE guilds & Junction alumni',
          'Match high-scoring graduates directly to Nokia summer/thesis tracks'
        ]
      },
      seniorOutreach: {
        targetCommunities: ['Rust Embedded Working Group & LLVM contributors', '3GPP RAN1/RAN2 delegates & IEEE ComSoc', 'Linux Plumbers / Real-Time Kernel mailing lists'],
        globalHubs: ['Stockholm / Lund', 'Munich / Dresden', 'Bristol / Cambridge', 'Bengaluru / Taipei'],
        tactics: [
          'Run open-source benchmark challenge shared via Rust Embedded & LLVM Discord/GitHub',
          'Highlight Espoo’s family-friendly Nordic lifestyle + English-first R&D culture'
        ]
      },
      antiBluffQuestion: MICRO_CHALLENGES[2].text,
      venuePreset: 'roundtable'
    },
    'Smart Urban & CleanTech AI': {
      eventTitle: 'Espoo Smart Urban Flow & Edge Telemetry AI Forum',
      tagline: 'Where physical infrastructure meets predictive Edge AI, digital twins, and sustainable buildings',
      keynoteTopic: 'Orchestrating 2 Million Connected Elevators & Urban Digital Twins with Sub-Watt Edge AI',
      speakerArchetype: 'Edge Telemetry Architect (Kone) + Smart City Systems Lead (VTT)',
      whyTopTalentAttends: 'Unique look at massive real-world physical IoT fleets, failure-prediction telemetry, and Nordic sustainable city design.',
      agenda: [
        { time: '17:00 EET', title: 'Zoom Keynote: Fleet-Scale Predictive Maintenance & Urban Simulation', room: 'Main Auditorium' },
        { time: '17:40 EET', title: 'Spatial Lounge: Kone Edge AI & VTT Microelectronics Demos', room: '6G & AI Engineering Hub' },
        { time: '18:20 EET', title: 'Matched Talent Meet-and-Greet Pods', room: 'VIP Interview Pods' }
      ],
      entryOutreach: {
        applicable: seniorityMode !== 'senior',
        targetUniversities: ['Aalto University (Data Science & Machine Learning)', 'Metropolia & Haaga-Helia', 'University of Helsinki'],
        degreePrograms: ['Urban Mobility & Spatial Computing', 'Machine Learning & IoT Systems'],
        tactics: [
          'Partner with Aalto Data Guild & Junction hackathon communities for predictive telemetry mini-tracks'
        ]
      },
      seniorOutreach: {
        targetCommunities: ['KubeEdge / AWS IoT Greengrass / TinyML communities', 'INFORMS & Urban Simulation researchers'],
        globalHubs: ['Nordics & Baltics', 'Netherlands / Germany', 'Singapore smart-urban hubs'],
        tactics: [
          'Invite senior distributed-systems & IoT ML engineers via TinyML and Edge AI community newsletters'
        ]
      },
      antiBluffQuestion: MICRO_CHALLENGES[2].text,
      venuePreset: 'roundtable'
    }
  };

  const base = templates[cluster] || templates['Energy Transformation'];
  currentEventBlueprint = {
    ...base,
    tagline: customNote ? `${base.tagline} · Focus: ${customNote}` : base.tagline,
    cluster,
    employers: clusterEmployers.map((e) => e.name),
    totalOpen,
    totalSenior,
    totalEntry,
    source: 'Built-in Demo Intelligence'
  };

  renderEventBlueprint(currentEventBlueprint);
}

function renderEventBlueprint(bp) {
  const container = document.getElementById('event-blueprint-container');
  const entryBadge = bp.entryOutreach.applicable
    ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold">${bp.totalEntry} Entry/Thesis Roles Detected</span>`
    : `<span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">Senior-Only Focus</span>`;

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
      <div class="space-y-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">${escapeHtml(bp.cluster)}</span>
          <span class="text-xs text-slate-400">Source: <strong class="text-slate-200">${escapeHtml(bp.source)}</strong></span>
        </div>
        <h3 class="text-xl sm:text-2xl font-extrabold text-white">${escapeHtml(bp.eventTitle)}</h3>
        <p class="text-sm text-slate-300">${escapeHtml(bp.tagline)}</p>
        <p class="text-xs text-slate-400 pt-1">Co-hosting Espoo Employers: <strong class="text-white">${escapeHtml(bp.employers.join(', ') || 'City of Espoo Cluster')}</strong> (${bp.totalOpen} open roles)</p>
      </div>

      <div class="flex flex-col gap-2 shrink-0">
        <button onclick="exportEventTo3DVenue()" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition">
          <i data-lucide="box" class="w-4 h-4"></i>
          <span>Launch in 3D Virtual Venue</span>
        </button>
        <button onclick="pushQuestionToGatekeeper()" class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition">
          <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
          <span>Use Gatekeeper Question</span>
        </button>
      </div>
    </div>

    <!-- Keynote & Value Proposition -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div class="text-xs font-bold uppercase tracking-wider text-sky-400">Keynote Session Architecture</div>
        <div class="text-sm font-bold text-white">${escapeHtml(bp.keynoteTopic)}</div>
        <div class="text-xs text-slate-300"><strong>Speaker Archetype:</strong> ${escapeHtml(bp.speakerArchetype)}</div>
        <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(bp.whyTopTalentAttends)}</p>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div class="text-xs font-bold uppercase tracking-wider text-indigo-400">3D Spatial Venue Flow</div>
        <div class="space-y-2">
          ${bp.agenda
            .map(
              (item) => `
            <div class="flex items-start justify-between gap-2 text-xs border-b border-slate-800/80 pb-1.5 last:border-0 last:pb-0">
              <div>
                <span class="font-bold text-sky-300">${escapeHtml(item.time)}</span>
                <span class="text-slate-200 ml-1.5">${escapeHtml(item.title)}</span>
              </div>
              <span class="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">${escapeHtml(item.room)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>

    <!-- Dual-Track Outreach Strategy -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Entry / University Track -->
      <div class="p-4 rounded-xl bg-cyan-950/25 border border-cyan-500/25 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-sm font-bold text-white flex items-center gap-1.5">
            <i data-lucide="graduation-cap" class="w-4 h-4 text-cyan-400"></i>
            Entry &amp; Thesis Outreach
          </h4>
          ${entryBadge}
        </div>
        <div>
          <div class="text-[11px] font-semibold text-cyan-300 uppercase">Target Universities &amp; Labs</div>
          <ul class="mt-1 space-y-1 text-xs text-slate-200 list-disc list-inside">
            ${bp.entryOutreach.targetUniversities.map((u) => `<li>${escapeHtml(u)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <div class="text-[11px] font-semibold text-cyan-300 uppercase">Matching Degree Programmes</div>
          <div class="flex flex-wrap gap-1.5 mt-1">
            ${bp.entryOutreach.degreePrograms.map((d) => `<span class="text-[11px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200">${escapeHtml(d)}</span>`).join('')}
          </div>
        </div>
        <div>
          <div class="text-[11px] font-semibold text-cyan-300 uppercase">Execution Tactics</div>
          <ul class="mt-1 space-y-1 text-xs text-slate-300">
            ${bp.entryOutreach.tactics.map((t) => `<li>• ${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Senior / Global Specialist Track -->
      <div class="p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/25 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-sm font-bold text-white flex items-center gap-1.5">
            <i data-lucide="globe" class="w-4 h-4 text-indigo-400"></i>
            Senior Global Specialist Outreach
          </h4>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 font-semibold">${bp.totalSenior} Senior Roles</span>
        </div>
        <div>
          <div class="text-[11px] font-semibold text-indigo-300 uppercase">High-Signal Specialist Channels</div>
          <ul class="mt-1 space-y-1 text-xs text-slate-200 list-disc list-inside">
            ${bp.seniorOutreach.targetCommunities.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <div class="text-[11px] font-semibold text-indigo-300 uppercase">Global Talent Hubs to Target</div>
          <div class="flex flex-wrap gap-1.5 mt-1">
            ${bp.seniorOutreach.globalHubs.map((g) => `<span class="text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-200">${escapeHtml(g)}</span>`).join('')}
          </div>
        </div>
        <div>
          <div class="text-[11px] font-semibold text-indigo-300 uppercase">Conversion Tactics</div>
          <ul class="mt-1 space-y-1 text-xs text-slate-300">
            ${bp.seniorOutreach.tactics.map((t) => `<li>• ${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <!-- Auto-Generated Registration Anti-Bluff Hook -->
    <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Auto-Generated Registration Micro-Challenge</div>
        <p class="text-xs text-slate-200 mt-1">${escapeHtml(bp.antiBluffQuestion)}</p>
      </div>
    </div>
  `;

  lucide.createIcons();
}

function pushQuestionToGatekeeper() {
  if (!currentEventBlueprint) return;
  document.getElementById('challenge-event-tag').textContent = currentEventBlueprint.eventTitle;
  document.getElementById('active-micro-challenge-text').textContent = `"${currentEventBlueprint.antiBluffQuestion}"`;
  document.querySelector('[data-tab="applicant-vetting-tab"]').click();
  showToast('Micro-challenge pushed to Anti-Bluff Gatekeeper!');
}

function exportEventTo3DVenue() {
  if (!currentEventBlueprint) return;
  const payload = {
    eventTitle: currentEventBlueprint.eventTitle,
    keynoteTopic: currentEventBlueprint.keynoteTopic,
    speakerArchetype: currentEventBlueprint.speakerArchetype,
    employers: currentEventBlueprint.employers,
    preset: currentEventBlueprint.venuePreset || 'energy',
    exportedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_EXPORT_EVENT, JSON.stringify(payload));
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const targetUrl = `../2-espoo-virtual-venue/index.html#event=${encoded}`;
  window.open(targetUrl, '_blank', 'noopener');
  showToast('Exported blueprint & opened 3D Virtual Venue!');
}

// ==================== TAB 3: ANTI-BLUFF APPLICANT GATEKEEPER ====================

function initGatekeeper() {
  document.getElementById('generate-challenge-btn').addEventListener('click', async () => {
    const btn = document.getElementById('generate-challenge-btn');
    if (getApiKey()) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span><span>Generating...</span>';
      try {
        const schema = {
          type: 'OBJECT',
          properties: {
            tag: { type: 'STRING' },
            question: { type: 'STRING' }
          },
          required: ['tag', 'question']
        };
        const res = await callGeminiJSON(
          `Create a single 3-minute anti-bluff technical screening question for registrants of an Espoo knowledge-work event in "${selectedCluster}". It must require naming a concrete physical metric, protocol, tool, or failure mode so LLM buzzwords fail.`,
          schema
        );
        if (res.usedLiveAI && res.data) {
          document.getElementById('challenge-event-tag').textContent = res.data.tag;
          document.getElementById('active-micro-challenge-text').textContent = `"${res.data.question}"`;
          showToast('Generated fresh Anti-Bluff Micro-Challenge via Gemini!');
          return;
        }
      } catch (err) {
        showToast(`Gemini error: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>New Micro-Challenge</span>';
        lucide.createIcons();
      }
    }

    currentChallengeIndex = (currentChallengeIndex + 1) % MICRO_CHALLENGES.length;
    const ch = MICRO_CHALLENGES[currentChallengeIndex];
    document.getElementById('challenge-event-tag').textContent = ch.tag;
    document.getElementById('active-micro-challenge-text').textContent = `"${ch.text}"`;
  });

  document.getElementById('evaluate-custom-cand-btn').addEventListener('click', handleCustomCandidateEval);
}

function renderApplicantQueue() {
  const list = document.getElementById('applicant-queue-list');
  list.innerHTML = SAMPLE_APPLICANTS.map((cand) => {
    const ev = cand.presetEval;
    const badgeClass =
      ev.caliberScore >= 80
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
        : ev.caliberScore >= 55
        ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
        : 'bg-rose-500/15 text-rose-300 border-rose-400/30';

    return `
      <button data-cand-id="${cand.id}" class="cand-queue-btn w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/40 transition space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-white truncate">${escapeHtml(cand.name)}</span>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}">${ev.caliberScore}%</span>
        </div>
        <div class="text-[11px] text-slate-400 truncate">${escapeHtml(cand.claimedTitle)}</div>
        <div class="text-[10px] font-semibold ${ev.caliberScore >= 80 ? 'text-emerald-400' : 'text-rose-400'}">${escapeHtml(ev.decision)}</div>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.cand-queue-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const found = SAMPLE_APPLICANTS.find((c) => c.id === btn.dataset.candId);
      if (found) selectApplicant(found);
    });
  });
}

function selectApplicant(cand) {
  renderVettingAudit(cand, cand.presetEval, 'Pre-Analyzed Candidate Profile');
}

async function handleCustomCandidateEval() {
  const name = document.getElementById('custom-cand-name').value.trim() || 'Custom Applicant';
  const claimedTitle = document.getElementById('custom-cand-claim').value.trim() || 'Senior Domain Engineer';
  const proofLinks = document.getElementById('custom-cand-proof').value.trim() || 'No proof link provided';
  const answer = document.getElementById('custom-cand-answer').value.trim();
  const question = document.getElementById('active-micro-challenge-text').textContent;

  if (!answer) {
    showToast('Please enter the candidate micro-challenge response to audit.');
    return;
  }

  const btn = document.getElementById('evaluate-custom-cand-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span>Auditing Truth &amp; Caliber...</span>';

  const candObj = {
    name,
    origin: 'Custom Registration',
    claimedTitle,
    proofLinks,
    answer
  };

  try {
    if (getApiKey()) {
      const schema = {
        type: 'OBJECT',
        properties: {
          caliberScore: { type: 'INTEGER' },
          authenticityStatus: { type: 'STRING' },
          bluffRisk: { type: 'STRING' },
          decision: { type: 'STRING' },
          assignedRoom: { type: 'STRING' },
          bestEmployers: { type: 'ARRAY', items: { type: 'STRING' } },
          auditSummary: { type: 'STRING' },
          strengths: { type: 'ARRAY', items: { type: 'STRING' } },
          redFlags: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['caliberScore', 'authenticityStatus', 'bluffRisk', 'decision', 'assignedRoom', 'bestEmployers', 'auditSummary', 'strengths', 'redFlags']
      };

      const prompt = `You are the City of Espoo's strict technical event gatekeeper. Employers (Fortum, Neste, IQM, Nokia, ICEYE, VTT, Kone) rely on Espoo only admitting authentic, high-caliber talent—never buzzword bluffers.
Evaluate this applicant:
Name: ${name}
Self-Claimed Title: ${claimedTitle}
Proof Links: ${proofLinks}
Micro-Challenge Question: ${question}
Candidate Answer: "${answer}"

Score caliberScore (0-100). Penalize heavily if the answer uses generic AI/blockchain/synergy buzzwords without concrete engineering metrics, physics, or humility about boundaries. Recommend one of the Espoo 3D Venue rooms ("CleanTech & Energy Lounge (Fortum & Neste)", "Quantum & SpaceTech Lab (IQM & ICEYE)", "6G & AI Engineering Hub (Nokia & Kone)", or "None (Gatekeeper Blocked)").`;

      const res = await callGeminiJSON(prompt, schema);
      if (res.usedLiveAI && res.data) {
        renderVettingAudit(candObj, res.data, `Live Gemini API (${getSelectedModel()})`);
        showToast('Completed live Anti-Bluff Audit with Gemini!');
        return;
      }
    }

    const evalHeuristic = heuristicVerifyCandidate(candObj);
    renderVettingAudit(candObj, evalHeuristic, 'Built-in Anti-Bluff Heuristic');
    showToast('Completed Anti-Bluff Verification');
  } catch (err) {
    showToast(`Gemini error: ${err.message} — using heuristic audit`);
    const evalHeuristic = heuristicVerifyCandidate(candObj);
    renderVettingAudit(candObj, evalHeuristic, 'Fallback Anti-Bluff Heuristic');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="cpu" class="w-4 h-4"></i><span>Run Anti-Bluff Verification</span>';
    lucide.createIcons();
  }
}

function heuristicVerifyCandidate(cand) {
  const ans = cand.answer.toLowerCase();
  const proof = cand.proofLinks.toLowerCase();
  const buzzwords = ['synergy', 'blockchain', '100% reliability', 'zero latency', 'cutting-edge', 'leverage', 'ecosystem', 'paradigm', 'disruptive'];
  const concreteTech = ['pll', 'impedance', 'hz', 'khz', 'fft', 'pmu', 'emt', 'scr', 'thd', 'd-q', 'droop', 'cryo', 'noise', 'bode', 'phase margin', 'dma', 'cache', 'irq', 'lock', 'latency', 'p99', 'sar', 'x-band', 'electrolyzer', 'simulink', 'profiler', 'perf'];

  const buzzHits = buzzwords.filter((w) => ans.includes(w));
  const techHits = concreteTech.filter((w) => ans.includes(w));
  const hasProof = /github|arxiv|ieee|scholar|patent|gitlab|orcid/.test(proof);

  let score = 52 + techHits.length * 10 + (hasProof ? 12 : -8) - buzzHits.length * 18;
  if (ans.length < 70) score -= 18;
  score = Math.max(8, Math.min(98, score));

  const admitted = score >= 70;
  return {
    caliberScore: score,
    authenticityStatus: admitted ? 'Verified Technical Depth' : buzzHits.length > 0 ? 'Buzzword Bluff Signals Detected' : 'Insufficient Engineering Specificity',
    bluffRisk: score >= 78 ? 'Low (10%)' : score >= 55 ? 'Moderate (42%)' : 'High (85%)',
    decision: score >= 85 ? 'Admitted — VIP Fast-Track' : admitted ? 'Admitted — Verified Track' : 'Waitlisted / Proof Requested',
    assignedRoom: admitted ? 'CleanTech & Energy Lounge (Fortum & Neste)' : 'None (Gatekeeper Blocked)',
    bestEmployers: admitted ? ['Fortum', 'VTT Technical Research Centre'] : [],
    auditSummary: admitted
      ? `Candidate backed claims with concrete engineering mechanisms (${techHits.slice(0, 4).join(', ')})${hasProof ? ' and verifiable external proof.' : '.'}`
      : `Candidate response lacked verifiable engineering mechanisms${buzzHits.length ? ` and relied on vague buzzwords (${buzzHits.join(', ')})` : ''}. Automated gatekeeper protects employer interview capacity by holding this registration.`,
    strengths: techHits.length ? [`Cited concrete concepts: ${techHits.slice(0, 5).join(', ')}`] : [],
    redFlags: [
      ...(buzzHits.length ? [`Buzzwords detected: ${buzzHits.join(', ')}`] : []),
      ...(!hasProof ? ['No verifiable GitHub, IEEE, arXiv, or patent link supplied'] : []),
      ...(techHits.length < 2 ? ['Missing specific telemetry signal, metric, or control parameter'] : [])
    ]
  };
}

function renderVettingAudit(cand, ev, sourceLabel) {
  const panel = document.getElementById('vetting-result-panel');
  const scoreColor =
    ev.caliberScore >= 80 ? 'text-emerald-400' : ev.caliberScore >= 55 ? 'text-amber-400' : 'text-rose-400';
  const barColor =
    ev.caliberScore >= 80 ? 'bg-emerald-500' : ev.caliberScore >= 55 ? 'bg-amber-500' : 'bg-rose-500';
  const decisionBadge =
    ev.caliberScore >= 80
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
      : ev.caliberScore >= 55
      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
      : 'bg-rose-500/20 text-rose-300 border-rose-400/40';

  panel.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-400">${escapeHtml(cand.origin || 'Applicant')}</span>
          <span class="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-sky-300">${escapeHtml(sourceLabel)}</span>
        </div>
        <h3 class="text-xl font-extrabold text-white mt-1">${escapeHtml(cand.name)}</h3>
        <p class="text-xs text-slate-300">${escapeHtml(cand.claimedTitle)}</p>
        <p class="text-xs text-sky-400 mt-0.5">${escapeHtml(cand.proofLinks)}</p>
      </div>
      <div class="text-left sm:text-right shrink-0">
        <div class="text-3xl font-black ${scoreColor}">${ev.caliberScore}<span class="text-base font-bold text-slate-400">/100</span></div>
        <span class="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full border ${decisionBadge}">${escapeHtml(ev.decision)}</span>
      </div>
    </div>

    <!-- Authenticity & Bluff Meter -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400 font-medium">Caliber &amp; Authenticity</span>
          <span class="font-bold text-white">${escapeHtml(ev.authenticityStatus)}</span>
        </div>
        <div class="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div style="width:${ev.caliberScore}%" class="h-full ${barColor} score-bar-fill"></div>
        </div>
        <div class="text-[11px] text-slate-400">Bluff Risk Estimate: <strong class="text-slate-200">${escapeHtml(ev.bluffRisk)}</strong></div>
      </div>

      <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
        <div class="text-xs text-slate-400 font-medium">3D Virtual Venue Assignment</div>
        <div class="text-xs font-bold text-sky-300">${escapeHtml(ev.assignedRoom)}</div>
        <div class="text-[11px] text-slate-400">
          Matched Employers:
          <strong class="text-white">${ev.bestEmployers.length ? escapeHtml(ev.bestEmployers.join(', ')) : 'None'}</strong>
        </div>
      </div>
    </div>

    <!-- Submitted Micro-Challenge Answer -->
    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Applicant's 3-Minute Micro-Challenge Response</div>
      <p class="text-xs text-slate-200 italic leading-relaxed">"${escapeHtml(cand.answer)}"</p>
    </div>

    <!-- AI Audit Explanation -->
    <div class="space-y-3">
      <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80">
        <div class="text-xs font-bold text-white mb-1">Gatekeeper Audit Verdict</div>
        <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(ev.auditSummary)}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25">
          <div class="text-xs font-bold text-emerald-400 mb-1.5">Verified Technical Signals</div>
          ${
            ev.strengths.length
              ? `<ul class="space-y-1 text-xs text-slate-200">${ev.strengths.map((s) => `<li>✓ ${escapeHtml(s)}</li>`).join('')}</ul>`
              : `<p class="text-xs text-slate-500">No concrete technical depth signals verified.</p>`
          }
        </div>
        <div class="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25">
          <div class="text-xs font-bold text-rose-400 mb-1.5">Bluff / Risk Flags</div>
          ${
            ev.redFlags.length
              ? `<ul class="space-y-1 text-xs text-rose-200">${ev.redFlags.map((r) => `<li>⚠ ${escapeHtml(r)}</li>`).join('')}</ul>`
              : `<p class="text-xs text-emerald-300">No bluff or exaggeration flags detected.</p>`
          }
        </div>
      </div>
    </div>
  `;
}

// ==================== UTILITIES ====================

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg) {
  const toast = document.getElementById('toast-banner');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3600);
}

