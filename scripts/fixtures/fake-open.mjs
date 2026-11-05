#!/usr/bin/env node
// Stand-in for "open with the default program": records what was opened.
import fs from 'node:fs';
fs.appendFileSync(process.env.FORTHEPLOT_OPEN_LOG, process.argv[2] + '\n');
