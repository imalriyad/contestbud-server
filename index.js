const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const app = express();
const port = process.env.PORT || 5000;

// middlle ware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sdrstxb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("contestbud");
    const contestCollection = database.collection("testContest");
    const userCollection = database.collection("users");
    const paymentCollection = database.collection("payment");

    //  Add new Contest
    app.post("/api/v1/create-contest", async (req, res) => {
      const newContest = req.body;
      console.log(newContest);
      const result = await contestCollection.insertOne(newContest);
      res.send(result);
    });

    // delete a contest
    app.delete("/api/v1/delete-contest/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await contestCollection.deleteOne(filter);
      res.send(result);
    });

    // update ucontest status
    app.patch("/api/v1/update-contest-status/:id", async (req, res) => {
      const id = req.params.id;
      const contestStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: contestStatus.status,
        },
      };
      const result = await contestCollection.updateOne(query, updateStatus);
      res.send(result);
    });
    // update user role
    app.patch("/api/v1/update-role/:id", async (req, res) => {
      const id = req.params.id;
      const userRole = req.body;
      const query = { _id: new ObjectId(id) };
      const updateRole = {
        $set: {
          role: userRole.role,
        },
      };
      const result = await userCollection.updateOne(query, updateRole);
      res.send(result);
    });

    // get user role
    app.get("/api/v1/get-user-role", async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const result = await userCollection.findOne(query);
      let role = "";
      if (result?.role === "admin") {
        role = "admin";
      } else if (result?.role === "creator") {
        role = "creator";
      } else {
        role = "user";
      }
      res.send({ role });
    });

    // getalluser
    app.get("/api/v1/get-all-user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //  Get top participent contest
    app.get("/api/v1/get-top-contests", async (req, res) => {
      const searchText = req.query?.search;
      let query = {};
      if (searchText) {
        query = { tags: { $regex: new RegExp(searchText, "i") } };
      }
      const result = await contestCollection
        .find(query)
        .sort({ participants: -1 })
        .limit(10)
        .toArray();

      res.send(result);
    });

    // payment intance
    app.post("/api/v1/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // save payment details to db
    app.post("/api/v1/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    // get paid contest
    app.get("/api/v1/get-paid-contest/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await paymentCollection.find(filter).toArray();
      res.send(result);
    });

    // update participent feild
    app.patch("/api/v1/participants/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      try {
        const contestDocument = await contestCollection.findOne(filter);

        if (!contestDocument) {
          return res.status(404).json({ error: "Document not found" });
        }

        const updatedParticipants = contestDocument.participants + 1;

        await contestCollection.updateOne(filter, {
          $set: { participants: updatedParticipants },
        });

        res.json({ message: "Participants field updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    //  Store User details on registration
    app.post("/api/v1/create-user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        return;
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Get Creator my-created-contest as  a creator
    app.get("/api/v1/get-my-created-contest", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { creatorMail: email };
      }
      const result = await contestCollection.find(query).toArray();
      res.send(result);
    });

    // get all contest by id
    app.get("/api/v1/get-all-contest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.findOne(query);
      res.send(result);
    });
    // get all contest
    app.get("/api/v1/get-all-contest", async (req, res) => {
      const result = await contestCollection
        .find({ status: { $ne: "pending" } })
        .toArray();
      res.send(result);
    });
    // get all contest as an admin
    app.get("/api/v1/get-all-contest-admin", async (req, res) => {
      const result = await contestCollection.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ContestBud server is running...");
});

app.listen(port, () => {
  console.log(`ContestBud server is running on port ${port}`);
});
