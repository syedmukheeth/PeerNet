const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./src/models/User');
    const res = await User.find({ $text: { $search: 'syed' } });
    console.log('Found ' + res.length + ' users');
    console.log(res.map(u => ({ username: u.username, name: u.fullName })));
    process.exit(0);
}
run();
