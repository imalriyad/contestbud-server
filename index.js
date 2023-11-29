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
    const contestCollection = database.collection("contest");
    const userCollection = database.collection("users");
    const paymentCollection = database.collection("payment");

    // payment intance
    app.post("/api/v1/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(price);
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

    app.post("/api/v1/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    app.patch("/api/v1/participants/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      try {
        // Find the document in the collection
        const contestDocument = await contestCollection.findOne(filter);
        
        // Check if the document exists
        if (!contestDocument) {
          return res.status(404).json({ error: 'Document not found' });
        }
    
        // Increment the participants field by 1
        const updatedParticipants = contestDocument.participants + 1;
    
        // Update the document in the collection
        await contestCollection.updateOne(filter, { $set: { participants: updatedParticipants } });
    
        res.json({ message: 'Participants field updated successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
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

    // get all contest by id
    app.get("/api/v1/get-all-contest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.findOne(query);
      res.send(result);
    });
    // get all contest
    app.get("/api/v1/get-all-contest", async (req, res) => {
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
