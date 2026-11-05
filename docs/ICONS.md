# Icons

## Built-in library

562 original icons in `src/icons/library/`, MIT-licensed, in eight groups (Cells; Proteins & molecules; Microbes; Genetics; Cell biology; Anatomy & organisms; Lab; Charts & symbols) and 34 categories. They share one drawing kit (`kit.js`, plus `cellkit.js` for cells) so they look like a set: lit-sphere shading with a rim of reflected light, inner edge shadows, bilayer-style membrane outlines, soft highlights, and detail where it helps the biology read (chromatin and nucleoli, mitochondria and vesicles, Ig-domain folds, helical transmembrane segments, glass, liquid and metal on lab ware). Everything is plain SVG gradients and clip paths, so icons stay sharp in PDF and recolor by role.


| file | contents |
|---|---|
| `cells.js`, `immuno2.js`, `cells-blood.js` | Immune cells (T cell subsets and states, CAR-T, B/plasma/plasmablast, NK, NKT, ILC2, macrophages incl. Kupffer, alveolar and foam cells, monocyte, DCs incl. pDC, Langerhans and follicular DCs, granulocytes, MDSC, giant cells); blood and stem cells (erythroid and myeloid precursors, megakaryocyte, platelets, sickle cell, progenitors, ES/iPS cells, MSC) |
| `cells-epi.js` | Skin and epithelia (keratinocyte, corneocyte, melanocyte, Merkel, sebocyte, squamous/cuboidal, mesothelial, myoepithelial); digestive (enterocyte, goblet, Paneth, enteroendocrine, tuft, M cell, Lgr5⁺ stem cell, parietal, chief, hepatocyte, cholangiocyte, stellate cell, LSEC, acinar and ductal cells); respiratory (ciliated, club, basal, AT1, AT2, ionocyte); kidney (podocyte, proximal tubule, principal and intercalated cells, mesangial, juxtaglomerular, umbrella cell) |
| `cells-tissue.js` | Neurons (pyramidal, Purkinje, motor, sensory, bipolar, interneuron) and glia (astrocyte, oligodendrocyte, Schwann cell, microglia, ependymal, radial glia); sensory cells (rod, cone, hair cell, olfactory neuron, taste bud, retinal ganglion, RPE); muscle (skeletal fiber, cardiomyocyte, smooth muscle, myoblast, myotube, satellite cell); connective and vascular (white and brown adipocytes, myofibroblast, CAF, FRC, endothelial, lymphatic endothelial, pericyte); bone and cartilage (osteoblast, osteocyte, osteoclast, chondrocyte) |
| `cells-other.js`, `cells-more.js` | Endocrine (α, β, δ cells, thyrocyte, C cell, chromaffin, adrenocortical, somatotroph, parathyroid, pinealocyte); reproductive (sperm, oocyte, Sertoli, Leydig, granulosa, syncytiotrophoblast, mammary luminal cell); development (zygote to blastocyst); mitosis stages, senescent and necrotic cells, plant cell; thymic epithelial cell, HEV cell, Müller glia, lens fiber, corneal endothelium, odontoblast, ameloblast, tenocyte, ICC, foveolar cell, tip cell |
| `cellkit.js` | The cell kit: outlines (round, columnar, polygonal, spindle, branched), organelle placement that works inside any outline, processes that merge into one outline, ER, Golgi, lipid droplets, cilia, brush borders |
| `molecules.js`, `receptors2.js` | Antibody formats (IgG/IgM/IgA/IgE/IgD, Fab, scFv, nanobody, Fc, Fc-fusion, bispecific, trispecific, BiTE, diabody, DVD-Ig, ADC, immunocytokine, immune complex, neutralizing antibodies); receptors (immune checkpoints, RTK, integrin, cadherin, Notch, ACE2, NKG2D, KIR, CD47–SIRPα, TNFR…); channels and transporters; signaling (G protein, Ras, MAPK cascade, NF-κB, STAT) |
| `molecules2.js` | Ball-and-stick small molecules (glucose, ATP, water, O₂, CO₂, amino acid, fatty acid, cholesterol, ions, ROS, N-glycan, phospholipid); drugs and delivery (tablet, capsule, liposome, micelle, polymer and gold nanoparticles, dendrimer, PROTAC); proteins (hemoglobin, insulin, collagen, amyloid, myosin, kinesin, ubiquitin, chaperone, spike, mucin) |
| `bio.js`, `genetics.js` | Nucleic acids (DNA, RNA, mRNA, plasmid, chromosome, nucleosome, chromatin, tRNA, siRNA, miRNA, ssDNA, nucleotide, base pairs, methylation, DSB, aptamer); gene expression and editing (replication fork, transcription, translation, splicing, expression cassette, CRISPR, base and prime editors, AAV, ASO, PCR) |
| `bio.js`, `microbes.js` | Viruses (enveloped, coronavirus, influenza, herpesvirus, retrovirus, adenovirus, filovirus, poxvirus, phage), bacteria (rod, bacterial cell anatomy, cocci, streptococci, diplococci, spirochete, vibrio, mycobacteria, spores, biofilm), fungi (yeast, hyphae, Aspergillus), protists and helminths, prion |
| `bio.js`, `structures.js` | Organelles (nucleus, mitochondrion, ER, Golgi, lysosome, peroxisome, endosome, autophagosome, lipid droplet, centrosome, chloroplast, proteasome, clathrin-coated vesicle, exosome); cell structures (microtubule, actin, intermediate filament, cytoskeleton, 9+2 axoneme, nuclear pore, fluid-mosaic membrane, tight/adherens/gap junctions, desmosome, synapse, sarcomere) |
| `lab.js`, `anatomy2.js` | Organs (lymphoid organs, lung, liver, heart, brain, gut, kidney, skin, stomach, pancreas, gallbladder, colon, bladder, reproductive organs, placenta, breast, thyroid, adrenal, pituitary, eye, ear, tooth, joints, muscle, bone, spinal cord, nerve, vessels, airways, blood, fat, body map); microanatomy (nephron, glomerulus, villus, liver lobule, islet, alveoli, hair follicle, osteon, tumor microenvironment) |
| `lab.js`, `organisms2.js` | Organisms (mouse and procedures, rat, hamster, ferret, rabbit, pig, dog, sheep, macaque, llama, chicken, Xenopus, zebrafish, Drosophila, C. elegans, mosquito, tick, Arabidopsis, human) |
| `lab.js`, `lab2.js` | Lab equipment (pipettes, tubes, plates, flasks, centrifuge, cytometer, sequencer, thermocycler, gels and blots, plate reader, incubator, hood, freezers, mixers, balance, pH meter, spectrophotometer, columns, mass spec, EM, glassware, PPE, slides, chips, bioreactor, IV bag…); cell culture and assays (culture dish, transwell, organoid, spheroid) |
| `lab.js`, `charts2.js` | Charts (flow plot, histogram, UMAP, bar, heatmap, survival, scatter, line, box, violin, dose–response, volcano, pie, Venn, network, phylogeny, stacked bar, tumor growth) and symbols (activation/inhibition arrows, cycle, timeline, plus/minus, warning, idea, target, thermometer, droplet, snowflake, question, document, database) |

Each icon is a small function that returns SVG for a set of colors, so users can recolor it by role:

```js
{
  id: 'nk-cell', name: 'NK cell', category: 'Immune cells',
  tags: ['natural killer', 'cd56', 'cytotoxic'],
  colors: { primary: '#ec8a7e', secondary: '#8a2f3e', accent: '#7a1f4a' },
  roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Granules' },
  w: 100, h: 100,        // viewBox
  size: 110,             // default width on the canvas
  shape: 'ellipse',      // outline arrows attach to
  body: 0.84,            // fraction of the box that is membrane (arrows and attach)
  anchor: [50, 72],      // receptors only: where the membrane crosses (viewBox units)
  draw: (c, uid) => `…svg using c.primary, c.secondary, c.accent…`,
}
```

Helpers in `kit.js` (`sphere` gradients, organic `blob`s, `speckle` granules, `domain` Ig beads, `membraneStrip`, `nucleusDetail`) keep the style consistent. For a new cell type, `makeCell()` in `cellkit.js` takes an outline, nuclei and organelle counts and does the shading, placement and outline for you; `stellate()` adds branched processes. Groups for the library panel live in `groups.js`. Gradient ids must use the `uid` prefix so copies of an icon don't clash.

**Adding an icon:** add it to the right file, then run `npm run icons:sheet` and check `docs/icon-sheet.png`. Include tags people would actually search for (gene names, CD numbers, common abbreviations).

## Recoloring imported icons

Bioicons and your own SVGs don't have color roles, so they recolor two ways, both in the inspector and as element properties:

- `tint: "#d1495b"` shifts every color to that hue, keeping each color's lightness and leaving white, black and greys alone. Good for matching a cell type's color across a figure.
- `colorMap: {"#e64980": "#2f9e44"}` replaces exact colors. The inspector shows the icon's main colors as swatches.

## My icons

Anything you draw can become an icon: select the objects (a cell built from shapes with a gradient, a receptor complex, a labelled organoid) and choose **Save as icon…** in the right panel, or ask Claude (`save_as_icon`). It appears in the library under **Mine** and in searches, and you can add it to any figure, resize it and recolor it. SVG files you drop on the canvas are kept there too. With the editor Claude opens (or `fortheplot serve`) they are stored in `Documents/ForThePlot/my-icons.json` (or `FORTHEPLOT_MY_ICONS`); the standalone editor keeps them in the browser, and **Export…/Import…** move them between computers. Icons made from Bioicons keep those icons' credits.

## Bioicons

`packs/bioicons/` holds 2,256 icons from [Bioicons](https://bioicons.com), split by category so the editor loads only what it shows. `index.json` holds the searchable metadata, and each category file is a ForThePlot icon pack. Every icon keeps its own `license`, `author` and `source`. Icons over 120 KB after SVG optimization (mostly very detailed anatomy) are left out. See `NOTICE.md` for the authors and counts.

Regenerate from upstream:

```bash
git clone --depth 1 https://github.com/duerrsimon/bioicons
node scripts/import-bioicons.js bioicons/static/icons --out packs/bioicons --max-kb 120
```

## Other icon sources

Any folder of SVGs can become a pack:

```bash
fortheplot import-icons ./servier-svgs --out packs/servier.json --name "Servier Medical Art" \
  --license CC-BY-4.0 --author "Servier Medical Art" --source https://smart.servier.com
```

Packs in `packs/` load automatically in the CLI, MCP server and `fortheplot serve`. In the standalone editor, use *Bioicons → Load icon pack…*. Good open sources include [Servier Medical Art](https://smart.servier.com), [NIH BioArt](https://bioart.niaid.nih.gov) and the [Reactome icon library](https://reactome.org/icon-lib). Check each site's current license terms and pass them to `--license` and `--author`.

Pack format:

```json
{ "format": "fortheplot-icon-pack", "version": 1, "name": "My pack", "prefix": "mine",
  "license": "CC-BY-4.0", "author": "Me", "source": "https://…",
  "icons": [ { "id": "thing", "name": "Thing", "category": "Mine", "tags": [], "w": 100, "h": 80, "svg": "<path …/>" } ] }
```

All imported SVG is sanitized: scripts, event handlers, `foreignObject`, external references and editor metadata are stripped.
