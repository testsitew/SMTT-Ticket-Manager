import fs from 'fs';
import path from 'path';

const imagePath = './src/assets/images/ooredoo_business_logo_1786104525322.jpg';
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');
console.log(`data:image/jpeg;base64,${base64Image}`);
