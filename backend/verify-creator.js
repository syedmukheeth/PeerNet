'use strict';

const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Replace with your username
        const username = 'syedmukheeth'; // Assuming this is the user
        const user = await User.findOneAndUpdate(
            { username },
            { isVerified: true, role: 'admin' },
            { new: true }
        );

        if (user) {
            console.log(`User ${username} updated successfully:`);
            console.log(`- isVerified: ${user.isVerified}`);
            console.log(`- role: ${user.role}`);
        } else {
            console.log(`User ${username} not found. Searching for any users...`);
            const allUsers = await User.find().limit(5);
            console.log('Top users:', allUsers.map(u => u.username));
            
            if (allUsers.length > 0) {
                const firstUser = await User.findByIdAndUpdate(
                    allUsers[0]._id,
                    { isVerified: true, role: 'admin' },
                    { new: true }
                );
                console.log(`Updated first user found (${firstUser.username}) instead.`);
            }
        }

        await mongoose.disconnect();
        console.log('Disconnected');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
