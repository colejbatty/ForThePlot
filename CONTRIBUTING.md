# Contributing

Thanks for helping. The most valuable contributions right now are:

1. **Icons**, especially immunology: cytokine receptors, complement, NETs, germinal center structure, tissue-resident cells. See [docs/ICONS.md](docs/ICONS.md).
2. **Templates**: common figure types built with ops in `scripts/build-examples.js`.
3. **Editor features**: freehand paths, image import, PDF export, multi-page figures.

## Development

```bash
npm install
npm run build          # rebuild dist/fortheplot.html after editor changes
npm test               # core, CLI and MCP end-to-end tests
node scripts/build-examples.js   # regenerate examples/*.json and previews
npm run icons:sheet    # regenerate docs/icon-sheet.png
```

`src/core` must stay dependency-free and run in both the browser and Node.

Keep built-in icons original. Don't trace or copy artwork from commercial libraries.
