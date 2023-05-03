import { buffer } from 'micro'
import * as admin from "firebase-admin"

const serviceAccount = require('../../../permissions.json')

// Secure a connection to FIREBASE from the backend
            //if no app initialized    then initialize app
const app = !admin.apps.length 
    ? admin.initializeApp ({
        credential: admin.credential.cert(serviceAccount)
    }) 
: admin.app() //else use current app


//Establish a connection stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const endpointSecret = process.env.STRIPE_SIGNING_SECRET

const fulfillOrder = async (session) => {
    //console.log('Fulfilling order', session)

    return app
    .firestore()
    .collection('users')
    .doc(session.metadata.email)
    .collection("orders")
    .doc(session.id)
    .set({
        amount: session.amount_total / 100,
        amount_shipping: session.total_details.amount_shipping / 100, //might need to remove
        images: JSON.parse(session.metadata.images),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    })
    .then(()=> {
        console.log(`SUCCESS: Order ${session.id} has been added to the DB`)
    })
}

export default async (req, res) => {
    if (req.method === 'POST') {
        const requestBuffer = await buffer(req) //generates a cert
        const payload = requestBuffer.toString()
        const sig = req.headers["stripe-signature"]  //sig is signature

        let event;

        //Verify that the EVENT posted came from stripe
        try {
            event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
        } catch (err) {
            console.log('ERROR', err.message)
            return res.status(400).send(`Webhook error: ${err.message}`)
        }

        //Handle the checkout.session.completed event  
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object

            //Fulfill the order..put inside the data base to show user/organization/info storage
            return fulfillOrder(session)
            .then(() => res.status(200))
            .catch((err) => res.status(400)
            .send(`Webhook Error: ${err.message}`))
        }
    }
}

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true
    }
}