# City of Espoo × Junction Hackathon — Knowledge-Work Talent Ecosystem

Two complementary prototypes built in separate directories to solve Espoo's challenge of connecting knowledge-work employers (Keilaniemi, Otaniemi, Karakaari, Leppävaara) with high-caliber Finnish and international talent.

## Project Structure

### 1. [`1-espoo-talent-radar/`](./1-espoo-talent-radar/index.html)
**AI Hiring Radar, Event & Outreach Strategist & Anti-Bluff Applicant Gatekeeper**
- Monitors open positions and hiring surges across Espoo employers (Fortum, Neste, IQM Quantum, ICEYE, Nokia, Qt Group, VTT, Kone) + supports live career-page/text scanning via **Google Gemini API**.
- Recommends targeted technical events from real hiring demand and splits outreach channels automatically:
  - **Entry / Thesis roles** → University programmes, guilds, and labs (e.g., Aalto, LUT, KTH, TU Delft).
  - **Senior / Principal roles** → Global specialist ecosystems (IEEE/CIGRE working groups, GitHub open-source communities, arXiv/patent authors).
- **Anti-Bluff Gatekeeper**: Generates 3-minute domain micro-challenges and audits registration answers + proof links to filter out buzzword exaggeration automatically without exhausting city staff capacity.

### 2. [`2-espoo-virtual-venue/`](./2-espoo-virtual-venue/index.html)
**3D Spatial Metaverse Event Building + Zoom Livestream Hybrid**
- Interactive **Three.js** architectural building with distinct rooms (Main Auditorium, CleanTech & Energy Lounge, Quantum & SpaceTech Lab, 6G & AI Hub, VIP 1-on-1 Interview Pods).
- Walk with **WASD / Arrow keys**, **floor clicks**, or **2D minimap clicks**; talk via **spatial proximity pods** (`< 4.5m`) and drop your Verified Talent Passport at employer rooms.
- Toggle seamlessly between **Zoom Keynote Stage Mode** (slides, speaker feed, Q&A) and **Draggable Picture-in-Picture (PiP)** while walking and networking in 3D.
- Includes an **Organizer Venue & Room Designer** with pre-designed presets, custom room theming, 3D furniture placement, and **Call-to-Room** broadcasts with glowing 3D floor guidance paths.

## How to Run Both Demos Locally
You can open either `index.html` directly in Chrome/Edge, or serve the root folder with one local static server so both apps share `localStorage` seamlessly:

```bash
python -m http.server 8000
```
Then visit:
- **Talent Radar & Gemini Gatekeeper:** `http://localhost:8000/1-espoo-talent-radar/`
- **3D Spatial Virtual Venue:** `http://localhost:8000/2-espoo-virtual-venue/`

