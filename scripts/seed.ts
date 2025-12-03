// scripts/seed.ts
import "dotenv/config";
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

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
    "Civil Engineer", "Consultant", "Customer Service", "Data Analyst", "Data Scientist",
    "Designer", "Doctor", "Developer", "Educator", "Engineer", "Entrepreneur",
    "Fashion Designer", "Freelancer", "Graphic Designer", "HR Specialist", "Lawyer",
    "Marketing Specialist", "Nurse", "Photographer", "Product Manager", "Project Manager",
    "Scientist", "Software Engineer", "Teacher", "Writer", "KOL", "Other"
];

const UNIVERSITY_LIST = [
    "Đại học Quốc gia Hà Nội", "Đại học Bách khoa Hà Nội", "Đại học Kinh tế Quốc dân",
    "Đại học Ngoại thương Hà Nội", "Đại học Hà Nội", "Đại học Y Hà Nội",
    "Học viện Ngoại giao", "Đại học Khoa học Tự nhiên - ĐHQGHN",
    "Đại học Khoa học Xã hội và Nhân văn - ĐHQGHN",
    "Đại học Quốc gia TP.HCM", "Đại học Bách khoa TP.HCM", "Đại học Kinh tế TP.HCM",
    "Đại học Sư phạm TP.HCM", "Đại học FPT", "Đại học RMIT Việt Nam",
    "Đại học Đà Nẵng", "Đại học Duy Tân", "Đại học Huế", "Đại học Cần Thơ",
    "Đại học VinUniversity", "Đại học Fulbright Việt Nam",
    "Khác"
];

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

async function uploadRandomPhoto() {
    const url = `https://picsum.photos/600/800?random=${Math.random()}`;
    return await cloudinary.uploader.upload(url, {
        folder: "dating_seed",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
    });
}

async function createFakeUser() {
    const hash = await bcrypt.hash("test1234", 10);

    const emailLocal = faker.internet.username().toLowerCase();
    const email = `${emailLocal}${faker.number.int({ min: 100, max: 999 })}@gmail.com`;

    const user = await UserModel.create({
        id: uuid(),
        email: email,
        password: hash,
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
        userId: user.id,
        firstName: first,
        lastName: last,
        displayName: `${first} ${last}`,
        bio: faker.lorem.sentence(),

        city,
        country: "Việt Nam",

        gender: faker.helpers.arrayElement(["male", "female"]),
        education: university,
        job: job,

        dateOfBirth: faker.date.birthdate({
            mode: "age",
            min: 18,
            max: 35,
        }),

        zodiacSign: faker.helpers.arrayElement([
            "Aries", "Taurus", "Gemini", "Cancer",
            "Leo", "Virgo", "Libra", "Scorpio",
            "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ]),

        height: faker.number.int({ min: 150, max: 199 }),

        weight: faker.number.int({ min: 45, max: 85 }),

        location: {
            type: "Point",
            coordinates: [lng, lat],
        },

        mode: "dating",
        interests: faker.helpers.arrayElements(
            ["Music", "Sports", "Movies", "Pets", "Deep talks"],
            3
        ),
        goals: faker.helpers.arrayElements(
            ["Serious relationship", "Just vibing", "New friends", "Something casual"],
            2
        ),

        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const uploaded = await uploadRandomPhoto();

    await PhotoModel.create({
        userId: user.id,
        url: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        type: "avatar",
        isPrimary: true,
        isActive: true,
        createdAt: new Date(),
    });

    console.log("✔ Seeded:", profile.displayName);
}

(async () => {
    await mongoose.connect(process.env.MONGO_URI!, {
        dbName: process.env.MONGO_DB_NAME,
    });

    for (let i = 0; i < 1; i++) {
        await createFakeUser();
    }
    process.exit(0);
})();
