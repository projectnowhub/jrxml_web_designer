import { describe, test, expect } from 'vitest';
import { ensureUniqueUuids, refreshUuids } from '../../src/utils/elementUtils';

describe('unique element IDs', () => {
  test('a copy gets new IDs for itself and every item inside it', () => {
    const box = { uuid: 'box', elements: [{ uuid: 'a' }, { uuid: 'b', elements: [{ uuid: 'c' }] }] };
    const copy = JSON.parse(JSON.stringify(box));
    refreshUuids(copy);
    const ids = (e: any): string[] => [e.uuid, ...(e.elements ?? []).flatMap(ids)];
    expect(ids(copy).some((id) => ids(box).includes(id))).toBe(false);
    expect(new Set(ids(copy)).size).toBe(4);
  });

  test('loading repairs copies that share IDs with their original, keeping the first', () => {
    const bands = [
      { elements: [{ uuid: 'box', elements: [{ uuid: 'part' }] }] },
      { elements: [{ uuid: 'box', elements: [{ uuid: 'part' }] }, { uuid: 'other' }] },
    ];
    expect(ensureUniqueUuids(bands)).toBe(true);
    const all = bands.flatMap((b) => b.elements.flatMap((e: any) => [e.uuid, ...(e.elements ?? []).map((c: any) => c.uuid)]));
    expect(new Set(all).size).toBe(all.length);
    expect(bands[0]!.elements[0]!.uuid).toBe('box');
    expect(ensureUniqueUuids(bands)).toBe(false);
  });

  const table = () => ({
    uuid: 't',
    type: 'table',
    dataset: { uuid: 'ds', name: 'orders' },
    children: [
      { uuid: 'g', children: [{ uuid: 'col1', detailCell: { enable: true, element: { uuid: 'cell1' } } }] },
    ],
    columns: [{ uuid: 'col1', detailCell: { enable: true, element: { uuid: 'cell1' } } }],
  });

  test('a copied table gets new column and cell IDs, consistent between children and columns', () => {
    const copy: any = table();
    refreshUuids(copy);
    const col = copy.children[0].children[0];
    expect(col.uuid).not.toBe('col1');
    expect(copy.columns[0].uuid).toBe(col.uuid);
    expect(copy.columns[0].detailCell.element.uuid).toBe(col.detailCell.element.uuid);
    expect(col.detailCell.element.uuid).not.toBe('cell1');
    expect(copy.children[0].uuid).not.toBe('g');
    // Same data as the original
    expect(copy.dataset.uuid).toBe('ds');
  });

  test('loading repairs a table copy but not a single table listing its columns twice', () => {
    const single = [{ elements: [table()] }];
    expect(ensureUniqueUuids(single)).toBe(false);

    const twice: any[] = [{ elements: [table(), { ...table(), uuid: 't2' }] }];
    expect(ensureUniqueUuids(twice)).toBe(true);
    const [first, second] = twice[0].elements;
    expect(first.columns[0].uuid).toBe('col1');
    expect(second.columns[0].uuid).not.toBe('col1');
    expect(second.columns[0].uuid).toBe(second.children[0].children[0].uuid);
  });
});
