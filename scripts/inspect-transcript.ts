import { YoutubeTranscript } from "youtube-transcript";

const id = process.argv[2] ?? "t6-fT0hjTvc";

const items = await YoutubeTranscript.fetchTranscript(id, { lang: "en" });

console.log(`total items: ${items.length}`);
console.log("\nfirst 5:");
for (const item of items.slice(0, 5)) {
  console.log(JSON.stringify(item));
}

console.log("\nlast 3:");
for (const item of items.slice(-3)) {
  console.log(JSON.stringify(item));
}

if (items.length > 0) {
  const first = items[0]!;
  const last = items.at(-1)!;
  console.log(`\nfirst.offset = ${first.offset}, first.duration = ${first.duration}`);
  console.log(`last.offset  = ${last.offset}, last.duration  = ${last.duration}`);
  console.log(`span = ${last.offset + last.duration - first.offset}`);
}

process.exit(0);
