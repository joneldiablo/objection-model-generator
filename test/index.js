require('dotenv').config();
const fs = require('fs-extra');
const ObjectionModelGenerator = require('../src/ObjectionModelGenerator.js');

const main = async () => {
  let omg = new ObjectionModelGenerator({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }, process.env.DB_NAME, '../pool');
  let ms = await omg.createModels();
  await fs.writeFile('test/output/ms.js', ms);
  console.log('\n -> file writed: output/ms.js');
}

main();
