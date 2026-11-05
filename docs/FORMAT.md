# Figure format (version 1)

A figure is one JSON object. Unknown properties are preserved, so tools can extend it.
A JSON Schema is in [`schema/figure.schema.json`](../schema/figure.schema.json).

```json
{
  "fortheplot": 1,
  "title": "Figure title",
  "canvas": { "width": 1200, "height": 800, "background": "#ffffff", "printWidth": 183 },
  "font": "Arial, Helvetica, sans-serif",
  "elements": [ … ],
  "iconDefs": [ … ]
}
```

- Coordinates are pixels with the origin at the top left. `background` may be `"none"` for a transparent export.
- `printWidth` (optional, mm) is how wide the figure will be printed. With it, text sizes can be read and set in points, and exports default to that physical size.
- `elements` are drawn in order: later elements are on top.
- `iconDefs` is written automatically when a figure uses imported icons (Bioicons, your own SVGs, icons you saved from figures), so the file renders anywhere.

## Common element properties

| key | type | notes |
|---|---|---|
| `id` | string | Unique, readable (`"tcell"`). Arrows and ops refer to it. |
| `type` | `icon` \| `shape` \| `text` \| `arrow` \| `note` \| `path` \| `image` \| `panel` | Inferred if omitted (`icon` when `icon` is set, and so on). |
| `x`, `y`, `w`, `h` | number | Top-left corner and size (not used by arrows). |
| `rotation` | degrees | Clockwise, around the center. |
| `opacity` | 0–1 | |
| `group` | string | Elements sharing a group select and move together. |
| `attachedTo` | id | Set by the `attach` op. The element moves and is deleted with its host. |
| `locked`, `hidden` | boolean | Locked elements can't be selected on the canvas. |

## icon

| key | notes |
|---|---|
| `icon` | Icon id, e.g. `t-cell-cd8` or `bioicons/b-cell-1` |
| `colors` | `{ primary, secondary, accent }` for built-in icons |
| `tint` | Imported icons: shift every color to this hue (white, black and greys are kept) |
| `colorMap` | Imported icons: `{ "#old": "#new" }` replaces single colors |
| `flipX`, `flipY` | Mirror |
| `label` | `"text"` or `{ text, position: bottom\|top\|left\|right\|center\|none, fontSize, color, bold, maxWidth }` |

When only `w` (or only `h`) is given, the other follows the icon's aspect ratio.

## shape

`shape`: `rect`, `ellipse`, `triangle`, `diamond`, `hexagon`, `brace`, `membrane` (straight bilayer filling the box), `membrane-ellipse` (closed bilayer: a cell or vesicle outline), `plot` (a flow cytometry plot, see below).

| key | notes |
|---|---|
| `fill`, `stroke`, `strokeWidth`, `dash` (`solid`/`dashed`/`dotted`) | `fill` is a color or a [gradient](#gradients). For membranes, `fill` colors the lipid heads and `stroke` the tails |
| `radius` | Corner radius for `rect` |
| `text`, `fontSize`, `textColor`, `bold` | Text centered inside the shape |
| `inner`, `thickness` | `membrane-ellipse` interior (color or gradient) and bilayer thickness |
| `label` | As for icons |

### plot

A `shape` with `shape: "plot"` draws axes and synthetic, density-colored events (the `gating` op makes these). `plot` holds:

| key | notes |
|---|---|
| `kind` | `dot` (default) or `histogram` |
| `xLabel`, `yLabel` | Axis titles, rich text allowed (`CD8^+`) |
| `gate` | `{ type: rect\|ellipse\|polygon\|quad, x, y, w, h }` in 0–1 plot units, or `points` for a polygon |
| `gateLabel`, `pct` | Population name and percentage drawn by the gate |
| `populations` | Optional list of `{ x, y, sx, sy, n, color }` clusters; a default layout is used otherwise |
| `seed`, `fontSize` | Reproducible scatter; label size |

## text

| key | notes |
|---|---|
| `text` | Rich text (see below); `\n` for new lines |
| `fontSize`, `color`, `bold`, `italic` | |
| `align` | `left`, `center`, `right` within the box |
| `w` | Wrap width (0 means no wrapping) |
| `background` | Optional backdrop color |

## arrow

| key | notes |
|---|---|
| `from`, `to` | `"id"`, `{ "id": "x", "anchor": "auto" }`, or a point `[x, y]` / `{ "x": 0, "y": 0 }`. Anchors: `auto`, `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`. An arrow may also point at another arrow (it attaches to that arrow's midpoint). |
| `head`, `tail` | `arrow`, `open`, `inhibit`, `circle`, `diamond`, `none` |
| `routing` | `straight`, `curved` (with `curvature`, −1…1, positive bends to the right of travel), `elbow` |
| `stroke`, `width`, `dash` | |
| `label`, `labelSize`, `labelColor`, `labelOffset` | |
| `gap` | Space between the arrow end and the element outline (default 6) |
| `clearance` | How far an elbow loop extends past its ends (default 32) |

## path

Pen and pencil drawings, free-form arrows and membranes along any curve.

| key | notes |
|---|---|
| `points` | Anchor points. When adding: `[x, y]` in canvas coordinates (or relative to `x`/`y` if you give them), or `{x, y, in: [dx, dy], out: [dx, dy]}` with Bézier handles. Stored relative to the path's box. |
| `vw`, `vh` | Reference size of the stored points (set by ForThePlot). Resizing changes `w`/`h`, which scales the points. |
| `smooth` | Automatic curves through points that have no handles |
| `closed` | Join the last point to the first |
| `stroke`, `strokeWidth`, `dash`, `fill` | `fill` applies to closed paths |
| `head`, `tail` | Arrowheads on open paths (same names as arrows) |
| `membrane`, `thickness`, `inner` | Draw a phospholipid bilayer along the curve (`fill` = heads, `stroke` = tails); `inner` fills a closed membrane |

Icons attached to a path (`attach` with `to` set to the path) sit on the curve and stay there when it is resized, rotated or reshaped.

## image

| key | notes |
|---|---|
| `image` | Id in the figure's top-level `images` map: `{ "img-…": { "src": "data:image/png;base64,…", "w": 1024, "h": 768, "name": "cells.tif" } }`. When adding, pass `src` (a data URL) or, with the CLI and MCP server, `file`. |
| `crop` | `{x, y, w, h}` as fractions 0–1 of the original picture |
| `radius`, `stroke`, `strokeWidth` | Rounded corners and border |
| `scaleBar` | `{length, unit: "µm", perPx (units per original pixel), position: bottom-right\|bottom-left\|top-right\|top-left, color, label}` |
| `label` | As for icons |
| `link` | A linked graph's source: `{ "prism": "cytokines.prism", "graph": 2, "uid": "…", "title": "H1 Redone", "layout"?: true }` (ForThePlot exports it with Prism; `uid` finds the graph again if it moves in Prism's list) and/or `{ "picture": "graph2.svg" }` (a watched export). Paths are relative to the figure when they are inside its folder. `updated` and `mtime` record the last refresh. |

SVG pictures (`data:image/svg+xml`) are drawn inline in exports, so they stay vector in PDF and SVG.

## panel

| key | notes |
|---|---|
| `x`, `y`, `w`, `h` | Frame |
| `title` | Shown after the letter |
| `letter` | Override the automatic letter; `""` for none |
| `letterSize`, `titleSize` | This panel's own letter and title sizes (px); leave out to use `panelLabels` |
| `fill`, `stroke`, `strokeWidth`, `radius`, `dash` | Frame style (use `"none"` for letter-only panels) |

Letters run A, B, C… in reading order (rows top to bottom, then left to right). The figure-level `panelLabels` sets their style: `{ "style": "A" | "a" | "(A)" | "(a)" | "A." | "none", "size": 28, "titleSize": 18, "letterBold": true, "titleBold": true, "position": "inside" | "outside", "color", "titleColor" }`. Without `titleSize`, titles are two thirds of the letter size. Moving a panel moves everything whose center is inside it.

## note

A sticky note for the people and agents working on the figure. Notes are shown in the editor and in agent previews, listed by `describe_figure`, and **never** exported.

| key | notes |
|---|---|
| `text` | The note (rich text) |
| `target` | Optional id of the element it is about; a dashed leader is drawn to it |
| `author` | `you` (a person) or `claude` |
| `color` | Background; the editor offers yellow, blue, pink and green |
| `resolved` | `true` once acted on (drawn faded) |
| `x`, `y`, `w` | Position and width; the height follows the text |

## Rich text

| markup | result |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* (gene names) |
| `CD8^+`, `CD4^-` | superscript + or − |
| `Ca^{2+}`, `IFN-γ^{hi}` | superscript |
| `H_{2}O`, `T_{reg}` | subscript |
| `\*` `\^` `\_` | literal characters |

## Text sizes

The `textSize` op changes text sizes by kind in one step, for the whole figure, the contents of panels (`within`), or chosen elements (`ids`):

```json
{ "op": "canvas", "set": { "printWidth": 183 } }
{ "op": "textSize", "roles": ["labels", "arrows"], "pt": 7 }
{ "op": "textSize", "roles": ["letters"], "pt": 10 }
{ "op": "textSize", "within": "panel-2", "scale": 0.9 }
{ "op": "textSize", "minPt": 6 }
```

Kinds (`roles`): `text` (text boxes), `labels` (icon, shape and image labels), `shapes` (text inside shapes), `arrows` (arrow labels), `plots` (plot axes), `scaleBars`, `titles` (panel titles), `letters` (panel letters). The default is every kind except panel letters. Give one of `size` (px), `pt` (needs `printWidth` or `widthMm`), `scale`, or `minPt`/`minSize` (raises only text that is smaller). Across the whole figure, letters and titles set `panelLabels`; within a panel they set that panel's own `letterSize`/`titleSize`.

## Gradients

Wherever a shape, closed path or panel takes `fill` (and a membrane takes `inner`), a gradient can stand in for a color:

```json
{ "type": "linear", "angle": 90, "stops": [{ "offset": 0, "color": "#ffffff" }, { "offset": 1, "color": "#4a8fe7" }] }
{ "type": "radial", "cx": 0.35, "cy": 0.3, "r": 0.75, "stops": [{ "offset": 0, "color": "#ffffff" }, { "offset": 0.6, "color": "#4a8fe7" }, { "offset": 1, "color": "#1d4e89" }] }
```

- `angle` follows CSS: 0 points up, 90 runs left to right, 180 (the default) top to bottom.
- Radial `cx`, `cy` and `r` are fractions of the object's box; an off-center highlight makes cells and beads look round.
- A stop may have `opacity` (0–1).
- When writing, CSS syntax works too: `"linear-gradient(90deg, #fff, #4a8fe7)"`, `"radial-gradient(circle at 35% 30%, #fff, #4a8fe7 60%, #1d4e89)"`, or `{ "type": "linear", "colors": ["#fff", "#4a8fe7"] }` with evenly spaced stops.

Gradients stay vector in SVG and PDF. PowerPoint has no gradient objects through this exporter, so gradient-filled objects go in as pictures with their text kept as editable text boxes.

## My icons

Objects from a figure can be saved as an icon (editor: select them, *Save as icon…*; agents: the `save_as_icon` tool). The icon is drawn from the objects with what is attached to them, what is inside selected panels and arrows between them, and stored in a pack file shared by every figure: `FORTHEPLOT_MY_ICONS`, else `Documents/ForThePlot/my-icons.json`. The standalone editor keeps them in the browser instead (export them from the library's Mine tab). Saved icons have ids `my/…`, carry `own: true`, and list the third-party icons they were made from in `credits`, so figures using them still credit the original authors. Like any imported icon they recolor with `tint` or `colorMap`, and figures that use them carry a copy in `iconDefs`.
