require('dotenv').config();
const fs = require('fs-extra');
const ObjectionModelGenerator = require('../src/ObjectionModelGenerator.js');

const main = async () => {
  let omg = new ObjectionModelGenerator({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }, 'headsmusic', '../db');
  let ms = await omg.createFiles();
  await fs.writeFile('output/ms.js', ms);
  console.log('\n -> file writed: output/ms.js');
}

main();
