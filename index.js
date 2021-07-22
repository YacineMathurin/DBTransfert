/** Imports */
const express = require("express");
const mongoose = require("mongoose");
var admin = require("firebase-admin");
const bodyParser = require("body-parser");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const store = require("./store.js");
const password = store.password;
const dotenv = require('dotenv');
dotenv.config();

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
  .then(() => console.log("Mongoose Connected Successfully", process.env.MONGO_IMAGE_IP, process.env.DB_NAME))
  .catch((err) => console.error("Mongoose Connection failed"));

/** Connection to Firabase */

var serviceAccount = require("./app-mon-compte-dev-firebase-adminsdk-bazos-1dc8da4864.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://moncompte-mb-staging.firebaseio.com",
});

const db = admin.firestore();

/** Model & Schema MongoDB */
const Collection = mongoose.model(
  "webhooks_packed",
  new mongoose.Schema({
    _id: String,
    _data: {},
  })
);

const Account = mongoose.model(
  "accounts",
  new mongoose.Schema({
    users: {},
    _id: {
      type: String,
      minlength: 5,
      maxlength: 1024,
    },
  })
);
const Auth = mongoose.model(
  "auth",
  new mongoose.Schema({
    email: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 255,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1024,
    },
    displayName: {
      type: String,
      required: true,
    },
    localId: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    createdAt: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      required: true,
    },

  })
);

const UsersPacked = mongoose.model(
  "users_packeds",
  new mongoose.Schema({
    _data: {},
    _id: {
      type: String,
      minlength: 5,
      maxlength: 1024,
    },
  })
);
const Users = mongoose.model(
  "users",
  new mongoose.Schema({
    email: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 255,
      unique: true,
    },
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    shopId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      // required: true,
    },
  })
);
/** Models */

/** Functions */
function callbk() {
  console.log(
    "\nAwesome, Successfully Added To MongoDB ! \n\nwhat then please, I'm a callback !"
  );
}
/** Functions */

/** Start Transfert to mongo */
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
app.post("/account", async (req, res) => {
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
  res.status(200).json({ res: "Cool !" });
});
app.post("/users", async (req, res) => {
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
  res.status(200).json({ res: response });
});
/** End Transfert to mongo */

app.listen(5000, () => console.log("Listening on port ", 5000));
