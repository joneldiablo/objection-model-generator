# OMG

Objection Model Generator is a tool to _automagically_ generate all ObjectionJS models from Mysql data base, using the information_schema table to let us know tables, columns and BelongsToOneRelations.

```js

require('dotenv').config();
const fs = require('fs');
const Omg = require('objection-model-generator');

// OPTIONAL: add pluralize customization
const pluralize = require('pluralize');
pluralize.addSingularRule('mouse', 'mice');
pluralize.addSingularRule('Mouse', 'Mice');
//----

const main = async () => {
  let omg = new Omg({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }, process.env.DB_NAME, '../knex'); // relative path to the knex instance, the generated file goings to require that file
  let ms = await omg.createModels();
  let path = 'src/api/models/generated.js'; // path to where goings to be created the output
  fs.writeFileSync(path, ms);
  console.log('-> file writed:', path);
  process.exit();
}

main();
```
