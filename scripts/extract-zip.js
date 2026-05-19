import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function extractZip() {
  const zipPath = './temp/Lovboost_Deobfuscated.zip';
  const outputDir = './temp/lovboost-extracted';
  
  // Read the zip file
  const zipData = fs.readFileSync(zipPath);
  
  // Load the zip
  const zip = await JSZip.loadAsync(zipData);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Extract all files
  const files = Object.keys(zip.files);
  console.log('Files in ZIP:', files);
  
  for (const filename of files) {
    const file = zip.files[filename];
    
    if (file.dir) {
      const dirPath = path.join(outputDir, filename);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } else {
      const content = await file.async('nodebuffer');
      const filePath = path.join(outputDir, filename);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content);
      console.log('Extracted:', filename);
    }
  }
  
  console.log('Extraction complete!');
}

extractZip().catch(console.error);
