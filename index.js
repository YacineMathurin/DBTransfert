/** Imports */
const express = require("express");
const mongoose = require("mongoose");
var admin = require("firebase-admin");
const bodyParser = require("body-parser");
const _ = require("lodash");
const dotenv = require('dotenv');
dotenv.config();

/** Model & Schema MongoDB */
const { Collection } = require("./Models/collection");
const { Account, Auth } = require("./Models/auth");
const { UsersPacked, Users } = require("./Models/users");
/** Models */

const app = express();
app.use(bodyParser.json());

if (!process.env.MONGO_IMAGE_IP || !process.env.DB_NAME) {
  console.error("MONGO_IMAGE_IP and DB_NAME should all be set as .env variables");
  process.exit(1);
}

/** Connection to MongoDB */
mongoose
  .connect(
    // To connect to a cluster
    // `mongodb+srv://admin:${password}@cluster0.pjomp.mongodb.net/firestore_mongodb`,
    // To connect to local MongoDB
    // `mongodb://localhost:27017/blachere`,
    // To connect to Containerized MongoDB, MONGO_IMAGE_IP and DB_NAME to 
    // be configured in .env file at the root of the project
    `mongodb://${process.env.MONGO_IMAGE_IP}:27017/${process.env.DB_NAME}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    if (process.env.MONGO_IMAGE_IP && process.env.DB_NAME)
      console.log("Mongoose Connected Successfully to mongo docker", process.env.MONGO_IMAGE_IP, process.env.DB_NAME)
    else
      console.log("Mongoose Connected Successfully")
  }
  )
  .catch((err) => console.error("Mongoose Connection failed"));

/** Connection to Firabase */
var serviceAccount = require("./app-mon-compte-dev-firebase-adminsdk-bazos-1dc8da4864.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://moncompte-mb-staging.firebaseio.com",
});
const db = admin.firestore();

/** Functions */
function callbk() {
  console.log(
    "\nAwesome, Successfully Added To MongoDB ! \n\nwhat then please, I'm a callback !"
  );
}

/** Transfert to mongo */
app.post("/tomongo", async (req, res) => {
  const { collection } = req.body;
  console.log("Transfert to mongo collection is: ", collection);
  const snapshot = await db.collection(collection).get();
  let result = [];
  snapshot.forEach((doc) => {
    result.push({ _id: doc.id, _data: doc.data() });
    /* In case not interested into some section, use _lodash */
    /* result.push({ _id: doc.id, _data: _.pick(doc.data(), ["action", "user"]) }); */
  });
  /* Show first */
  // res.json({ res: result });

  /* If ok, then transfert */
  try {
    await Collection.insertMany(result);
    callbk();
    res
      .status(201)
      .json({ res: "Awesome, Successfully Added To MongoDB !", data: result });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error });
  }
});
app.post("/formating/account", async (req, res) => {
  var accounts = await Account.find();
  // console.log(accounts[0]["users"]);
  // const response = await Account.insertMany(accounts[0]["users"]);
  const users = accounts[0]["users"];
  var auth = "";
  users.forEach(async (element) => {
    // arr.push(_.pick(element, ["email", "passwordHash"]));
    console.log(_.pick(element, ["email", "passwordHash"]));
    auth = new Auth(_.pick(element, ["email", "passwordHash", "displayName", "localId", "emailVerified", "salt", "createdAt", "disabled"]));
    await auth.save();
  });
  // const authResponse = await Auth.insertMany(
  //   _.pick(arr, ["email", "passwordHash"])
  // );
  // console.log(authResponse);
  res.status(201).json({ message: "Creation Succeded !" });
});
app.post("/formating/users", async (req, res) => {
  var response = await UsersPacked.find();
  console.log("res", response);
  console.log(response[0]["_data"]);
  // const response = await Account.insertMany(accounts[0]["users"]);
  // const users = res[0]["users"];
  // var user = "";
  response.forEach(async (element) => {
    // arr.push(_.pick(element, ["email", "passwordHash"]));
    // console.log();
    user = new Users(_.pick(element["_data"], ["email", "firstname", "lastname", "shopId", "role", "id", "status"]));
    await user.save();
  });
  // const authResponse = await Auth.insertMany(
  //   _.pick(arr, ["email", "passwordHash"])
  // );
  // console.log(authResponse); 
  res.status(201).json({ message: "Creation Succeded !" });
});

/** Transfert to mongo */
app.listen(5000, () => console.log("Listening on port ", 5000));