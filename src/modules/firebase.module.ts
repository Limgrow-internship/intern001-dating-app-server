import { Module } from '@nestjs/common';
import { initializeApp, credential } from 'firebase-admin';

@Module({})
export class FirebaseModule {
    constructor() {
        initializeApp({
            credential: credential.cert(require('../config/firebase-service-account.json')),
        });
    }
}
