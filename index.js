const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

//middleware

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASS}@cluster0.ncc8jsr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);


function verifyJWT(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {

    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }

    req.decoded = decoded;
    next();
  })
}



async function run() {
  try {
    await client.connect();
    console.log('Database connection established')
  }
  catch (error) {
    console.log(error);
  }
}

run();

const ServicesCollection = client.db('geniusCar').collection('services');
const ordersCollection = client.db('geniusCar').collection('orders');

app.get('/services', async (req, res) => {

  const search = req.query.search;
  // console.log(search);
  let query = {};

  if (search.length) {
    query = {
      $text: {
        $search: search,
        $caseSensitive: true
      }
    }
  }

  // const query = { price: { $gt: 20, $lt: 100 } };
  // const query = { price: { $eq: 200 } }
  // const query = { price: { $lte: 200 } }
  // const query = { price: { $ne: 150 } }
  // const query = { price: { $in: [20, 40, 150] } }
  // const query = { price: { $nin: [20, 40, 150] } }
  // const query = { $and: [{price: {$gt: 20}}, {price: {$gt: 100}}] }

  const order = req.query.order === 'asc' ? 1 : -1;

  try {
    const cursor = ServicesCollection.find(query).sort({ price: order });
    const services = await cursor.toArray();
    res.send({
      success: true,
      message: "Successfully got the data",
      data: services
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
})

app.get('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const services = await ServicesCollection.findOne({ _id: ObjectId(id) })

    res.send({
      success: true,
      message: "Successfully got the data",
      data: services
    })

  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    })
  }
})


// order api

app.post('/orders', verifyJWT, async (req, res) => {
  try {
    const orders = await ordersCollection.insertOne(req.body);
    if (orders.insertedId) {
      res.send({
        success: true,
        message: "Successfully placed order",
        data: orders
      });
    }
    else {
      res.send({
        success: false,
        message: "Couldn't create order",
      });
    }
  }
  catch (error) {
    console.log(error);
    res.send({
      success: false,
      error: error.message,
    })
  }
})


app.get('/orders', verifyJWT, async (req, res) => {
  try {

    const decoded = req.decoded;

    // console.log(decoded);

    if (decoded.email !== req.query.email) {
      res.status(403).send({ message: 'unauthorized access' });
    }

    let query = {};

    if (req.query.email) {
      query = { email: req.query.email }
    }

    const cursor = ordersCollection.find(query);
    const orders = await cursor.toArray();
    res.send({
      success: true,
      message: "Successfully got the data",
      data: orders
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
})





app.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ordersCollection.findOne({ _id: ObjectId(id) })

    res.send({
      success: true,
      message: "Successfully Got the Data",
      data: order
    })
  }


  catch (error) {
    res.send({
      success: false,
      error: error.message,
    })
  }
})


app.patch('/orders/:id', verifyJWT, async (req, res) => {
  try {

    const { id } = req.params;
    const query = { _id: ObjectId(id) }
    const status = req.body.status;
    const updateDoc = {
      $set: {
        status: status
      }
    }
    const result = await ordersCollection.updateOne(query, updateDoc)

    res.send(result);
  }
  catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
})



app.delete('/orders/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ordersCollection.findOne({ _id: ObjectId(id) })

    if (!order?._id) {
      res.send({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const result = await ordersCollection.deleteOne({ _id: ObjectId(id) })

    if (result.deletedCount) {
      res.send({
        success: true,
        message: "Successfully Delete the order",
      })
    }


  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    })
  }
})



// JWT Token 

// random hexa key for token secure cookies: Command: node ---> require('crypto').randomBytes(64) ----> require('crypto').randomBytes(64).toString('hex')

// console.log(process.env.ACCESS_TOKEN_SECRET);

app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });

  res.send({ token });

})



app.get('/', (req, res) => {
  res.send('Server is Running........');
})


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

