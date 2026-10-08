# Core acceleration and locked encounter

2026-10-08. Follow-up to the user's screenshot: stop the camera at a readable cylinder encounter, delay the request panel, accelerate the existing upper/lower rotors, and give the whole moment more scroll distance.

- Core authored interval remains 0.31–0.345, but extra scroll distance increases from 0.06 to 0.14. Physical Core allocation is now 0.175 vs previous 0.095 (1.84× previous revision, 5× original). WebGL track height increases 1040→1120svh; later authored camera/motion samples and Text selection hold remain.
- Hold camera position [-1,43,-15.5], target [0,43,-23], FOV 72 from Core arrival through the split inspection. No deeper push toward the cylinder. Approach and selected Text departure remain continuous.
- Existing named upper/lower rotors use absolute scroll angle 2π(0.12t+1.88t³). They start slowly, accelerate, and complete two turns. No geometry changes or wall-clock autoplay. Named nodes/GLB remain intact.
- Ring look cue clones only functional lime materials; metal and warm alloy remain authored. Ring emission is reduced early, ramps with acceleration, and stays capped during the encounter. Existing sign/spindle cue remains restrained; global exposure/bloom unchanged.
- Request panel begins later at 0.330–0.335, holds through 0.342, then disappears by 0.345. It sits lower on desktop to avoid covering the ROUTING label. Four-view crossfade and three Text selection flashes remain.

Browser checks: desktop review at 0.318 (no request text), 0.337 (request text), 0.38 (split, request panel hidden); reverse back to Core; mobile 390×844; actual homepage scroll inspection. Camera metrics remain identical across Core poses. First visual pass found the initial hold too far back with side glyph panels visible; corrected to a centered intermediate encounter matching the supplied framing, then rechecked. Development hot refresh briefly lost WebGL context; fresh page reload restored rendering. Only the existing dependency-owned THREE.Clock warning remained in inspected console entries.

Eight motion/timing tests pass including camera-hold and increasing rotor-speed assertions. TypeScript noEmit and targeted ESLint pass. Temporary viewport override reset. Screens: slow.png, request-hold.png, split.png, mobile.png, home-final.png.

## User correction

The user rejected the new frontal camera as too different and clarified that the request orb should be absorbed inside the box. The final hold now restores the original approach's intermediate camera pose: position [-2,42.6,-15], FOV 71, quaternion halfway between the original entry and original deeper encounter. No further push-in occurs during the hold.

Request head (including its point light) is hidden from 0.31 until the selected exit begins at 0.422. It reappears at the exit; reverse seeks restore the same hidden state. The panel reaches full visibility at 0.329 and stays fully visible until 0.343. Core extra scroll is now 0.24, with 1220svh WebGL track. Relative to the previous 0.14 hold, physical Core allocation rises 0.175→0.275, and the fully readable panel allocation rises roughly 3.14× by expanding both its authored window and physical scroll scale. Slow rotation/glow precede its appearance at 0.326.

Twelve targeted motion/request/timing tests pass, including hidden Core request head and reappearance at selected exit. Final corrected screenshot: corrected-request.png. This supersedes the earlier camera/timing values above. Local dev cache failure recurred and was resolved with server restart before the final visual verification.
