/** Imports */
const express = require("express");
const mongoose = require("mongoose");
var admin = require("firebase-admin");
const bodyParser = require("body-parser");
const _ = require("lodash");

const app = express();
app.use(bodyParser.json());

/** Connection to MongoDB */
mongoose
  .connect("mongodb://localhost/retour_base", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Mongoose Connected Successfully"))
  .catch((err) => console.error("Mongoose Connection failed"));

/** Connection to Firabase */

var serviceAccount = require("./mario-bros-yas-firebase-adminsdk-kjgqa-f01609b93d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mario-bros-yas.firebaseio.com",
});

const db = admin.firestore();

/** Model & Schema MongoDB */
const Joining = mongoose.model(
  "Users_Joining",
  new mongoose.Schema({
    result: [{}],
  })
);
const Joining_obj = mongoose.model(
  "notifications_from_firebase",
  new mongoose.Schema({
    _id: String,
    _data: {},
  })
);

app.post("/tomongo", async (req, res) => {
  const snapshot = await db.collection("notifications").get();
  let result = [];
  snapshot.forEach((doc) => {
    result.push({ _id: doc.id, _data: doc.data() });
    // In case not interested into some section, use _lodash
    // result.push({ _id: doc.id, _data: _.pick(doc.data(), ["action", "user"]) });
  });
  //   Show first
  //   res.json({ res: result });
  //   If ok, then transfert
  //   let joining = new Joining({ result });
  //   await joining.save();

  //   let joining_obj = new Joining_obj({ result });
  await Joining_obj.insertMany(result);
  res.status(200).json({ res: "ack" });
});
app.post("/tofirebase", async (req, res) => {
  //   Create a new collection and a document
  const docRef = db.collection("notifications_from_mongodb").doc("doc_title");
  try {
    Joining_obj.find().then((docs) => {
      console.log(docs);
      var toStore = [];
      docs.forEach((el) => {
        toStore.push(_.pick(el["_data"], ["user", "action"]));
      });
      console.log(toStore);
      docRef.set({ ...toStore });
    });

    res.status(200).json({ res: "ok" });
  } catch (error) {
    res.status(500).json({ error });
  }
});
app.listen(5000, () => console.log("Listening on port ", 5000));
