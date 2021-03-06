  # Set up Database
  module.exports = {
    id: 'noths-database',
    description: 'NOTHS Local Database',
    migrations: [
      {

        version: 1,
        migrate: (transaction, next) ->
          store = transaction.db.createObjectStore('users', {keyPath: "id"})
          store.createIndex('emailIndex', 'email')
          next()

      },
      {
        version: 2,
        migrate: (transaction, next) ->
          store = transaction.db.createObjectStore('products', {keyPath: "id"})
          next()
      },
      {
        version: 3,
        migrate: (transaction, next) ->
          store = transaction.db.createObjectStore('days_to_ship', {keyPath: "id"})
          store.createIndex('daysIndex', 'days')
          next()
      },
      {
        version: 4,
        migrate: (transaction, next) ->
          store = transaction.db.createObjectStore('product_types', {keyPath: "id"})
          next()
      },
      {
        version: 5,
        migrate: (transaction, next) ->
          store = transaction.db.createObjectStore('experience_types', {keyPath: "id"})
          next()
      }
    ]
  }