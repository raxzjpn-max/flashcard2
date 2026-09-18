import fs from "node:fs";

const htmlPath = process.argv[2] || "index.html";
const dataPath = process.argv[3] || "pdf-vocabulary.json";
let html = fs.readFileSync(htmlPath, "utf8");
const source = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const vocabulary = source.map(({ k, h, m }) => ({ k, h, m }));
const compact = JSON.stringify(vocabulary);

const startMarker = "const pdfPriorityVocabulary = ";
const endMarker = "const allWords = sets.flat();";
const runtimeBlock = `${startMarker}${compact};
const vocabularyIdentity=value=>String(value||"").normalize("NFKC").replace(/\\s+/g,"").replace(/[()（）]/g,"");
const vocabularyPair=word=>\`${"${vocabularyIdentity(word.k)}|${vocabularyIdentity(word.h)}"}\`;
const existingVocabularyPairs=new Set(sets.flat().map(vocabularyPair));
const missingPdfVocabulary=pdfPriorityVocabulary
  .filter(word=>!existingVocabularyPairs.has(vocabularyPair(word)))
  .map(word=>({...word,ex:"",exr:"",exm:"",read:"",readr:"",readm:"",level:"N4-N3",kind:"kotoba"}));
for(let offset=0;offset<missingPdfVocabulary.length;offset+=25)sets.push(missingPdfVocabulary.slice(offset,offset+25));
${endMarker}`;

if (html.includes(startMarker)) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (end < 0) throw new Error("Penanda akhir data tidak ditemukan");
  html = html.slice(0, start) + runtimeBlock + html.slice(end + endMarker.length);
} else {
  html = html.replace(endMarker, runtimeBlock);
}

if (!html.includes("const pdfPriorityRank=new Map(")) html = html.replace(
  /function prioritizeN3Vocabulary\(words\)\{\r?\n/,
  `function prioritizeN3Vocabulary(words){
  const pdfPriorityRank=new Map(pdfPriorityVocabulary.map((word,index)=>[vocabularyPair(word),index]));
`
);
html = html.replace(
  /return \{word,level:levelRank\(word\),score,originalIndex\};\r?\n  \}\)\.sort\(\(a,b\)=>a\.level-b\.level\|\|b\.score-a\.score\|\|a\.originalIndex-b\.originalIndex\)/,
  `return {word,pdfRank:pdfPriorityRank.get(vocabularyPair(word))??Number.MAX_SAFE_INTEGER,level:levelRank(word),score,originalIndex};
  }).sort((a,b)=>a.pdfRank-b.pdfRank||a.level-b.level||b.score-a.score||a.originalIndex-b.originalIndex)`
);
html = html.replace(/const APP_DATA_VERSION="[^"]+";/, 'const APP_DATA_VERSION="2026-09-18-pdf-priority-v2";');

fs.writeFileSync(htmlPath, html, "utf8");
console.log(JSON.stringify({ pdfVocabulary: vocabulary.length }, null, 2));
