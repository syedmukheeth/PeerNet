const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const dscrollService = require('./backend/src/services/dscroll.service');

async function testUpload() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");
    
    // Find any user id
    const User = require('./backend/src/models/User');
    const user = await User.findOne({});
    if (!user) {
        console.log("No user found.");
        process.exit(1);
    }
    console.log(`Using user: ${user.username} (${user._id})`);

    // Create a dummy video file
    const filePath = path.join(__dirname, 'test-video.mp4');
    fs.writeFileSync(filePath, Buffer.from('test video content'));

    const file = {
        path: filePath,
        mimetype: 'video/mp4',
        originalname: 'test-video.mp4'
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
