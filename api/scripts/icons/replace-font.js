// replace-font.js
const fs = require("fs");
const path = require("path");

const folder = __dirname; // same folder as SVG files
const files = fs.readdirSync(folder).filter(f => f.endsWith(".svg"));

files.forEach(file => {
 const filePath = path.join(folder, file);
 let content = fs.readFileSync(filePath, "utf8");

 // Replace any Radley variant with Vast Shadow
 const updated = content.replace(/font-family=['"]?[^"']*Radley[^"']*['"]?/gi, "font-family=\"'Vast Shadow', serif\"");

 if (updated !== content) {
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`✅ Updated: ${file}`);
 } else {
  console.log(`ℹ️ No Radley found in: ${file}`);
 }
});

console.log("🎉 Done updating font-family to 'Vast Shadow', serif");
