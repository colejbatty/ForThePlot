# ForThePlot for agents

ForThePlot is built so an agent can make a figure end to end and then hand it to a person who keeps editing it, or the other way round. Every route goes through the same JSON **ops**.

| Route | Use it when |
|---|---|
| MCP server (`fortheplot mcp`) | You are an MCP client (Claude Desktop, Claude Code, others) |
| CLI (`fortheplot apply fig.json ops.json`) | You can run shell commands |
| Editor → *Agent → Apply ops* | A person pastes ops you wrote in chat |
| `window.fortheplot.apply(ops)` | You drive the editor in a browser |

## A good loop

1. `search_icons` for each thing you need ("cd8", "pd-l1", "lymph node"). Prefer built-in ids (no `/`), because they recolor by role; `bioicons/…` ids recolor with `tint` or `colorMap`.
2. `new_figure` with a sensible canvas (1200×800 for a figure, 1600×900 for a slide).
3. Start whole motifs with a **building block** (`add_block`, or the `synapse`, `pathway`, `timeline`, `gating` ops), then use `edit_figure` for the rest: place the big objects first, then attach, connect and label.
4. `render_figure` and **look at it**. Fix overlaps, crowding and off-canvas items (`tidy` helps). `describe_figure` gives exact coordinates.
5. `open_editor` and give the person the URL. Re-read with `describe_figure` before making more edits, since they may have moved things.
6. For a paper, `export_figure` with a journal preset (`journal: "nature-2col"`): it sets the physical size, checks that every label prints at the journal's minimum text size, and returns the credit line for the legend.

## Working with the person

- **"This" and "these".** When the person refers to something on screen, call `get_selection`: it returns the ids they selected in the editor (and `describe_figure` lists them too).
- **Sticky notes.** People leave `note` elements on the canvas, often pointing at an element (`target`). Treat open notes as instructions: do the work, then `update {id, set:{resolved:true}}`. To ask a question, add your own note with `author: "claude"`. Notes appear in `render_figure` previews, never in exports.

## Placement without arithmetic

- `cx`/`cy` place by center; `near: {id, side, gap}` places next to another element, and the gap clears its label.
- `attach` seats receptors, antibodies or virions on a cell surface and points them outward. `toward: "<id>"` aims at another cell, and several ids fan out (`spread`). Attached items move with their cell and are deleted with it.
- `arrange` lays out a row, column, grid or circle; `align` and `distribute` tidy up; `fit` shrinks the canvas to the content.
- Arrows attach to element outlines. Anchors `top`/`bottom` connect beyond a label on that side. `routing: "elbow"` with the same anchor on both ends (e.g. both `bottom`) draws a U-shaped return path, which is good for "re-infusion" loops.
- `curvature` > 0 bends to the right of the direction of travel. For a left-to-right arrow that arcs over the top, use a negative value.

## Building blocks

Each block is one op that lays out a whole motif and returns every id it made. All accept `x`/`y` or `cx`/`cy`; without them a block is centered, and `add_block` moves it below existing content so nothing is covered.

| op | what it draws | key fields |
|---|---|---|
| `synapse` | Two cells facing each other with receptor–ligand pairs that meet in the gap, optionally a blocking antibody and a legend | `left`, `right` (icon id, `{icon, label, colors}` or an existing element id), `pairs: [["tcr","mhc-i"], {left:"pd-1", right:"pd-l1", blockedBy:{icon:"antibody", label:"anti-PD-1"}}]`, `size`, `legend` |
| `pathway` | A signaling cascade laid out in layers, with typed edges, an optional membrane on top and dashed compartments | `nodes: ["LCK", {id, label, icon, shape: pill\|box\|ellipse\|circle, color}]`, `edges: [[from, to, "activates"\|"inhibits"\|"binds"\|"phosphorylates"\|"translocates"\|"produces"\|"secretes", label?]]`, `direction: down\|right`, `membrane`, `compartments: [{label:"Nucleus", ids:[…]}]` |
| `timeline` | An experiment schedule: axis with ticks, events above or below, repeated doses, ranges as bars, a subject icon | `events: [{at:0, label, icon}, {at:[7,10,13], …}, {from:7, to:21, label, below:true}]`, `unit`, `start`, `end`, `subject`, `width` |
| `gating` | A flow cytometry gating strategy: density dot plots with gates, percentages and arrows between them | `steps: [{x:"FSC-A", y:"SSC-A", gate:"Lymphocytes", pct:"58.3"}, …]`, `size`, `cols`, `gap` |
| `tidy` | Nudges overlapping elements (with their attached receptors and labels) apart, keeping containers fixed | `ids?`, `margin?` |

## Panels, pictures and drawn membranes

- **Multi-panel figures.** Start with `panels {rows, cols, titles}` (or `cells` for spans, `widths`/`heights` for ratios), then build each part inside its panel. Letters (A, B, C…) follow reading order and update by themselves; `describe_figure` lists each panel's letter and contents. `panels {wrap: [["id1","id2"], ["id3"]]}` frames content that already exists. Moving a panel moves what is inside it.
- **Pictures.** `add_image {file, w, crop, scale_bar: {length: 20, per_px: 0.325}}`, or an `image` element with `file` in `edit_figure`. TIFF is converted; the picture is stored once in the figure file. Only add a scale bar when you know the µm per pixel (ask the person, or read it from the microscope metadata they give you).
- **Prism graphs.** `list_prism_graphs {file}` shows a `.prism` file's graphs by number and name; `add_prism_graph {file: "C:\\Data\\cytokines.prism", graph: "H1 Redone"}` (or a number) adds one linked to its Prism file. The link stores the graph's id, so it survives graphs being reordered in Prism. On Windows with Prism installed, ForThePlot exports it with Prism (vector) and updates it whenever the file is saved while the editor is open; `refresh_links` catches up otherwise, and `open_in_prism {id}` opens it for the person. Without Prism, pass a picture the person exported from Prism (SVG best) as `file`. Prefer this over `add_image` for data graphs so they stay editable.
- **Drawn shapes.** A `path` with `points` (canvas coordinates) and `smooth: true` is a flowing curve; `closed: true` makes an outline; `head: "arrow"` makes a free-form arrow (migration, a cell's route through tissue). With `membrane: true` it is drawn as a phospholipid bilayer: a curved plasma membrane, or with `closed: true` a cell or organelle of any shape. `attach {to: <path>, at: 0.3 | toward: <id>, gap}` seats receptors along it, pointing out of the membrane.
- Attached items stay on their host when it is moved, resized, rotated or reshaped, so resize cells freely.
- **Gradients.** Any `fill` of a shape, closed path or panel (and a membrane's `inner`) takes a gradient: `"radial-gradient(circle at 35% 30%, #fff, #4a8fe7 60%, #1d4e89)"` gives a cell a rounded look, `"linear-gradient(90deg, #2c7bb6, #ffffbf, #d7191c)"` makes a scale bar for a heat map. See FORMAT.md.
- **Reusable icons.** `save_as_icon {ids, name}` turns objects the person drew into an icon in their "My icons" (id `my/…`), usable in any figure with `add_icon`; `replace_selection: true` also swaps the objects for the icon.
- **Text sizes.** `describe_figure` lists sizes by kind. Set the printed width once (`canvas {set:{printWidth: 183}}`), then `textSize {roles: ["labels","arrows","text"], pt: 7}`, `textSize {roles: ["letters"], pt: 10}`, `textSize {within: <panel>, scale: 0.9}` or `textSize {minPt: 6}` to fix a figure for a journal in one step.

## Op reference

```
add        {element} | {elements:[…]}
connect    {from, to, head, tail, routing, curvature, label, stroke, width, dash}
update     {id|ids, set:{…}}            colors and label merge; icon w/h keep aspect
remove     {id|ids}                     also removes attached arrows and receptors
move       {ids, dx, dy}   moveTo {id, x|cx, y|cy}   resize {id, w|h|scale}
place      {id, relativeTo, side, gap}
attach     {id|ids, to, angle | toward, spread?, inset?}
align      {ids, edge: left|right|top|bottom|hcenter|vcenter|center, to?: "canvas"}
distribute {ids, axis: h|v}
arrange    {ids, layout: row|column|grid|circle, gap, x|cx, y|cy, cols, radius}
order      {ids, to: front|back|forward|backward}
group / ungroup {ids}    duplicate {ids, dx, dy}
canvas     {set:{width, height, background, title, font, printWidth (mm), panelLabels}}    fit {margin}    clear
textSize   {roles?, within? | ids?, size | pt | scale | minPt, widthMm?}   text sizes by kind (see FORMAT.md)
synapse | pathway | timeline | gating | tidy    see Building blocks
panels     {rows, cols, titles?, cells?, widths?, heights?, gap?, margin?, labels?} | {wrap: [[ids]…], titles?, padding?}
```

Element properties are listed in [FORMAT.md](FORMAT.md). Ops are **transactional**: if op #4 fails, nothing is applied and the error names op #4 and lists the valid ids or values.

## Arrow vocabulary for biology

| head | meaning |
|---|---|
| `arrow` | activates, leads to, becomes |
| `inhibit` | blocks or suppresses (T-bar) |
| `circle` | binds or catalyzes |
| `open` | weaker or indirect effect |
| `dash: "dashed"` | secretion, migration, or an indirect or hypothesized step |

## Colors

Built-in icons take `colors: {primary, secondary, accent}`. The role names differ by icon (for a cell: cytoplasm, nucleus, granules; for an antibody: heavy chain, light chain, variable). `search_icons` lists them. Keep one color per cell type across a figure.

Imported icons (`bioicons/…`) take `tint: "#hex"` (shifts every color to that hue, keeping white, black and greys) or `colorMap: {"#old": "#new"}` (swaps single colors). Both can be combined.

## Export

`export_figure {to, journal?, width_mm?, dpi?}` writes `.pdf` (vector, Liberation Sans embedded), `.tiff` (LZW, with dpi), `.png` (with dpi), `.svg` (physical size), `.pptx` (native text, shapes and arrows; icons as images) or `.json`. Presets: `nature-1col` 89 mm, `nature-1.5col` 120 mm, `nature-1.5col-wide` 136 mm, `nature-2col` 183 mm (text 5–7 pt), `jci-min` 90 mm and `jci-max` 180 mm (text 6–8 pt, 600 dpi), `slide-16x9`. The result reports the printed size of the smallest text; if it is below the journal minimum, enlarge those labels (it says to what px) or export wider. Always tell the person to check their journal's current guide.

## Credits

Icons whose id starts with `bioicons/` carry their own licenses. `export_figure` and `fortheplot credits` print a ready-to-paste credit line ("Illustration created with ForThePlot. Icons: “B cell 1” by … (CC BY 4.0), via Bioicons."), which also goes into the SVG `<desc>`. Tell the person when a figure needs credits (any CC-BY icon).
