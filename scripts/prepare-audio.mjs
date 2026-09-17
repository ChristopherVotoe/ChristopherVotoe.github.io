import { mkdir, writeFile } from "node:fs/promises";

// Original deterministic 120 BPM synth loop. No sampled or third-party music.
const rate = 44100, seconds = 10, count = rate * seconds;
const data = Buffer.alloc(44 + count * 2);
data.write("RIFF", 0); data.writeUInt32LE(36 + count * 2, 4); data.write("WAVEfmt ", 8);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
data.write("data", 36); data.writeUInt32LE(count * 2, 40);
const notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 392];
let seed = 42;
for (let i = 0; i < count; i++) {
  const t = i / rate, beat = t % .5, eighth = t % .25;
  const note = notes[Math.floor(t / .25) % notes.length];
  const melody = Math.sin(2 * Math.PI * note * t) * Math.exp(-eighth * 13) * .14;
  const bass = Math.sin(2 * Math.PI * (Math.floor(t / 2) % 2 ? 65.406 : 130.813) * t) * Math.exp(-beat * 6) * .16;
  const kick = Math.sin(2 * Math.PI * (48 * beat + 9 * (1 - Math.exp(-beat * 25)))) * Math.exp(-beat * 22) * .45;
  seed = (1664525 * seed + 1013904223) >>> 0;
  const noise = seed / 2147483648 - 1;
  const hat = noise * Math.exp(-eighth * 100) * .12;
  const snare = Math.floor(t / .5) % 2 ? noise * Math.exp(-beat * 28) * .2 : 0;
  const fade = Math.min(1, t * 100, (seconds - t) * 8);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, melody + bass + kick + hat + snare)) * fade * 30000), 44 + i * 2);
}
await mkdir("public/audio", { recursive: true });
await writeFile("public/audio/first-wave.wav", data);
console.log("Original 10-second backing track ready.");
