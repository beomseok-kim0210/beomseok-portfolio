# Core-before-options revision

Requested order: visible voice waveform converges into request sphere, sphere enters product, brief chamber establish, follow rising signal into the box, encounter Routing cylinder, four capability panes, Text selection, direct Text bridge, unchanged Text/Response/product return.

Implemented in the runtime only; no asset re-export or Blender geometry changes. WorldCameraController remains the sole main camera owner. Core request path enters before preview (.31-.33), holds in the chamber during classification, leaves after selection under the final part of the preview. Preview .345-.442, selection starts .402 with extended scroll hold. The final camera leaves the box under the preview so there is no second internal introduction after preview exit. Main Text and all Response/return sample windows remain unchanged.

The waveform is now 40px high; its bars physically converge toward the center, round into overlapping dots, and resolve into an expanding sphere before intake starts. It remains registered to the actual DOM waveform and voice button bounds. No fabricated utterance is added.

Four views use 6px viewport insets, opaque outer frames and a 12px central separation. Renderer clear color, viewport and scissor state are restored after the multi-view render.

QA: desktop 1440x900 and mobile 390x844 actual browser. First pass showed the post-preview cylinder repeating briefly; second pass moved that exit beneath the selection hold and confirmed the direct Text bridge. Forward samples and reverse seeks checked; sphere/wave and Core-before-preview screenshots saved. No browser console errors observed. Temporary viewport restored. Reduced-motion CSS was preserved from the prior verified pass; the full Hangarae/shared-transition and reduced-motion sweep was not repeated.

24 scoped regressions pass, including continuity, one-route execution, revised Core hold and authored-clock preservation. TypeScript and scoped ESLint pass.
