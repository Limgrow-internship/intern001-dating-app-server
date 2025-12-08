// scripts/seed.ts
import "dotenv/config";
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

import { UserSchema } from "../src/Models/user.model";
import { ProfileSchema } from "../src/Models/profile.model";
import { PhotoSchema } from "../src/Models/photo.model";

const UserModel = mongoose.model("User", UserSchema);
const ProfileModel = mongoose.model("Profile", ProfileSchema);
const PhotoModel = mongoose.model("Photo", PhotoSchema);

const VIETNAM_CITIES = [
    "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
    "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Huế", "Quảng Nam",
    "Bình Định", "Khánh Hòa", "Lâm Đồng", "Gia Lai", "Đắk Lắk",
    "Bình Dương", "Đồng Nai", "Vũng Tàu", "Long An", "An Giang",
    "Cà Mau", "Bạc Liêu", "Sóc Trăng", "Kiên Giang"
];

const JOB_LIST = [
    "Accountant", "Actor", "Architect", "Artist", "Banker", "Business Analyst",
    "Civil Engineer", "Consultant", "Customer Service", "Data Analyst",
    "Data Scientist", "Designer", "Doctor", "Developer", "Educator",
    "Engineer", "Entrepreneur", "Fashion Designer", "Freelancer",
    "Graphic Designer", "HR Specialist", "Lawyer", "Marketing Specialist",
    "Nurse", "Photographer", "Product Manager", "Project Manager",
    "Scientist", "Software Engineer", "Teacher", "Writer", "KOL", "Other"
];

const UNIVERSITY_LIST = [
    "Đại học Quốc gia Hà Nội", "Đại học Bách khoa Hà Nội", "ĐH KTQD",
    "ĐH Ngoại thương", "ĐH Hà Nội", "ĐH Y Hà Nội", "Học viện Ngoại giao",
    "ĐH KHTN - ĐHQGHN", "ĐH KHXHNV - ĐHQGHN",
    "ĐHQG TP.HCM", "ĐH Bách khoa TP.HCM", "UEH",
    "ĐH Sư phạm TP.HCM", "ĐH FPT", "RMIT Việt Nam",
    "Đại học Đà Nẵng", "ĐH Duy Tân", "ĐH Huế", "ĐH Cần Thơ",
    "VinUni", "Fulbright Việt Nam", "Khác"
];

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});


async function uploadRandomHuman(): Promise<UploadApiResponse> {
    const api = `https://randomuser.me/api/`;

    const user = await fetch(api).then((r) => r.json());
    const imageUrl = user.results[0].picture.large;

    return await cloudinary.uploader.upload(imageUrl, {
        folder: "dating_seed",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
    });
}

async function createFakeUser() {
    const hashed = await bcrypt.hash("test1234", 10);

    const emailLocal = faker.internet.username().toLowerCase();
    const email = `${emailLocal}${faker.number.int({ min: 100, max: 999 })}@gmail.com`;

    const userId = uuid();

    const user = await UserModel.create({
        id: userId,
        email,
        password: hashed,
        status: "active",
        optAttempts: 0,
        lastLogin: new Date(),
        fcmToken: uuid(),
        fcmTokenUpdatedAt: new Date(),
        createdAt: new Date(),
    });

    const first = faker.person.firstName();
    const last = faker.person.lastName();

    const city = faker.helpers.arrayElement(VIETNAM_CITIES);
    const job = faker.helpers.arrayElement(JOB_LIST);
    const university = faker.helpers.arrayElement(UNIVERSITY_LIST);

    const lat = faker.number.float({ min: 8.5, max: 23.5 });
    const lng = faker.number.float({ min: 102, max: 109.5 });

    const profile = await ProfileModel.create({
        userId,
        firstName: first,
        lastName: last,
        displayName: `${first} ${last}`,
        bio: faker.lorem.sentence(),
        city,
        country: "Việt Nam",

        gender: faker.helpers.arrayElement(["male", "female"]),
        education: university,
        job,

        dateOfBirth: faker.date.birthdate({ mode: "age", min: 18, max: 35 }),
        zodiacSign: faker.helpers.arrayElement([
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ]),

        height: faker.number.int({ min: 150, max: 199 }),
        weight: faker.number.int({ min: 45, max: 85 }),

        location: {
            type: "Point",
            coordinates: [lng, lat],
        },

        mode: "dating",
        interests: faker.helpers.arrayElements(
            ["Music", "Sports", "Movies", "Pets", "Deep talks"], 3
        ),
        goals: faker.helpers.arrayElements(
            ["Serious relationship", "Just vibing", "New friends", "Something casual"], 2
        ),

        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const uploaded: UploadApiResponse = await uploadRandomHuman();

    await PhotoModel.create({
        userId,
        url: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        type: "avatar",
        isPrimary: true,
        isActive: true,
        createdAt: new Date(),
    });

}

(async () => {
    await mongoose.connect(process.env.MONGO_URI!, {
        dbName: process.env.MONGO_DB_NAME,
    });

    for (let i = 0; i < 1; i++) {
        await createFakeUser();
    }
    console.log("🎉 DONE! Seeded all fake users.");
    process.exit(0);
})();
