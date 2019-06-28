const ObjectionModelGenerator = require('./lib/ObjectionModelGenerator.js');

const main = () => {
  let omg = new ObjectionModelGenerator();
  console.log('version:', omg.version);
}

main();
