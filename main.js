require('dotenv').config();
const fs = require('fs-extra');
const ObjectionModelGenerator = require('./lib/ObjectionModelGenerator.js');

const main = async () => {
  let omg = new ObjectionModelGenerator({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }, process.env.DB_NAME, '../db');
  let ms = await omg.createModels().catch(error => ({ error }));
  if (ms.error) {
    console.error(error);
    return process.exit(1);
  }
  await fs.writeFile('output/ms.js', ms);
  console.log('\n -> file writed: output/ms.js');
  process.exit();
}

main();
