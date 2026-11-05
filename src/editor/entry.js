// Browser entry point (bundled by scripts/build-standalone.js).
import { boot } from './main.js';

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
