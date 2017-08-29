/* global module, require */

const uuidv4 = require('uuid/v4');

const collectionName = 'User';
const log = require('../Utilities/log');
const MongoDataSource = require('../Connections/Mongo.datasource');
const typeCheck = require('../Utilities/typeCheck');

// In lieu of an Entity/Model framework, we'll fake it
// We are not trying to build a robust typing system, so we'll check basic types and patterns where possible
// but allow the DataSource to validate more completely

// We are reusing the pattern used in RestHandler parameter validation, but expressing what is required
// of the record, not the specific operation being performed

const userFields = [
  // Automatically created:
  { valueName: 'id', dataType: 'uuid4', required: true, autoCreated: true },
  { valueName: 'createDate', dataType: 'date', required: true, autoCreated: true },
  { valueName: 'updatedDate', dataType: 'date', required: true, autoCreated: true },

  { valueName: 'email', dataType: 'email', required: true },

  { valueName: 'nameDisplay', dataType: 'string', required: true },
  { valueName: 'nameFirst', dataType: 'string', required: false },
  { valueName: 'nameLast', dataType: 'string', required: false },
  { valueName: 'nameLogin', dataType: 'string', required: true },

  { valueName: 'active', dataType: 'boolean', required: false },

  { valueName: 'dateOfBirth', dataType: 'date', required: false },

  { valueName: 'createdSource', dataType: 'string', required: false }
];

module.exports = {
  create: (values, callback) => {
    let newUser = {};

    let fieldErrors = [];

    // For each required field
    userFields
    // Id is created during this process, so ignore it
      .filter((field) => field.autoCreated !== true && field.required)
      .forEach((field) => {
        if (typeof values[field.valueName] === 'undefined') {
          fieldErrors.push(`Missing ${field.valueName}`);
          return;
        }
        // Check the type
        if (typeCheck(values[field.valueName], field) !== true) {
          fieldErrors.push(`Invalid ${field.valueName}`);
        }
      });

    // For each optional field
    userFields
      .filter((field) => field.autoCreated !== true && field.required === false)
      .forEach((field) => {
        if (values[field.valueName] && typeCheck(values[field.valueName], field) !== true) {
          fieldErrors.push(`Invalid ${field.valueName}`);
        }
      });

    if (fieldErrors.length !== 0) {
      // ToDo: needs to notify the consumer that this should be a 422 error.
      let newError = new Error(`Field validations failed: ${fieldErrors.join(', ')}`);
      newError.internalCode = 422;
      return callback(newError);
    }

    // Now map the fields into the new object
    userFields
      .filter((field) => field.autoCreated !== true)
      .forEach((field) => {
        newUser[field.valueName] = values[field.valueName];
      });

    // Default each value
    newUser.id = uuidv4();
    newUser.createdDate = new Date();
    newUser.updatedDate = new Date();

    if (typeof newUser.active === 'undefined') {
      newUser.active = true;
    }

    // The record should be ready to pass off to the database
    MongoDataSource.create(collectionName, newUser, (error, newRecord) => {
      if (error) {
        log.error('UserController', 'create', 'Encountered an error in the Data Layer.', error);
        return callback(error);
      }
      // Filter out non-public values
      return callback(undefined, newRecord);
    });
  }

};
