/** Routes */
app.post("/tofirebase", async (req, res) => {
  //   Create a new collection and a document
  const docRef = db.collection("notifications_from_mongodb").doc("doc_title");
  try {
    Collection.find().then((docs) => {
      console.log(docs);
      var toStore = [];
      docs.forEach((el) => {
        toStore.push(_.pick(el["_data"], ["user", "action"]));
      });
      console.log(toStore);
      docRef.set({ ...toStore });
      res.status(201).json({
        ack: "Awesome, Successfully Added To Firestore !",
        data: { ...toStore },
      });
    });
  } catch (error) {
    res.status(400).json({ error });
  }
});
/** Routes */

// This function is used to generate a JWT that contains the user informations
// and that can be trusted across all our vuejs apps: moncompte, marketplace, inventaire.
app.post("/authenticateWithAD", async (req, res) => {
  cors(req, res, async () => {
    const {
      APIAuthManager,
      ADAuthManager,
    } = require("@holdingblachere/node-sdk");

    const email = req.body.email;
    const password = req.body.password;

    // Authenticate With
    const adManager = new ADAuthManager();

    const userInfo = await adManager.loginWithEmailAndPassword(email, password);

    if (!userInfo) {
      return res.status(401).send("FORBIDDEN");
    }

    // Add the common signature
    const manager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const token = manager.signUserToken(userInfo);
    const result = {
      userInfo,
      token,
    };
    return res.send(result);
  });
});
// app.createShopSession = functions.https.onRequest(async (req, res) => {
app.post("/createShopSession", async (req, res) => {
  cors(req, res, async () => {
    const { CreateShopSessionUsecase } = require("@holdingblachere/node-sdk");
    return CreateShopSessionUsecase.InitExpressController({
      secretKey: functions.config().app.jwt_secret,
      firebaseAdmin: admin.admin,
    })(req, res);
  });
});
// This function must be duplicated for all child app
// Returns the value of the session if exists and invalidate the sessionId
app.post("/refreshSession", async (req, res) => {
  cors(req, res, async () => {
    const { RefreshShopSessionUsecase } = require("@holdingblachere/node-sdk");
    return RefreshShopSessionUsecase.InitExpressController(admin.admin)(
      req,
      res
    );
  });
});
// Admin outils mag
app.post("/getShopSynchronizationStats", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }

    const shopId = req.query.id;
    if (!shopId) {
      return res.status(400).send("Missing shop id");
    }

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
    if (!user) {
      return res.status(403).send("FORBIDDEN");
    }

    const [
      amcUsers,
      marketplaceShop,
      marketplaceShopUsers,
    ] = await Promise.all([
      shopAuthService.listShopUsers(shopId),
      marketplaceApiService.getShopById(shopId),
      marketplaceApiService.listShopUsers(shopId),
    ]).catch((e) => console.log("Er", e));

    // A map of app and userId with status 'true'/'false' as:
    // true means it exists / false means it doesn't exist in the given project.
    // { marketplace: { myUserId: true, doesntExistUserId: false }}
    const usersSyncStats = {
      marketplace: {},
    };

    amcUsers.forEach((user) => {
      usersSyncStats.marketplace[user.id] = !!marketplaceShopUsers.find(
        (e) => e.id === user.id
      );
    });

    return res.status(200).send({
      usersSyncStats,
      shopSyncStats: {
        marketplace: {
          implemented: true,
          displayName: "Marketplace",
          shopExists: !!marketplaceShop,
          shop: marketplaceShop,
          shopUsersCount: marketplaceShopUsers.length,
        },
        inventaire: {
          implemented: false,
          displayName: "Inventaire",
        },
      },
    });
  });
});

app.post("/getIntranetUserPassword", async (req, res) => {
  cors(req, res, async () => {
    const axios = require("axios");
    const params = new URLSearchParams();
    params.append("codeUser", req.query.codeUser);

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
    // TODO: create a generic guard instance.
    if (!user) {
      return res.send("FORBIDDEN");
    }

    const config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const { data } = await axios.post(
      "https://intranet.blachere.fr/blachere_api/admin_outils_mag/get_password_user.php",
      params,
      {
        timeout: 1000 * 60, // Wait for 60 seconds
        auth: {
          username: "admin_out",
          password: "qsdfmnqsefjhbcv763JDHBdql9%D*d",
        },
      }
    );
    return res.send({ password: data[0].mdp });
  });
});

app.post("listShopIntranetUsers", async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
    // TODO: create a generic guard instance.
    if (!user) {
      return res.send("FORBIDDEN");
    }

    const axios = require("axios");
    const params = new URLSearchParams();
    params.append("shopId", req.query.shopId);

    const config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const { data } = await axios.post(
      "https://intranet.blachere.fr/blachere_api/admin_outils_mag/users_by_mag.php",
      params,
      {
        timeout: 1000 * 60, // Wait for 60 seconds
        auth: {
          username: "admin_out",
          password: "qsdfmnqsefjhbcv763JDHBdql9%D*d",
        },
      }
    );

    return res.send(data);
  });
});

app.post("/listShopByUser", async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));

    if (!user) {
      return res.send("FORBIDDEN");
    }

    // Source values: ['AMC', 'AD']
    const source = req.query.source || "AD";
    if (source === "AD") {
      const axios = require("axios");
      const params = new URLSearchParams();
      params.append("userId", user.id);

      try {
        const { data } = await axios.get(
          "https://intranet.blachere.fr/blachere_api/v2/maria/get_mags_by_user.php",
          {
            params,
            auth: {
              username: "adminOutil",
              password: "qsefj2343KJb4%Npsdf345df",
            },
          }
        );

        if (!data) {
          return [];
        }

        return res.send(
          data.map((e) => {
            let type = "MB";
            let domain = e.shopMail.split("@")[1];
            if (
              domain &&
              (domain.includes("mangeonsfrais") ||
                domain.includes("provenc-halles"))
            ) {
              type = "FL";
            }
            return {
              email: e.shopMail,
              name: e.shopName,
              id: e.shopId.toString(),
              type,
            };
          })
        );
      } catch (e) {
        console.error(e);
        return res.send([]);
      }
    } else if (source === "AMC") {
      const shops = await admin.admin
        .firestore()
        .collection("shops")
        .get()
        .then((snap) => {
          const list = [];
          snap.forEach((doc) =>
            list.push({
              email: doc.data().email,
              name: doc.data().name,
              id: doc.id,
              type: "CDM-PRT",
            })
          );
          return list;
        });
      return res.send(shops);
    }
  });
});

app.post("/getShopById", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
    if (!user) {
      return res.status(403).send("FORBIDDEN");
    }

    const shopId = req.query.shopId;
    const shop = await shopAuthService.getShopById(shopId);

    if (!shop) {
      return res.status(404).send("shop not found");
    }

    return res.status(200).send(shop);
  });
});

app.post("/getShopToken", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(400).send("not found");
    }

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
    if (!user) {
      return res.status(403).send("FORBIDDEN");
    }

    const shopId = req.body.shopId;
    const shop = await shopAuthService.getShopById(shopId);
    if (!shop) {
      return res.status(404).send("shop not found");
    }
    const shopEmail = shop.email;
    const token = await shopAuthService.generateJWT({
      shopId,
      shopEmail,
    });
    return res.status(200).send({ token });
  });
});

app.post("/authenticateShopWithLoginCode", async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(400).send("not found");
    }
    const { email, code } = req.body;
    const response = await authenticateShopWithLoginCodeUsecase.execute(
      email,
      code
    );
    res.status(response.code).send(response.data);
  });
});

app.post("/requestShopLoginCode", async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const { email } = req.query;
    const response = await requestShopLoginCodeUsecase.execute(email);
    res.status(response.code).send(response.data);
  });
});

app.post("/requestMagicLink", async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const { callbackURL, email } = req.query;
    const response = await requestMagicLinkUsecase.execute(callbackURL, email);
    res.status(response.code).send(response.data);
  });
});

app.post("/shopUsers", async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    let shopToken = req.headers["shop-token"];
    const adminToken = req.get("Authorization");
    if (adminToken && !shopToken) {
      const { APIAuthManager } = require("@holdingblachere/node-sdk");
      const apiAuthManager = new APIAuthManager({
        secretKey: functions.config().app.jwt_secret,
      });
      const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
      if (!user) {
        return res.status(403).send("FORBIDDEN");
      }

      shopToken = await shopAuthService.generateJWT({
        shopId: req.query.shopId,
      });
    }
    const response = await listShopUsersUsecase.execute(shopToken, true);
    return res.status(response.code).send(response.data);
  });
});

app.post("/forgetPassword", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(404).send("NOT_FOUND");
    }
    const shopToken = req.headers["shop-token"];
    const { newPassword, userId } = req.body;
    const response = await updateUserPasswordUsecase.execute(
      userId,
      newPassword
    );
    return res.status(response.code).send(response.data);
  });
});

app.post("/approveResetPasswordRequest", async (req, res) => {
  if (req.method !== "GET") {
    return res.status(404).send("NOT_FOUND");
  }
  const { requestToken, requestId } = req.query;
  const response = await approveResetPasswordUsecase.execute(
    requestToken,
    requestId
  );
  return res.status(response.code).send(response.data);
});

app.post("/createShopUserByAdmin", async (req, res) => {
  cors(req, res, async () => {
    const userProfile = _.get(req.body, "userProfile", null);
    const userPassword = _.get(req.body, "userPassword", null);
    const syncUser = _.get(req.body, "syncUser", true);
    const shopId = _.get(req.body, "shopId", null);

    if (!shopId) {
      return res.status(400).send("Missing shopId");
    }

    const { APIAuthManager } = require("@holdingblachere/node-sdk");
    const apiAuthManager = new APIAuthManager({
      secretKey: functions.config().app.jwt_secret,
    });
    const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
    if (!user) {
      return res.status(403).send("FORBIDDEN");
    }

    const response = await createUserUsecase.execute(
      userProfile,
      userPassword,
      null,
      shopId,
      true,
      syncUser
    );

    return res.status(200).send(response.data);
  });
});

app.post("/createShopByAdmin", async (req, res) => {
  cors(req, res, async () => {
    const body = req.body;

    const fields = ["id", "name", "email", "managerDeSecteurEmail"];
    for (const field of fields) {
      if (!body[field]) {
        return res.status(400).send(`MISSING_${field.toUpperCase()}`);
      }
    }

    try {
      const { APIAuthManager } = require("@holdingblachere/node-sdk");
      const apiAuthManager = new APIAuthManager({
        secretKey: functions.config().app.jwt_secret,
      });
      const { user } = apiAuthManager.verifyBearer(req.get("Authorization"));
      if (!user) {
        return res.status(403).send("FORBIDDEN");
      }
    } catch {
      return res.status(403).send("FORBIDDEN");
    }

    const response = await createShopUsecase.execute(
      body.email,
      body.id,
      body.name,
      { email: body.managerDeSecteurEmail },
      null,
      true
    );

    return res.status(200).send(response.data);
  });
});

app.post("/createShopUser", async (data, context) => {
  const creatorId = _.get(context, "auth.uid", "none");
  const userProfile = _.get(data, "userProfile", null);
  const userPassword = _.get(data, "userPassword", null);

  const syncUser = true;
  const isAdmin = false;

  let creator = _.get(context, "auth.token.userInfo", null);
  if (!creator) {
    creator = await shopAuthService.getUserById(creatorId);
  }

  const shopId = creator.shopId;

  const response = await createUserUsecase.execute(
    userProfile,
    userPassword,
    creator.role,
    shopId,
    !!creator,
    syncUser
  );

  return response.data;
});

// TODO: why isn't this endpoint secured ?!
app.post("/createFirstShopUser", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(404).send("NOT_FOUND");
  }

  req.body.data.forEach((user) => {
    console.log(user);
    const userProfile = _.get(user, "userProfile", null);
    const userPassword = _.get(user, "userPassword", null);
    const shopId = _.get(user, "shopId", null);

    createFirstUserUsecase.execute(userProfile, userPassword, shopId);
  });
  return 0;
});

app.post("/createShop", async (data, context) => {
  const creatorId = context.auth.uid;
  const email = _.get(data, "email", null);
  const id = _.get(data, "id", null);
  const name = _.get(data, "name", null);
  const managerDeSecteur = _.get(data, "managerDeSecteur", null);

  const creator = await shopAuthService.getUserById(creatorId);

  const response = await createShopUsecase.execute(
    email,
    id,
    name,
    managerDeSecteur,
    creator.role
  );
  return response.data;
});

app.post("/deleteUser", async (data, context) => {
  const deleterId = context.auth.uid;
  const userId = data.userId;

  let deleter = _.get(context, "auth.token.userInfo", null);
  if (!deleter) {
    deleter = await shopAuthService.getUserById(deleterId);
  }
  console.log("DELETER", deleter);
  const response = await mainConfig.usecases.requestSoftDeleteUserUsecase.execute(
    deleter,
    userId
  );
  return response.data;
});

app.approveDeleteUser = functions.https.onRequest(
  mainConfig.controllers.approveDeleteUserController.handler()
);

app.updateUserPassword = functions.https.onCall(async (data, context) => {
  const userId = context.auth.uid;
  const { password } = data;
  const response = await updateUserPasswordUsecase.execute(userId, password);
  return response.data;
});

app.onNewWebhookJob = functions
  .runWith({ timeoutSeconds: 300 })
  .firestore.document("webhookJobs/{jobId}")
  .onCreate(async (snap, context) => {
    const { type, urls, requestData } = snap.data();
    const { jobId } = context.params;

    const response = await triggerWebhookUsecase.execute(
      jobId,
      type,
      urls,
      requestData
    );
    return response.data;
  });

app.onWehbookJobUpdated = functions
  .runWith({ timeoutSeconds: 300 })
  .firestore.document("webhookJobs/{jobId}")
  .onUpdate(async (change, context) => {
    const { type, urls, requestData } = change.after.data();
    const { jobId } = context.params;

    const response = await triggerWebhookUsecase.execute(
      jobId,
      type,
      urls,
      requestData
    );
    return response.data;
  });

app.onUserUpdated = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const { userId } = context.params;
    const newValue = change.after.data();
    const response = onUserUpdatedUsecase.execute(userId, newValue);
    return response.data;
  });

/*
    TODO: PROTECT THIS ENDPOINT WITH AN API_KEY OR SOMETHING
  */
app.syncAllUsers = functions.https.onRequest(syncAllUsersController);

app.getJWT = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(400).send("not found");
    }
    console.log("coucou: ", req.body);
    const shopInfo = req.body;
    const response = await getJWTUsecase.execute(shopInfo);
    return res.status(response.code).send(response.data);
  });
});

app.getAllJWT = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const csv = await getAllJWTUsecase.execute();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Content-disposition",
      "attachment; filename=shopsToken.json"
    );
    // res.set('Content-Type', 'text/csv');
    res.status(200).send(csv);
  });
});

app.getAllShops = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const response = await getAllShopsUsecase.execute();

    return res.status(response.code).send(response.data);
  });
});

app.getUsersByMag = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const response = await getUsersByMagUsecase.execute();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Content-disposition",
      "attachment; filename=shopsToken.json"
    );
    // res.set('Content-Type', 'text/csv');
    res.status(200).send(response);
  });
});

app.rmvDuplicataFromDecember = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const response = await rmvDuplicataFromDecember.execute();

    return res.status(response.code).send(response.data);
  });
});

app.reactivateAllUsers = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const response = await reactivateAllUsers.execute();

    return res.status(response.code).send(response.data);
  });
});

app.posMgmtSync = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(400).send("not found");
    }
    const body = req.body;
    response = await upsertShopUsecase.execute(body);
    return res.status(response.code).send(response.data);
  });
});

app.getShopsWithoutFirstUser = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(400).send("not found");
    }
    const body = req.body;
    response = await getShopsWithoutFirstUserUsecase.execute();
    return res.status(response.code).send(response.data);
  });
});

app.posMgmtFirstUserSync = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(404).send("NOT_FOUND");
  }

  const isValidBearer = await cryptoService.validBearer(req);
  if (!isValidBearer) {
    return res.status(400).json({
      error: "Not Authorized",
    });
  }

  const response = [];
  req.body.data.forEach((user) => {
    response.push(posMgmtFirstUserUsecase.execute(user));
  });
  return res.status(200).send(response);
});
