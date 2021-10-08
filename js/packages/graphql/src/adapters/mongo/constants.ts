export const connectionString =
  process.env.MONGO_DB ||
  "mongodb://127.0.0.1:27017/?readPreference=primary&directConnection=true&ssl=false";
