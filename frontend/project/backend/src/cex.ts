import fs from 'fs';
import yaml from 'js-yaml';

export type CexAddressBook = Record<string, Record<string, string[]>>; // chain->exchange->addresses

export function loadCexAddressBook(file: string): CexAddressBook {
  const content = fs.readFileSync(file, 'utf8');
  const data = yaml.load(content) as any;
  const book: CexAddressBook = {};
  const exchanges = data?.exchanges || {};
  for (const chain of Object.keys(exchanges)) {
    book[chain] = {};
    for (const ex of Object.keys(exchanges[chain])) {
      book[chain][ex] = (exchanges[chain][ex] || []).map((a: string) => a.toLowerCase());
    }
  }
  return book;
}

export function isCexAddress(book: CexAddressBook, chain: string, address: string): { match: boolean; exchange?: string } {
  const addr = address.toLowerCase();
  const chainBook = book[chain] || {};
  for (const ex of Object.keys(chainBook)) {
    if (chainBook[ex].includes(addr)) return { match: true, exchange: ex };
  }
  return { match: false };
}
