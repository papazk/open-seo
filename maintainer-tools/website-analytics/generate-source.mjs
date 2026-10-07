import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('./consent.js',import.meta.url);
writeFileSync(new URL('./consent-source.mjs',import.meta.url),'export default '+JSON.stringify(readFileSync(source,'utf8'))+';\n');
