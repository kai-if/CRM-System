const fs = require('fs');
const path = require('path');

const source = "C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\b3ed8945-1f02-4bc9-a6c8-42fe4c1c0707\\media__1774264198199.png";
const dest = path.join(__dirname, 'public', 'favicon.png');

try {
  fs.copyFileSync(source, dest);
  console.log("Favicon copied successfully to " + dest);
} catch (e) {
  console.error("Failed to copy favicon:", e);
}
