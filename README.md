# OMG!!!!!
Objection Model Generator is a tool to automagically generate all ObjectionJS models from Mysql data base, using the information_schema table to let us know tables, columns and BelongsToOneRelation

basic usage:

```js
const fs = require('fs');
const ObjectionModelGenerator = require('objection-model-generator');

const main = async () => {
  let omg = new ObjectionModelGenerator({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root'
  }, 'dbName');
  let models = await omg.createFiles();
  await fs.writeFile('output/ms.js', models);
  console.log('\n -> file writed: output/ms.js');
}

main();
```
