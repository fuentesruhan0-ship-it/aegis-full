const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/flean/.gemini/antigravity-ide/brain/f97ee201-6f4a-4858-8621-b61b03236231/.system_generated/logs/transcript.jsonl')
});

let found = '';
rl.on('line', (line) => {
  if (line.includes('"step_index":1598')) {
    try {
      const obj = JSON.parse(line);
      found = obj.content;
    } catch(e) {}
  }
});

rl.on('close', () => {
  fs.writeFileSync('c:/Users/flean/Documents/aegis-full/scratch/master_prompt.txt', found);
  console.log('Saved master_prompt.txt length:', found.length);
});
