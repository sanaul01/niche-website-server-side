const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hcshw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next){
    if(req?.headers?.authorization?.startsWith('Bearer ')){
        const token = req.headers.authorization.split(' ')[1];

        try{
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch{

        }

    }
    next();
}

async function run(){
    try{
        await client.connect();

        const database = client.db('bike_lover');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders')
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');

        // Get products 
        app.get('/products', async (req, res)=>{
            const cursor = productsCollection.find({});
            const page  = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if(page){
                products = await cursor.skip(page*size).limit(size).toArray()
            }
            else{
                products = await cursor.toArray();
            }
            
            res.json({count, products});
        });

        // Get a product 
        app.get('/products/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const product = await productsCollection.findOne(query);
            res.json(product);
        });

        // Get an order 
        app.get('/orders', verifyToken, async (req, res)=>{
            const email = req.query.email;
            const query = {email: email}
            const cursor = ordersCollection.find(query);
            const order = await cursor.toArray();
            res.json(order)
        });

        // Get all orders 
        app.get('/orders/id', async (req,res)=>{
            const cursor = ordersCollection.find({});
            console.log('orders', cursor)
            const result = await cursor.toArray();
            res.json(result)
        });

        // Get all reviews 
        app.get('/reviews', async (req, res)=>{
            const cursor = reviewsCollection.find({});
            const result = await cursor.toArray()
            res.json(result)
        })

        // Add product in database 
        app.post('/products', async (req, res)=>{
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result)
        });;

        // Add reviews 
        app.post('/reviews', async (req, res)=>{
            const review = req.body;
            console.log(review)
            const result = await reviewsCollection.insertOne(review);
            res.json(result)
        })

        // Add orders in database 
        app.post('/orders', async (req, res)=>{
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        });

        // Delete an order 
        app.delete('/orders/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await ordersCollection.deleteOne(query);
            res.json(order)
        });

        // Delete a Product 
        app.delete('/products/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const product = await productsCollection.deleteOne(query);
            res.json(product)
        });

        // Add user in server 
        app.post('/users', async (req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });

        // Make an admin user 
        app.put('/users/admin', verifyToken, async (req, res)=>{
            const user = req.body;
            const requester = req.decodedEmail;
            if(requester){
                const requesterAccount = await usersCollection.findOne({email: requester});
                if(requesterAccount.role === 'admin'){
                    const filter = { email: user.email };
                    const updateDoc = { $set: {role: 'admin'} };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result)
                }
            }
            else{
                res.status(403).json({message: 'You do not have access to make admin'})
            }
        });

        // Find an admin user 
        app.get('/users/:email', async (req, res)=>{
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === 'admin'){
                isAdmin = true;
            }
            res.json({admin: isAdmin})
        })

    }
    finally {
        // await client.close();
      }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('Bike Lover')
});

app.listen(port, ()=>{
    console.log(`listening, ${port}`)
});