require('dotenv').config();
const models = require('../src/dbToModel');
const controllers = require('../src/dbToControllers');
const routes = require('../src/dbToRoutes');

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
  console.log(all);
  process.exit();
}

main();