// Registers the built-in icon library. All built-in icons are original artwork,
// released under the project's MIT license.
import { registerIcons } from '../registry.js';
import { ICON_GROUPS, groupOf } from './groups.js';
import { immuneCells, otherCells } from './cells.js';
import { antibodies, receptors, molecules } from './molecules.js';
import { nucleic, pathogens, organelles } from './bio.js';
import { anatomy, organisms, lab, charts } from './lab.js';
import { bloodCells } from './cells-blood.js';
import { epiCells } from './cells-epi.js';
import { tissueCells } from './cells-tissue.js';
import { otherCells2 } from './cells-other.js';
import { moreCells } from './cells-more.js';
import { organelles2 } from './structures.js';
import { molecules2 } from './molecules2.js';
import { receptors2 } from './receptors2.js';
import { genetics } from './genetics.js';
import { microbes } from './microbes.js';
import { anatomy2 } from './anatomy2.js';
import { organisms2 } from './organisms2.js';
import { lab2 } from './lab2.js';
import { charts2 } from './charts2.js';
import { cellStates, signaling, innateIcons, moreReceptors, mouseProcedures } from './immuno2.js';

registerIcons([
  ...immuneCells, ...cellStates, ...bloodCells, ...epiCells, ...tissueCells, ...otherCells2, ...moreCells, ...antibodies, ...receptors, ...moreReceptors, ...receptors2, ...signaling, ...molecules, ...molecules2, ...innateIcons, ...pathogens, ...microbes, ...otherCells,
  ...nucleic, ...genetics, ...organelles, ...organelles2, ...anatomy, ...anatomy2, ...organisms, ...organisms2, ...mouseProcedures, ...lab, ...lab2, ...charts, ...charts2,
].map((d) => ({ ...d, group: groupOf(d.category) })));

export { ICON_GROUPS };
