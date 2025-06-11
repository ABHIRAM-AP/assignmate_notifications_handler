const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = admin.firestore();

app.post('/add-assignment', async (req, res) => {
  try {
    const { title, dueDate, body, pdfUrl } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Title and dueDate are required' });
    }

    const assignmentData = {
      Title: title,
      Date: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
    };

    // Only add PDF if it exists
    if (pdfUrl) {
      assignmentData.pdfUrl = pdfUrl;
    }

    // Save to Firestore
    await db.collection('Assignment_Subjects').add(assignmentData);

    // Send push notification
    const tokensSnapshot = await db.collection('Students').get();
    const tokens = tokensSnapshot.docs
      .map(doc => doc.data().token)
      .filter(token => token); // remove nulls

    const message = {
      notification: {
        title: title,
        body: body || `Due on ${new Date(dueDate).toLocaleDateString()}`
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    res.status(200).json({
      success: true,
      message: 'Assignment added and notification sent',
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('Error adding assignment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
