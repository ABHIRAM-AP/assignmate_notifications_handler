const express = require('express');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

let lastChecked = new Date(); // local memory; resets on restart

app.get('/send-notifications', async (req, res) => {
    try {
        const snapshot = await db.collection('Assignment_Subjects')
            .where('createdAt', '>', lastChecked)
            .get();

        if (snapshot.empty) {
            lastChecked = new Date();
            return res.send('No new assignments.');
        }

        const assignments = snapshot.docs.map(doc => doc.data());
        const studentsSnapshot = await db.collection('Students').get();
        const tokens = studentsSnapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);

        const messages = assignments.map(a => ({
            notification: {
                title: `New Assignment: ${a.subjectName}`,
                body: a.title || 'Check your dashboard!',
            },
            tokens: tokens
        }));

        for (const message of messages) {
            await admin.messaging().sendMulticast(message);
        }

        lastChecked = new Date();
        res.send(`${assignments.length} assignments processed.`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error sending notifications.');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
