const package = require('./package.json');
const fs = require('fs');

let vArr = package.version.split('.');
let v = parseInt(vArr.pop());
vArr.push(++v);
package.version = vArr.join('.');
fs.writeFileSync('./package.json', JSON.stringify(package, null, 2));

