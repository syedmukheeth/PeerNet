const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://syedmukheeth09_db_user:8mWXLrAQeL3teMl6@cluster0.q3bizmz.mongodb.net/PeerNet?retryWrites=true&w=majority&appName=Cluster0';

const check = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        const UserSchema = new mongoose.Schema({
            username: String,
            email: String,
            passwordHash: String
        });
        const User = mongoose.model('User', UserSchema);

        const user = await User.findOne({ username: 'syedmukheeth' });
        if (!user) {
            console.log('User not found: syedmukheeth');
        } else {
            console.log('User found:', user.username);
            const match = await bcrypt.compare('@Syedmukheeth29', user.passwordHash);
            console.log('Password match (@Syedmukheeth29):', match);
            
            const match2 = await bcrypt.compare('@syedmukheeth29', user.passwordHash);
            console.log('Password match (@syedmukheeth29):', match2);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

check();
