const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Load service account from secret path (Render)
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(express.json());


app.post('/add-assignment', async (req, res) => {
    const { title, body, dueDate } = req.body;

    try {
        

        // Get all student tokens from Firestore
        const studentsSnapshot = await admin.firestore().collection('Students').get();
        const tokens = [];
        studentsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) {
                tokens.push(data.fcmToken);
            }
        });

        if (tokens.length === 0) {
            return res.status(200).send({ success: false, message: 'No tokens found' });
        }

      
        const message = {
            notification: { title, body },
            tokens: tokens, 
        };


        const response = await admin.messaging().sendMulticast(message);

        res.status(200).send({ success: true, response });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
