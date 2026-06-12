const fs = require('fs');
const path = require('path');

const file = 'c:\\\\Users\\\\bryal\\\\Desktop\\\\ESTEBAN\\\\Prueba.html';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

const frontendDir = 'c:\\\\Users\\\\bryal\\\\Desktop\\\\ESTEBAN\\\\frontend\\\\public';
fs.mkdirSync(path.join(frontendDir, 'css'), { recursive: true });
fs.mkdirSync(path.join(frontendDir, 'js'), { recursive: true });

// <style> is at line 11 (0-indexed 10)
// </style> is at line 1193 (0-indexed 1192)
const cssLines = lines.slice(11, 1192);

// <script> is at line 4096 (0-indexed 4095)
// </script> is at line 8602 (0-indexed 8601)
const jsLines = lines.slice(4096, 8601);

const htmlStart = lines.slice(0, 10);
const htmlMiddle = lines.slice(1193, 4092); // Up to the line before firebase scripts
// lines 4093, 4094 are the firebase scripts (0-indexed 4092, 4093)
const firebaseScripts = lines.slice(4092, 4094);
const htmlEnd = lines.slice(8602);

// Write style.css
fs.writeFileSync(path.join(frontendDir, 'css', 'style.css'), cssLines.join('\n'));

// Write app.js
fs.writeFileSync(path.join(frontendDir, 'js', 'app.js'), jsLines.join('\n'));

// Construct new index.html
const indexHtmlContent = [
    ...htmlStart,
    '    <link rel="stylesheet" href="css/style.css">',
    ...htmlMiddle,
    ...firebaseScripts,
    '    <script src="js/app.js"></script>',
    ...htmlEnd
].join('\n');

fs.writeFileSync(path.join(frontendDir, 'index.html'), indexHtmlContent);
console.log('Files split successfully.');
