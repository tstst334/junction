# 2. Espoo 3D Spatial Virtual Venue & Zoom Hybrid Stage

An interactive **Three.js 3D spatial event building + Zoom Livestream hybrid web app** built for the **City of Espoo × Junction Hackathon Challenge**.

## Key Features
1. **Tangible 3D Building with Physical Rooms (`venue3d.js`)**
   - Central Atrium & Coffee Networking Hub, Main Keynote Auditorium, CleanTech & Energy Lounge (Fortum & Neste), Quantum & SpaceTech Lab (IQM & ICEYE), 6G & AI Engineering Hub (Nokia & Kone), and VIP 1-on-1 Interview Pods.
   - Walk freely with **WASD / Arrow keys**, **click anywhere on the 3D floor**, or **click any room on the live 2D Minimap** to auto-walk through doorways.
   - Drag mouse to orbit camera, scroll to zoom.

2. **Spatial Proximity Pods & Room Interaction**
   - When your avatar walks within **4.5 meters** of Espoo engineers, recruiters, or global attendees, spatial audio/video proximity pods appear automatically on the right HUD alongside live speech bubbles.
   - Inspect open Espoo roles inside each room, chat in room-specific spatial chat, and click **Drop Talent Passport** to share verified credentials.

3. **Seamless Zoom Keynote Stage + Picture-in-Picture (PiP) Mode**
   - Switch to **Zoom Keynote Stage** during talks for a full presentation slide deck, speaker video inset, participant tiles, live Q&A, and floating reactions.
   - Click **Minimize to PiP & Walk Venue** to keep watching/listening in a draggable corner window while walking around the 3D building and networking between sessions.

4. **Organizer Venue & Room Designer**
   - Load pre-designed venue presets (*Espoo Energy & CleanTech Summit*, *Otaniemi Quantum & DeepTech Expo*, *Executive Senior Talent Roundtable*).
   - Rename rooms, change sponsor hosts, set admission rules (*Open to All*, *Verified Match >80% Only*, *1-on-1 Invite*), change room colors, place 3D furniture (*Conference Table, Sponsor Booth, Keynote Screen, Lounge Sofa, Info Kiosk*), and broadcast a **Call-to-Room** that draws a glowing animated 3D path on the floor.

5. **Direct Integration with Solution 1 (`1-espoo-talent-radar`)**
   - Clicking **Launch in 3D Virtual Venue** inside `1-espoo-talent-radar` automatically opens this 3D venue pre-configured with your Gemini-generated event title, speaker topic, and venue layout.

## Quick Start
Open `index.html` directly in any modern browser, or run a local HTTP server from this folder:
```bash
python -m http.server 8002
```

