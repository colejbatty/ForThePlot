// Starter figures (bundled from examples/*.json by esbuild).
import pd1 from '../../examples/pd1-blockade.json';
import activation from '../../examples/t-cell-activation.json';
import cart from '../../examples/car-t-workflow.json';
import flow from '../../examples/flow-cytometry-workflow.json';
import ebv from '../../examples/ebv-b-cell.json';
import tumor from '../../examples/tumor-model-study.json';

export const TEMPLATES = [
  { id: 'pd1-blockade', name: 'PD-1 checkpoint blockade', description: 'Two-panel synapse: PD-L1 engagement vs. anti-PD-1', figure: pd1 },
  { id: 't-cell-activation', name: 'T cell activation', description: 'Signals 1–3 between a dendritic cell and a CD4⁺ T cell', figure: activation },
  { id: 'car-t-workflow', name: 'CAR-T workflow', description: 'Leukapheresis → transduction → expansion → infusion', figure: cart },
  { id: 'flow-cytometry-workflow', name: 'Flow cytometry workflow', description: 'Mouse spleen to gated populations and UMAP', figure: flow },
  { id: 'ebv-b-cell', name: 'EBV and B cells', description: 'Infection, latency and CD8⁺ T cell control', figure: ebv },
  { id: 'tumor-model-study', name: 'Tumor model study', description: 'Timeline, gating strategy and mechanism, built from blocks', figure: tumor },
];
