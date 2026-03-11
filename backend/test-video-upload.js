const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
// Mongoose and dotenv are in backend/node_modules, so this script must be run from inside backend folder or we must require them properly.
// The easiest is just running it from inside the backend folder.
require('dotenv').config({ path: __dirname + '/.env' });
const dscrollService = require('./src/services/dscroll.service');
const { execSync } = require('child_process');

async function testUpload() {
  try {
    if (!process.env.MONGO_URI) {
        throw new Error('No mongo uri found, check .env');
    }
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    
    // Find any user id
    const User = require('./src/models/User');
    const user = await User.findOne({});
    if (!user) {
        console.log("No user found.");
        process.exit(1);
    }
    console.log(`Using user: ${user.username} (${user._id})`);

    // Download a very small real sample MP4 so cloudinary doesn't reject it
    const filePath = path.join(__dirname, 'sample-video.mp4');
    console.log('Downloading sample mp4...');
    execSync('curl -s https://www.w3schools.com/html/mov_bbb.mp4 -o ' + filePath);
    console.log('Downloaded sample mp4.');

    const file = {
        path: filePath,
        mimetype: 'video/mp4',
        originalname: 'sample-video.mp4'
    };

    console.log("Uploading via service...");
    const result = await dscrollService.createDscroll(user._id, { caption: 'Test Video via script' }, file);
    console.log("SUCCESS. Created Post:");
    console.log(result);
    
    fs.unlinkSync(filePath);
    process.exit(0);
  } catch (err) {
    console.error("ERROR=================================");
    console.error(err);
    process.exit(1);
  }
}

testUpload();
