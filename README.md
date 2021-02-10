# OMG!!!!!
Objection Model Generator is a tool to automagically generate all ObjectionJS models from Mysql data base, using the information_schema table to let us know tables, columns and BelongsToOneRelation

generate routes, controllers and models:

```js
require('dotenv').config();
const models = require('objection-model-generator/src/dbToModel');
const controllers = require('objection-model-generator/src/dbToControllers');
const routes = require('objection-model-generator/src/dbToRoutes');

const main = async () => {
  const connection = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
  };
  const modelsPromise = models(process.env.DB_NAME, connection, 'knex', './test/models/models.js');
  const controllersPromise = controllers(process.env.DB_NAME, connection, '../models', 'abstract-controller', './test/controllers');
  const routesPromise = routes(process.env.DB_NAME, connection, './test/routes/index.js');
  const all = await Promise.all([modelsPromise, controllersPromise, routesPromise]);
}

main();
```
