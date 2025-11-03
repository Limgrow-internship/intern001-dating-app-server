import { MongooseModuleOptions } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

export const databaseConfig = (): MongooseModuleOptions => ({
  uri: process.env.MONGO_URI,
  dbName: process.env.MONGO_DB_NAME,
});
