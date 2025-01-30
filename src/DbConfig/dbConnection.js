import mongoose from 'mongoose';

const dbConnection = async (DB_NAME, DATABASE_URL) => {
    console.log(`Connecting to database ${DB_NAME} at ${DATABASE_URL}`);
    try {
        const options = { dbName: DB_NAME };

        if (!DATABASE_URL.startsWith('mongodb://') && !DATABASE_URL.startsWith('mongodb+srv://')) {
            throw new Error('Invalid connection string. It should start with "mongodb://" or "mongodb+srv://".');
        }

        await mongoose.connect(DATABASE_URL, options);
        console.log(`Connected to the database successfully;`)
    } catch(err) {
        console.error(err.message);
        throw err

    }
}

export default dbConnection;