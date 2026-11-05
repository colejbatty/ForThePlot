// Public API of the ForThePlot core (browser + Node, no dependencies).
export * from './model.js';
export * from './ops.js';
export * from './render.js';
export * from './inspect.js';
export { elementBox, visualBounds, labelBox, arrowGeometry, anchorPoint, union, center, rotatedBounds } from './geometry.js';
export { parseRich, plainText, layoutText } from './text.js';
export { blockOps } from './place.js';
export * from './path.js';
export * from './images.js';
export * from './panels.js';
export * from './textsize.js';
export * from './gradient.js';
export * from './saveicon.js';
export { reseatAttached, anchorPoint as attachAnchor } from './attach.js';
export { shade, mix, normalizeColor, contrastText, PALETTE } from './color.js';
export {
  registerIcon, registerIcons, registerPack, getIcon, hasIcon, allIcons, categories, searchIcons, unwrapSvg,
  embedUsedIcons, registerEmbeddedIcons, iconColors, sanitizeSvg,
} from '../icons/registry.js';
import '../icons/library/index.js';
