const express = require("express");
const app = express();
const admin = require("firebase-admin");

const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const port = process.env.PORT || 5000;

//7. doctors-portal-ae96f-firebase-adminsdk.json

//const serviceAccount = require("./doctors-portal-ae96f-firebase-adminsdk.json");
const serviceAccount =JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f2bxu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log(uri);

//8. verify token 3 parameter
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail=decodedUser.email;
    }
    
    catch {
    
    }
  }
  next();
}

// client.connect(err =>{
// const collection=client.db("doctorsPortal").collection("appointment");
// console.log('hitting the database');
// const appointment={ name : "jana", email:'jkhatun25862@gmail.com'};
// collection.insertOne(appointment)
// .then( ()=>{
// console.log('insert success')

// })

// })

async function run() {
  try {
    await client.connect();
    console.log("database connected successfully");
    const database = client.db("doctorsPortal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("user");

    //2. show appointment data 65 verifyToken,
    app.get("/appointments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      // console.log(query)
      const query = { email: email, date: date };
      // console.log(date)
      // const cursor = appointmentsCollection.find({});
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
      // console.log(appointments)
    });
    
    //9.get for appointment id for payment

    app.get("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appointmentsCollection.findOne(query);
      res.json(result);
    });

    //1.if add to  data send to database  then "POST"
    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      // console.log(appointment);
      const result = await appointmentsCollection.insertOne(appointment);
      res.json({ message: "Hello" });
      // console.log(result)
      // res.json(result)
    });
//11. update appointment 
    app.put('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: payment,
        }
      };
      const result = await appointmentsCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    //6. admin or not, normal user not make admin
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    //3. if add to  data send to database  then "POST" user er info send
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      // console.log(result);
      res.json(result);
    });

    //4. upsert for user go to google sign  in for on time, second time could not sign in
    app.put("/users", async (req, res) => {
      const user = req.body;
      // console.log('PUT', user);
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
      // console.log(result)
    });

    //5.for make admin  verifyToken,
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      // console.log('PUT', user);
      // console.log('put', req.headers);
     // console.log("put", req.headers.authorization);
     // console.log("put", req.decodedEmail);
      
      // const filter = { email: user.email };
      // const updateDoc = { $set: { role: "admin" } };
      // const result = await usersCollection.updateOne(filter, updateDoc);
      // res.json(result);

      const requester = req.decodedEmail;
      if (requester) {
          const requesterAccount = await usersCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
              const filter = { email: user.email };
              const updateDoc = { $set: { role: 'admin' } };
              const result = await usersCollection.updateOne(filter, updateDoc);
              res.json(result);
          }
      }
      else {
          res.status(403).json({ message: 'you do not have access to make admin' })
      }
    });
    // 10. app.post for payment currency
    // app.post('/create-payment-intent', async (req, res)=>{
    // const paymentInfo=req.body;
    // const amount=paymentInfo.price*100;
    // const paymentIntent =await stripe.paymentIntents.create({
    // currency:'usd',
    // amount:amount,
    // payment_method_types:['card']
    
    // });
    // res.json({  clientSecret: paymentIntent.client_secret})
    // });
    
    app.post('/create-payment-intent', async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
          currency: 'usd',
          amount: amount,
          payment_method_types: ['card']
      });
      res.json({ clientSecret: paymentIntent.client_secret })
  })
    
  } finally {
    // //await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctors Portal !");
});

app.listen(port, () => {
  console.log(` listening at ${port}`);
});

/*
// data get all time
app.get('/users')
//brand new data post
app.post('/users')
app.get('/users/:id')
//for update put
app.put('/users/:id')
// delete
app.delete('/users/:id')

// users: get
// users:post

*/
