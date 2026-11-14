# 1. Espoo TalentPulse AI — Hiring Radar, Event Strategist & Anti-Bluff Gatekeeper

An AI-powered intelligence platform built for the **City of Espoo × Junction Hackathon Challenge**.

## What It Solves
1. **Continuous Espoo Employer Hiring Radar (`#radar-tab`)**
   - Monitors knowledge-work employers across Keilaniemi, Otaniemi, Karakaari, and Leppävaara (**Fortum, Neste, IQM Quantum, ICEYE, Nokia, Qt Group, VTT, Kone**).
   - Tracks hiring velocity spikes and breaks down **Senior/Principal** vs. **Entry/MSc Thesis** demand.
   - Includes a **Live Career Page / Job Feed Scanner**: paste any company career snippet or URL and extract structured open roles and skills into the live radar.

2. **AI Event & Dual-Track Outreach Architect (`#event-generator-tab`)**
   - Uses **Google Gemini API (`gemini-2.5-flash` / `gemini-2.5-pro`)** (or built-in fallback demo intelligence) to design high-signal technical keynote events around active hiring surges instead of generic career fairs.
   - Automatically tailors outreach channels by seniority:
     - **Entry / Graduate / Thesis Roles**: Finnish & European university degree programs, student guilds (e.g., Aalto Sähkökilta, KTH, TU Delft), and thesis clinics.
     - **Senior / Principal Roles**: Global specialist channels (IEEE/CIGRE working groups, GitHub open-source communities, arXiv/patent authors).
   - **One-click Export to 3D Virtual Venue**: Launches `../2-espoo-virtual-venue/index.html` pre-configured with the generated event blueprint.

3. **Anti-Bluff Applicant Gatekeeper (`#applicant-vetting-tab`)**
   - Eliminates registration exaggeration without requiring manual city staff capacity to read hundreds of CVs.
   - Generates a 3-minute domain micro-challenge from real employer bottlenecks and audits applicant responses + proof links (GitHub, IEEE, arXiv) to detect buzzword bluffing vs. real engineering depth.

## Quick Start
1. Open `index.html` directly in any modern browser, or run a local static server from this folder:
   ```bash
   python -m http.server 8001
   ```
2. *(Optional)* Click **Configure Gemini API Key** in the top-right header and paste a Google Gemini API key (`AIzaSy...`) to enable live Gemini JSON structured extraction, event design, and applicant verification. Without a key, the app runs seamlessly in **Demo Intelligence Mode**.

