// Top-level groups for the built-in icon categories (used to keep the library browsable).

export const ICON_GROUPS = [
  ['Cells', ['Immune cells', 'Blood & stem cells', 'Skin & epithelial cells', 'Digestive cells', 'Respiratory cells', 'Kidney & urinary cells',
    'Nervous system cells', 'Sensory cells', 'Muscle cells', 'Connective tissue cells', 'Bone & cartilage cells', 'Endocrine cells',
    'Reproductive cells', 'Development', 'Cells']],
  ['Proteins & molecules', ['Antibodies', 'Receptors & ligands', 'Channels & transporters', 'Signaling', 'Proteins', 'Molecules', 'Drugs & delivery', 'Innate immunity']],
  ['Genetics', ['Nucleic acids', 'Gene expression & editing']],
  ['Cell biology', ['Organelles', 'Cell structures']],
  ['Microbes', ['Pathogens']],
  ['Anatomy & organisms', ['Organs & tissues', 'Microanatomy', 'Organisms']],
  ['Lab', ['Lab equipment', 'Cell culture & assays']],
  ['Charts & symbols', ['Charts & symbols']],
];

const byCat = new Map(ICON_GROUPS.flatMap(([g, cats]) => cats.map((c) => [c, g])));

/** The top-level group of a category (falls back to the category itself). */
export const groupOf = (category) => byCat.get(category) || category;
