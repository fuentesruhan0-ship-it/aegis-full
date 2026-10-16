const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/flean/.gemini/antigravity-ide/brain/f97ee201-6f4a-4858-8621-b61b03236231/.system_generated/logs/transcript.jsonl')
});

const userInputs = [];
rl.on('line', (line) => {
  if (line.includes('"USER_INPUT"')) {
    try {
      const obj = JSON.parse(line);
      userInputs.push({ step: obj.step_index, content: (obj.content || '').slice(0, 150) });
    } catch(e) {}
  }
});

rl.on('close', () => {
  console.log(JSON.stringify(userInputs.slice(-15), null, 2));
});
