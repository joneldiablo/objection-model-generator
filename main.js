require('dotenv').config();
const fs = require('fs-extra');
const ObjectionModelGenerator = require('./lib/ObjectionModelGenerator.js');

const main = async () => {
  let omg = new ObjectionModelGenerator({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }, 'headsmusic', '../db');
  let ms = await omg.createModels();
  await fs.writeFile('output/ms.js', ms);
  console.log('\n -> file writed: output/ms.js');
}

main();
