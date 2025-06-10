const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Load Firebase service account key (from Render secret mount)
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.use(express.json());

// ✅ Route: Add Assignment and Send Notification
app.post('/add-assignment', async (req, res) => {
  const { title, body, dueDate } = req.body;

  if (!title || !body || !dueDate) {
    return res.status(400).send({ success: false, message: 'Missing title, body, or dueDate' });
  }

  try {
    // Save assignment to Firestore
    await db.collection('Assignment_Subjects').add({
      title,
      body,
      dueDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Fetch all student FCM tokens
    const studentsSnapshot = await db.collection('Students').get();
    const tokens = [];

    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return res.status(200).send({ success: false, message: 'No FCM tokens found' });
    }

    // Send a notification to each token
    const results = [];
    for (const token of tokens) {
      const message = {
        notification: {
          title,
          body
        },
        token
      };

      try {
        const response = await admin.messaging().send(message);
        results.push({ token, response });
      } catch (error) {
        results.push({ token, error: error.message });
      }
    }

    return res.status(200).send({ success: true, results });
  } catch (error) {
    return res.status(500).send({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT}`);
});
