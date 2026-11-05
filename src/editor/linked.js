// Linked graphs in the editor: open the source in Prism, update now, unlink.

import { S, commit } from './state.js';
import { toast } from './ui.js';
import { server, serverCall } from './io.js';

export function linkName(link) {
  const base = (p) => String(p || '').split(/[\\/]/).pop();
  if (link.prism) return `${base(link.prism)} · ${link.title || `${link.layout ? 'layout' : 'graph'} ${link.graph || 1}`}`;
  return base(link.picture);
}

export async function openLinked(el) {
  if (!server.enabled) {
    toast('This graph is linked to a Prism file. Open the figure through Claude (or `fortheplot serve`) to edit it in Prism.', 'error');
    return;
  }
  try {
    const r = await serverCall('/api/open-link', { id: el.id });
    toast(el.link.prism
      ? `Opening ${r.opened} in Prism. Save it there and this graph updates.`
      : `Opening ${r.opened}. Export it again from Prism and this graph updates.`);
  } catch (err) {
    toast(`Couldn’t open it: ${err.message}`, 'error');
  }
}

export async function refreshLinked(el) {
  try {
    toast('Updating from the source…');
    await serverCall('/api/refresh-link', { id: el.id });
  } catch (err) {
    toast(`Couldn’t update: ${err.message}`, 'error');
  }
}

export function unlink(el) {
  delete el.link;
  commit();
  toast('Unlinked. The picture stays as it is.');
}
