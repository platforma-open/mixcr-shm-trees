import { test } from 'vitest';
import { detectAlphabet, translate } from './alphabets';

test('simple alphabet test', ({ expect }) => {
  expect(detectAlphabet(['ATTAGACA'])?.type).toEqual('nucleotide');
  expect(detectAlphabet(['attagaca'])?.type).toEqual('nucleotide');
  expect(detectAlphabet(['CASSLAPGAT'])?.type).toEqual('amino-acid');
  expect(detectAlphabet(['casslapgat'])?.type).toEqual('amino-acid');
  expect(detectAlphabet(['hello world'])?.type).toBeUndefined();
});

test('simple translate test', ({ expect }) => {
  expect(translate('attagacatatacaca')).toEqual('IRHIH');
});
