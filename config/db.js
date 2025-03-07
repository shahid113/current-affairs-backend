const mongoose = require("mongoose");

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'currentaffairs'
  });
  return conn;
};

module.exports = connectDB;
module.exports.close = () => mongoose.connection.close();